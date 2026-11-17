"""Skill-driven Living World & Sandbox Systems (Tiers 1-7) powered by CC-ELM."""
import os, re, time, math, json, copy, zlib
from .constants import SAVES_DIR, GRID_SQ
from .core_models import Choice, evaluate_jev_decision
from .action_catalog import get_action_catalog_payload, match_character_action, perform_character_action as _run_char_action


class SessionLivingWorldMixin:
    """Generic data-driven interpreter for SKILL.md `living_world` rules and CC-ELM routing."""

    def _lw_cfg(self) -> dict:
        return getattr(self, "living_world_cfg", None) or {}

    def _lw_client_cfg(self) -> dict:
        comp = getattr(self, "compositor", None)
        base = dict(getattr(comp, "visual_client_config", None) or {})
        base.update(getattr(self, "client_skill_data", None) or {})
        return base

    def _init_living_world(self):
        lw = self._lw_cfg()
        self.camp_stash = []
        self.auto_vacuum_enabled = True
        self.world_pings = []
        self.combo_fields = []
        self.shared_map_pins = []
        self.placed_structures = {}
        self.saved_blueprints = {}
        self.active_bounties = {}
        self.completed_bounties = set()
        self.bazaar_rugs = {}
        self.player_pets = {}
        self.active_mounts = {}
        self.mount_passengers = {}
        self.room_vehicles = {}
        self.room_nodes = {}
        self.room_chemistry = {}
        self.room_wildlife = {}
        self.room_destructibles = {}
        self.dug_tunnels = {}
        self.room_ghosts = {}
        self.active_rivals = []
        self.active_world_event = None
        self.labyrinth_state = None
        self.encounter_contributors = {}
        self.voice_signals = []
        self.speech_bubbles = []
        self.pending_fx_events = []
        self.crowd_state = {"enabled": True, "density": 48, "seamless": True}
        self._last_ecology_tick = 0.0
        self.discovered_shards = {}
        self.spared_foes = set()
        self.faction_goodwill = 0
        self.verb_counts = {}

        # Seed chalk notes from skill + disk persistence
        self.room_notes = {}
        for sn in (lw.get("pastimes", {}).get("seed_notes") or []):
            r = sn.get("room")
            if r:
                self.room_notes.setdefault(r, []).append(dict(sn))
        notes_fp = os.path.join(SAVES_DIR, "world_notes.json")
        if os.path.isfile(notes_fp):
            try:
                with open(notes_fp, "r", encoding="utf-8") as f:
                    saved_notes = json.load(f)
                if isinstance(saved_notes, dict):
                    for rk, nl in saved_notes.items():
                        if isinstance(nl, list):
                            self.room_notes.setdefault(rk, [])
                            existing_txt = {n.get("text") for n in self.room_notes[rk]}
                            for n in nl:
                                if isinstance(n, dict) and n.get("text") not in existing_txt:
                                    self.room_notes[rk].append(n)
            except Exception:
                pass

        # Seed frontier outpost tiers
        self.outpost_states = {
            k: {**dict(v), "progress": 0, "max_tier": len(v.get("tier_names", [])) - 1 or 3}
            for k, v in (lw.get("frontier_outposts") or {}).items()
            if isinstance(v, dict)
        }

        # Seed destructible blocks from skill
        for rk, blocks in (lw.get("destructibles") or {}).items():
            if isinstance(blocks, list):
                self.room_destructibles[rk] = [dict(b) for b in blocks]

        # Ensure initial room props are populated lazily via _ensure_room_living_state
        self._ensure_room_living_state(self.current_room)

    def _ensure_room_living_state(self, room_id: str):
        if not room_id:
            return
        lw = self._lw_cfg()
        b = self.room_bounds.get(room_id, {})
        W, H = b.get("width", 1024), b.get("height", 768)
        seed = sum(ord(c) for c in room_id)

        if room_id not in self.room_nodes:
            self.room_nodes[room_id] = [
                {"id": f"node_{room_id}_cry", "name": "Luminous Aether Crystal Vein", "yield": "Crystal Shard", "x": round(W * 0.22, 1), "y": round(H * 0.28, 1), "claimed_by": []},
                {"id": f"node_{room_id}_ore", "name": "Star-Iron Ore Outcrop", "yield": "Star-Iron Ingot", "x": round(W * 0.78, 1), "y": round(H * 0.72, 1), "claimed_by": []},
                {"id": f"node_{room_id}_herb", "name": "Solar-Leaf Herb Patch", "yield": "Solaris Herb", "x": round(W * 0.30, 1), "y": round(H * 0.74, 1), "claimed_by": []},
            ]

        if room_id not in self.room_chemistry:
            self.room_chemistry[room_id] = [
                {"id": f"chem_{room_id}_grass", "kind": "tallgrass", "name": "Dry Tallgrass Patch", "x": round(W * 0.56, 1), "y": round(H * 0.30, 1), "state": "dry"},
                {"id": f"chem_{room_id}_puddle", "kind": "rain_puddle", "name": "Rain Puddle", "x": round(W * 0.42, 1), "y": round(H * 0.54, 1), "state": "wet"},
                {"id": f"chem_{room_id}_boulder", "kind": "perched_boulder", "name": "Perched Crag Boulder", "x": round(W * 0.72, 1), "y": round(H * 0.24, 1), "state": "perched"},
                {"id": f"chem_{room_id}_keg", "kind": "oil_barrel", "name": "Volatile Oil Barrel", "x": round(W * 0.62, 1), "y": round(H * 0.48, 1), "state": "intact"},
            ]

        if room_id not in self.room_wildlife:
            self.room_wildlife[room_id] = [
                {"id": f"wl_{room_id}_deer", "kind": "deer", "name": "Silver-Horn Deer", "x": round(W * 0.26, 1), "y": round(H * 0.60, 1), "hp": 14, "max_hp": 14, "state": "graze"},
                {"id": f"wl_{room_id}_wolf", "kind": "wolf", "name": "Wild Crag-Wolf", "x": round(W * 0.78, 1), "y": round(H * 0.26, 1), "hp": 16, "max_hp": 16, "state": "stalk"},
                {"id": f"wl_{room_id}_peddler", "kind": "peddler", "name": "Traveling Peddler", "x": round(W * 0.36, 1), "y": round(H * 0.45, 1), "hp": 22, "max_hp": 22, "state": "travel"},
            ]
            # Add tameable wild battle pet in matching biome
            for pet_k, pet_def in (lw.get("battle_pets") or {}).items():
                if pet_def.get("biome") == room_id or (seed % 4 == 0 and pet_k == "storm_fox"):
                    self.room_wildlife[room_id].append({
                        "id": f"wildpet_{room_id}_{pet_k}", "kind": "wild_pet", "pet_key": pet_k,
                        "name": f"Wild {pet_def.get('name', pet_k)}", "x": round(W * 0.66, 1), "y": round(H * 0.68, 1),
                        "hp": 18, "max_hp": 18, "state": "curious",
                    })
                    break

        nh = lw.get("narrative_harmony") or {}
        shard_def = (nh.get("archaeological_shards") or {}).get(room_id)
        if shard_def and room_id not in getattr(self, "discovered_shards", {}):
            self.discovered_shards[room_id] = dict(shard_def)
            if hasattr(self, "char_stats"):
                self.char_stats["xp"] = self.char_stats.get("xp", 0) + 25

    def _emit_fx(self, fx_type: str, **kwargs):
        seq = int(getattr(self, "_fx_seq", 0)) + 1
        self._fx_seq = seq
        now = time.time()
        self.pending_fx_events = [e for e in self.pending_fx_events if now - e.get("ts", 0) < 2.5]
        evt = {**kwargs}
        if "kind" in evt:
            evt["subkind"] = evt.pop("kind")
        evt.update({"id": seq, "kind": fx_type, "ts": now})
        self.pending_fx_events.append(evt)
        if len(self.pending_fx_events) > 64:
            self.pending_fx_events = self.pending_fx_events[-40:]

    # =========================================================================
    # TIER 1: LOOT THEATER, ZERO-CHORE INVENTORY & CRAFTING
    # =========================================================================
    def classify_loot_rarity(self, item_name: str) -> dict:
        cli = self._lw_client_cfg()
        lr = cli.get("loot_rarities") or {}
        crit = lr.get("criteria") or {}
        styles = lr.get("styles") or {}
        key = evaluate_jev_decision(item_name or "", {"r": Choice(criteria=crit)})["r"].choice if crit else "common"
        st = dict(styles.get(key) or {"label": "Common", "color": 13684944, "beam_height": 44, "intensity": 0.55, "chime": "loot_common"})
        st["rarity"] = key or "common"
        return st

    def vacuum_nearby_drops(self, player_id: str = None, radius: float = None) -> list[str]:
        if not getattr(self, "auto_vacuum_enabled", True):
            return []
        p = self.get_player(player_id) if player_id else None
        px = float(p.get("x", self.player_x)) if p else float(self.player_x)
        py = float(p.get("y", self.player_y)) if p else float(self.player_y)
        b = self.room_bounds.get(self.current_room, {})
        W, H = b.get("width", 1024), b.get("height", 768)
        eff_r = radius or (210.0 if any("magnet" in i.lower() for i in self.inventory) else 120.0)
        picked = []
        items = self.room_items.get(self.current_room, [])
        gifts = getattr(self, "ground_gifts", {}).get(self.current_room, {})
        for idx, it_name in enumerate(list(items)):
            ix = min(W - GRID_SQ, int(W * 0.48) + idx * GRID_SQ) + GRID_SQ // 2
            iy = int(H * 0.62) + GRID_SQ // 2
            if math.hypot(px - ix, py - iy) <= eff_r:
                items.remove(it_name)
                self.inventory.append(it_name)
                picked.append(it_name)
                rarity = self.classify_loot_rarity(it_name)
                self._emit_fx("loot_pickup", item=it_name, rarity=rarity["rarity"], color=rarity["color"], chime=rarity["chime"], x=ix, y=iy, gift_from=gifts.pop(it_name, None))
        if picked:
            self.check_storyline_advancement()
            self.check_win()
            self.scene_dirty = True
        return picked

    def deposit_matching_materials(self) -> str:
        lw = self._lw_cfg()
        mat_tags = [t.lower() for t in (lw.get("material_tags") or ["ore", "ingot", "crystal", "shard", "herb", "timber", "cell"])]
        stash_low = {s.lower() for s in self.camp_stash}
        moved = []
        for it in list(self.inventory):
            il = it.lower()
            if il in stash_low or any(t in il for t in mat_tags):
                if it == getattr(self, "initial_inv", ""):
                    continue
                self.inventory.remove(it)
                self.camp_stash.append(it)
                moved.append(it)
        if not moved:
            return "📥 [CAMP STASH]: No matching crafting materials in pack to deposit."
        self.scene_dirty = True
        return f"📥 [CAMP STASH]: Deposited {len(moved)} matching material(s) into shared Camp Stash ({', '.join(moved)}). Total in stash: {len(self.camp_stash)}."

    def craft_item(self, query: str, player_id: str = None) -> str:
        recipes = self._lw_cfg().get("crafting_recipes") or {}
        if not recipes:
            return "No crafting recipes available."
        q = re.sub(r"^(?:craft|forge|brew|make|synthesize)\s*", "", (query or "").strip(), flags=re.IGNORECASE).strip()
        if not q or q in ("list", "recipes", "help"):
            lines = ["⚒️ [ZERO-CHORE CRAFTING (Uses Pack + Camp Stash)]:"]
            for r_name, r_def in recipes.items():
                ings = ", ".join(f"{v}x {k}" for k, v in (r_def.get("ingredients") or {}).items()) or f"{r_def.get('fallback_gp', 10)} GP"
                lines.append(f"  * {r_name} [{ings}] — {r_def.get('desc', '')}")
            return "\n".join(lines)
        crit = {rk: f"{rk} {rv.get('desc', '')}" for rk, rv in recipes.items()}
        r_name = evaluate_jev_decision(q, {"c": Choice(criteria=crit)})["c"].choice
        r_def = recipes.get(r_name)
        if not r_def:
            return f"Recipe '{q}' not found."
        ings = r_def.get("ingredients") or {}
        combined = [(src, idx, val) for src, lst in (("pack", self.inventory), ("stash", self.camp_stash)) for idx, val in enumerate(lst)]
        to_consume = []
        missing = []
        for req_kw, req_cnt in ings.items():
            hits = [item for item in combined if req_kw.lower() in item[2].lower() and item not in to_consume]
            if len(hits) >= req_cnt:
                to_consume.extend(hits[:req_cnt])
            else:
                missing.append(f"{req_cnt}x {req_kw}")
        w = self.char_stats.setdefault("wealth", {"gp": 25, "sp": 10, "cp": 0})
        used_gp = 0
        if missing:
            cost_gp = int(r_def.get("fallback_gp", 15))
            if w.get("gp", 0) >= cost_gp:
                w["gp"] -= cost_gp
                used_gp = cost_gp
            else:
                return f"⚒️ Need {', '.join(missing)} (or {cost_gp} Sovereign Marks) across Pack + Camp Stash to craft {r_name}."
        else:
            for src, _, val in to_consume:
                lst = self.inventory if src == "pack" else self.camp_stash
                if val in lst:
                    lst.remove(val)
        self.inventory.append(r_name)
        self._emit_fx("loot_burst", item=r_name, rarity=self.classify_loot_rarity(r_name)["rarity"], chime="chest_pop")
        self.scene_dirty = True
        via = f"{used_gp} GP reserve" if used_gp else "Pack + Camp Stash materials"
        return f"⚒️ [CRAFTED]: Forged {r_name} using {via}! Added to your Pack."

    def compare_item(self, query: str, player_id: str = None) -> str:
        cur = self.get_equipped_weapon_info(player_id)
        codex = getattr(self, "weapons_codex", [])
        q = re.sub(r"^(?:compare|diff)\s*", "", (query or "").strip(), flags=re.IGNORECASE).strip()
        cand = None
        if codex:
            crit = {str(i): " ".join(e.get("name_keywords", [])) for i, e in enumerate(codex)}
            ans = evaluate_jev_decision(q or (self.inventory[-1] if self.inventory else cur.get("name", "")), {"w": Choice(criteria=crit)})["w"]
            if ans.choice:
                cand = dict(codex[int(ans.choice)])
                cand["name"] = cand.get("name_keywords", ["Candidate"])[0].title()
        if not cand:
            return f"Equipped: {cur.get('name')} (Dmg {cur.get('base_damage')}, Reach {cur.get('reach_ft')} ft, {cur.get('category')})."
        d_dmg = int(cand.get("base_damage", 10)) - int(cur.get("base_damage", 10))
        d_rch = int(cand.get("reach_ft", 10)) - int(cur.get("reach_ft", 10))
        lore_line = f"\n  • Inscription: \"{cand['lore']}\"" if cand.get("lore") else ""
        return (f"⚖️ [GEAR COMPARE] {cand['name']} vs Equipped {cur.get('name')}:\n"
                f"  • Base Damage: {cand.get('base_damage')} ({d_dmg:+d}) | Reach: {cand.get('reach_ft')} ft ({d_rch:+d} ft)\n"
                f"  • Style: {cand.get('category')} ({cand.get('damage_type')}) | Attribute: {cand.get('ability')}{lore_line}")

    # =========================================================================
    # TIER 2: DROP-IN, WEAPON KITS, WARDROBE/DYES, PINGS, EMOTES, GIFTS
    # =========================================================================
    def export_hero_profile(self, player_id: str = None) -> dict:
        p = self.get_player(player_id)
        cs = self.get_player_char_stats(p["id"])
        return {
            "version": 1,
            "name": p.get("name", cs.get("name", "Adventurer")),
            "class": p.get("class", cs.get("class", "Vanguard")),
            "species": p.get("species", cs.get("species", "Solarborn")),
            "archetype_index": p.get("archetype_index", 0),
            "level": cs.get("level", 1),
            "xp": cs.get("xp", 0),
            "weapon": cs.get("weapon", getattr(self, "initial_inv", "Sun-Forged Longblade")),
            "appearance": p.get("appearance", {}),
            "inventory": list(self.inventory[:16]),
            "pet": self.player_pets.get(p["id"]),
            "mount": self.active_mounts.get(p["id"]),
        }

    def import_hero_profile(self, profile: dict, player_id: str = None) -> dict:
        if not isinstance(profile, dict):
            return self.get_player(player_id)
        pid = player_id or "player_1"
        arch_idx = profile.get("archetype_index")
        p = self.register_player(pid, name=profile.get("name"), char_class=profile.get("class"), archetype_index=arch_idx)
        cs = p.setdefault("char_stats", self.get_player_char_stats(pid))
        if profile.get("level"):
            cs["level"] = max(1, int(profile["level"]))
        if profile.get("xp") is not None:
            cs["xp"] = int(profile["xp"])
        if profile.get("weapon"):
            cs["weapon"] = profile["weapon"]
            if profile["weapon"] not in self.inventory:
                self.inventory.append(profile["weapon"])
        if isinstance(profile.get("appearance"), dict):
            p["appearance"] = dict(profile["appearance"])
        for it in (profile.get("inventory") or []):
            if isinstance(it, str) and it not in self.inventory:
                self.inventory.append(it)
        if isinstance(profile.get("pet"), dict):
            self.player_pets[pid] = dict(profile["pet"])
        self.scene_dirty = True
        return p

    def join_at_leader(self, player_id: str, room_id: str = None, x: float = None, y: float = None) -> dict:
        with self.state_lock:
            p = self.get_player(player_id)
            target_room = room_id if (room_id and room_id in self.rooms_def) else self.current_room
            self.current_room = target_room
            p["room"] = target_room
            self.visited_rooms.add(target_room)
            sp = self.room_bounds.get(target_room, {}).get("spawn", [220, 390])
            tx = float(x) if x is not None else float(sp[0])
            ty = float(y) if y is not None else float(sp[1])
            ox, oy = self.find_open_position(tx, ty, exclude_player_id=p["id"], min_spacing=54.0)
            p["x"], p["y"] = ox, oy
            self.ensure_ai_party_members()
            self.scene_dirty = True
            return p

    def get_weapon_kit(self, weapon_name: str = None, player_id: str = None) -> dict:
        kits = self._lw_cfg().get("weapon_skill_kits") or {}
        if not kits:
            return {}
        wname = weapon_name or self.get_equipped_weapon_info(player_id).get("name", "sword")
        crit = {k: f"{k} {v.get('family', '')}" for k, v in kits.items()}
        k = evaluate_jev_decision(wname.lower(), {"wk": Choice(criteria=crit)})["wk"].choice or "sword"
        return {"key": k, **kits.get(k, {})}

    def equip_weapon(self, query: str, player_id: str = None) -> str:
        q = re.sub(r"^(?:equip|swap|wield|switch\s+to)\s*", "", (query or "").strip(), flags=re.IGNORECASE).strip()
        p = self.get_player(player_id)
        cs = self.get_player_char_stats(p["id"])
        pool = list(self.inventory) + [f"{' '.join(w.get('name_keywords', ['Blade'])[:1]).title()}" for w in getattr(self, "weapons_codex", [])]
        if not q:
            kit = self.get_weapon_kit(cs.get("weapon"), p["id"])
            return f"⚔️ Currently wielding {cs.get('weapon', 'Sun-Forged Longblade')} ({kit.get('family', 'Vanguard')})."
        crit = {it: it for it in pool}
        ans = evaluate_jev_decision(q, {"w": Choice(criteria=crit)})["w"]
        chosen = ans.choice or q
        if chosen not in self.inventory:
            self.inventory.append(chosen)
        cs["weapon"] = chosen
        p["weapon"] = chosen
        p["active_weapon"] = chosen
        kit = self.get_weapon_kit(chosen, p["id"])
        p["appearance"] = {**(p.get("appearance") or {}), "weapon_override": kit.get("key")}
        skills_str = ", ".join(f"[{k.upper()}] {v.get('name')}" for k, v in (kit.get("skills") or {}).items())
        self.scene_dirty = True
        return f"🔄 [WEAPON IDENTITY]: Wielding {chosen} ({kit.get('family', 'Custom')})! Active Skills: {skills_str}"

    def reinvent_build(self, query: str, player_id: str = None) -> str:
        q = re.sub(r"^(?:reinvent|respec|switch\s+role|change\s+class)\s*", "", (query or "").strip(), flags=re.IGNORECASE).strip()
        arches = self.current_archetypes
        crit = {str(i): f"{a.get('name', '')} {a.get('class', '')} {a.get('weapon', '')}" for i, a in enumerate(arches)}
        ans = evaluate_jev_decision(q or "wizard", {"a": Choice(criteria=crit)})["a"]
        idx = int(ans.choice or 0)
        p = self.register_player(player_id or "player_1", archetype_index=idx)
        kit = self.get_weapon_kit(p.get("char_stats", {}).get("weapon"), p["id"])
        self.scene_dirty = True
        return f"✨ [ANYTIME REINVENTION]: Reinvented as {p['name']} ({p['class']}) with {p.get('char_stats', {}).get('weapon')} — zero build regret!"

    def set_wardrobe(self, player_id: str = None, silhouette: str = None, headgear: str = None, dye_palette: str = None, custom_dyes: dict = None, cloak: bool = None) -> str:
        p = self.get_player(player_id)
        cli = self._lw_client_cfg()
        app = dict(p.get("appearance") or {})
        palettes = cli.get("dye_palettes") or {}
        sils = cli.get("wardrobe_silhouettes") or {}
        if silhouette:
            s_key = evaluate_jev_decision(silhouette, {"s": Choice(criteria={k: f"{k} {v.get('label', '')}" for k, v in sils.items()})})["s"].choice
            if s_key in sils:
                app["silhouette"] = sils[s_key].get("key", s_key)
                app["silhouette_label"] = sils[s_key].get("label", s_key)
                if not headgear:
                    app["headgear"] = sils[s_key].get("headgear", "helm")
        if headgear:
            app["headgear"] = headgear.lower().strip()
        if dye_palette:
            d_key = evaluate_jev_decision(dye_palette, {"d": Choice(criteria={k: f"{k} {v.get('name', '')}" for k, v in palettes.items()})})["d"].choice
            if d_key in palettes:
                pal = palettes[d_key]
                app["dye_name"] = pal.get("name", d_key)
                app["primary_color"] = pal["primary"]
                app["trim_color"] = pal["trim"]
                app["accent_color"] = pal["accent"]
        if isinstance(custom_dyes, dict):
            for ck in ("primary_color", "trim_color", "accent_color"):
                if custom_dyes.get(ck):
                    app[ck] = str(custom_dyes[ck])
        if cloak is not None:
            app["cloak"] = bool(cloak)
        p["appearance"] = app
        self.scene_dirty = True
        return f"🎨 [WARDROBE & DYE]: Silhouette={app.get('silhouette_label', 'Default')}, Dye={app.get('dye_name', 'Custom')} ({app.get('primary_color', '#1f6feb')}/{app.get('trim_color', '#f3ba2f')})."

    def create_ping(self, kind: str = "look", x: float = None, y: float = None, label: str = None, player_id: str = None) -> dict:
        p = self.get_player(player_id)
        cli = self._lw_client_cfg()
        pings_cfg = cli.get("world_pings") or {}
        pk = evaluate_jev_decision(kind or "look", {"p": Choice(criteria={k: f"{k} {v.get('label', '')}" for k, v in pings_cfg.items()})})["p"].choice or "look"
        pc = pings_cfg.get(pk) or {"label": "Look Here!", "icon": "👁️", "color": 5809919, "chime": "ping_look"}
        px = float(x if x is not None else p.get("x", self.player_x))
        py = float(y if y is not None else p.get("y", self.player_y))
        now = time.time()
        self.world_pings = [wp for wp in self.world_pings if wp.get("expires_at", 0) > now]
        ping = {
            "id": f"ping_{int(now * 1000)}_{len(self.world_pings)}",
            "kind": pk, "icon": pc.get("icon", "👁️"), "label": label or pc.get("label", "Look Here!"),
            "color": pc.get("color", 5809919), "chime": pc.get("chime", "ping_look"),
            "room": self.current_room, "x": px, "y": py, "by": p.get("name", "Vanguard"), "expires_at": now + 18.0,
        }
        self.world_pings.append(ping)
        self._emit_fx("ping", **ping)
        self.scene_dirty = True
        return ping

    def perform_emote(self, query: str, player_id: str = None) -> str:
        p = self.get_player(player_id)
        cli = self._lw_client_cfg()
        emotes_cfg = cli.get("emotes") or {}
        crit = {k: f"{k} {v.get('label', '')} {v.get('posture', '')}" for k, v in emotes_cfg.items()}
        ek = evaluate_jev_decision(query or "wave", {"e": Choice(criteria=crit)})["e"].choice or "wave"
        ed = emotes_cfg.get(ek) or {"label": ek.title(), "icon": "👋", "posture": ek}
        p["emote"] = {"key": ek, "posture": ed.get("posture", ek), "label": ed.get("label"), "ts": time.time()}
        if ed.get("posture") == "sit":
            p["is_sitting"] = True
        else:
            p["is_sitting"] = False
        self._emit_fx("emote", player_id=p["id"], emote=ek, posture=ed.get("posture"), chime=ed.get("chime"), x=p["x"], y=p["y"])
        extra = ""
        if ed.get("paired") or ek == "highfive":
            near_allies = [op for op in self.get_players_in_room(self.current_room) if op["id"] != p["id"] and math.hypot(op["x"] - p["x"], op["y"] - p["y"]) <= 200.0]
            if near_allies:
                partner = min(near_allies, key=lambda op: math.hypot(op["x"] - p["x"], op["y"] - p["y"]))
                partner["x"] = round(p["x"] + 38.0, 1)
                partner["y"] = round(p["y"], 1)
                partner["emote"] = {"key": "highfive", "posture": "highfive", "label": "High-Five!", "ts": time.time()}
                self._emit_fx("highfive_pair", a=p["id"], b=partner["id"], x=(p["x"] + partner["x"]) * 0.5, y=p["y"], chime="highfive")
                extra = f" 🙌 {partner['name']} rushes in and lands a thunderous High-Five!"
        elif ek in ("lute", "drum", "flute"):
            band = [op["name"] for op in self.get_players_in_room(self.current_room) if op["id"] != p["id"] and op.get("is_ai")]
            if band:
                extra = f" 🎶 {', '.join(band[:2])} clap along in harmony around the campfire!"
        self.scene_dirty = True
        return f"{ed.get('icon', '✨')} [{p['name']}]: {ed.get('label', ek)}!{extra}"

    def gift_item(self, query: str, player_id: str = None) -> str:
        p = self.get_player(player_id)
        q = re.sub(r"^(?:gift|share|toss|give)\s*", "", (query or "").strip(), flags=re.IGNORECASE).strip()
        q = re.sub(r"\s+to\s+.*$", "", q, flags=re.IGNORECASE).strip()
        if not self.inventory:
            return "Your pack is empty — nothing to gift!"
        m = next((it for it in self.inventory if q and q.lower() in it.lower()), None)
        if not m:
            m = evaluate_jev_decision(q or self.inventory[-1], {"i": Choice(options=self.inventory)})["i"].choice or self.inventory[-1]
        self.inventory.remove(m)
        self.room_items.setdefault(self.current_room, []).append(m)
        if not hasattr(self, "ground_gifts"):
            self.ground_gifts = {}
        self.ground_gifts.setdefault(self.current_room, {})[m] = p.get("name", "Ally")
        rarity = self.classify_loot_rarity(m)
        self._emit_fx("gift_drop", item=m, from_name=p.get("name"), rarity=rarity["rarity"], color=16766720, x=p["x"], y=p["y"])
        self.scene_dirty = True
        return f"🎁 [GIFT SHARE]: {p['name']} gently tosses {m} onto the grass for a squadmate! (Walk over or 'take {m}' to claim)"

    # =========================================================================
    # TIER 3: SHARED NODES, JUMP-IN CREDIT, REVIVES, SIDEKICK, MAP, NOTES, VOICE
    # =========================================================================
    def harvest_node(self, player_id: str = None, node_id: str = None) -> str:
        p = self.get_player(player_id)
        pid = p["id"]
        self._ensure_room_living_state(self.current_room)
        nodes = self.room_nodes.get(self.current_room, [])
        avail = [n for n in nodes if pid not in n.get("claimed_by", [])]
        if not avail:
            return "💎 You have already gathered your personal yield from all nodes in this sector (others still have theirs!)."
        target = next((n for n in avail if node_id and n["id"] == node_id), None) or min(avail, key=lambda n: math.hypot(n["x"] - p["x"], n["y"] - p["y"]))
        target.setdefault("claimed_by", []).append(pid)
        item = target["yield"]
        self.inventory.append(item)
        self._emit_fx("loot_burst", item=item, rarity="rare", x=target["x"], y=target["y"], chime="loot_rare")
        self.scene_dirty = True
        return f"💎 [PERSONAL NODE HARVEST]: Extracted {item} from {target['name']}! (Instanced per-player — allies still get full ore!)"

    def record_encounter_contributor(self, room_id: str, player_id: str = None):
        if not player_id:
            return
        self.encounter_contributors.setdefault(room_id, set()).add(player_id)

    def revive_player(self, target_id: str = None, reviver_id: str = None) -> str:
        reviver = self.get_player(reviver_id)
        downed = [op for op in self.get_players_in_room(self.current_room) if op.get("is_downed") or op.get("hp", 1) <= 0]
        target = next((op for op in downed if target_id and op["id"] == target_id), None) or (downed[0] if downed else None)
        if not target:
            return "💚 No downed allies nearby need revival."
        heal_hp = max(10, int(round(target.get("max_hp", 36) * 0.45)))
        target["is_downed"] = False
        target["downed_until"] = 0.0
        target["hp"] = heal_hp
        target["current_hp"] = heal_hp
        if "char_stats" in target:
            target["char_stats"]["current_hp"] = heal_hp
        if target["id"] == "player_1" or not target.get("is_ai"):
            self.char_stats["current_hp"] = heal_hp
        self.record_encounter_contributor(self.current_room, reviver["id"])
        self._emit_fx("revive", target_id=target["id"], reviver_id=reviver["id"], x=target["x"], y=target["y"], chime="heal")
        self.scene_dirty = True
        return f"❤️‍🔥 [CLUTCH REVIVE]: {reviver['name']} pulls {target['name']} back into the fight with {heal_hp} Vitality!"

    def compute_sidekick_scale(self, player_obj: dict = None, room_id: str = None) -> float:
        rules = self._lw_cfg().get("scaling_rules") or {}
        cs = (player_obj or {}).get("char_stats") or self.char_stats
        p_lvl = int(cs.get("level", 1))
        r = room_id or self.current_room
        mons = self.get_monsters_in_room(r)
        sec_tier = max([int(re.sub(r"[^0-9]", "", str(m.get("cr", "1"))) or 1) for m in mons] + [1])
        if p_lvl <= sec_tier + 2:
            return 1.0
        scale = max(float(rules.get("min_scale", 0.55)), min(float(rules.get("max_scale", 1.35)), (sec_tier + 1.5) / max(1.0, float(p_lvl))))
        return round(scale, 2)

    def add_map_pin(self, label: str, x: float = None, y: float = None, player_id: str = None) -> str:
        p = self.get_player(player_id)
        pin = {"id": f"pin_{len(self.shared_map_pins) + 1}", "room": self.current_room, "label": label or "Expedition Pin", "x": float(x or p["x"]), "y": float(y or p["y"]), "by": p["name"]}
        self.shared_map_pins.append(pin)
        self.scene_dirty = True
        return f"📌 [CARTOGRAPHY PIN]: Pinned '{pin['label']}' in {self.rooms_def.get(self.current_room, {}).get('name', self.current_room)}."

    def interact_map_table(self, player_id: str = None) -> str:
        p = self.get_player(player_id)
        all_rooms = list(self.rooms_def.keys())
        newly_charted = [r for r in all_rooms if r not in self.visited_rooms][:4]
        self.visited_rooms.update(newly_charted)
        if not any(pin.get("room") == self.current_room for pin in self.shared_map_pins):
            self.shared_map_pins.append({"id": f"pin_tbl_{len(self.shared_map_pins)+1}", "room": self.current_room, "label": "Expedition Camp", "x": p["x"], "y": p["y"], "by": p["name"]})
        self.scene_dirty = True
        return f"🗺️ [SHARED MAP TABLE]: {p['name']} syncs cartography notes with the squad! Revealed {len(newly_charted)} sectors ({len(self.visited_rooms)}/{len(all_rooms)} charted, {len(self.shared_map_pins)} map pins)."

    def compute_camp_comfort(self, room_id: str = None) -> tuple[int, dict]:
        r = room_id or self.current_room
        rc = self._lw_cfg().get("rested_comfort") or {}
        comfort_items = set(rc.get("comfort_items") or [])
        structs = self.placed_structures.get(r, [])
        decor_score = sum(1 for s in structs if s.get("kind") in comfort_items)
        # Conservatory & Plaza naturally have hearth comfort
        has_hearth = ("conservatory" in r or "plaza" in r or any("brazier" in str(o.get("name", "")).lower() for o in self.room_bounds.get(r, {}).get("obstacles", [])))
        tier = min(3, max(1 if (has_hearth or decor_score > 0) else 0, 1 + decor_score // 2 if decor_score > 0 else (1 if has_hearth else 0)))
        bonus = (rc.get("tier_bonuses") or {}).get(tier) or (rc.get("tier_bonuses") or {}).get(str(tier)) or {"label": "Warmth", "xp_bonus": 1.15, "momentum_bonus": 10, "regen": 2}
        return tier, dict(bonus)

    def apply_rested_warmth(self, player_id: str = None) -> str:
        tier, bonus = self.compute_camp_comfort(self.current_room)
        if tier <= 0:
            return ""
        dur = int((self._lw_cfg().get("rested_comfort") or {}).get("base_duration_turns", 25))
        buff = {"tier": tier, "label": bonus.get("label", "Rested"), "xp_bonus": bonus.get("xp_bonus", 1.15), "momentum_bonus": bonus.get("momentum_bonus", 10), "turns_left": dur}
        for po in self.players.values():
            po["rested_buff"] = dict(buff)
            po["rested_turns"] = dur
        self.char_stats["rested_buff"] = dict(buff)
        reflection = self.get_campfire_breakfast_scene(player_id)
        extra_ref = f"\n☕ [QUIET INTERLUDE]: {reflection}" if reflection else ""
        return f"🔥 [CAMPFIRE WARMTH TIER {tier} — {buff['label']}]: +{int((buff['xp_bonus']-1)*100)}% XP, +{buff['momentum_bonus']} Momentum boost for {dur} turns!{extra_ref}"

    def leave_note(self, text: str, player_id: str = None) -> str:
        p = self.get_player(player_id)
        msg = re.sub(r"^(?:leave\s+note|note|chalk)\s*", "", (text or "").strip(), flags=re.IGNORECASE).strip()
        if not msg:
            notes = self.room_notes.get(self.current_room, [])
            if not notes:
                return "📝 No chalk notes found in this sector yet. Write one with 'note <message>'!"
            return "📝 [CHALK NOTES]:\n" + "\n".join(f"  * \"{n['text']}\" — {n.get('author', 'Wayfarer')}" for n in notes)
        note = {"room": self.current_room, "author": p["name"], "text": msg[:140], "x": p["x"], "y": p["y"], "endorsements": 1}
        self.room_notes.setdefault(self.current_room, []).append(note)
        notes_fp = os.path.join(SAVES_DIR, "world_notes.json")
        try:
            with open(notes_fp, "w", encoding="utf-8") as f:
                json.dump(self.room_notes, f, ensure_ascii=False)
        except Exception:
            pass
        self.scene_dirty = True
        return f"🖍️ [CHALK NOTE SCRIBED]: \"{note['text']}\" left on the flagstones for future travelers!"

    def record_ghost_echo(self, player_obj: dict, cause: str = "Overwhelmed in battle"):
        r = player_obj.get("room", self.current_room)
        self.room_ghosts.setdefault(r, []).append({
            "id": f"ghost_{int(time.time()*1000)}", "name": player_obj.get("name", "Fallen Vanguard"),
            "x": float(player_obj.get("x", 400)), "y": float(player_obj.get("y", 380)),
            "cause": cause, "ts": time.time(),
        })
        self.room_ghosts[r] = self.room_ghosts[r][-6:]

    def play_fishing(self, player_id: str = None) -> str:
        p = self.get_player(player_id)
        catches = self._lw_cfg().get("pastimes", {}).get("fishing_catches") or [{"name": "Moonfin Trout", "rarity": "common", "keywords": "clear"}]
        tw = self.get_time_and_weather()
        q = f"{self.current_room} {tw.get('period')} {tw.get('weather')}"
        crit = {c["name"]: c.get("keywords", c["name"]) for c in catches}
        caught = evaluate_jev_decision(q, {"f": Choice(criteria=crit)})["f"].choice or catches[0]["name"]
        self.inventory.append(caught)
        self._emit_fx("fish_catch", item=caught, x=p["x"], y=p["y"], chime="fish_catch")
        self.scene_dirty = True
        return f"🎣 [COZY FISHING]: You cast your line into the shimmering ripples... and reel in a **{caught}**!"

    def play_dice(self, query: str = "", player_id: str = None) -> str:
        p = self.get_player(player_id)
        m = re.search(r"(\d+)", query or "")
        bet = max(5, min(50, int(m.group(1)))) if m else 10
        seed = (self.turn_count * 31 + sum(ord(c) for c in p["name"]))
        r1, r2 = (seed % 6) + 1, ((seed // 5) % 6) + 1
        opp1, opp2 = ((seed + 2) % 6) + 1, ((seed + 4) % 6) + 1
        p_tot, o_tot = r1 + r2, opp1 + opp2
        w = self.char_stats.setdefault("wealth", {"gp": 25, "sp": 10, "cp": 0})
        if p_tot >= o_tot:
            w["gp"] += bet
            res = f"YOU WIN +{bet} Sovereign Marks!"
        else:
            w["gp"] = max(0, w["gp"] - bet)
            res = f"House takes {bet} Marks — rematch anytime!"
        self._emit_fx("dice_roll", chime="dice_roll", x=p["x"], y=p["y"])
        return f"🎲 [TAVERN DICE]: {p['name']} rolls [{r1} + {r2} = {p_tot}] vs Tavern Patron [{opp1} + {opp2} = {o_tot}] — {res}"

    def solve_riddle(self, query: str = "", player_id: str = None) -> str:
        riddles = self._lw_cfg().get("pastimes", {}).get("riddles") or []
        if not riddles:
            return "📜 No treasure riddles found."
        unsolved = [r for r in riddles if f"riddle:{r['id']}" not in self.story_flags]
        if not unsolved:
            return "📜 You have decoded every treasure riddle in the Continuum!"
        cur = unsolved[0]
        guess = re.sub(r"^(?:riddle|decode|answer)\s*", "", (query or "").strip(), flags=re.IGNORECASE).strip()
        if not guess:
            return f"📜 [TREASURE RIDDLE]: \"{cur['prompt']}\" (Reply with 'decode <your answer>')"
        ans = evaluate_jev_decision(guess, {"r": Choice(criteria={"match": cur["answer_keywords"], "miss": "nothing wrong blank"})})["r"]
        if ans.choice == "match" and ans.confidence >= 0.55:
            self.story_flags.add(f"riddle:{cur['id']}")
            self.inventory.append(cur["reward_item"])
            w = self.char_stats.setdefault("wealth", {"gp": 25, "sp": 10, "cp": 0})
            w["gp"] += int(cur.get("reward_gp", 30))
            self._emit_fx("loot_burst", item=cur["reward_item"], rarity="rare", chime="loot_epic")
            return f"🧭 [RIDDLE DECODED!]: Hidden cache unlocked — claimed {cur['reward_item']} + {cur.get('reward_gp', 30)} Sovereign Marks!"
        return f"📜 Not quite! Clue: \"{cur['prompt']}\""

    def speak_proximity(self, text: str, player_id: str = None) -> str:
        p = self.get_player(player_id)
        msg = re.sub(r"^(?:say|shout|whisper)\s*", "", (text or "").strip(), flags=re.IGNORECASE).strip()
        if not msg:
            return ""
        now = time.time()
        self.speech_bubbles = [b for b in self.speech_bubbles if b.get("expires_at", 0) > now]
        self.speech_bubbles.append({"player_id": p["id"], "name": p["name"], "room": self.current_room, "x": p["x"], "y": p["y"], "text": msg[:120], "expires_at": now + 6.5})
        self.scene_dirty = True
        return f"🎙️ [{p['name']} (Proximity)]: \"{msg}\""

    # =========================================================================
    # TIER 4: ACTION COMBAT, COMBO FIELDS, GEAR PERKS, MOUNTS, BOUNTIES, BAZAAR
    # =========================================================================
    def dodge_roll(self, player_id: str = None) -> str:
        p = self.get_player(player_id)
        now = time.time()
        p["invuln_until"] = now + 1.25
        p["dodge_until"] = now + 1.25
        # Directional evasive roll step along facing (avoiding obstacles)
        f_map = {"east": (1, 0), "southeast": (0.71, 0.71), "south": (0, 1), "southwest": (-0.71, 0.71),
                 "west": (-1, 0), "northwest": (-0.71, -0.71), "north": (0, -1), "northeast": (0.71, -0.71)}
        dx, dy = f_map.get(str(p.get("facing", "east")).lower(), (1, 0))
        ox, oy = float(p.get("x", self.player_x)), float(p.get("y", self.player_y))
        for frac in (1.0, 0.7, 0.45):
            nx, ny = ox + dx * 88.0 * frac, oy + dy * 88.0 * frac
            if not self.check_collision(nx, ny):
                p["x"], p["y"] = round(nx, 1), round(ny, 1)
                if p.get("id") == "player_1" or not p.get("is_ai"):
                    self.player_x, self.player_y = p["x"], p["y"]
                break
        # Check Shadowstep Greaves perk
        has_shadow = any("shadowstep" in i.lower() for i in self.inventory)
        extra = ""
        if has_shadow:
            dmg = 14
            hits = 0
            for m in self.get_monsters_in_room(self.current_room):
                if m.get("hp", 0) > 0 and math.hypot((m["x"] + 32) - p["x"], (m["y"] + 32) - p["y"]) <= 185.0:
                    m["hp"] = max(0, m["hp"] - dmg)
                    if m["hp"] <= 0:
                        self.defeated_monsters.add(m.get("id", m["name"]))
                        self.defeated_monsters.add(m.get("raw_name", m["name"]))
                    self._emit_fx("hit_impact", is_crit=False, x=m["x"] + 32, y=m["y"] + 32, dmg=dmg, chime="combo_fire")
                    hits += 1
            self._emit_fx("shadow_decoy", x=ox, y=oy, chime="combo_fire")
            extra = f" 💥 Shadowstep Greaves leave an exploding shadow decoy ({hits} foe(s) blasted for {dmg} Void damage)!"
            if hits and not [m for m in self.get_monsters_in_room(self.current_room) if m.get("hp", 0) > 0]:
                self.finish_room_combat(self.current_room)
        self._emit_fx("dodge_roll", player_id=p["id"], x=p["x"], y=p["y"], chime="dodge_roll")
        self.scene_dirty = True
        return f"💨 [EVASIVE ROLL]: {p['name']} vaults cleanly across the grid (Invulnerable)!{extra}"

    def timed_parry(self, player_id: str = None) -> str:
        p = self.get_player(player_id)
        now = time.time()
        mons = [m for m in self.get_monsters_in_room(self.current_room) if m.get("hp", 0) > 0]
        telegraphed = [m for m in mons if float(m.get("windup_until", 0.0)) > now]
        target = telegraphed[0] if telegraphed else (min(mons, key=lambda m: math.hypot((m["x"] + 32) - p["x"], (m["y"] + 32) - p["y"])) if mons else None)
        p["parry_until"] = now + 1.5
        if target and (float(target.get("windup_until", 0.0)) > now or math.hypot((target["x"] + 32) - p["x"], (target["y"] + 32) - p["y"]) <= 165.0):
            target["windup_until"] = 0.0
            target["telegraph_radius"] = 0.0
            target["staggered"] = True
            target["is_staggered"] = True
            target["staggered_until"] = now + 4.5
            cs = self.get_player_char_stats(p["id"])
            cs["momentum"] = min(100, int(cs.get("momentum", 0)) + 40)
            self.char_stats["momentum"] = cs["momentum"]
            self._emit_fx("parry", monster=target["name"], target_id=p["id"], x=(p["x"] + target["x"] + 32) * 0.5, y=(p["y"] + target["y"] + 32) * 0.5, chime="parry_clang")
            self.scene_dirty = True
            return f"🛡️⚡ [TIMED PARRY CLASH!]: {p['name']} deflects {target['name']}'s strike, STAGGERING them (1.75x next strike damage, +40 Momentum)!"
        self._emit_fx("parry_ready", x=p["x"], y=p["y"], chime="parry_clang")
        return f"🛡️ [PARRY STANCE]: {p['name']} raises blade in counter-parry readiness!"

    def spawn_combo_field(self, field_kind: str, x: float, y: float, owner_id: str = None) -> dict:
        now = time.time()
        self.combo_fields = [cf for cf in self.combo_fields if cf.get("expires_at", 0) > now]
        colors = {"oil_slick": 4860957, "frost_mist": 5809919, "storm_aura": 16771665, "solar_flame": 16744234, "void_snare": 11141375}
        cf = {
            "id": f"cf_{int(now*1000)}_{len(self.combo_fields)}", "kind": field_kind, "room": self.current_room,
            "x": float(x), "y": float(y), "radius": 145.0, "color": colors.get(field_kind, 5809919),
            "owner_id": owner_id, "expires_at": now + 22.0,
        }
        self.combo_fields.append(cf)
        self._emit_fx("combo_field", **cf)
        self.scene_dirty = True
        return cf

    def check_and_trigger_combos(self, element_tag: str, x: float, y: float, attacker_id: str = None) -> list[str]:
        matrix = self._lw_cfg().get("combo_matrix") or {}
        now = time.time()
        self.combo_fields = [cf for cf in self.combo_fields if cf.get("expires_at", 0) > now]
        notes = []
        for cf in list(self.combo_fields):
            if cf.get("room") != self.current_room or math.hypot(cf["x"] - x, cf["y"] - y) > cf.get("radius", 145.0) + 45.0:
                continue
            for c_key, c_def in matrix.items():
                f_ans = evaluate_jev_decision(cf["kind"].replace("_", " "), {"f": Choice(criteria={"match": c_def["need_field"], "other": "unrelated"})})["f"]
                e_ans = evaluate_jev_decision(element_tag or "kinetic", {"e": Choice(criteria={"match": c_def["trigger_element"], "other": "unrelated"})})["e"]
                if f_ans.choice == "match" and f_ans.confidence >= 0.55 and e_ans.choice == "match" and e_ans.confidence >= 0.50:
                    if cf in self.combo_fields:
                        self.combo_fields.remove(cf)
                    dmg = int(c_def.get("damage", 22))
                    rad = float(c_def.get("radius", 160.0))
                    hit_cnt = 0
                    for m in self.get_monsters_in_room(self.current_room):
                        if m.get("hp", 0) > 0 and math.hypot((m["x"] + 32) - cf["x"], (m["y"] + 32) - cf["y"]) <= rad:
                            m["hp"] = max(0, m["hp"] - dmg)
                            hit_cnt += 1
                            if m["hp"] <= 0:
                                self.defeated_monsters.add(m.get("id", m["name"]))
                                self.defeated_monsters.add(m.get("raw_name", m["name"]))
                    self._emit_fx("combo_detonate", title=c_def["title"], color=c_def.get("color", 16744234), x=cf["x"], y=cf["y"], radius=rad, chime=c_def.get("chime", "combo_fire"))
                    notes.append(f"⚡ [ELEMENTAL TEAM COMBO — {c_def['title']}] {c_def['desc']} ({hit_cnt} target(s) hit for {dmg} AoE damage!)")
                    if hit_cnt and not [m for m in self.get_monsters_in_room(self.current_room) if m.get("hp", 0) > 0]:
                        notes.extend(self.finish_room_combat(self.current_room))
                    break
        notes.extend(self.trigger_world_chemistry(element_tag, x, y, attacker_id))
        return notes

    def use_weapon_skill(self, slot_key: str, player_id: str = None) -> str:
        p = self.get_player(player_id)
        cs = self.get_player_char_stats(p["id"])
        w_info = self.get_equipped_weapon_info(p["id"])
        kit = self.get_weapon_kit(w_info.get("name"), p["id"])
        sk = (kit.get("skills") or {}).get(slot_key.lower())
        if not sk:
            return f"No weapon skill bound to [{slot_key.upper()}]."
        self.record_encounter_contributor(self.current_room, p["id"])
        logs = [f"✨ [{p['name']} — {sk['name']} ({kit.get('family', '')})]: {sk.get('desc', '')}"]
        elem = sk.get("element", "kinetic")
        now = time.time()
        tx, ty = p["x"] + 64.0, p["y"]
        mons = [m for m in self.get_monsters_in_room(self.current_room) if m.get("hp", 0) > 0]
        hit_dmg = 0
        hit_crit = False
        if mons:
            nearest = min(mons, key=lambda m: math.hypot((m["x"] + 32) - p["x"], (m["y"] + 32) - p["y"]))
            tx, ty = nearest["x"] + 32.0, nearest["y"] + 32.0
            dist_px = math.hypot(tx - p["x"], ty - p["y"])
            opt_min = float(w_info.get("optimal_min_px", 35.0))
            opt_max = float(w_info.get("optimal_max_px", 120.0)) + float(sk.get("reach_bonus", 0.0))
            in_sweet = opt_min <= dist_px <= opt_max
            ab_entry = (cs.get("abilities") or {}).get(w_info.get("ability", "FORGE")) or {"mod": 3}
            skill_mod = int(ab_entry.get("mod", 3)) if isinstance(ab_entry, dict) else 3
            raw_base = (int(w_info.get("base_damage", 11)) + max(1, skill_mod // 2)) * float(sk.get("dmg_mult", 1.2))
            if in_sweet:
                raw_base *= 1.15
            cs["momentum"] = min(100, int(cs.get("momentum", 0)) + (35 if in_sweet else 20))
            self.char_stats["momentum"] = cs["momentum"]

            def _apply_skill_hit(tm):
                nonlocal hit_dmg, hit_crit
                stag = float(tm.get("staggered_until", 0.0)) > now
                d = max(4, int(round(raw_base * (1.5 if stag else 1.0))))
                tm["hp"] = max(0, tm["hp"] - d)
                if sk.get("stagger"):
                    tm["staggered"] = True
                    tm["is_staggered"] = True
                    tm["staggered_until"] = now + 4.0
                if tm["hp"] <= 0:
                    self.defeated_monsters.add(tm.get("id", tm["name"]))
                    self.defeated_monsters.add(tm.get("raw_name", tm["name"]))
                hit_dmg = max(hit_dmg, d)
                hit_crit = hit_crit or stag or float(sk.get("dmg_mult", 1.0)) >= 1.5
                return d

            if sk.get("aoe") or sk.get("ricochet"):
                targets = sorted(mons, key=lambda m: math.hypot((m["x"] + 32) - p["x"], (m["y"] + 32) - p["y"]))[:(3 if sk.get("ricochet") else 6)]
                dealt = [_apply_skill_hit(tm) for tm in targets]
                logs.append(f"  💥 Struck {len(targets)} target(s) for {dealt[0]} {elem} damage{' (Sweet-Spot!)' if in_sweet else ''}!")
            elif raw_base > 0:
                d = _apply_skill_hit(nearest)
                logs.append(f"  ⚔️ Hits {nearest['name']} for {d} {elem} damage{' (Sweet-Spot!)' if in_sweet else ''}! ({nearest['hp']}/{nearest['max_hp']} HP)")
            self._emit_fx("hit_impact", is_crit=hit_crit, x=tx, y=ty, dmg=hit_dmg, chime="crit" if hit_crit else "hit_heavy")
            self.last_combat_result = {
                "hit": True, "reason": "hit", "is_crit": hit_crit, "damage": hit_dmg,
                "weapon": w_info.get("name", "Weapon"), "target_name": nearest["name"],
                "target_x": tx, "target_y": ty, "momentum": cs["momentum"],
            }
        else:
            self.last_combat_result = {"hit": False, "reason": "no_foes"}
        if sk.get("heal"):
            heal = int(sk["heal"])
            for op in self.get_players_in_room(self.current_room):
                if op.get("is_downed"):
                    logs.append(self.revive_player(op["id"], p["id"]))
                else:
                    op["hp"] = min(op["max_hp"], op["hp"] + heal)
                    if "char_stats" in op:
                        op["char_stats"]["current_hp"] = op["hp"]
            self.char_stats["current_hp"] = min(self.char_stats["max_hp"], self.char_stats["current_hp"] + heal)
            logs.append(f"  💚 Restores +{heal} Vitality across the squad!")
        if sk.get("field"):
            self.spawn_combo_field(sk["field"], tx, ty, p["id"])
            logs.append(f"  🌀 Created Combo Field [{sk['field'].replace('_', ' ').title()}]!")
        if sk.get("launch"):
            p["z_elev"] = 110.0
            self._emit_fx("skyward_launch", player_id=p["id"], x=p["x"], y=p["y"])
        if sk.get("breach"):
            logs.append(self.breach_destructible(None, p["id"]))
        logs.extend(self.check_and_trigger_combos(elem, tx, ty, p["id"]))
        if mons and not [m for m in self.get_monsters_in_room(self.current_room) if m.get("hp", 0) > 0]:
            logs.extend(self.finish_room_combat(self.current_room))
        self.scene_dirty = True
        return "\n".join(l for l in logs if l)

    def _release_ridden_wildlife(self, player_id: str, place_x: float = None, place_y: float = None):
        """Releases any wildlife entity (e.g. Traveling Peddler) currently ridden by player_id."""
        for rm_id, wl_list in (getattr(self, "room_wildlife", None) or {}).items():
            for wl_item in wl_list:
                if wl_item.get("ridden_by") == player_id:
                    wl_item.pop("ridden_by", None)
                    if rm_id == self.current_room and place_x is not None and place_y is not None:
                        wl_item["x"] = round(float(place_x), 1)
                        wl_item["y"] = round(float(place_y), 1)

    def summon_mount(self, query: str = "", player_id: str = None) -> str:
        p = self.get_player(player_id)
        mounts = self._lw_cfg().get("mounts") or {}
        if not mounts:
            return "No mounts configured."
        q = re.sub(r"^(?:summon\s+mount|hop\s+on|get\s+on|mount|ride)\s*(?:the\s+)?", "", (query or "").strip(), flags=re.IGNORECASE).strip()
        crit = {k: f"{k} {v['name']} {v.get('desc', '')} {v.get('wildlife_kind', '')}" for k, v in mounts.items()}
        mk = evaluate_jev_decision(q or "ash_drake", {"m": Choice(criteria=crit)})["m"].choice or next(iter(mounts))
        if "dragon" in q.lower() and "ash_drake" in mounts:
            mk = "ash_drake"
        md = mounts[mk]
        self._release_ridden_wildlife(p["id"], p["x"] + 24.0, p["y"])
        if md.get("wildlife_kind") == "peddler" or mk == "traveling_peddler":
            self._ensure_room_living_state(self.current_room)
            for wl_item in self.room_wildlife.get(self.current_room, []):
                if wl_item.get("kind") == "peddler" and not wl_item.get("ridden_by"):
                    wl_item["ridden_by"] = p["id"]
                    wl_item["x"], wl_item["y"] = round(float(p["x"]), 1), round(float(p["y"]), 1)
                    break
        self.active_mounts[p["id"]] = {"key": mk, **dict(md)}
        p["mount"] = self.active_mounts[p["id"]]
        self._emit_fx("mount_summon", player_id=p["id"], mount=mk, x=p["x"], y=p["y"], chime="select_hero")
        self.scene_dirty = True
        seat_note = " (2-Seat: a squadmate can 'ride passenger' behind you!)" if md.get("seats", 1) >= 2 else ""
        return f"🐪 [MOUNTED]: Riding {md['name']} ({md.get('ability', '')}, {md.get('speed_mult', 1.4)}x speed)!{seat_note}"

    def mount_passenger(self, player_id: str = None) -> str:
        p = self.get_player(player_id)
        drivers = [op for op in self.get_players_in_room(self.current_room) if op["id"] != p["id"] and self.active_mounts.get(op["id"], {}).get("seats", 1) >= 2]
        if not drivers:
            return "🐉 No two-seat mount (like the Ash-Drake) nearby to ride passenger on!"
        drv = drivers[0]
        self.mount_passengers[p["id"]] = drv["id"]
        p["x"], p["y"] = drv["x"] - 18.0, drv["y"]
        self.scene_dirty = True
        return f"🐉 [2-SEAT RIDE]: {p['name']} hops onto the rear saddle of {drv['name']}'s {self.active_mounts[drv['id']]['name']}! Fire bows & spells while riding!"

    def dismount(self, player_id: str = None) -> str:
        p = self.get_player(player_id)
        self.active_mounts.pop(p["id"], None)
        self.mount_passengers.pop(p["id"], None)
        p.pop("mount", None)
        self._release_ridden_wildlife(p["id"], p.get("x", 512.0) + 28.0, p.get("y", 384.0) + 12.0)
        self.scene_dirty = True
        return f"🥾 {p['name']} dismounts smoothly."

    def list_bounties(self) -> str:
        bounties = self._lw_cfg().get("bounties") or []
        lines = ["📜 [TAVERN BOUNTY BOARD]:"]
        for b in bounties:
            st = "✅ CLAIMED" if b["id"] in self.completed_bounties else ("🎯 ACTIVE" if b["id"] in self.active_bounties else "📌 AVAILABLE")
            lines.append(f"  * [{st}] {b['title']} ({b['room'].replace('_', ' ').title()}) — {b['reward_gp']} GP + {b['reward_item']}")
        return "\n".join(lines)

    def accept_bounty(self, query: str = "", player_id: str = None) -> str:
        bounties = self._lw_cfg().get("bounties") or []
        if not bounties:
            return "No bounty posters available."
        q = re.sub(r"^(?:accept\s+bounty|bounty|wanted)\s*", "", (query or "").strip(), flags=re.IGNORECASE).strip()
        if q in ("", "list", "board"):
            return self.list_bounties()
        crit = {b["id"]: f"{b['title']} {b['target']} {b['room']} {b['desc']}" for b in bounties}
        bid = evaluate_jev_decision(q, {"b": Choice(criteria=crit)})["b"].choice
        b_def = next((b for b in bounties if b["id"] == bid), bounties[0])
        self.active_bounties[b_def["id"]] = b_def
        t_room = b_def["room"]
        if b_def["target"] not in self.room_monsters.get(t_room, []):
            self.room_monsters.setdefault(t_room, []).append(b_def["target"])
            self.bestiary_def[b_def["target"]] = {"name": b_def["target"], "type": "Wanted Bounty Captain", "cr": "3", "level": 3, "hp": 38, "max_hp": 38, "ac": 15, "speed": "35 ft", "attacks": "Bounty Cleaver (+6 to hit, 9 damage)", "detail": b_def["desc"]}
        self.scene_dirty = True
        return f"📜 [BOUNTY ACCEPTED]: {b_def['title']}! Hunt them down in {self.rooms_def.get(t_room, {}).get('name', t_room)} for {b_def['reward_gp']} GP & {b_def['reward_item']}!"

    def setup_bazaar_rug(self, player_id: str = None) -> str:
        p = self.get_player(player_id)
        for_sale = [it for it in self.inventory if it != getattr(self, "initial_inv", "")]
        if not for_sale:
            for_sale = ["Harmonic Aether Cell", "Starfire Oil Flask"]
        rugs = self.bazaar_rugs.setdefault(self.current_room, [])
        rugs.append({"owner": p["name"], "owner_id": p["id"], "x": p["x"], "y": p["y"] + 24.0, "items": [{"name": it, "price": 20 + idx * 8} for idx, it in enumerate(for_sale[:4])]})
        self.build_structure("bazaar_rug", p["x"], p["y"] + 24.0, p["id"])
        self.scene_dirty = True
        return f"🧶 [POP-UP BAZAAR]: {p['name']} unrolls an ornate trading rug with {len(for_sale[:4])} curiosities for passing adventurers!"

    def bazaar_buy(self, query: str, player_id: str = None) -> str:
        rugs = self.bazaar_rugs.get(self.current_room, [])
        all_offers = [(r, o) for r in rugs for o in r.get("items", [])]
        if not all_offers:
            all_offers = [(None, {"name": "Starfire Oil Flask", "price": 15}), (None, {"name": "Frost-Mist Vial", "price": 15})]
        q = re.sub(r"^(?:buy|trade)\s*", "", (query or "").strip(), flags=re.IGNORECASE).strip()
        crit = {str(i): o["name"] for i, (_, o) in enumerate(all_offers)}
        idx = int(evaluate_jev_decision(q or all_offers[0][1]["name"], {"b": Choice(criteria=crit)})["b"].choice or 0)
        rug, offer = all_offers[idx]
        w = self.char_stats.setdefault("wealth", {"gp": 25, "sp": 10, "cp": 0})
        if w.get("gp", 0) < offer["price"]:
            return f"🪙 Need {offer['price']} Sovereign Marks to buy {offer['name']}."
        w["gp"] -= offer["price"]
        self.inventory.append(offer["name"])
        if rug and offer in rug["items"]:
            rug["items"].remove(offer)
        self.scene_dirty = True
        return f"🛍️ [BAZAAR PURCHASE]: Bought {offer['name']} for {offer['price']} Sovereign Marks!"

    # =========================================================================
    # TIER 5: EVENTS, COLOSSUS, BATTLE PETS, LABYRINTH CURSES, MODULAR BUILDING
    # =========================================================================
    def start_world_event(self, player_id: str = None) -> str:
        ev_def = (self._lw_cfg().get("dynamic_world_events") or {}).get("caravan_crisis") or {}
        if not ev_def:
            return "No dynamic world events configured."
        self.active_world_event = {"name": ev_def["name"], "room": self.current_room, "stage": 1, "progress": 0, "target": 3, "stages": ev_def["stages"], "completed": False}
        self._emit_fx("world_event", stage=1, name=ev_def["name"], chime="door")
        self.scene_dirty = True
        return f"🚨 [WORLD EVENT STARTED — {ev_def['name']}]: Stage 1/3 — {ev_def['stages'][0]['goal']}! (Use 'event advance' or defeat attackers!)"

    def advance_world_event(self, delta: int = 1, player_id: str = None) -> str:
        ev = self.active_world_event
        if not ev or ev.get("completed"):
            return self.start_world_event(player_id)
        ev["progress"] += delta
        if ev["progress"] < ev["target"]:
            return f"⚔️ [{ev['name']} — Stage {ev['stage']}/3]: Progress {ev['progress']}/{ev['target']}!"
        if ev["stage"] < 3:
            ev["stage"] += 1
            ev["progress"] = 0
            st = ev["stages"][ev["stage"] - 1]
            ev["target"] = st.get("target_progress", 1)
            if ev["stage"] == 3:
                boss_name = st.get("boss", "Obsidian Meridian Colossus")
                squad_cnt = max(1, len([po for po in self.players.values() if po.get("room") == self.current_room]))
                boss_hp = int(st.get("base_hp", 95)) + squad_cnt * int(st.get("per_player_hp", 35))
                self.bestiary_def[boss_name] = {"name": boss_name, "type": "Scaling World Colossus", "cr": "6", "level": 6, "hp": boss_hp, "max_hp": boss_hp, "ac": 16, "speed": "25 ft", "attacks": "Colossus World-Slam (+7 to hit, 14 seismic)", "detail": f"Scaled for {squad_cnt} heroes | HP: {boss_hp}"}
                self.room_monsters.setdefault(self.current_room, []).append(boss_name)
                self._emit_fx("colossus_spawn", boss=boss_name, chime="tower_collapse")
                self.scene_dirty = True
                return f"🌋 [{ev['name']} — FINAL STAGE 3/3]: {boss_name} ({boss_hp} HP, scaled to {squad_cnt} heroes!) rises from the earth!"
            self.scene_dirty = True
            return f"🔥 [{ev['name']} — Stage {ev['stage']}/3]: {st['goal']}!"
        ev["completed"] = True
        self.char_stats["xp"] = self.char_stats.get("xp", 0) + 350
        self.inventory.append("Colossus Heartstone")
        self.scene_dirty = True
        return f"🏆 [WORLD EVENT TRIUMPH]: {ev['name']} conquered! All contributors earn +350 XP & Colossus Heartstone!"

    def tame_pet(self, query: str = "", player_id: str = None) -> str:
        p = self.get_player(player_id)
        pets_cfg = self._lw_cfg().get("battle_pets") or {}
        q = re.sub(r"^(?:tame|befriend|feed)\s*", "", (query or "").strip(), flags=re.IGNORECASE).strip()
        wild = [w for w in self.room_wildlife.get(self.current_room, []) if w.get("kind") == "wild_pet"]
        pk = wild[0].get("pet_key") if (wild and not q) else evaluate_jev_decision(q or "storm_fox", {"p": Choice(criteria={k: f"{k} {v['name']} {v.get('desc', '')}" for k, v in pets_cfg.items()})})["p"].choice
        pd = pets_cfg.get(pk) or next(iter(pets_cfg.values()))
        pet_obj = {"key": pk, "name": pd["name"], "species": pd["name"], "dmg": pd.get("dmg", 8), "ability": pd.get("ability", "Spark"), "bond": 1, "scale": 1.0, "x": p["x"] - 32.0, "y": p["y"] + 28.0}
        self.player_pets[p["id"]] = pet_obj
        if wild:
            self.room_wildlife[self.current_room] = [w for w in self.room_wildlife[self.current_room] if w.get("id") != wild[0]["id"]]
        self._emit_fx("pet_tame", player_id=p["id"], pet=pet_obj, chime="heal")
        self.scene_dirty = True
        return f"🦊 [COMPANION TAMED]: You earned the trust of a {pd['name']}! Rename anytime with 'name pet <Name>'."

    def name_pet(self, new_name: str, player_id: str = None) -> str:
        p = self.get_player(player_id)
        pet = self.player_pets.get(p["id"])
        if not pet:
            return self.tame_pet("", p["id"])
        clean = re.sub(r"^(?:name\s+pet|rename\s+pet)\s*", "", (new_name or "").strip(), flags=re.IGNORECASE).strip()[:28]
        if clean:
            pet["name"] = clean
        self.scene_dirty = True
        return f"🐾 Your {pet['species']} happily answers to **{pet['name']}**! (Bond Tier {pet['bond']})"

    def enter_labyrinth(self, curse_query: str = "", player_id: str = None) -> str:
        curses = self._lw_cfg().get("labyrinth_curses") or {}
        q = re.sub(r"^(?:labyrinth|delve|dungeon)\s*", "", (curse_query or "").strip(), flags=re.IGNORECASE).strip()
        if q:
            ck = evaluate_jev_decision(q, {"c": Choice(criteria={k: f"{k} {v['name']} {v['desc']}" for k, v in curses.items()})})["c"].choice
        else:
            keys = list(curses.keys())
            ck = keys[(self.turn_count + len(self.visited_rooms)) % len(keys)] if keys else "low_gravity"
        cdef = curses.get(ck) or {"name": "Low-Gravity Vaults", "desc": "Floaty leaps!"}
        idx = (getattr(self, "labyrinth_depth", 0)) + 1
        self.labyrinth_depth = idx
        lab_id = f"labyrinth_floor_{idx}"
        boss_nm = f"Labyrinth Vault Warden #{idx}"
        self.rooms_def[lab_id] = {"name": f"Shifting Labyrinth Floor {idx} [{cdef['name']}]", "color": "Obsidian Vault", "south": [self.current_room, "Escape portal back out"], "items": ["Labyrinth Treasure Relic"], "monsters": [boss_nm]}
        self.room_items[lab_id] = ["Labyrinth Treasure Relic"]
        self.room_monsters[lab_id] = [boss_nm]
        self.room_npcs[lab_id] = []
        self.bestiary_def[boss_nm] = {"name": boss_nm, "type": "Labyrinth Construct", "cr": "3", "level": 3, "hp": 32 + idx * 5, "max_hp": 32 + idx * 5, "ac": 14, "speed": "30 ft", "attacks": "Vault Halberd (+5 to hit, 8 damage)", "detail": f"Curse: {cdef['name']}"}
        # Fresh procedural obstacle maze layout
        obs = [{"name": f"Labyrinth Pillar #{k+1}", "rect": [220 + ((k * 190 + idx * 70) % 580), 180 + ((k * 130 + idx * 50) % 420), 64, 64]} for k in range(5)]
        self.room_bounds[lab_id] = {"width": 1024, "height": 768, "spawn": [512, 650], "obstacles": obs, "portals": [{"direction": "south", "target": self.current_room, "name": "Labyrinth Return Gate", "rect": [450, 710, 124, 48], "target_spawn": [512, 580]}]}
        self.labyrinth_state = {"room": lab_id, "depth": idx, "curse_key": ck, **dict(cdef)}
        self.fast_travel_to_sector(lab_id, player_id)
        return f"🌀 [SHIFTING LABYRINTH FLOOR {idx}]: Active Curse — **{cdef['name']}** ({cdef['desc']})!"

    def build_structure(self, piece_query: str, x: float = None, y: float = None, player_id: str = None) -> str:
        p = self.get_player(player_id)
        recipes = self._lw_client_cfg().get("building_recipes") or {"timber_wall": {}}
        q = re.sub(r"^(?:build|place)\s*", "", (piece_query or "").strip(), flags=re.IGNORECASE).strip()
        pk = evaluate_jev_decision(q or "cozy_hearth", {"b": Choice(criteria={k: k.replace("_", " ") for k in recipes.keys()})})["b"].choice or "cozy_hearth"
        bx = float(x if x is not None else p["x"] + 56.0)
        by = float(y if y is not None else p["y"])
        # Snap gently to 32px grid
        sx, sy = round(bx / 32.0) * 32.0, round(by / 32.0) * 32.0
        st = {"id": f"bld_{self.current_room}_{len(self.placed_structures.get(self.current_room, []))+1}", "kind": pk, "x": sx, "y": sy, "owner": p["name"]}
        self.placed_structures.setdefault(self.current_room, []).append(st)
        self._emit_fx("build_place", **st, chime="chest_pop")
        self.scene_dirty = True
        comfort_tier, comfort = self.compute_camp_comfort(self.current_room)
        return f"🏗️ [MODULAR BUILD]: Constructed **{pk.replace('_', ' ').title()}** at ({int(sx)}, {int(sy)})! Camp Comfort Tier: {comfort_tier} ({comfort.get('label')})."

    def save_blueprint(self, name: str, player_id: str = None) -> str:
        clean = re.sub(r"^(?:blueprint\s+save|save\s+blueprint)\s*", "", (name or "").strip(), flags=re.IGNORECASE).strip() or f"Stronghold_{len(self.saved_blueprints)+1}"
        cur = self.placed_structures.get(self.current_room, [])
        if not cur:
            return "🏗️ Place at least one camp structure first before saving a blueprint!"
        ox, oy = cur[0]["x"], cur[0]["y"]
        self.saved_blueprints[clean] = [{"kind": s["kind"], "dx": s["x"] - ox, "dy": s["y"] - oy} for s in cur]
        return f"📐 [BLUEPRINT SAVED]: '{clean}' saved with {len(cur)} modular piece(s)!"

    def deploy_blueprint(self, name: str, player_id: str = None) -> str:
        p = self.get_player(player_id)
        clean = re.sub(r"^(?:blueprint\s+(?:build|deploy|load)|deploy\s+blueprint)\s*", "", (name or "").strip(), flags=re.IGNORECASE).strip()
        if not self.saved_blueprints:
            return "📐 No saved blueprints yet! Use 'blueprint save <name>' first."
        key = evaluate_jev_decision(clean or next(iter(self.saved_blueprints)), {"bp": Choice(options=list(self.saved_blueprints.keys()))})["bp"].choice
        pieces = self.saved_blueprints.get(key) or []
        for pc in pieces:
            self.build_structure(pc["kind"], p["x"] + 60.0 + pc["dx"], p["y"] + pc["dy"], p["id"])
        return f"🏰 [BLUEPRINT DEPLOYED]: Rebuilt '{key}' ({len(pieces)} structures) at your camp!"

    # =========================================================================
    # TIER 6: MULTI-CREW VEHICLES, EVOLVING OUTPOSTS, WORLD CHEMISTRY, ECOLOGY & RIVALS
    # =========================================================================
    def spawn_vehicle(self, query: str = "", player_id: str = None) -> str:
        p = self.get_player(player_id)
        vehs = self._lw_cfg().get("vehicles") or {}
        q = re.sub(r"^(?:spawn\s+ship|board|ship|airship|wagon|skiff)\s*", "", (query or "").strip(), flags=re.IGNORECASE).strip()
        vk = evaluate_jev_decision(q or "galleon_airship", {"v": Choice(criteria={k: f"{k} {v['name']} {v.get('desc', '')}" for k, v in vehs.items()})})["v"].choice or "galleon_airship"
        vd = vehs.get(vk) or {"name": "Concordat Sky-Galleon", "base_speed": 26, "cannon_dmg": 28}
        v_obj = {"id": f"veh_{self.current_room}_{vk}", "kind": vk, "name": vd["name"], "x": float(p["x"] + 40), "y": float(p["y"]), "rot": 0.0, "base_speed": vd.get("base_speed", 24), "cannon_dmg": vd.get("cannon_dmg", 25), "stations": {"helm": p["id"], "sails": None, "cannon": None}}
        self.room_vehicles[self.current_room] = [v_obj]
        p["vehicle_id"] = v_obj["id"]
        p["vehicle_station"] = "helm"
        self.scene_dirty = True
        return f"⛵ [MULTI-CREW VESSEL]: Boarded **{vd['name']}** at the Helm! (Allies/crew can man 'crew sails' & 'crew cannon'!)"

    def assign_crew_station(self, station_query: str, player_id: str = None) -> str:
        p = self.get_player(player_id)
        vehs = self.room_vehicles.get(self.current_room, [])
        if not vehs:
            return self.spawn_vehicle(station_query, p["id"])
        v = vehs[0]
        st = evaluate_jev_decision(station_query or "helm", {"s": Choice(criteria={"helm": "helm wheel steer pilot", "sails": "sails trim wind boost", "cannon": "cannon fire gun turret"})})["s"].choice or "helm"
        for k, holder in list(v["stations"].items()):
            if holder == p["id"]:
                v["stations"][k] = None
        v["stations"][st] = p["id"]
        p["vehicle_id"] = v["id"]
        p["vehicle_station"] = st
        self.scene_dirty = True
        return f"⚓ [CREW STATION]: {p['name']} takes command of the **{st.upper()}** aboard {v['name']}!"

    def fire_vehicle_cannon(self, player_id: str = None) -> str:
        p = self.get_player(player_id)
        vehs = self.room_vehicles.get(self.current_room, [])
        if not vehs:
            return "⛵ Board or summon a multi-crew vessel first ('ship' or 'wagon')."
        v = vehs[0]
        dmg = int(v.get("cannon_dmg", 25))
        mons = [m for m in self.get_monsters_in_room(self.current_room) if m.get("hp", 0) > 0]
        if mons:
            target = min(mons, key=lambda m: math.hypot((m["x"] + 32) - v["x"], (m["y"] + 32) - v["y"]))
            target["hp"] = max(0, target["hp"] - dmg)
            self._emit_fx("cannon_fire", from_x=v["x"], from_y=v["y"], to_x=target["x"] + 32, to_y=target["y"] + 32, chime="cannon_boom")
            notes = [f"💣 [BROADSIDE CANNON!]: {p['name']} blasts {target['name']} for {dmg} siege damage!"]
            if target["hp"] <= 0:
                self.defeated_monsters.add(target.get("id", target["name"]))
                self.defeated_monsters.add(target.get("raw_name", target["name"]))
            notes.extend(self.check_and_trigger_combos("cannon", target["x"] + 32, target["y"] + 32, p["id"]))
            if not [m for m in self.get_monsters_in_room(self.current_room) if m.get("hp", 0) > 0]:
                notes.extend(self.finish_room_combat(self.current_room))
            self.scene_dirty = True
            return "\n".join(notes)
        self._emit_fx("cannon_fire", from_x=v["x"], from_y=v["y"], to_x=v["x"] + 160, to_y=v["y"], chime="cannon_boom")
        return f"💣 [CANNON SALVO]: {v['name']} fires a booming warning broadside across the horizon!"

    def supply_outpost(self, player_id: str = None, delta: int = 1) -> str:
        r = self.current_room
        op = self.outpost_states.get(r)
        if not op:
            op = {"name": f"{self.rooms_def.get(r, {}).get('name', r)} Outpost", "tier": 0, "tier_names": ["Ashen Ruins", "Timber Camp", "Palisade Fort", "Bustling Walled Town"], "progress": 0, "max_tier": 3}
            self.outpost_states[r] = op
        op["progress"] += delta
        if op["progress"] >= 2 and op["tier"] < op["max_tier"]:
            op["tier"] += 1
            op["progress"] = 0
        elif op["progress"] <= -2 and op["tier"] > 0:
            op["tier"] -= 1
            op["progress"] = 0
        t_name = op["tier_names"][min(len(op["tier_names"]) - 1, op["tier"])]
        self.scene_dirty = True
        return f"🏰 [EVOLVING OUTPOST — {op['name']}]: Now Tier {op['tier']} — **{t_name}**!"

    def trigger_world_chemistry(self, element_tag: str, x: float, y: float, player_id: str = None) -> list[str]:
        self._ensure_room_living_state(self.current_room)
        chem_rules = self._lw_cfg().get("world_chemistry") or {}
        props = self.room_chemistry.get(self.current_room, [])
        notes = []
        for prop in props:
            if math.hypot(prop["x"] - x, prop["y"] - y) > 155.0:
                continue
            for _, rule in chem_rules.items():
                if rule.get("prop_kind") != prop["kind"]:
                    continue
                if prop["state"] == rule.get("result_state"):
                    continue
                e_ans = evaluate_jev_decision(element_tag or "", {"e": Choice(criteria={"match": rule["trigger_element"], "other": "unrelated"})})["e"]
                if e_ans.choice == "match" and e_ans.confidence >= 0.50:
                    prop["state"] = rule["result_state"]
                    self._emit_fx("chemistry", prop_kind=prop["kind"], state=prop["state"], x=prop["x"], y=prop["y"], title=rule["title"], chime="combo_fire" if prop["kind"] != "rain_puddle" else "combo_shock")
                    notes.append(f"🧪 [WORLD CHEMISTRY — {rule['title']}] {rule['desc']}")
                    if prop["kind"] in ("perched_boulder", "oil_barrel"):
                        for m in self.get_monsters_in_room(self.current_room):
                            if m.get("hp", 0) > 0:
                                m["hp"] = max(0, m["hp"] - 18)
                                if m["hp"] <= 0:
                                    self.defeated_monsters.add(m.get("id", m["name"]))
                                    self.defeated_monsters.add(m.get("raw_name", m["name"]))
                    self.scene_dirty = True
                    break
        return notes

    def step_autonomous_ecology(self, room_id: str = None):
        r = room_id or self.current_room
        now = time.time()
        if now - getattr(self, "_last_ecology_tick", 0.0) < 2.2:
            return
        self._last_ecology_tick = now
        self._ensure_room_living_state(r)
        wl = self.room_wildlife.get(r, [])
        deer = next((a for a in wl if a.get("kind") == "deer" and a.get("hp", 0) > 0), None)
        wolf = next((a for a in wl if a.get("kind") == "wolf" and a.get("hp", 0) > 0), None)
        eco_beh = (self._lw_cfg().get("ecology_rules") or {}).get("wildlife_behaviors") or {}
        if wolf and deer and eco_beh:
            choice, _ = self.world_model.rank_adaptive_choices("monster", wolf["name"], "wolf stalk hunt deer", eco_beh, {"room": r, "turn": self.turn_count})
            dx, dy = deer["x"] - wolf["x"], deer["y"] - wolf["y"]
            dist = max(1.0, math.hypot(dx, dy))
            if dist > 42.0:
                wolf["x"] = round(wolf["x"] + (dx / dist) * 18.0, 1)
                wolf["y"] = round(wolf["y"] + (dy / dist) * 18.0, 1)
            deer["x"] = round(max(80.0, min(940.0, deer["x"] + (dx / dist) * 14.0)), 1)
            deer["y"] = round(max(80.0, min(680.0, deer["y"] + (dy / dist) * 14.0)), 1)
            wolf["state"] = choice or "wolf_stalk"
            self.world_model.learn_step("monster", wolf["name"], wolf["state"], {"room": r, "turn": self.turn_count}, {"reward": 0.12 if dist < 120 else 0.03})

    def promote_or_spawn_rival(self, tactic_tag: str = "melee", player_id: str = None, base_name: str = None) -> dict:
        scars = (self._lw_cfg().get("ecology_rules") or {}).get("rival_scars") or {}
        key = evaluate_jev_decision(tactic_tag or "melee", {"t": Choice(criteria={k: f"{k} {v.get('scar', '')}" for k, v in scars.items()})})["t"].choice or "melee"
        info = scars.get(key) or {"scar": "Battle-Scarred", "counter": "Tempered Plate", "taunt": "I remember how you fought me last time!"}
        pv = self.world_model.predict_manifold("monster", base_name or "Rival", tactic_tag, {"room": self.current_room, "turn": self.turn_count})
        bonus_hp = max(12, int(20 + abs(float(pv[0])) * 12))
        rival = {
            "id": f"rival_{len(self.active_rivals) + 1}",
            "name": f"{info['scar']} {base_name or 'Warchief Uruk'}",
            "tactic_remembered": key, "counter_gear": info["counter"], "taunt": info["taunt"],
            "hp": 38 + bonus_hp, "power_level": len(self.active_rivals) + 2,
        }
        self.active_rivals.append(rival)
        self.bestiary_def[rival["name"]] = {"name": rival["name"], "type": "Nemesis Rival", "cr": "4", "level": 4, "hp": rival["hp"], "max_hp": rival["hp"], "ac": 16, "speed": "35 ft", "attacks": "Grudge Cleaver (+6 to hit, 10 damage)", "detail": f"Counter: {rival['counter_gear']}"}
        self.world_model.learn_step("monster", rival["name"], f"adapt_{key}", {"room": self.current_room, "turn": self.turn_count}, {"reward": 0.45})
        return rival

    # =========================================================================
    # TIER 7: DESTRUCTIBLES, COLLAPSING CASTLES & SEAMLESS ENDLESS CROWDS
    # =========================================================================
    def _is_destructible_wall_blocking(self, nx: float, ny: float) -> bool:
        for blk in (getattr(self, "room_destructibles", None) or {}).get(self.current_room, []):
            if blk.get("hp", 0) <= 0 or blk.get("kind") == "earth_mound":
                continue
            bx, by, bw, bh = blk["x"] - blk["w"] * 0.5, blk["y"] - blk["h"] * 0.5, blk["w"], blk["h"]
            if bx <= nx <= bx + bw and by <= ny <= by + bh:
                return True
        return False

    def recompute_structural_collapse(self, room_id: str) -> list[str]:
        blocks = self.room_destructibles.get(room_id, [])
        destroyed_ids = {b["id"] for b in blocks if b.get("hp", 0) <= 0}
        collapsed = []
        for b in blocks:
            sup = b.get("supported_by")
            if sup and sup in destroyed_ids and b.get("hp", 0) > 0:
                b["hp"] = 0
                b["collapsed"] = True
                collapsed.append(b["name"])
                self._emit_fx("tower_collapse", x=b["x"], y=b["y"], name=b["name"], chime="tower_collapse")
        return collapsed

    def breach_destructible(self, target_id: str = None, player_id: str = None) -> str:
        p = self.get_player(player_id)
        blocks = [b for b in self.room_destructibles.get(self.current_room, []) if b.get("hp", 0) > 0]
        if not blocks:
            return "🧱 No intact destructible structures nearby — you can place new ones with 'build watchtower'!"
        blk = next((b for b in blocks if target_id and b["id"] == target_id), None) or min(blocks, key=lambda b: math.hypot(b["x"] - p["x"], b["y"] - p["y"]))
        blk["hp"] = 0
        self._emit_fx("breach_shatter", x=blk["x"], y=blk["y"], name=blk["name"], chime="breach_shatter")
        collapsed = self.recompute_structural_collapse(self.current_room)
        self.scene_dirty = True
        extra = f" 🏚️ STRUCTURAL COLLAPSE: {', '.join(collapsed)} crashes to the ground!" if collapsed else ""
        return f"💥 [BREACH!]: Shattered **{blk['name']}** into flying rubble, carving a clear path!{extra}"

    def dig_tunnel(self, x: float = None, y: float = None, player_id: str = None) -> str:
        p = self.get_player(player_id)
        tx, ty = float(x if x is not None else p["x"]), float(y if y is not None else p["y"])
        for blk in self.room_destructibles.get(self.current_room, []):
            if blk.get("kind") == "earth_mound" and blk.get("hp", 0) > 0:
                blk["hp"] = 0
        tunnels = self.dug_tunnels.setdefault(self.current_room, [])
        tunnels.append({"id": f"tun_{len(tunnels)+1}", "x": tx, "y": ty, "radius": 52.0})
        self._emit_fx("dig_tunnel", x=tx, y=ty, chime="dig_earth")
        self.scene_dirty = True
        return f"⛏️ [TUNNEL CARVED]: Dug an escape tunnel passage at ({int(tx)}, {int(ty)})!"

    def get_crowd_simulation(self, room_id: str = None) -> dict:
        r = room_id or self.current_room
        is_hub = any(k in r for k in ("plaza", "conservatory", "watchtower", "outpost", "citadel"))
        base_cnt = 72 if is_hub else 28
        return {"enabled": self.crowd_state.get("enabled", True), "density": base_cnt, "seamless": True, "room_id": r}

    # =========================================================================
    # NARRATIVE-GAMEPLAY HARMONY (VERBS, SHARDS, VIGNETTES, MERCY, REACTIONS)
    # =========================================================================
    def get_world_reaction(self, player_id: str = None) -> str:
        nh = (self._lw_cfg().get("narrative_harmony") or {})
        rx = nh.get("world_reactions") or {}
        if not rx:
            return ""
        p = self.players.get(player_id or "player_1") or {}
        cs = p.get("char_stats") or getattr(self, "char_stats", {})
        w_name = str(cs.get("weapon") or p.get("active_weapon") or "").lower()
        low_hp = "wounded low hp bleeding" if p.get("hp", 36) < max(1, p.get("max_hp", 36)) * 0.45 else ""
        mercy = "spare mercy truce nonlethal" if getattr(self, "spared_foes", None) else ""
        breach = "breach tunnel smash" if getattr(self, "dug_tunnels", None) else ""
        ctx_str = f"{w_name} {low_hp} {mercy} {breach}".strip()
        if not ctx_str:
            return next(iter(rx.values())).get("line", "")
        crit = {k: v.get("keywords", k) for k, v in rx.items() if isinstance(v, dict)}
        chosen = evaluate_jev_decision(ctx_str, {"r": Choice(criteria=crit)})["r"].choice
        return (rx.get(chosen) or {}).get("line", "")

    def get_campfire_breakfast_scene(self, player_id: str = None) -> str:
        nh = (self._lw_cfg().get("narrative_harmony") or {})
        refs = nh.get("campfire_reflections") or []
        if not refs:
            return ""
        idx = int(getattr(self, "turn_count", 0)) % len(refs)
        return str(refs[idx])

    def spare_foe(self, query: str = "", player_id: str = None) -> str:
        p = self.get_player(player_id)
        r = self.current_room
        mons = [m for m in self.get_monsters_in_room(r) if m.get("hp", 0) > 0]
        if not mons:
            return "🕊️ No active combatants here to parley or spare."
        weakened = [m for m in mons if m.get("hp", 10) <= m.get("max_hp", 10) * 0.65 or m.get("staggered_until", 0) > time.time()]
        target = weakened[0] if weakened else mons[0]
        target["hp"] = 0
        self.defeated_monsters.add(target.get("id", target["name"]))
        self.defeated_monsters.add(target.get("raw_name", target["name"]))
        self.spared_foes.add(target["name"])
        self.faction_goodwill = int(getattr(self, "faction_goodwill", 0)) + 1
        self.char_stats["xp"] = self.char_stats.get("xp", 0) + 120
        self._emit_fx("revive", target_id=target.get("id"), x=target.get("x", p["x"]), y=target.get("y", p["y"]), chime="heal")
        rem = [m for m in mons if m is not target and m.get("hp", 0) > 0]
        extra = ""
        if not rem:
            v_notes = self.finish_room_combat(r) if hasattr(self, "finish_room_combat") else []
            self.room_monsters[r] = []
            self.monster_states[r] = []
            extra = " Remaining adversaries lay down their arms and honor the truce!" + (("\n" + "\n".join(v_notes)) if v_notes else "")
        self.scene_dirty = True
        return f"🕊️ [MERCY & AGENCY]: {p['name']} lowers their weapon and spares **{target['name']}**! (+120 XP, Goodwill +{self.faction_goodwill}).{extra}"

    def get_narrative_harmony_payload(self, player_id: str = None) -> dict:
        nh = (self._lw_cfg().get("narrative_harmony") or {})
        r = self.current_room
        shards = list((getattr(self, "discovered_shards", None) or {}).values())
        prep_step = float((nh.get("looming_threat") or {}).get("prep_bonus_per_shard", 0.05))
        vig = (nh.get("environmental_vignettes") or {}).get(r) or (
            "shifting obsidian tiles hover above soot-darkened niches bearing chalk signatures from earlier vanguard delves."
            if "labyrinth" in r else
            "weathered surveyor stakes and paired bootprints trace where earlier vanguard scouts pressed onward."
        )
        return {
            "guild_title": nh.get("guild_title", "Concordat Expedition Vanguard"),
            "looming_threat": (nh.get("looming_threat") or {}).get("desc", ""),
            "vignette": vig,
            "shards": shards[-6:],
            "climax_prep_pct": min(100, int(round(len(shards) * prep_step * 100))),
            "goodwill": int(getattr(self, "faction_goodwill", 0)),
            "spared_count": len(getattr(self, "spared_foes", ())),
            "reaction": self.get_world_reaction(player_id),
            "breakfast_scene": self.get_campfire_breakfast_scene(player_id),
        }

    # =========================================================================
    # PAYLOAD & UNIFIED CC-ELM COMMAND DISPATCHER
    # =========================================================================
    def get_living_world_payload(self, player_id: str = None) -> dict:
        now = time.time()
        r = self.current_room
        self._ensure_room_living_state(r)
        self.world_pings = [wp for wp in self.world_pings if wp.get("expires_at", 0) > now]
        self.combo_fields = [cf for cf in self.combo_fields if cf.get("expires_at", 0) > now]
        self.speech_bubbles = [sb for sb in self.speech_bubbles if sb.get("expires_at", 0) > now]
        self.pending_fx_events = [e for e in self.pending_fx_events if now - e.get("ts", 0) < 2.5]
        fx = list(self.pending_fx_events)
        pid = player_id or "player_1"
        p = self.players.get(pid) or {}
        comfort_tier, comfort_info = self.compute_camp_comfort(r)
        return {
            "camp_stash": list(self.camp_stash),
            "auto_vacuum": bool(self.auto_vacuum_enabled),
            "pings": list(self.world_pings),
            "combo_fields": [cf for cf in self.combo_fields if cf.get("room") == r],
            "nodes": list(self.room_nodes.get(r, [])),
            "chemistry": list(self.room_chemistry.get(r, [])),
            "wildlife": list(self.room_wildlife.get(r, [])),
            "destructibles": list(self.room_destructibles.get(r, [])),
            "tunnels": list(self.dug_tunnels.get(r, [])),
            "structures": list(self.placed_structures.get(r, [])),
            "blueprints": list(self.saved_blueprints.keys()),
            "vehicles": list(self.room_vehicles.get(r, [])),
            "bazaar_rugs": list(self.bazaar_rugs.get(r, [])),
            "notes": list(self.room_notes.get(r, [])),
            "ghosts": list(self.room_ghosts.get(r, [])),
            "map_pins": list(self.shared_map_pins),
            "outpost": self.outpost_states.get(r),
            "world_event": self.active_world_event,
            "labyrinth": self.labyrinth_state,
            "rivals": list(self.active_rivals[-5:]),
            "bounties": {"active": list(self.active_bounties.keys()), "completed": sorted(self.completed_bounties)},
            "pets": dict(self.player_pets),
            "mounts": dict(self.active_mounts),
            "mount_passengers": dict(self.mount_passengers),
            "speech_bubbles": [sb for sb in self.speech_bubbles if sb.get("room") == r],
            "comfort": {"tier": comfort_tier, **comfort_info},
            "crowd": self.get_crowd_simulation(r),
            "weapon_kit": {
                **self.get_weapon_kit(None, pid),
                "weapon_name": (w_eq := self.get_equipped_weapon_info(pid)).get("name", ""),
                "optimal_min_px": float(w_eq.get("optimal_min_px", 35.0)),
                "optimal_max_px": float(w_eq.get("optimal_max_px", 120.0)),
                "max_dist_px": float(w_eq.get("max_dist_px", 135.0)),
            },
            "sidekick_scale": self.compute_sidekick_scale(p, r),
            "narrative_harmony": self.get_narrative_harmony_payload(pid),
            "fx_events": fx,
        }

    def perform_character_action(self, query: str, player_id: str = None) -> str:
        return _run_char_action(self, query, player_id)

    def handle_living_world_command(self, user_input: str, player_id: str = None, explicit_only: bool = False) -> str | None:
        cmd = (user_input or "").strip()
        low = cmd.lower()
        criteria = self._lw_cfg().get("intent_criteria") or {}
        if not low:
            return None

        # Explicit fast prefix matching before CC-ELM semantic scoring
        if re.match(r"^(?:ping)\b", low):
            return f"📍 Pinged [{self.create_ping(low[4:].strip() or 'look', player_id=player_id)['label']}]!"
        if re.match(r"^(?:emote|sit|warm|wave|cheer|dance|highfive|fistbump|hug|play\s+(?:lute|drum|flute))\b", low):
            return self.perform_emote(low, player_id)
        if re.match(r"^(?:gift|share\s+item)\b", low):
            return self.gift_item(low, player_id)
        if re.match(r"^(?:revive|rescue)\b", low):
            return self.revive_player(None, player_id)
        if re.match(r"^(?:harvest|mine|gather)\b", low):
            return self.harvest_node(player_id)
        if re.match(r"^(?:craft|forge|brew|make)\b", low):
            return self.craft_item(low, player_id)
        if re.match(r"^(?:stash|deposit|dump)\b", low):
            return self.deposit_matching_materials()
        if re.match(r"^(?:compare|diff)\b", low):
            return self.compare_item(low, player_id)
        if re.match(r"^(?:equip|swap|wield)\b", low):
            return self.equip_weapon(low, player_id)
        if re.match(r"^(?:reinvent|respec)\b", low):
            return self.reinvent_build(low, player_id)
        if re.match(r"^(?:dye|transmog|wardrobe)\b", low):
            return self.set_wardrobe(player_id, dye_palette=low, silhouette=low)
        if re.match(r"^(?:dodge|roll)\b", low):
            return self.dodge_roll(player_id)
        if re.match(r"^(?:parry|block)\b", low):
            return self.timed_parry(player_id)
        if re.match(r"^(?:skill\s+[qer]|cast\s+[qer])\b", low):
            slot = re.search(r"\b([qer])\b", low).group(1)
            return self.use_weapon_skill(slot, player_id)
        if re.match(r"^(?:ride\s+passenger)\b", low):
            return self.mount_passenger(player_id)
        if re.match(r"^(?:mount|ride|summon\s+mount|hop\s+on)\b", low):
            return self.summon_mount(low, player_id)
        if re.match(r"^(?:dismount)\b", low):
            return self.dismount(player_id)
        if re.match(r"^(?:bounties|bounty)\b", low):
            return self.accept_bounty(low, player_id)
        if re.match(r"^(?:bazaar|set\s+rug)\b", low):
            return self.setup_bazaar_rug(player_id)
        if re.match(r"^(?:buy)\b", low):
            return self.bazaar_buy(low, player_id)
        if re.match(r"^(?:tame|befriend)\b", low):
            return self.tame_pet(low, player_id)
        if re.match(r"^(?:name\s+pet)\b", low):
            return self.name_pet(cmd, player_id)
        if re.match(r"^(?:labyrinth|delve)\b", low):
            return self.enter_labyrinth(low, player_id)
        if re.match(r"^(?:build|place)\b", low):
            return self.build_structure(low, player_id=player_id)
        if re.match(r"^(?:blueprint\s+save|save\s+blueprint)\b", low):
            return self.save_blueprint(cmd, player_id)
        if re.match(r"^(?:blueprint\s+(?:build|deploy|load)|deploy\s+blueprint)\b", low):
            return self.deploy_blueprint(cmd, player_id)
        if re.match(r"^(?:ship|airship|wagon|skiff)\b", low):
            return self.spawn_vehicle(low, player_id)
        if re.match(r"^(?:crew)\b", low):
            return self.assign_crew_station(low, player_id)
        if re.match(r"^(?:fire\s+cannon|cannon)\b", low):
            return self.fire_vehicle_cannon(player_id)
        if re.match(r"^(?:outpost|supply\s+outpost)\b", low):
            return self.supply_outpost(player_id, 1)
        if re.match(r"^(?:event)\b", low):
            return self.advance_world_event(1, player_id)
        if re.match(r"^(?:breach|smash|demolish)\b", low):
            return self.breach_destructible(None, player_id)
        if re.match(r"^(?:dig|tunnel)\b", low):
            return self.dig_tunnel(player_id=player_id)
        if re.match(r"^(?:fish|cast\s+line)\b", low):
            return self.play_fishing(player_id)
        if re.match(r"^(?:dice|roll\s+dice)\b", low):
            return self.play_dice(low, player_id)
        if re.match(r"^(?:riddle|decode)\b", low):
            return self.solve_riddle(low, player_id)
        if re.match(r"^(?:note|leave\s+note|chalk)\b", low):
            return self.leave_note(cmd, player_id)
        if re.match(r"^(?:share\s+map|map\s+table)\b", low):
            return self.interact_map_table(player_id)
        if re.match(r"^(?:pin)\b", low):
            return self.add_map_pin(cmd[3:].strip(), player_id=player_id)
        if re.match(r"^(?:say|shout|whisper)\b", low):
            return self.speak_proximity(cmd, player_id)
        if re.match(r"^(?:ignite|freeze|shock|push\s+boulder)\b", low):
            p = self.get_player(player_id)
            notes = self.trigger_world_chemistry(low, p["x"], p["y"], p["id"])
            return "\n".join(notes) if notes else "🧪 No reactive world chemistry prop nearby."
        if re.match(r"^(?:spare|mercy|parley|truce)\b", low):
            return self.spare_foe(low, player_id)
        if re.match(r"^(?:reflect|breakfast|harmony|vignette)\b", low):
            nh = self.get_narrative_harmony_payload(player_id)
            return f"☕ [HARMONY — {nh['guild_title']} | Climax Prep +{nh['climax_prep_pct']}%]: {nh['breakfast_scene']}\n🔍 Environmental Vignette: {nh['vignette'] or 'Quiet flagstones ahead.'}\n💬 {nh['reaction']}"
        matched_act = match_character_action(low, explicit_only=True)
        if matched_act:
            return self.perform_character_action(matched_act["id"], player_id)

        if explicit_only or not criteria:
            return None

        # Semantic CC-ELM fallback for phrased living-world intents
        ans = evaluate_jev_decision(low, {"lw": Choice(criteria=criteria)})["lw"]
        if ans.confidence < 0.55:
            return None
        c = ans.choice
        if c == "ping":
            return f"📍 Pinged [{self.create_ping(low, player_id=player_id)['label']}]!"
        if c == "emote":
            return self.perform_emote(low, player_id)
        if c == "gift":
            return self.gift_item(low, player_id)
        if c == "revive":
            return self.revive_player(None, player_id)
        if c == "craft":
            return self.craft_item(low, player_id)
        if c == "stash":
            return self.deposit_matching_materials()
        if c == "equip":
            return self.equip_weapon(low, player_id)
        if c == "wardrobe":
            return self.set_wardrobe(player_id, dye_palette=low, silhouette=low)
        if c == "mount":
            return self.summon_mount(low, player_id)
        if c == "pet":
            return self.tame_pet(low, player_id)
        if c == "labyrinth":
            return self.enter_labyrinth(low, player_id)
        if c == "build":
            return self.build_structure(low, player_id=player_id)
        if c == "vehicle":
            return self.spawn_vehicle(low, player_id)
        if c == "outpost":
            return self.supply_outpost(player_id, 1)
        if c == "destructible":
            return self.breach_destructible(None, player_id)
        if c == "cartography":
            return self.interact_map_table(player_id)
        if c == "pastime":
            return self.play_fishing(player_id) if "fish" in low else (self.play_dice(low, player_id) if "dice" in low else self.solve_riddle(low, player_id))
        if c == "spare":
            return self.spare_foe(low, player_id)
        if c == "reflect":
            nh = self.get_narrative_harmony_payload(player_id)
            return f"☕ [{nh['guild_title']}]: {nh['breakfast_scene']} | {nh['reaction']}"
        return None
