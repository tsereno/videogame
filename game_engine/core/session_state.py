"""Game state initialization, skill loading, player management, and deterministic monster turns."""
import os, sys, re, time, math, yaml, glob, zlib, threading, copy, importlib.util
import numpy as np
from .constants import SKILLS_DIR, GRID_SQ, ROOM_BOUNDS_AND_COLLISIONS, WORLD_MODEL_WEIGHTS_PATH, SHARED_EXPERIENCE_LOG_PATH
from .core_models import VisualCompositor, NeuralWorldModel, Choice, evaluate_jev_decision, load_skill_yaml_cached

class SessionStateMixin:
    def __init__(self, skill_name: str = "interactive-adventure-engine"):
        self.skill_name, self.compositor, self.world_model = skill_name, VisualCompositor(), NeuralWorldModel()
        self.player_x, self.player_y, self.player_radius = 220, 390, 20
        self.expansion_index = 12
        self.load_skill(skill_name)
        self.reset()

    @property
    def current_archetypes(self) -> list:
        ha = getattr(self, "hero_archetypes", None)
        if isinstance(ha, dict):
            return list(ha.values())
        return ha or [{"name": getattr(self, "default_hero", {}).get("name", "Adventurer"), "class": getattr(self, "default_hero", {}).get("class", "Adventurer"), "species": getattr(self, "default_hero", {}).get("species", "Humanoid"), "hp": 30, "max_hp": 30, "ac": 14}]

    def load_skill(self, skill_name: str):
        # Search multiple skill roots: local SKILLS_DIR, games/<name>/skills, games/*/skills, and engine skills
        workspace_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        raw_dirs = [
            SKILLS_DIR,
            os.path.join(workspace_root, "games", skill_name, "skills"),
            os.path.join(workspace_root, "games", "*", "skills"),
            os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "skills", "game_skills"),
        ]
        search_dirs = []
        for rd in raw_dirs:
            if not rd:
                continue
            if "*" in rd:
                search_dirs.extend(glob.glob(rd))
            elif os.path.exists(rd):
                search_dirs.append(rd)

        sp = None
        for sdir in search_dirs:
            cand = os.path.join(sdir, skill_name, "SKILL.md")
            if os.path.exists(cand):
                sp = cand
                break
            cands = glob.glob(os.path.join(sdir, f"*{skill_name}*", "SKILL.md"))
            if cands:
                sp = cands[0]
                break

        if not sp:
            for sdir in search_dirs:
                cands = glob.glob(os.path.join(sdir, "*", "SKILL.md"))
                if cands:
                    sp = cands[0]
                    break
        if not sp:
            raise FileNotFoundError(f"Skill '{skill_name}' not found in search paths: {search_dirs}")

        with open(sp, "r", encoding="utf-8") as f:
            raw_content = f.read()
            parts = raw_content.split("---")
        if len(parts) < 3: raise ValueError(f"SKILL.md in {sp} missing YAML frontmatter")
        from .core_models import fast_yaml_load
        self.skill_raw_content, self.skill_markdown_doc = raw_content, parts[2] if len(parts) > 2 else ""
        self.game_assets_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(sp))), "assets")
        self.lore_paragraphs = [p.strip()[:280] for p in re.split(r"\n\s*\n", self.skill_markdown_doc) if len(p.strip()) > 25]
        g = fast_yaml_load(parts[1]).get("game", {})
        self.game_data = g
        self.title, self.start_room, self.initial_inv = g.get("title", "Tactical Adventure"), g.get("start_room", "start"), g.get("initial_inventory", "Basic Sword")
        for attr, k, df in (
            ("rooms_def", "rooms", {}), ("gates_def", "gates", {}), ("dragons_def", "dragons", {}), ("win_def", "win_condition", {}),
            ("events_def", "events", {}), ("chapters_def", "storyline_chapters", {}), ("loot_tables_def", "loot_tables", {}), ("bestiary_def", "bestiary", {}),
            ("npcs_def", "npcs", {}), ("room_bounds", "room_bounds", {}), ("extractable_items", "extractable_items", []),
            ("hero_archetypes", "hero_archetypes", []), ("walkthrough_commands", "walkthrough_commands", []),
            ("narrative_flavors", "narrative_flavors", {}), ("immovable_fixtures", "immovable_fixtures", []), ("default_sprites", "default_sprites", {}),
            ("scenery_classification", "scenery_classification", []), ("weapons_codex", "weapons_codex", []), ("tactical_archetypes", "tactical_archetypes", {}),
            ("minion_breakdowns", "minion_breakdowns", {}), ("discovery_rules", "discovery_rules", {}), ("intent_criteria", "intent_criteria", {}),
            ("ai_roles", "ai_roles", {}), ("companion_tactics", "companion_tactics", {}), ("companion_dialogue", "companion_dialogue", {}),
            ("environment_conditions", "environment_conditions", {}), ("species_languages", "species_languages", {}),
            ("archetype_languages", "archetype_languages", {}), ("salutation_lexicon", "salutation_lexicon", {}),
            ("start_room_reset", "start_room_reset", {}), ("sector_adjacency", "sector_adjacency", {}), ("language_keywords", "language_keywords", {}),
            ("default_hero", "default_hero", {}), ("npc_defaults", "npc_defaults", {}), ("threat_criteria", "threat_criteria", {}),
            ("terminology", "terminology", {}), ("client_skill_data", "client", {}),
        ):
            setattr(self, attr, g.get(k, copy.deepcopy(df)))
        self._client_skills_bundle_cache = None
        self.intro_message = g.get("intro_message", "Welcome to the adventure!")
        self.default_language = g.get("default_language", "Common")
        for attr, k in (("scene_mapping", "scene_mapping"), ("sprite_mapping", "sprite_mapping"), ("default_sprites", "default_sprites"), ("environment_themes", "environment_themes"), ("visual_classification", "visual_classification")):
            setattr(self.compositor, attr, g.get(k, {}))
        self.compositor.load_visual_models_from_skills(SKILLS_DIR)

        self.npc_dialogue_paths, self.monster_dialogue_talk = dict(g.get("npc_paths", {})), dict(g.get("monster_talk", {}))
        self.custom_command_verbs = g.get("command_verbs", "")
        lw_cfg = {}
        def _deep_merge_lw(dst, src):
            for lk, lv in (src or {}).items():
                if isinstance(lv, dict) and isinstance(dst.get(lk), dict):
                    _deep_merge_lw(dst[lk], lv)
                elif isinstance(lv, list) and isinstance(dst.get(lk), list):
                    dst[lk].extend(copy.deepcopy(lv))
                else:
                    dst[lk] = copy.deepcopy(lv)
        if isinstance(g.get("living_world"), dict):
            _deep_merge_lw(lw_cfg, g.get("living_world"))
        for sdir in search_dirs:
            for d_cand in glob.glob(os.path.join(sdir, "*dialogue*", "SKILL.md")):
                try:
                    d_meta, d_body = load_skill_yaml_cached(d_cand)
                    if d_meta:
                        d_data = d_meta.get("dialogue") or d_meta.get("game", {}).get("dialogue") or {}
                        if isinstance(d_data, dict):
                            self.npc_dialogue_paths.update(d_data.get("npc_paths", {}))
                            self.monster_dialogue_talk.update(d_data.get("monster_talk", {}))
                            if d_data.get("command_verbs"):
                                cv = d_data["command_verbs"]
                                self.custom_command_verbs = "|".join(str(x) for x in cv) if isinstance(cv, list) else str(cv)
                        self.lore_paragraphs.extend(p.strip()[:280] for p in re.split(r"\n\s*\n", d_body) if len(p.strip()) > 25)
                except Exception:
                    pass
            for lw_cand in glob.glob(os.path.join(sdir, "*", "SKILL.md")):
                try:
                    lw_meta, _ = load_skill_yaml_cached(lw_cand)
                    if isinstance(lw_meta, dict):
                        for key in ("living_world",):
                            blk = lw_meta.get(key) or lw_meta.get("game", {}).get(key)
                            if isinstance(blk, dict):
                                _deep_merge_lw(lw_cfg, blk)
                except Exception:
                    pass
        self.living_world_cfg = lw_cfg
        fl = self.narrative_flavors if isinstance(self.narrative_flavors, dict) else {}
        self.world_model.combat_flavors = fl.get("combat", ["strikes with precision"])
        self.world_model.movement_flavors = fl.get("movement", ["moves steadily forward"])
        self.world_model.monster_flavors = fl.get("monster", ["locks onto your position"])
        self.world_model.npc_flavors = fl.get("npc", ["looks around attentively"])
        self.world_model.background_flavors = fl.get("background", ["The surroundings remain quiet."])
        self.world_model.immovable_fixtures = self.immovable_fixtures if isinstance(self.immovable_fixtures, list) else []
        self.world_model.load_weights(WORLD_MODEL_WEIGHTS_PATH)

        base_cls = type(self)._base_session_cls if getattr(type(self), "_is_skill_composed", False) else type(self)
        slug = re.sub(r"[^a-zA-Z0-9_]", "_", skill_name)
        skill_mixins = []
        for idx, sfp in enumerate(sorted(glob.glob(os.path.join(os.path.dirname(sp), "scripts", "*.py")))):
            if os.path.basename(sfp).startswith("_"):
                continue
            mname = f"_skill_script_{slug}_{idx}"
            spec = importlib.util.spec_from_file_location(mname, sfp)
            if spec and spec.loader:
                mod = importlib.util.module_from_spec(spec)
                sys.modules[mname] = mod
                spec.loader.exec_module(mod)
                skill_mixins.extend(c for c in vars(mod).values() if isinstance(c, type) and c.__module__ == mname)
        self.__class__ = type(f"{base_cls.__name__}_{slug}", tuple(skill_mixins) + (base_cls,), {"_is_skill_composed": True, "_base_session_cls": base_cls}) if skill_mixins else base_cls
        if hasattr(self, "on_skill_loaded"):
            self.on_skill_loaded()

    def get_client_skills_bundle(self) -> dict:
        """Returns compact skill configuration, dialogue, lore, codex, and room summary for browser JS & client CC-ELM."""
        cached = getattr(self, "_client_skills_bundle_cache", None)
        if cached is not None:
            return {**cached, "story_flags": sorted(getattr(self, "story_flags", set()) or ())}
        comp = getattr(self, "compositor", None)
        def _merge_cfg(dst, src):
            for k, v in (src or {}).items():
                if isinstance(v, dict) and isinstance(dst.get(k), dict):
                    _merge_cfg(dst[k], v)
                else:
                    dst[k] = v
            return dst

        client_cfg = {}
        try:
            eng_skill = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "skills", "game_skills", "interactive-adventure-engine", "SKILL.md")
            eng_meta, _ = load_skill_yaml_cached(eng_skill)
            eng_cli = (eng_meta or {}).get("game", {}).get("client")
            if isinstance(eng_cli, dict):
                _merge_cfg(client_cfg, eng_cli)
        except Exception:
            pass
        _merge_cfg(client_cfg, getattr(comp, "visual_client_config", {}) or {})
        skill_client = getattr(self, "client_skill_data", None)
        if isinstance(skill_client, dict):
            _merge_cfg(client_cfg, skill_client)
        vis_cls = dict(getattr(comp, "visual_classification", {}) or {})
        if not vis_cls and isinstance(client_cfg.get("visual_classification"), dict):
            vis_cls = dict(client_cfg["visual_classification"])
        _dir_keys = ("north", "south", "east", "west", "up", "down", "northeast", "northwest", "southeast", "southwest")
        rooms_summary = {}
        for rk, rv in (getattr(self, "rooms_def", {}) or {}).items():
            if not isinstance(rv, dict):
                continue
            raw_exits = dict(rv.get("exits")) if isinstance(rv.get("exits"), dict) else {}
            for dk in _dir_keys:
                if dk in rv and dk not in raw_exits:
                    raw_exits[dk] = rv[dk]
            exits = {
                dk: (dv[0] if isinstance(dv, (list, tuple)) and dv else dv)
                for dk, dv in raw_exits.items()
                if (isinstance(dv, (list, tuple)) and dv and isinstance(dv[0], str) and dv[0]) or (isinstance(dv, str) and dv)
            }
            rooms_summary[rk] = {"name": rv.get("name", rk), "desc": rv.get("desc", ""), "exits": exits}
        bundle = {
            "skill_name": getattr(self, "skill_name", ""),
            "title": getattr(self, "title", "Tactical Adventure"),
            "start_room": getattr(self, "start_room", "start"),
            "terminology": dict(getattr(self, "terminology", {}) or {}),
            "intent_criteria": dict(getattr(self, "intent_criteria", {}) or {}),
            "visual_classification": vis_cls,
            "hero_archetypes": list(self.current_archetypes or []),
            "bestiary": dict(getattr(self, "bestiary_def", {}) or {}),
            "dialogue": {
                "npc_paths": dict(getattr(self, "npc_dialogue_paths", {}) or {}),
                "monster_talk": dict(getattr(self, "monster_dialogue_talk", {}) or {}),
                "command_verbs": getattr(self, "custom_command_verbs", "") or "",
                "lore": list(getattr(self, "lore_paragraphs", [])[:60]),
            },
            "visual_codex": dict(getattr(comp, "visual_models", {}) or {}),
            "extractable_items": list(getattr(self, "extractable_items", []) or []),
            "gates": [{"id": gid, "room": g.get("room"), "key_item": g.get("key_item")} for gid, g in (getattr(self, "gates_def", {}) or {}).items()],
            "rooms": rooms_summary,
            "client": client_cfg,
            "living_world": copy.deepcopy(getattr(self, "living_world_cfg", {}) or {}),
        }
        self._client_skills_bundle_cache = bundle
        return {**bundle, "story_flags": sorted(getattr(self, "story_flags", set()) or ())}

    def classify_scenery_object(self, name: str) -> dict:
        nl = (name or "").lower()
        rules = getattr(self, "scenery_classification", [])
        is_list = isinstance(rules, list) and bool(rules)
        ck = (id(rules) if is_list else 0, len(rules) if is_list else 0, nl)
        cache = getattr(self, "_scenery_cls_cache", None)
        if cache is None:
            cache = {}
            self._scenery_cls_cache = cache
        hit = cache.get(ck)
        if hit is not None:
            return dict(hit)
        res = {"kind": "wall", "label": "Solid Wall", "height": 125}
        if is_list:
            kw_entries = [e for e in rules if e.get("keywords")]
            matched = None
            if kw_entries and nl:
                crit = {str(i): f"{e.get('label', '')} {' '.join(e.get('keywords', []))}" for i, e in enumerate(kw_entries)}
                resp = evaluate_jev_decision(nl, {"scenery": Choice(criteria=crit)})["scenery"]
                if resp.choice and resp.confidence >= 0.40:
                    entry = kw_entries[int(resp.choice)]
                    matched = {"kind": entry.get("kind", "wall"), "label": entry.get("label", "Scenery"), "height": entry.get("height", 125)}
            if matched is not None:
                res = matched
            else:
                default_e = next((e for e in rules if not e.get("keywords")), None)
                if default_e:
                    res = {"kind": default_e.get("kind", "wall"), "label": default_e.get("label", "Solid Wall"), "height": default_e.get("height", 125)}
        with self.state_lock:
            if len(cache) > 2048:
                cache.clear()
            cache[ck] = res
        return dict(res)

    def is_object_discovered(self, obj_type: str, name: str, target_room: str = None) -> bool:
        nl = (name or "").lower()
        rules = getattr(self, "discovery_rules", {})
        hazards = rules.get("hazards", {})
        if hazards and any(w in nl for w in hazards.get("keywords", ())):
            if not any(r in self.visited_rooms for r in hazards.get("required_visited_rooms", ())) and not any(f in self.story_flags for f in hazards.get("required_flags", ())):
                return False

        sec = rules.get("secret_passages", {})
        if sec and any(w in nl for w in sec.get("keywords", ())):
            target_discovered = (target_room in self.visited_rooms) if target_room else False
            gid = self.find_gate(self.current_room, target_room) if target_room else None
            if not ((gid and gid in self.unlocked_gates) or target_discovered or any(f in self.story_flags for f in sec.get("required_flags", ()))):
                return False

        if target_room:
            gid = self.find_gate(self.current_room, target_room)
            if gid and gid not in self.unlocked_gates:
                rk = self.gates_def.get(gid, {}).get("key_item", "")
                has_key = any(rk.lower() in it.lower() for it in self.inventory) if rk else False
                if not has_key and target_room not in self.visited_rooms:
                    return False

        if obj_type == "monster":
            m_rules = rules.get("monsters", {})
            for m_key, m_rule in m_rules.items():
                if any(w in nl for w in m_rule.get("keywords", [])):
                    if not any(ev in self.triggered_events for ev in m_rule.get("required_events", [])):
                        return False

        return True

    def reset(self):
        self.state_lock = threading.RLock()
        self.players = {}
        self.scene_dirty = True
        self.last_frame_packet = b""
        self.current_room = self.start_room
        self.visited_rooms = {self.start_room}
        spawn = self.room_bounds.get(self.current_room, {}).get("spawn", [220, 390])
        self.player_x, self.player_y = spawn[0], spawn[1]
        self.inventory = [self.initial_inv] if self.initial_inv else []
        self.room_items = {r: list(info.get("items", [])) for r, info in self.rooms_def.items()}
        self.room_monsters = {r: list(info.get("monsters", [])) for r, info in self.rooms_def.items()}
        self.room_npcs = {r: list(info.get("npcs", [])) for r, info in self.rooms_def.items()}
        for d_name, d_info in self.dragons_def.items():
            sr = d_info.get("start_room")
            if sr in self.room_monsters and d_name not in self.room_monsters[sr]: self.room_monsters[sr].append(d_name)
        # In Open World format, all regional gates and celestial corridors are unsealed for free exploration
        self.unlocked_gates = set(self.gates_def.keys())
        self.defeated_monsters, self.triggered_events, self.completed_chapters, self.story_flags, self.salvaged_parts = set(), set(), set(), set(), set()
        self.monster_states = {}
        self.turn_count, self.in_game_minutes, self.is_won, self.is_over = 0, 0.0, False, False
        self.last_human_move_time = 0.0
        dh = getattr(self, "default_hero", {})
        ls = self.game_data.get("initial_char_stats", {})
        self.char_stats = copy.deepcopy(ls) if ls else {"name": dh.get("name", "Adventurer"), "species": dh.get("species", "Humanoid"), "class": dh.get("class", "Adventurer"), "level": 1, "max_hp": 36, "current_hp": 36, "armor_class": 18, "momentum": 0, "combo_chain": 0}
        self._last_ai_step_time = 0.0
        if hasattr(self, "_init_living_world"):
            self._init_living_world()
        self.ensure_ai_party_members()

    def _build_player_from_archetype(self, player_id: str, arch: dict, px: float, py: float, pz: float = 64.0, p_room: str = None, p_facing: str = "east", name: str = None, is_ai: bool = False) -> dict:
        p_room, dh = p_room or self.current_room, getattr(self, "default_hero", {})
        base_name = arch.get("name", dh.get("name", "Adventurer"))
        other_names = {po.get("name") for pid, po in self.players.items() if pid != player_id}
        p_name = name or (base_name if base_name not in other_names else f"{base_name} #{len(self.players) + 1}")
        p_class = arch.get("class", dh.get("class", "Adventurer"))
        p_sprite = arch.get("sprite", self.default_sprites.get("player", ""))
        p_hp, p_ac, p_spec = int(arch.get("hp", 36)), int(arch.get("ac", 18)), arch.get("species", dh.get("species", "Humanoid"))
        p_stats = copy.deepcopy(self.char_stats)
        p_stats.update({
            "name": p_name, "class": p_class, "species": p_spec,
            "level": int(arch.get("level", 1)), "xp": int(arch.get("xp", 0)), "next_level_xp": int(arch.get("next_level_xp", 300)),
            "max_hp": p_hp, "current_hp": p_hp, "armor_class": p_ac,
            "hit_dice": arch.get("hit_dice", dh.get("hit_dice", "3 Hit Dice")), "hit_dice_remaining": int(arch.get("hit_dice_remaining", 3)),
            "initiative": arch.get("initiative", 0), "speed": arch.get("speed", 30), "proficiency_bonus": 2, "momentum": 0, "combo_chain": 0, "stance": "Balanced"
        })
        for k in ("abilities", "skills", "spells_and_powers", "wealth"):
            if k in arch: p_stats[k] = copy.deepcopy(arch[k])
        if "features_2024" in arch: p_stats["features_2024"] = list(arch["features_2024"])
        p_langs = arch.get("languages") or getattr(self, "archetype_languages", {}).get(p_name.lower()) or getattr(self, "species_languages", {}).get(p_spec.lower(), [getattr(self, "default_language", "Common")])
        p_stats["languages"] = list(p_langs)
        now = time.time()
        vis_spec = self.compositor.build_entity_visual_spec(category="player", name=p_name, char_class=p_class)
        return {
            "id": player_id,
            "name": p_name,
            "class": p_class,
            "species": p_spec,
            "languages": list(p_langs),
            "sprite": p_sprite,
            "hp": p_hp,
            "max_hp": p_hp,
            "ac": p_ac,
            "char_stats": p_stats,
            "visual_spec": vis_spec,
            "x": float(px),
            "y": float(py),
            "z": float(pz),
            "room": p_room,
            "facing": p_facing,
            "joined_at": now,
            "last_active": now,
            "is_ai": bool(is_ai),
            "archetype_index": self.current_archetypes.index(arch) if arch in self.current_archetypes else 0,
            "numeric_id": (zlib.crc32(player_id.encode("utf-8")) & 0x7FFF) | 0x8000,
            "active_weapon": self.initial_inv or "Sun-forged Broadsword",
            "is_downed": False,
            "downed_until": 0.0,
            "rested_turns": 0,
            "mount": None,
            "emote": None,
            "appearance": {"silhouette": "default", "headgear": "default", "palette": "default", "cloak": True},
        }

    def ensure_ai_party_members(self):
        with self.state_lock:
            now = time.time()
            human_cutoff = now - 90.0
            for sid in [pid for pid, po in list(self.players.items()) if not po.get("is_ai") and po.get("last_active", 0) < human_cutoff]:
                del self.players[sid]

            human_arch_indices = set()
            human_classes = set()
            for pid, po in self.players.items():
                if not po.get("is_ai"):
                    if po.get("archetype_index") is not None:
                        human_arch_indices.add(int(po["archetype_index"]))
                    if po.get("class"):
                        human_classes.add(po["class"])

            sp = self.room_bounds.get(self.current_room, {}).get("spawn", [220, 390])
            init_facing = "east"
            for idx, arch in enumerate(self.current_archetypes):
                ai_id = f"ai_hero_{idx}"
                arch_cls = arch.get("class", "Adventurer")
                if idx in human_arch_indices or arch_cls in human_classes:
                    if ai_id in self.players:
                        del self.players[ai_id]
                else:
                    if ai_id not in self.players:
                        px, py = self.find_open_position(sp[0], sp[1], exclude_player_id=ai_id, min_spacing=64.0)
                        self.players[ai_id] = self._build_player_from_archetype(
                            ai_id, arch, px, py, pz=64.0, p_room=self.current_room, p_facing=init_facing, name=arch.get("name", "Companion"), is_ai=True
                        )
                    else:
                        self.players[ai_id]["last_active"] = now
                        self.players[ai_id]["is_ai"] = True
                        if self.players[ai_id].get("room") != self.current_room:
                            self.players[ai_id]["room"] = self.current_room
                            px, py = self.find_open_position(sp[0], sp[1], exclude_player_id=ai_id, min_spacing=64.0)
                            self.players[ai_id]["x"], self.players[ai_id]["y"] = px, py

    def register_player(self, player_id: str, name: str = None, char_class: str = None, sprite: str = None, archetype_index: int = None) -> dict:
        with self.state_lock:
            existing_pos = None
            existing_numeric_id = None
            if player_id in self.players:
                p = self.players[player_id]
                p["last_active"] = time.time()
                p["is_ai"] = False
                if archetype_index is None and not char_class:
                    if name: p["name"] = name
                    self.ensure_ai_party_members()
                    return p
                existing_pos = (p.get("x"), p.get("y"), p.get("z", 64.0), p.get("room", self.current_room), p.get("facing", "east"))
                existing_numeric_id = p.get("numeric_id")
            used_cls = {po.get("class") for pid, po in self.players.items() if pid != player_id and not po.get("is_ai")}
            if not used_cls and player_id not in self.players and self.current_room == self.start_room:
                reset_cfg = getattr(self, "start_room_reset", {})
                for ev in reset_cfg.get("discard_events", []):
                    self.triggered_events.discard(ev)
                for dm in reset_cfg.get("discard_defeated_monsters", []):
                    self.defeated_monsters.discard(dm)
                self.room_monsters = {r: list(info.get("monsters", [])) for r, info in self.rooms_def.items()}
                for d_name, d_info in self.dragons_def.items():
                    sr = d_info.get("start_room")
                    if sr in self.room_monsters and d_name not in self.room_monsters[sr]:
                        self.room_monsters[sr].append(d_name)
                self.monster_states = {}
                sp_start = self.room_bounds.get(self.current_room, {}).get("spawn", [220, 390])
                self.player_x, self.player_y = float(sp_start[0]), float(sp_start[1])
                for ai_k in [k for k, v in self.players.items() if v.get("is_ai")]:
                    del self.players[ai_k]
            if archetype_index is not None and 0 <= int(archetype_index) < len(self.current_archetypes):
                arch = self.current_archetypes[int(archetype_index)]
            elif char_class:
                arch = next((a for a in self.current_archetypes if a.get("class", "").lower() == char_class.lower() or a.get("name", "").lower() == char_class.lower()), self.current_archetypes[0])
            else:
                arch = next((a for a in self.current_archetypes if a.get("class") not in used_cls), self.current_archetypes[0])
            arch_idx = self.current_archetypes.index(arch) if arch in self.current_archetypes else 0
            ai_id = f"ai_hero_{arch_idx}"
            if ai_id in self.players and existing_pos is None:
                ai_p = self.players.pop(ai_id)
                existing_pos = (ai_p.get("x"), ai_p.get("y"), ai_p.get("z", 64.0), ai_p.get("room", self.current_room), ai_p.get("facing", "east"))
            elif ai_id in self.players:
                del self.players[ai_id]
            if existing_pos and existing_pos[0] is not None and existing_pos[1] is not None:
                px, py, pz, p_room, p_facing = existing_pos
            else:
                sp = self.room_bounds.get(self.current_room, {}).get("spawn", [220, 390])
                px, py = self.find_open_position(sp[0], sp[1], exclude_player_id=player_id, min_spacing=64.0)
                pz, p_room, p_facing = 64.0, self.current_room, "east"
            p_data = self._build_player_from_archetype(player_id, arch, px, py, pz=pz, p_room=p_room, p_facing=p_facing, name=name, is_ai=False)
            if sprite:
                p_data["sprite"] = sprite
            if existing_numeric_id is not None:
                p_data["numeric_id"] = existing_numeric_id
            self.players[player_id] = p_data
            if player_id == "player_1":
                self.char_stats = p_data["char_stats"]
            self.player_x, self.player_y = float(px), float(py)
            self.ensure_ai_party_members()
            self.turn_count += 1
            self.scene_dirty = True
            return p_data

    def respawn_player(self, player_id: str) -> dict:
        with self.state_lock:
            p = self.get_player(player_id)
            arch = next((a for a in self.current_archetypes if a.get("class") == p.get("class")), self.current_archetypes[0])
            max_hp = int(arch.get("hp", 36))
            p["hp"] = max_hp
            p["current_hp"] = max_hp
            p["max_hp"] = max_hp
            p["is_downed"] = False
            p["downed_until"] = 0.0
            p["revived_at"] = time.time()
            if "char_stats" in p:
                p["char_stats"]["current_hp"] = max_hp
                p["char_stats"]["max_hp"] = max_hp
            if player_id == "player_1" or not p.get("is_ai"):
                self.char_stats["current_hp"] = max_hp
                self.char_stats["max_hp"] = max_hp
            spawn = self.room_bounds.get(self.current_room, {}).get("spawn", [220, 390])
            p["x"], p["y"] = float(spawn[0]), float(spawn[1])
            if player_id == "player_1":
                self.player_x, self.player_y = float(spawn[0]), float(spawn[1])
            self.scene_dirty = True
            return p

    def _apply_move_and_pickups(self, p: dict, tx: float, ty: float, dx: float, dy: float, step_turn: bool = False):
        """Handle portal transitions and proximity item pickups after movement."""
        t_room, msg, sp = self.check_portal_transition(tx, ty, dx, dy)
        if not t_room:
            t_room, msg, sp = self.check_portal_transition(p["x"], p["y"], dx, dy)
        trans = bool(t_room)
        if trans:
            self.current_room = p["room"] = t_room
            self.visited_rooms.add(t_room)
            if sp:
                p["x"], p["y"] = self.player_x, self.player_y = float(sp[0]), float(sp[1])
            for op_id, op in self.players.items():
                if op_id != p["id"]:
                    op["room"] = t_room
                    if sp:
                        op["x"], op["y"] = self.find_open_position(sp[0], sp[1], exclude_player_id=op_id, min_spacing=64.0)
            if step_turn:
                self.turn_count += 1
            if hasattr(self, "_ensure_room_living_state"):
                self._ensure_room_living_state(t_room)
            self.check_win()
        picked = []
        if getattr(self, "auto_vacuum_enabled", True) and hasattr(self, "vacuum_nearby_drops"):
            picked = self.vacuum_nearby_drops(p["id"])
            if step_turn and picked:
                self.turn_count += len(picked)
        else:
            b = self.room_bounds.get(self.current_room, {})
            W, H = b.get("width", 1024), b.get("height", 768)
            for idx, it_name in enumerate(list(self.room_items.get(self.current_room, []))):
                ix, iy = min(W - GRID_SQ, int(W * 0.48) + idx * GRID_SQ) + GRID_SQ // 2, int(H * 0.62) + GRID_SQ // 2
                if math.hypot(p["x"] - ix, p["y"] - iy) < 60.0:
                    self.room_items[self.current_room].remove(it_name)
                    self.inventory.append(it_name)
                    picked.append(it_name)
                    if step_turn:
                        self.turn_count += 1
                    self.check_win()
        return trans, msg, picked

    def update_player_binary(self, pid_int: int, x: float, y: float, z: float, now: float = None) -> bool:
        now = now or time.time()
        pid_str = f"gp_{pid_int}"
        with self.state_lock:
            p = self.players.get(pid_str)
            if not p:
                for existing_p in self.players.values():
                    if existing_p.get("numeric_id") == pid_int:
                        p = existing_p
                        break
            if not p and (pid_int % 10 in (0, 1)):
                tab_base_id = (pid_int // 10) * 10
                for existing_p in self.players.values():
                    e_num = existing_p.get("numeric_id")
                    if e_num == tab_base_id or (not existing_p.get("is_ai") and not str(existing_p.get("id", "")).startswith("gp_") and not e_num):
                        existing_p["numeric_id"] = pid_int
                        p = existing_p
                        break
            if not p:
                p = self.register_player(pid_str)
                p["numeric_id"] = pid_int
                self.scene_dirty = True

            old_x, old_y, old_z = float(p.get("x", x)), float(p.get("y", y)), float(p.get("z", 64.0))
            new_z = max(15.0, min(180.0, float(z)))
            dx, dy = float(x) - old_x, float(y) - old_y

            if abs(dx) > 0.2 or abs(dy) > 0.2:
                self.last_human_move_time = now
                p["facing"] = ("south" if dy > 0.2 else "north" if dy < -0.2 else "") + ("east" if dx > 0.2 else "west" if dx < -0.2 else "") or p.get("facing", "east")
                tx = float(x)
                ty = float(y)
                if not self.check_collision(tx, ty):
                    p["x"], p["y"] = tx, ty
                elif not self.check_collision(tx, old_y):
                    p["x"] = tx
                elif not self.check_collision(old_x, ty):
                    p["y"] = ty

                self.player_x, self.player_y = p["x"], p["y"]
                trans, msg, picked = self._apply_move_and_pickups(p, tx, ty, dx, dy, step_turn=True)

                ev_msg, battle = self.check_events_proximity(p["x"], p["y"])
                ch_ev = self.check_storyline_advancement()
                now_ts = time.time()
                ai_logs = []
                m_logs = []
                if not trans and (now_ts - getattr(self, "_last_ai_step_time", 0.0) >= 0.35 or battle):
                    self._last_ai_step_time = now_ts
                    m_logs = self.step_monsters_turn(self.current_room)
                    ai_logs = self.step_ai_party_members(leader_player_id=p["id"], allow_combat=battle)
                parts = [m for m in [msg, ev_msg, "\n".join(ch_ev) if ch_ev else None, "\n".join(m_logs) if m_logs else None, "\n".join(ai_logs) if ai_logs else None, f"You acquired: {', '.join(picked)}!" if picked else None] if m]
                if parts or battle or trans:
                    if not hasattr(self, "pending_events"):
                        self.pending_events = []
                    self.pending_events.append({
                        "turn": self.turn_count + 1,
                        "message": "\n".join(parts) if parts else None,
                        "battle_triggered": battle,
                        "transition": trans,
                        "picked_up": picked
                    })
                    self.turn_count += 1

            p["z"] = new_z
            p["last_active"] = now
            if p["x"] != old_x or p["y"] != old_y or p["z"] != old_z:
                self.scene_dirty = True
                return True
            return False

    def get_player(self, player_id: str) -> dict:
        player_id = player_id or "player_1"
        with self.state_lock:
            if player_id in self.players:
                self.players[player_id]["last_active"] = time.time()
                return self.players[player_id]
        return self.register_player(player_id)

    def get_player_char_stats(self, player_id: str = None) -> dict:
        if not player_id: return self.char_stats
        p = self.get_player(player_id)
        if "char_stats" in p:
            return p["char_stats"]
        st = dict(self.char_stats)
        dh = getattr(self, "default_hero", {})
        st.update({"name": p.get("name", dh.get("name", "Adventurer")), "class": p.get("class", dh.get("class", "Adventurer")), "species": p.get("species", dh.get("species", "Humanoid")), "current_hp": p.get("hp", 36), "max_hp": p.get("max_hp", 36), "armor_class": p.get("ac", 18), "player_id": p.get("id", player_id)})
        return st

    def get_players_in_room(self, room_id: str) -> list[dict]:
        with self.state_lock:
            self.ensure_ai_party_members()
            cutoff = time.time() - 300
            return [p for p in self.players.values() if p.get("room") == room_id and (p.get("is_ai") or p.get("last_active", 0) >= cutoff)]

    def check_collision(self, nx: float, ny: float) -> bool:
        b = self.room_bounds.get(self.current_room, {})
        pr = self.player_radius
        W = b.get("width", 1024)
        H = b.get("height", 768)

        is_outdoor = self.get_time_and_weather().get("is_outdoor", True)
        if is_outdoor:
            if nx < -3600.0 or nx > W + 3600.0 or ny < -3600.0 or ny > H + 3600.0:
                return True
        else:
            if nx - pr < 0 or nx + pr > W or ny - pr < 0 or ny + pr > H:
                return True

        for obs in b.get("obstacles", []):
            o_name = (obs.get("name") if isinstance(obs, dict) else "").lower()
            if "wall" in o_name:
                continue
            rect = obs.get("rect") if isinstance(obs, dict) else obs
            if rect and len(rect) == 4:
                ox, oy, ow, oh = rect
                if (nx - max(ox, min(nx, ox + ow)))**2 + (ny - max(oy, min(ny, oy + oh)))**2 < (pr * 0.85)**2: return True
        if hasattr(self, "_is_destructible_wall_blocking") and self._is_destructible_wall_blocking(nx, ny):
            return True
        return False

    def check_creature_collision(self, nx: float, ny: float, room_id: str, radius: float = 24.0) -> bool:
        b = self.room_bounds.get(room_id, {})
        w, h = b.get("width", 1024), b.get("height", 768)
        if nx - radius < 0 or nx + radius > w or ny - radius < 0 or ny + radius > h: return True
        for obs in b.get("obstacles", []):
            rect = obs.get("rect") if isinstance(obs, dict) else obs
            if rect and len(rect) == 4:
                ox, oy, ow, oh = rect
                if (nx - max(ox, min(nx, ox + ow)))**2 + (ny - max(oy, min(ny, oy + oh)))**2 < (radius * 0.85)**2: return True
        return False

    def get_monsters_in_room(self, room_id: str) -> list[dict]:
        with self.state_lock:
            active_names = self.room_monsters.get(room_id, [])
            if not active_names:
                self.monster_states[room_id] = []
                return []
            existing = {m.get("id", m.get("name")): m for m in self.monster_states.get(room_id, [])}
            b = self.room_bounds.get(room_id, {})
            W, H = b.get("width", 1024), b.get("height", 768)
            spawn = b.get("spawn", [220, 390])
            m_list = []
            unit_counter = 0
            for idx, m_name in enumerate(active_names):
                bd = self.bestiary_def.get(m_name) or next((v for k, v in self.bestiary_def.items() if k.lower() in m_name.lower() or m_name.lower() in k.lower()), {})
                full_disp_name = bd.get("name", m_name)
                detail_str = str(bd.get("detail", ""))
                count = 1
                sub_names = [full_disp_name]
                matched_bd = False
                mb_dict = getattr(self, "minion_breakdowns", {})
                for mb_k, mb_v in mb_dict.items():
                    if mb_k.lower() in m_name.lower() or mb_k.lower() in full_disp_name.lower():
                        if isinstance(mb_v, dict):
                            count = int(mb_v.get("count", len(mb_v.get("sub_names", [full_disp_name]))))
                            sub_names = list(mb_v.get("sub_names", [full_disp_name]))
                        elif isinstance(mb_v, list):
                            count = len(mb_v)
                            sub_names = [x.get("name", full_disp_name) for x in mb_v]
                        matched_bd = True
                        break

                if not matched_bd:
                    cm = re.search(r"\((\d+)\s+([^)]+)\)|pack\s+of\s+(\d+)|squad\s+of\s+(\d+)", f"{full_disp_name} {detail_str}", re.IGNORECASE)
                    if cm:
                        c_val = int(cm.group(1) or cm.group(3) or cm.group(4) or 1)
                        if 1 < c_val <= 6:
                            count = c_val
                            base_short = re.sub(r"\s*\([^)]*\)", "", full_disp_name).strip()
                            sub_names = [f"{base_short} #{i+1}" for i in range(count)]

                speed_str = str(bd.get("speed", "30 ft"))
                spd = 30
                sm = re.search(r"(\d+)\s*ft", speed_str)
                if sm:
                    spd = int(sm.group(1))
                step_px = max(24.0, round(spd * 1.15))

                total_hp = max(count, int(bd.get("hp", 15)))
                per_unit_hp = max(4, int(round(total_hp / count)))

                for sub_i in range(count):
                    sub_label = sub_names[sub_i] if sub_i < len(sub_names) else f"{full_disp_name} #{sub_i+1}"
                    m_id = f"{room_id}_{idx}_{sub_i}_{m_name}"
                    if m_id in existing:
                        unit_m = existing[m_id]
                        if unit_m.get("hp", 0) > 0:
                            m_list.append(unit_m)
                        unit_counter += 1
                        continue

                    clean_det = re.sub(r"\bguard:\s*\d+", "", detail_str.lower())
                    sub_lower = f"{m_name.lower()} {sub_label.lower()} {str(bd.get('attacks', '')).lower()} {clean_det} {speed_str.lower()}".replace("-", " ")
                    tact = getattr(self, "tactical_archetypes", {})
                    defaults = (
                        ("skirmisher", ("bow", "scout", "lookout", "skirmisher", "gunner")),
                        ("caster", ("weaver", "savant", "archon", "resonator", "gazer", "mage")),
                        ("pack_hunter", ("hound", "syndicate", "enforcer", "swarm", "guard")),
                        ("ambusher", ("arachnid", "stalker", "panther", "lurker", "infiltrator")),
                        ("brute", ("titan", "goliath", "behemoth", "golem", "brute")),
                    )
                    crit = {a: " ".join(tact.get(f"{a}_keywords", kw)) for a, kw in defaults}
                    arch_res = evaluate_jev_decision(sub_lower, {"a": Choice(criteria=crit)})["a"]
                    archetype = arch_res.choice if arch_res.confidence >= 0.30 else "brute"

                    spread_offsets = [
                        (0, -70), (70, 55), (-65, 65), (95, -55), (-85, -45), (45, 95)
                    ]
                    ox_off, oy_off = spread_offsets[unit_counter % len(spread_offsets)]
                    base_x = int(W * 0.62) + ox_off
                    base_y = int(H * 0.48) + oy_off
                    mx = max(36, min(W - GRID_SQ - 36, base_x))
                    my = max(36, min(H - GRID_SQ - 36, base_y))
                    if self.check_creature_collision(mx + 32, my + 32, room_id) or any(math.hypot(mx - om["x"], my - om["y"]) < 48.0 for om in m_list):
                        placed = False
                        center_x, center_y = int(W * 0.60), int(H * 0.50)
                        for radius in [70, 110, 150, 190, 230, 270]:
                            for ang in range(0, 360, 30):
                                rad = math.radians(ang + unit_counter * 45)
                                cx = max(36, min(W - GRID_SQ - 36, int(center_x + radius * math.cos(rad))))
                                cy = max(36, min(H - GRID_SQ - 36, int(center_y + radius * math.sin(rad))))
                                if not self.check_creature_collision(cx + 32, cy + 32, room_id) and not any(math.hypot(cx - om["x"], cy - om["y"]) < 46.0 for om in m_list):
                                    mx, my, placed = cx, cy, True
                                    break
                            if placed:
                                break
                        if not placed:
                            mx, my = max(36, min(W - GRID_SQ - 36, spawn[0] + 180 + unit_counter * 48)), max(36, min(H - GRID_SQ - 36, spawn[1] + (unit_counter % 2) * 52 - 26))

                    m_data = {
                        "id": m_id,
                        "name": sub_label,
                        "raw_name": m_name,
                        "x": float(mx),
                        "y": float(my),
                        "facing": "west",
                        "hp": per_unit_hp,
                        "max_hp": per_unit_hp,
                        "ac": bd.get("ac", 13),
                        "cr": bd.get("cr", "1"),
                        "speed_ft": spd,
                        "step_px": step_px,
                        "archetype": archetype,
                        "unit_idx": unit_counter,
                        "numeric_id": (zlib.crc32(m_id.encode("utf-8")) & 0x7FFF) | 0x8000,
                        "visual_spec": self.compositor.build_entity_visual_spec(category="monster", name=sub_label),
                        "attacks": bd.get("attacks") or getattr(self, "default_monster_attack", "Strike (+4 to hit, 6 damage)")
                    }
                    m_list.append(m_data)
                    unit_counter += 1
            for m in m_list:
                existing[m["id"]] = m
            self.monster_states[room_id] = list(existing.values())
            return m_list

    def _move_monster_avoiding_obstacles(self, m: dict, move_dx: float, move_dy: float, room_id: str, all_monsters: list):
        ox, oy = float(m["x"]), float(m["y"])
        step_len = math.hypot(move_dx, move_dy)
        if step_len < 0.5:
            return
        base_ang = math.atan2(move_dy, move_dx)
        b = self.room_bounds.get(room_id, {})
        W, H = b.get("width", 1024), b.get("height", 768)
        other_entities = [(float(om["x"]) + 32.0, float(om["y"]) + 32.0) for om in all_monsters if om.get("id") != m.get("id")]
        for p in self.players.values():
            if p.get("room") == room_id:
                other_entities.append((float(p.get("x", 0)), float(p.get("y", 0))))

        for frac in (1.0, 0.65):
            for deg_off in (0, 28, -28, 55, -55, 85, -85, 115, -115):
                ang = base_ang + math.radians(deg_off)
                nx = max(24.0, min(W - GRID_SQ - 24.0, ox + (step_len * frac) * math.cos(ang)))
                ny = max(24.0, min(H - GRID_SQ - 24.0, oy + (step_len * frac) * math.sin(ang)))
                if not self.check_creature_collision(nx + 32, ny + 32, room_id, radius=22.0):
                    if not any(math.hypot((nx + 32.0) - ex, (ny + 32.0) - ey) < 56.0 for ex, ey in other_entities):
                        m["x"], m["y"] = round(nx, 1), round(ny, 1)
                        dx_a, dy_a = nx - ox, ny - oy
                        if math.hypot(dx_a, dy_a) > 1.2:
                            m["facing"] = ("south" if dy_a > 0.5 else "north" if dy_a < -0.5 else "") + ("east" if dx_a > 0.5 else "west" if dx_a < -0.5 else "") or m.get("facing", "west")
                            m["is_moving"] = True
                            m["last_move_time"] = time.time()
                        else:
                            m["is_moving"] = False
                        return
        m["is_moving"] = False

    def step_monsters_turn(self, room_id: str) -> list[str]:
        """Deterministic monster positioning and cadence-based combat (zero random dice rolls)."""
        logs = []
        with self.state_lock:
            monsters = self.get_monsters_in_room(room_id)
            if not monsters:
                return logs
            visible_monsters = [m for m in monsters if self.is_object_discovered("monster", m.get("raw_name", m.get("name", "")))]
            if not visible_monsters:
                return logs
            active_players = self.get_players_in_room(room_id)
            if not active_players:
                active_players = [{"id": "player_1", "name": self.char_stats.get("name", "Adventurer"), "x": self.player_x, "y": self.player_y, "is_ai": False, "hp": self.char_stats.get("current_hp", 36), "max_hp": self.char_stats.get("max_hp", 36), "ac": self.char_stats.get("armor_class", 18)}]
            alive_players = [p for p in active_players if not p.get("is_downed") and p.get("hp", 1) > 0]
            if not alive_players:
                return logs
            human_players = [p for p in alive_players if not p.get("is_ai")] or alive_players

            now = time.time()
            for idx, m in enumerate(visible_monsters):
                if float(m.get("staggered_until", 0.0)) > now:
                    m["is_staggered"] = True
                    m["is_moving"] = False
                    continue
                m["is_staggered"] = False

                u_idx = int(m.get("unit_idx", idx))
                mx, my = float(m["x"] + 32), float(m["y"] + 32)
                if u_idx % 2 == 0 and human_players:
                    target_p = min(human_players, key=lambda p: math.hypot(p.get("x", 500) - mx, p.get("y", 400) - my))
                else:
                    target_p = min(alive_players, key=lambda p: math.hypot(p.get("x", 500) - mx, p.get("y", 400) - my))

                px, py = float(target_p.get("x", 500)), float(target_p.get("y", 400))
                dist = math.hypot(px - mx, py - my)
                step = float(m.get("step_px", 34.0))
                arch = m.get("archetype", "brute")
                phase = now * 1.4 + u_idx * 1.7

                move_dx, move_dy = 0.0, 0.0
                dx_p, dy_p = (px - mx) / max(1.0, dist), (py - my) / max(1.0, dist)
                if arch in ("skirmisher", "caster"):
                    lo, hi = (135.0, 240.0) if arch == "skirmisher" else (165.0, 245.0)
                    sgn = -1.0 if dist < lo else (1.0 if dist > hi else 0.0)
                    stf = (0.45 if dist < lo else -0.35) * (1.0 if u_idx % 2 == 0 else -1.0) if (arch == "skirmisher" and sgn) else 0.0
                    move_dx, move_dy = sgn * dx_p * step + dy_p * step * stf, sgn * dy_p * step - dx_p * step * stf
                elif arch == "pack_hunter":
                    ang = math.atan2(my - py, mx - px) + (0.55 if u_idx % 2 == 0 else -0.55)
                    gx, gy = px + 54.0 * math.cos(ang), py + 54.0 * math.sin(ang)
                    dg = math.hypot(gx - mx, gy - my)
                    if dg > 16.0:
                        move_dx, move_dy = ((gx - mx) / max(1.0, dg)) * min(step * 1.15, dg), ((gy - my) / max(1.0, dg)) * min(step * 1.15, dg)
                elif arch == "ambusher" and dist > 62.0:
                    ang = math.atan2(py - my, px - mx) + 0.42 * math.sin(phase)
                    move_dx, move_dy = math.cos(ang) * min(step * 1.1, dist - 46.0), math.sin(ang) * min(step * 1.1, dist - 46.0)
                elif dist > 58.0:
                    move_dx, move_dy = dx_p * min(step, dist - 48.0), dy_p * min(step, dist - 48.0)

                if abs(move_dx) > 0.5 or abs(move_dy) > 0.5:
                    self._move_monster_avoiding_obstacles(m, move_dx, move_dy, room_id, monsters)
                else:
                    m["is_moving"] = False
                    dx_f, dy_f = px - mx, py - my
                    m["facing"] = ("south" if dy_f > 8 else "north" if dy_f < -8 else "") + ("east" if dx_f > 8 else "west" if dx_f < -8 else "") or m.get("facing", "west")

                now_mx, now_my = float(m["x"] + 32), float(m["y"] + 32)
                now_dist = math.hypot(px - now_mx, py - now_my)
                is_ranged_m = arch in ("skirmisher", "caster")
                atk_reach = 340.0 if is_ranged_m else 92.0

                target_p_hp = target_p.get("current_hp", target_p.get("hp", 36))
                if now_dist <= atk_reach and target_p_hp > 0:
                    # Telegraphed heavy cleave windup window
                    windup_t = float(m.get("windup_until", 0.0))
                    if windup_t > now:
                        continue
                    last_atk_t = float(m.get("_last_attack_time", 0.0))
                    if now - last_atk_t >= 1.8:
                        cadence = int(m.get("_cadence", 0)) + 1
                        m["_cadence"] = cadence
                        was_heavy = bool(windup_t and now >= windup_t)
                        if not was_heavy and not is_ranged_m and cadence % 4 == 2:
                            m["windup_until"] = now + 1.0
                            m["telegraph_radius"] = 95.0
                            m["_last_attack_time"] = now - 0.8
                            if hasattr(self, "_emit_fx"):
                                self._emit_fx("telegraph", monster=m["name"], x=now_mx, y=now_my, radius=95.0, chime="telegraph")
                            logs.append(f"⚠️ [TELEGRAPH]: {m['name']} winds up a shattering slam — Dodge [R] or Parry [Q]!")
                            continue
                        m["windup_until"] = 0.0
                        m["telegraph_radius"] = 0.0
                        m["_last_attack_time"] = now

                        if float(target_p.get("parry_until", 0.0)) > now:
                            target_p["parry_until"] = 0.0
                            m["windup_until"] = 0.0
                            m["telegraph_radius"] = 0.0
                            m["staggered_until"] = now + 4.5
                            m["is_staggered"] = True
                            self.char_stats["momentum"] = min(100, int(self.char_stats.get("momentum", 0)) + 35)
                            if hasattr(self, "_emit_fx"):
                                self._emit_fx("parry", monster=m["name"], target_id=target_p.get("id"), x=now_mx, y=now_my, chime="parry_clang")
                            logs.append(f"🛡️✨ [TIMED PARRY]: {target_p['name']} deflects {m['name']}'s strike and leaves them STAGGERED (1.75x damage window, +35 Momentum)!")
                            continue
                        if max(float(target_p.get("dodge_until", 0.0)), float(target_p.get("invuln_until", 0.0))) > now:
                            if hasattr(self, "_emit_fx"):
                                self._emit_fx("dodge", target_id=target_p.get("id"), x=px, y=py, chime="dodge_roll")
                            logs.append(f"💨 [EVADED]: {target_p['name']} rolls smoothly beneath {m['name']}'s strike!")
                            continue

                        atk_str = str(m.get("attacks") or getattr(self, "default_monster_attack", "Strike (+4 to hit, 6 damage)"))
                        bm = re.search(r"\+(\d+)\s+to\s+hit", atk_str)
                        m_atk_bonus = int(bm.group(1)) if bm else 4
                        p_guard = int(target_p.get("ac", 16))
                        total_m_atk = 13 + m_atk_bonus + (2 if cadence % 2 == 1 else 0)
                        is_m_hit = was_heavy or (total_m_atk >= p_guard) or (cadence % 3 == 1)

                        w_name_m = re.match(r"^([^,(]+)", atk_str)
                        w_label = w_name_m.group(1).strip() if w_name_m else "Strike"

                        is_bow_atk = is_ranged_m or evaluate_jev_decision(w_label, {"r": Choice(criteria={"ranged": "bow bolt beam pulse lance orb cannon", "melee": "blade sword strike claw bite smash"})})["r"].choice == "ranged"
                        if not hasattr(self, "pending_action_visuals"):
                            self.pending_action_visuals = []
                        self.pending_action_visuals.append({
                            "type": "projectile" if is_bow_atk else "swing",
                            "attacker_id": m.get("id"),
                            "target_id": target_p.get("id"),
                            "from_x": float(m["x"] + 32),
                            "from_y": float(m["y"] + 32),
                            "to_x": float(target_p.get("x", 500)),
                            "to_y": float(target_p.get("y", 400)),
                            "is_ranged": is_bow_atk,
                            "weapon": w_label
                        })

                        if is_m_hit:
                            num_m = re.search(r",\s*(\d+)\s+[a-zA-Z]+", atk_str)
                            base_m_dmg = int(num_m.group(1)) if num_m else 5
                            if was_heavy:
                                base_m_dmg = int(round(base_m_dmg * 1.5))
                            guard_absorb = max(1, (p_guard - 12) // 2)
                            m_dmg = max(1, base_m_dmg - guard_absorb)
                            hp_lbl = getattr(self, "terminology", {}).get("hp_label", "HP")
                            new_hp = int(target_p_hp) - m_dmg
                            has_ally = any(not op.get("is_downed") and op.get("id") != target_p.get("id") for op in active_players)
                            if new_hp <= 0 and (has_ally or now - float(target_p.get("revived_at", 0.0)) > 15.0):
                                target_p["hp"] = 0
                                target_p["current_hp"] = 0
                                target_p["is_downed"] = True
                                target_p["downed_until"] = now + 22.0
                                if "char_stats" in target_p:
                                    target_p["char_stats"]["current_hp"] = 0
                                if target_p.get("id") == "player_1" or not target_p.get("is_ai"):
                                    self.char_stats["current_hp"] = 0
                                if hasattr(self, "record_ghost_echo"):
                                    self.record_ghost_echo(target_p, cause=f"Overwhelmed by {m['name']}")
                                if hasattr(self, "promote_or_spawn_rival"):
                                    self.promote_or_spawn_rival(tactic_tag=arch, player_id=target_p.get("id"), base_name=m["name"])
                                if hasattr(self, "_emit_fx"):
                                    self._emit_fx("downed", player_id=target_p.get("id"), name=target_p["name"], x=px, y=py, chime="stagger_thud")
                                logs.append(f"🩹 [DOWNED]: {target_p['name']} drops to one knee! Allies can press [E] or type 'revive'!")
                            else:
                                target_p["hp"] = max(1, new_hp)
                                target_p["current_hp"] = target_p["hp"]
                                if "char_stats" in target_p:
                                    target_p["char_stats"]["current_hp"] = target_p["hp"]
                                if target_p.get("id") == "player_1" or not target_p.get("is_ai"):
                                    self.char_stats["current_hp"] = target_p["hp"]
                                logs.append(f"⚔️ {m['name']} strikes {target_p['name']} with {w_label} (Guard Mitigation -{guard_absorb}) for {m_dmg} damage! ({target_p['hp']}/{target_p.get('max_hp', 36)} {hp_lbl} remaining)")
                        else:
                            logs.append(f"🛡️ {m['name']} strikes at {target_p['name']} with {w_label} -- DEFLECTED by {target_p['name']}'s Guard ({p_guard})!")

            self.scene_dirty = True
            return logs

    def get_npcs_in_room(self, room_id: str) -> list[dict]:
        with self.state_lock:
            npcs_def = getattr(self, "npcs_def", {})
            room_npc_names = list(self.room_npcs.get(room_id, []))
            for nid, ninfo in npcs_def.items():
                if isinstance(ninfo, dict) and ninfo.get("room") == room_id and ninfo.get("name", nid) not in room_npc_names and nid not in room_npc_names:
                    room_npc_names.append(ninfo.get("name", nid))
            nd = getattr(self, "npc_defaults", {})
            def_langs = list(nd.get("languages", [getattr(self, "default_language", "Common")]))
            npcs_list = []
            for idx, raw_name in enumerate(room_npc_names):
                r_low = raw_name.lower()
                matched_id, matched_def = next(
                    ((nid, ninfo) for nid, ninfo in npcs_def.items()
                     if isinstance(ninfo, dict) and (nid.lower() == r_low or ninfo.get("name", "").lower() == r_low or r_low in ninfo.get("name", "").lower() or ninfo.get("name", "").lower() in r_low)),
                    (f"npc_{room_id}_{idx}", None),
                )
                md = matched_def or {}
                n_name = md.get("name", raw_name)
                vis_spec = self.compositor.build_entity_visual_spec(category="npc", name=n_name, char_class=md.get("class", nd.get("class", "Citizen"))) if hasattr(self, "compositor") else None
                npcs_list.append({
                    "id": matched_id, "numeric_id": int((zlib.crc32(matched_id.encode("utf-8")) & 0x7FFF) | 0x8000), "name": n_name,
                    "title": md.get("title", nd.get("title", "Citizen")), "species": md.get("species", nd.get("species", "Humanoid")),
                    "class": md.get("class", nd.get("class", "Citizen")), "room": room_id, "facing": md.get("facing", "south"),
                    "x": float(md.get("x", 300.0 + idx * 80.0)), "y": float(md.get("y", 400.0)),
                    "languages": list(md.get("languages", def_langs)), "greeting": md.get("greeting", nd.get("greeting", "Greetings.")),
                    "topics": copy.deepcopy(md.get("topics", {})), "visual_spec": vis_spec, "token_category": "npc"
                })
            return npcs_list
