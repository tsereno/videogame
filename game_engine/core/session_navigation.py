"""AI companion party behavior, movement, environmental collisions, and deterministic world simulation."""
import os, re, time, math, json
import numpy as np
from .constants import GRID_SQ, WORLD_MODEL_WEIGHTS_PATH, SHARED_EXPERIENCE_LOG_PATH
from .core_models import Choice, evaluate_jev_decision

class SessionNavigationMixin:
    def _speaker(self, player_id: str = None) -> dict | None:
        return self.players.get(player_id) or next((p for p in self.players.values() if not p.get("is_ai")), None) or next(iter(self.players.values()), None)

    def get_ai_companion_dialogue(self, character_class: str, context_category: str) -> str | None:
        """Retrieves context-aware narrative dialogue for an AI companion via CC-ELM semantic matching."""
        ai_roles = getattr(self, "ai_roles", None) or {"fighter": ["fighter warrior"]}
        role_crit = {r: cfg[0] for r, cfg in ai_roles.items()}
        key = evaluate_jev_decision((character_class or "").lower() or "fighter", {"cls": Choice(criteria=role_crit)})["cls"].choice or next(iter(role_crit))
        diag_defs = getattr(self, "game_data", {}).get("companion_dialogue", {})
        cls_diag = diag_defs.get(key, {}) if isinstance(diag_defs, dict) else {}
        line = cls_diag.get(context_category) if isinstance(cls_diag, dict) else None
        if not line and isinstance(cls_diag, dict) and cls_diag and context_category:
            line = cls_diag.get(evaluate_jev_decision(context_category, {"ctx": Choice(criteria={k: f"{k} {v}" for k, v in cls_diag.items()})})["ctx"].choice)
        if not line and getattr(self, "world_model", None):
            return self.world_model.infer_transition("character", key, context_category or "status", {"room": getattr(self, "current_room", "")})["narration"]
        return line

    def get_character_languages(self, player_obj: dict) -> list[str]:
        """Resolves spoken dialects for a player character via profile or CC-ELM lookup."""
        def_lang = getattr(self, "default_language", "Common")
        if not player_obj:
            return [def_lang]
        langs = player_obj.get("languages") or player_obj.get("char_stats", {}).get("languages")
        if langs:
            return list(langs)
        combined = {**getattr(self, "archetype_languages", {}), **getattr(self, "species_languages", {})}
        query = f"{player_obj.get('name', '')} {player_obj.get('species', '')}".strip()
        if combined and query:
            ans = evaluate_jev_decision(query, {"l": Choice(criteria={k: f"{k} {' '.join(v)}" for k, v in combined.items()})})["l"]
            if ans.choice and ans.confidence >= 0.25:
                return list(combined[ans.choice])
        return [def_lang]

    def respond_to_salutation(self, speaker_id: str, greeting_text: str) -> str:
        """Handles dialogue greetings across listening operatives using SKILL.md language configs and CC-ELM."""
        speaker = self._speaker(speaker_id)
        speaker_name = (speaker or {}).get("name") or self.char_stats.get("name", "Adventurer")
        speaker_langs = self.get_character_languages(speaker)
        sx, sy, s_room = (speaker or {}).get("x", 220.0), (speaker or {}).get("y", 390.0), (speaker or {}).get("room", self.current_room)
        def_lang = getattr(self, "default_language", "Common")
        lang_kw = getattr(self, "language_keywords", {})
        lang_crit = {def_lang: "hello hi greetings hail well met common", **{l: lang_kw.get(l, l) for l in speaker_langs}}
        spoken_lang = evaluate_jev_decision(greeting_text, {"lang": Choice(criteria=lang_crit)})["lang"].choice or def_lang

        lexicon = getattr(self, "salutation_lexicon", {})
        def _salut_line(name: str, lang: str, fallback: str) -> str:
            nl = name.lower()
            smap = lexicon.get(nl) or next((v for k, v in lexicon.items() if k in nl), {})
            if smap:
                return smap.get(lang) or smap.get("Common") or smap.get(def_lang) or fallback
            if getattr(self, "world_model", None):
                return self.world_model.infer_transition("npc", name, f"greet {lang}", {"room": s_room})["narration"]
            return fallback

        responses = [f'[{speaker_name.upper()}]: speaks in {spoken_lang}, "{_salut_line(speaker_name, spoken_lang, greeting_text.capitalize() + "!")}"']
        listeners = sorted(
            ((p, math.hypot(p.get("x", sx) - sx, p.get("y", sy) - sy)) for pid, p in self.players.items()
             if (not speaker or pid != speaker.get("id")) and p.get("room") == s_room and math.hypot(p.get("x", sx) - sx, p.get("y", sy) - sy) <= 600.0),
            key=lambda x: x[1],
        )
        unintelligible = []
        for p, _ in listeners:
            p_name, p_langs = p.get("name", "Companion"), self.get_character_languages(p)
            shared = set(speaker_langs) & set(p_langs)
            if spoken_lang in p_langs:
                responses.append(f'[{p_name.upper()}]: replies in {spoken_lang}, "{_salut_line(p_name, spoken_lang, "Greetings, comrade.")}"')
            elif def_lang in shared or "Common" in shared:
                responses.append(f'[{p_name.upper()}]: replies in {def_lang}, "{_salut_line(p_name, def_lang, "Well met, friend!")}"')
            else:
                unintelligible.append(p_name)
        if unintelligible:
            responses.append(f"({', '.join(unintelligible)} listen closely but do not share {spoken_lang}.)")
        return "\n".join(responses)

    def step_ai_party_members(self, leader_player_id: str = None, allow_combat: bool = True) -> list[str]:
        """Uses deterministic archetype techniques and spacing geometry to control AI party companions."""
        logs = []
        with self.state_lock:
            self.ensure_ai_party_members()
            room_id = self.current_room
            b = self.room_bounds.get(room_id, {})
            W, H = b.get("width", 1024), b.get("height", 768)
            now = time.time()

            human_players = [p for p in self.players.values() if not p.get("is_ai") and p.get("room") == room_id]
            leader = self.players.get(leader_player_id) if (leader_player_id and leader_player_id in self.players and not self.players[leader_player_id].get("is_ai")) else None
            if not leader and human_players:
                leader = human_players[0]

            ai_members = [p for p in self.players.values() if p.get("is_ai") and p.get("room") == room_id]
            if not ai_members:
                return logs

            monsters = self.get_monsters_in_room(room_id)
            visible_monsters = [m for m in monsters if self.is_object_discovered("monster", m.get("raw_name", m.get("name", "")))]
            room_objs = b.get("obstacles", [])
            room_loot = self.room_items.get(room_id, [])
            ctx = {
                "room": room_id,
                "turn": self.turn_count,
                "monsters": [m.get("name", "") for m in visible_monsters],
                "items": list(room_loot)
            }

            ai_roles = getattr(self, "ai_roles", None) or {"fighter": ("fighter warrior", 48.0, 105.0, (56.0, 50.0), "melee", "strike", "Blade", 6, (65.0, 60.0), "march")}
            role_crit = {r: cfg[0] for r, cfg in ai_roles.items()}
            threat_crit = getattr(self, "threat_criteria", None) or {"boss": "boss titan juggernaut", "goblins": "raider grunt skirmisher sentinel beast"}
            for idx, ai_p in enumerate(ai_members):
                ai_p["last_active"] = now
                px, py = float(ai_p.get("x", self.player_x)), float(ai_p.get("y", self.player_y))
                # Priority 0: Auto-revive downed allies & reciprocate high-fives
                downed_allies = [hp for hp in self.players.values() if hp.get("room") == room_id and hp.get("is_downed") and hp.get("id") != ai_p.get("id")]
                if downed_allies:
                    dt = min(downed_allies, key=lambda hp: math.hypot(hp.get("x", px) - px, hp.get("y", py) - py))
                    dx_d, dy_d = float(dt.get("x", px)) - px, float(dt.get("y", py)) - py
                    dist_d = math.hypot(dx_d, dy_d)
                    if dist_d <= 155.0 and hasattr(self, "revive_player"):
                        logs.append(self.revive_player(dt["id"], ai_p["id"]))
                        continue
                    elif dist_d > 1.0:
                        self._move_ai_companion_avoiding_obstacles(ai_p, (dx_d / dist_d) * 56.0, (dy_d / dist_d) * 56.0, W, H)
                        continue
                hf_human = next((hp for hp in human_players if ((hp.get("emote") or {}).get("key") == "highfive" if isinstance(hp.get("emote"), dict) else hp.get("emote") == "highfive") and ((hp.get("emote") or {}).get("ts", 0) > now - 3.5 if isinstance(hp.get("emote"), dict) else hp.get("emote_until", 0) > now) and math.hypot(hp.get("x", px) - px, hp.get("y", py) - py) < 175.0), None)
                if hf_human and (ai_p.get("emote") or {}).get("key") != "highfive":
                    ai_p["emote"] = {"key": "highfive", "posture": "highfive", "label": "High-Five!", "ts": now}
                    ai_p["emote_until"] = now + 2.5
                    logs.append(f"🙌 [PAIRED HIGH-FIVE]: {ai_p['name']} slaps palms with {hf_human['name']}! (+5 Momentum)")
                cls_lower = str(ai_p.get("class", getattr(self, "default_hero", {}).get("class", "Adventurer"))).lower()
                role = evaluate_jev_decision(cls_lower, {"r": Choice(criteria=role_crit)})["r"].choice or next(iter(ai_roles))
                _, step_px, atk_range, (b_min, b_max), mode, action_label, def_weapon, dmg_val, (fwd_f, right_f), behavior_tag = ai_roles[role]
                is_ranged, is_rogue, is_cleric = role in ("archer", "wizard"), role == "rogue", role == "cleric"

                target_human = leader
                if human_players:
                    if is_cleric:
                        injured = [hp for hp in human_players if hp.get("hp", 36) < hp.get("max_hp", 36)]
                        target_human = min(injured, key=lambda hp: hp.get("hp", 36) / max(1, hp.get("max_hp", 36))) if injured else min(human_players, key=lambda hp: math.hypot(hp.get("x", px) - px, hp.get("y", py) - py))
                    else:
                        target_human = human_players[idx % len(human_players)] if len(human_players) > 1 else human_players[0]

                lx, ly = float((target_human or {}).get("x", self.player_x)), float((target_human or {}).get("y", self.player_y))
                l_facing = ((target_human or {}).get("facing", "east")).lower()
                lfx = 1.0 if "east" in l_facing else (-1.0 if "west" in l_facing else 0.0)
                lfy = 1.0 if "south" in l_facing else (-1.0 if "north" in l_facing else 0.0)
                if lfx == 0.0 and lfy == 0.0:
                    lfx = 1.0
                lf_mag = math.hypot(lfx, lfy)
                lfx, lfy = lfx / lf_mag, lfy / lf_mag
                lrx, lry = -lfy, lfx

                if visible_monsters:
                    nearest_m = min(visible_monsters, key=lambda m: math.hypot((m["x"] + 32) - px, (m["y"] + 32) - py))
                    mx, my = float(nearest_m["x"] + 32), float(nearest_m["y"] + 32)
                    dist_m = math.hypot(mx - px, my - py)
                    move_dx, move_dy = 0.0, 0.0
                    if mode == "kite":
                        if dist_m < b_min:
                            move_dx, move_dy = -((mx - px) / max(1.0, dist_m)) * step_px, -((my - py) / max(1.0, dist_m)) * step_px
                        elif dist_m > b_max:
                            move_dx, move_dy = ((mx - px) / max(1.0, dist_m)) * step_px, ((my - py) / max(1.0, dist_m)) * step_px
                    elif mode == "flank":
                        ang = math.atan2(my - ly, mx - lx)
                        fx, fy = mx + 68.0 * math.cos(ang), my + 68.0 * math.sin(ang)
                        df = math.hypot(fx - px, fy - py)
                        if df > 24.0:
                            move_dx, move_dy = ((fx - px) / max(1.0, df)) * min(step_px, df), ((fy - py) / max(1.0, df)) * min(step_px, df)
                    elif mode == "mid":
                        mid_x, mid_y = (lx * 0.45 + mx * 0.55), (ly * 0.45 + my * 0.55)
                        dm = math.hypot(mid_x - px, mid_y - py)
                        if dm > 28.0:
                            move_dx, move_dy = ((mid_x - px) / max(1.0, dm)) * min(step_px, dm), ((mid_y - py) / max(1.0, dm)) * min(step_px, dm)
                    elif dist_m > b_min:
                        sd = min(step_px, dist_m - b_max)
                        move_dx, move_dy = ((mx - px) / max(1.0, dist_m)) * sd, ((my - py) / max(1.0, dist_m)) * sd

                    if abs(move_dx) > 1.0 or abs(move_dy) > 1.0:
                        self._move_ai_companion_avoiding_obstacles(ai_p, move_dx, move_dy, W, H)
                        px, py = float(ai_p["x"]), float(ai_p["y"])
                        dist_m = math.hypot(mx - px, my - py)
                    else:
                        ai_p["is_moving"] = False

                    dx_f, dy_f = mx - px, my - py
                    ai_p["facing"] = ("south" if dy_f > 8 else "north" if dy_f < -8 else "") + ("east" if dx_f > 8 else "west" if dx_f < -8 else "") or ai_p.get("facing", "east")
                    self.world_model.infer_transition("character", ai_p["name"], f"{action_label}_{nearest_m['name']}", ctx)

                    if allow_combat and self.room_monsters.get(room_id):
                        last_diag_time = getattr(self, "_last_ai_dialogue_time", 0.0)
                        if (now - last_diag_time > 18.0) and ((self.turn_count + idx) % 3 == 0):
                            m_raw = str(nearest_m.get("raw_name", nearest_m.get("name", ""))).lower()
                            diag_cat = evaluate_jev_decision(m_raw, {"c": Choice(criteria=threat_crit)})["c"].choice or "goblins"
                            d_line = self.get_ai_companion_dialogue(ai_p.get("class", ""), diag_cat)
                            if d_line:
                                self._last_ai_dialogue_time = now
                                logs.append(f'🗣️ [{ai_p["name"]}]: "{d_line}"')

                        comp_t = getattr(self, "companion_tactics", {}).get(cls_lower, {})
                        weapon_desc = comp_t.get("weapon") or comp_t.get("technique") or ai_p.get("weapon") or def_weapon
                        if is_cleric and target_human and target_human.get("hp", 36) < target_human.get("max_hp", 36) * 0.70:
                            heal_amt = 8
                            target_human["hp"] = min(target_human.get("max_hp", 36), target_human.get("hp", 36) + heal_amt)
                            if "char_stats" in target_human:
                                target_human["char_stats"]["current_hp"] = target_human["hp"]
                            self.char_stats["current_hp"] = target_human["hp"]
                            logs.append(f"✨ [Squad AI - {ai_p['name']}]: Restores +{heal_amt} {getattr(self, 'terminology', {}).get('hp_label', 'HP')} to {target_human['name']}!")
                        elif dist_m <= float(atk_range):
                            self.pending_action_visuals = getattr(self, "pending_action_visuals", [])
                            self.pending_action_visuals.append({
                                "type": "projectile" if is_ranged else "swing", "attacker_id": ai_p.get("id"), "target_id": nearest_m.get("id"),
                                "from_x": float(ai_p.get("x", 500)), "from_y": float(ai_p.get("y", 400)),
                                "to_x": float(nearest_m.get("x", 500) + 32), "to_y": float(nearest_m.get("y", 400) + 32),
                                "is_ranged": is_ranged, "weapon": comp_t.get("weapon") or def_weapon
                            })
                            cur_m_hp = int(nearest_m.get("hp", 12))
                            actual_dmg = min(int(dmg_val), cur_m_hp)
                            nearest_m["hp"] = max(0, cur_m_hp - actual_dmg)
                            if nearest_m["hp"] <= 0:
                                self.defeated_monsters.add(nearest_m.get("id", nearest_m["name"]))
                                self.defeated_monsters.add(nearest_m.get("raw_name", nearest_m["name"]))
                                logs.append(f"⚔️ [Squad AI - {ai_p['name']}]: Neutralizes {nearest_m['name']} with {weapon_desc}! ({actual_dmg} deterministic damage)")
                                rem_alive = [m for m in self.get_monsters_in_room(room_id) if m.get("hp", 0) > 0]
                                if not rem_alive:
                                    v_notes = self.finish_room_combat(room_id)
                                    logs.extend(v_notes)
                            else:
                                logs.append(f"⚔️ [Squad AI - {ai_p['name']}]: Strikes {nearest_m['name']} with {weapon_desc} for {actual_dmg} damage! ({nearest_m['hp']}/{nearest_m['max_hp']} {getattr(self, 'terminology', {}).get('hp_label', 'HP')} left)")
                            if role == "wizard" and len(getattr(self, "combo_fields", [])) < 3 and hasattr(self, "spawn_combo_field"):
                                self.spawn_combo_field("frost_mist", mx, my, ai_p.get("id"))
                            elif hasattr(self, "check_and_trigger_combos"):
                                logs.extend(self.check_and_trigger_combos("fire" if is_ranged else "kinetic", mx, my, ai_p.get("id")))
                else:
                    time_since_move = now - getattr(self, "last_human_move_time", 0.0)
                    dist_to_leader = math.hypot(lx - px, ly - py)
                    # When the player is not moving and companion is within loose formation distance (52px to 210px),
                    # companions immediately hold position and face outward / toward leader without jittering.
                    if (time_since_move > 0.35 or not getattr(self, "is_player_moving", False)) and 52.0 <= dist_to_leader <= 210.0:
                        dfx, dfy = lx - px, ly - py
                        if abs(dfx) > 6 or abs(dfy) > 6:
                            ai_p["facing"] = ("south" if dfy > 6 else "north" if dfy < -6 else "") + ("east" if dfx > 6 else "west" if dfx < -6 else "") or ai_p.get("facing", "east")
                        ai_p["is_moving"] = False
                        continue

                    goal_x = lx + lfx * fwd_f + lrx * right_f
                    goal_y = ly + lfy * fwd_f + lry * right_f
                    if is_rogue and room_loot:
                        ix, iy = min(W - GRID_SQ, int(W * 0.48)) + GRID_SQ // 2, int(H * 0.62) + GRID_SQ // 2
                        if math.hypot(ix - lx, iy - ly) < 280.0:
                            goal_x, goal_y = float(ix), float(iy)
                    elif role == "wizard":
                        for obs in room_objs:
                            o_name = (obs.get("name", "") if isinstance(obs, dict) else "").lower()
                            r_rect = obs["rect"] if isinstance(obs, dict) else obs
                            if r_rect and len(r_rect) == 4 and o_name and self.classify_scenery_object(o_name).get("kind") == "shrine":
                                ox_c, oy_c = r_rect[0] + r_rect[2] * 0.5, r_rect[1] + r_rect[3] * 0.5
                                if math.hypot(ox_c - lx, oy_c - ly) < 240.0:
                                    goal_x, goal_y = lx * 0.45 + ox_c * 0.55, ly * 0.45 + oy_c * 0.55
                                    break

                    goal_x = max(36.0, min(W - 36.0, goal_x))
                    goal_y = max(36.0, min(H - 36.0, goal_y))
                    dist_goal = math.hypot(goal_x - px, goal_y - py)
                    if dist_goal > 32.0:
                        step_dist = min(step_px, max(12.0, dist_goal * 0.55))
                        mdx = ((goal_x - px) / max(1.0, dist_goal)) * step_dist
                        mdy = ((goal_y - py) / max(1.0, dist_goal)) * step_dist
                        self._move_ai_companion_avoiding_obstacles(ai_p, mdx, mdy, W, H)
                        self.world_model.infer_transition("character", ai_p["name"], f"{behavior_tag}_{ai_p.get('facing', 'east')}", ctx)
                    else:
                        ai_p["is_moving"] = False

                    last_diag_time = getattr(self, "_last_ai_dialogue_time", 0.0)
                    if (now - last_diag_time > 30.0) and ((self.turn_count + idx) % 5 == 0):
                        diag_cat = "loot" if room_loot else "dungeon"
                        d_line = self.get_ai_companion_dialogue(ai_p.get("class", ""), diag_cat)
                        if d_line:
                            self._last_ai_dialogue_time = now
                            logs.append(f'🗣️ [{ai_p["name"]}]: "{d_line}"')

            self.scene_dirty = True
        return logs

    def _move_ai_companion_avoiding_obstacles(self, ai_p: dict, mdx: float, mdy: float, W: int, H: int):
        ox, oy = float(ai_p.get("x", 360.0)), float(ai_p.get("y", 390.0))
        base_ang = math.atan2(mdy, mdx)
        step_len = math.hypot(mdx, mdy)
        if step_len < 0.5:
            ai_p["is_moving"] = False
            return
        other_positions = [
            (float(p.get("x", 0)), float(p.get("y", 0)))
            for pid, p in self.players.items()
            if pid != ai_p["id"] and p.get("room") == self.current_room
        ]
        for m in self.get_monsters_in_room(self.current_room):
            if m.get("hp", 0) > 0:
                other_positions.append((float(m.get("x", 0)) + 32.0, float(m.get("y", 0)) + 32.0))

        close_entities = [(x, y) for x, y in other_positions if math.hypot(ox - x, oy - y) < 56.0]
        if close_entities:
            rep_x = sum(ox - x for x, y in close_entities)
            rep_y = sum(oy - y for x, y in close_entities)
            rep_mag = math.hypot(rep_x, rep_y)
            if rep_mag > 0.1:
                base_ang = math.atan2(math.sin(base_ang) + (rep_y / rep_mag) * 0.25, math.cos(base_ang) + (rep_x / rep_mag) * 0.25)

        for deg_offset in (0, 25, -25, 50, -50, 75, -75):
            ang = base_ang + math.radians(deg_offset)
            cx = max(32.0, min(W - 32.0, ox + step_len * math.cos(ang)))
            cy = max(32.0, min(H - 32.0, oy + step_len * math.sin(ang)))
            if not self.check_collision(cx, cy):
                if not any(math.hypot(cx - x, cy - y) < 56.0 for x, y in other_positions):
                    dx_actual, dy_actual = cx - ox, cy - oy
                    actual_dist = math.hypot(dx_actual, dy_actual)
                    if actual_dist > 1.2:
                        ai_p["facing"] = ("south" if dy_actual > 0.5 else "north" if dy_actual < -0.5 else "") + ("east" if dx_actual > 0.5 else "west" if dx_actual < -0.5 else "") or ai_p.get("facing", "east")
                        ai_p["is_moving"] = True
                        ai_p["last_move_time"] = time.time()
                    else:
                        ai_p["is_moving"] = False
                    ai_p["x"], ai_p["y"] = round(cx, 1), round(cy, 1)
                    return
        ai_p["is_moving"] = False

    def find_open_position(self, bx: float, by: float, exclude_player_id: str = None, min_spacing: float = 64.0) -> tuple[float, float]:
        b = self.room_bounds.get(self.current_room, {})
        mw, mh = b.get("width", 1024), b.get("height", 768)
        ex = [(float(p.get("x", bx)), float(p.get("y", by))) for pid, p in self.players.items() if pid != exclude_player_id and p.get("room") == self.current_room]
        if not self.check_collision(bx, by) and not any(math.hypot(bx - x, by - y) < min_spacing for x, y in ex): return float(bx), float(by)
        best, best_d = None, 0.0
        for r in [64.0, 85.0, 110.0, 140.0, 175.0, 215.0]:
            for deg in range(0, 360, 30):
                cx, cy = max(40.0, min(mw - 40.0, bx + r * math.cos(math.radians(deg)))), max(40.0, min(mh - 40.0, by + r * math.sin(math.radians(deg))))
                if not self.check_collision(cx, cy):
                    dists = [math.hypot(cx - x, cy - y) for x, y in ex]
                    if not dists or min(dists) >= min_spacing: return round(cx, 1), round(cy, 1)
                    if min(dists) > best_d: best_d, best = min(dists), (round(cx, 1), round(cy, 1))
        return best or (float(bx), float(by))

    def check_portal_transition(self, px: float, py: float, dx: float = 0.0, dy: float = 0.0) -> tuple[str | None, str | None, list | None]:
        b = self.room_bounds.get(self.current_room, {})
        W, H = b.get("width", 1024), b.get("height", 768)
        for portal in b.get("portals", []):
            rx, ry, rw, rh = portal["rect"]
            p_dir = portal.get("direction", "").lower()
            dir_matches = ((dx == 0.0 and dy == 0.0) or any(w in p_dir for w in ("up", "down", "stairs"))
                           or ("west" in p_dir and dx < 0) or ("east" in p_dir and dx > 0) or ("north" in p_dir and dy < 0) or ("south" in p_dir and dy > 0))
            if dir_matches and rx <= px <= rx + rw and ry <= py <= ry + rh:
                t_room = portal["target"]
                if (g_id := self.find_gate(self.current_room, t_room)):
                    self.unlocked_gates.add(g_id)
                t_name = self.rooms_def.get(t_room, {}).get('name', t_room.replace('_', ' ').title())
                return t_room, f"You cross seamlessly into {t_name}.", portal.get("target_spawn")

        r_info = self.rooms_def.get(self.current_room, {})
        matrix_adj = getattr(self, "sector_adjacency", {}).get(self.current_room, {})
        cx, cy = max(50.0, min(W - 50.0, px)), max(50.0, min(H - 50.0, py))
        for b_dir, cond, target_sp in (
            ("east", px >= W + 450.0 and dx > 0, [60.0, cy]), ("west", px <= -450.0 and dx < 0, [W - 60.0, cy]),
            ("south", py >= H + 450.0 and dy > 0, [cx, 60.0]), ("north", py <= -450.0 and dy < 0, [cx, H - 60.0]),
        ):
            t_room = matrix_adj.get(b_dir) or (r_info[b_dir][0] if b_dir in r_info else None)
            if cond and t_room:
                if (g_id := self.find_gate(self.current_room, t_room)):
                    self.unlocked_gates.add(g_id)
                t_name = self.rooms_def.get(t_room, {}).get('name', t_room.replace('_', ' ').title())
                return t_room, f"You journey {b_dir} across open terrain into {t_name}.", target_sp
        return None, None, None

    def _trigger_event(self, ev_id: str, ev: dict) -> tuple[str, bool]:
        self.triggered_events.add(ev_id)
        act = ev.get("actions", {})
        for m in act.get("spawn_monsters", []):
            if m not in self.room_monsters.setdefault(self.current_room, []): self.room_monsters[self.current_room].append(m)
        return act.get("message", f"Event triggered: {ev.get('name', ev_id)}"), bool(act.get("battle_mode"))

    def check_events_proximity(self, px: float = None, py: float = None) -> tuple[str, bool]:
        cx_p, cy_p = (self.player_x if px is None else px), (self.player_y if py is None else py)
        msgs, battle = [], False
        b_obs = self.room_bounds.get(self.current_room, {}).get("obstacles", [])
        for ev_id, ev in self.events_def.items():
            if ev.get("room") != self.current_room:
                continue
            if ev_id in self.triggered_events:
                sp_mons = ev.get("actions", {}).get("spawn_monsters", [])
                if not sp_mons or any(m in self.defeated_monsters or m in self.room_monsters.get(self.current_room, []) for m in sp_mons):
                    continue
                self.triggered_events.discard(ev_id)

            prox = ev.get("trigger", {}).get("proximity")
            if prox:
                cx_ev, cy_ev = prox.get("center", [0, 0])
                rad_ev = prox.get("radius", 60)
                in_range = (math.hypot(cx_p - cx_ev, cy_p - cy_ev) <= rad_ev)
                obs_kws = prox.get("obstacle_keywords", ())
                if not in_range and obs_kws:
                    obs_rad = float(prox.get("obstacle_radius", 85.0))
                    for obs in b_obs:
                        if isinstance(obs, dict) and any(k in obs.get("name", "").lower() for k in obs_kws):
                            rx, ry, rw, rh = obs["rect"]
                            nearest_x = max(rx, min(cx_p, rx + rw))
                            nearest_y = max(ry, min(cy_p, ry + rh))
                            if math.hypot(cx_p - nearest_x, cy_p - nearest_y) <= obs_rad:
                                in_range = True
                                break
                if in_range:
                    m, b = self._trigger_event(ev_id, ev); msgs.append(m); battle = battle or b
        return "\n".join(msgs), battle

    def check_events_command(self, cmd: str) -> tuple[str, bool]:
        c_clean, msgs, battle = cmd.strip().lower(), [], False
        for ev_id, ev in self.events_def.items():
            if ev_id not in self.triggered_events and ev.get("room") == self.current_room:
                if any(re.search(pat, c_clean) for pat in ev.get("trigger", {}).get("command_patterns", [])):
                    m, b = self._trigger_event(ev_id, ev); msgs.append(m); battle = battle or b
        return "\n".join(msgs), battle

    def check_storyline_advancement(self) -> list[str]:
        out = []
        for ch_id, ch in list(self.chapters_def.items()):
            if ch_id in self.completed_chapters: continue
            trig = ch.get("completion_trigger", {})
            if not all(any(sm.lower() in dm.lower() for dm in self.defeated_monsters) for sm in trig.get("slain_monsters", [])): continue
            if not all(any(itm.lower() in inv.lower() for inv in self.inventory) for itm in trig.get("has_items", [])): continue
            self.completed_chapters.add(ch_id)
            act = ch.get("actions", {})
            out.append(act.get("broadcast_message", f"Storyline Chapter Complete: {ch.get('title', ch_id)}"))
            aw = act.get("award_bonus_item")
            if aw and aw not in self.inventory:
                self.inventory.append(aw); out.append(f"  * Milestone Reward Granted: You received {aw}!")
            if act.get("trigger_state"): self.story_flags.add(act["trigger_state"])
            ns = self.world_model.infer_transition("npc", "Chronicle", f"chapter_completed_{ch_id}", {"room": self.current_room, "turn": self.turn_count, "chapter": ch_id})
            if ns.get("narration"): out.append(f"  {ns['narration']}")
            if act.get("expand_world") and hasattr(self, "expand_continuum_storyline"):
                out.append(self.expand_continuum_storyline())
        return out

    def move_player_vector(self, dx: float, dy: float, player_id: str = None, target_x: float = None, target_y: float = None) -> dict:
        with self.state_lock:
            p = self.get_player(player_id)
            ox, oy = float(p["x"]), float(p["y"])
            if target_x is not None and target_y is not None:
                tx, ty = float(target_x), float(target_y)
                if abs(dx) < 0.1 and abs(dy) < 0.1:
                    dx, dy = tx - ox, ty - oy
            else:
                tx, ty = ox + dx, oy + dy
            if abs(dx) > 0.5 or abs(dy) > 0.5:
                self.last_human_move_time = time.time()
                dirs = ("east", "southeast", "south", "southwest", "west", "northwest", "north", "northeast")
                p["facing"] = dirs[int((math.degrees(math.atan2(dy, dx)) + 22.5) // 45) % 8]
            collided = False
            if not self.check_collision(tx, ty):
                p["x"], p["y"] = round(tx, 1), round(ty, 1)
            else:
                collided = True
                moved_sub = False
                for frac in (0.7, 0.45, 0.25):
                    sx, sy = ox + dx * frac, oy + dy * frac
                    if not self.check_collision(sx, sy):
                        p["x"], p["y"] = round(sx, 1), round(sy, 1)
                        moved_sub = True
                        break
                if not moved_sub:
                    if abs(dx) > 0.5 and not self.check_collision(tx, oy):
                        p["x"] = round(tx, 1)
                    elif abs(dy) > 0.5 and not self.check_collision(ox, ty):
                        p["y"] = round(ty, 1)
                    else:
                        base_ang = math.atan2(dy, dx)
                        step_len = math.hypot(dx, dy) * 0.85
                        for deg_off in (35, -35, 65, -65, 85, -85):
                            a_rad = base_ang + math.radians(deg_off)
                            cx, cy = ox + step_len * math.cos(a_rad), oy + step_len * math.sin(a_rad)
                            if not self.check_collision(cx, cy):
                                p["x"], p["y"] = round(cx, 1), round(cy, 1)
                                break
            actual_moved_dist = math.hypot(p["x"] - ox, p["y"] - oy)
            p["is_moving"] = (actual_moved_dist > 1.2)
            if p["is_moving"]:
                p["last_move_time"] = time.time()
            self.player_x, self.player_y = p["x"], p["y"]
            for pass_id, drv_id in list((getattr(self, "mount_passengers", None) or {}).items()):
                if drv_id == p["id"] and pass_id in self.players:
                    self.players[pass_id]["x"] = p["x"] - 24.0
                    self.players[pass_id]["y"] = p["y"] - 10.0
                    self.players[pass_id]["room"] = self.current_room
            for veh in (getattr(self, "room_vehicles", None) or {}).get(self.current_room, []):
                if (veh.get("crew") or {}).get("helm") == p["id"]:
                    veh["x"], veh["y"] = p["x"], p["y"]

            trans, msg, picked = self._apply_move_and_pickups(p, tx, ty, dx, dy, step_turn=False)

            ev_msg, battle = self.check_events_proximity(p["x"], p["y"])
            ch_ev = self.check_storyline_advancement()
            self.turn_count += 1
            self.in_game_minutes += 0.5
            ai_logs = []
            m_logs = []
            now_step = time.time()
            if not trans and (now_step - getattr(self, "_last_ai_step_time", 0.0) >= 0.22 or battle):
                self._last_ai_step_time = now_step
                m_logs = self.step_monsters_turn(self.current_room)
                ai_logs = self.step_ai_party_members(leader_player_id=p["id"], allow_combat=True)
                if hasattr(self, "step_autonomous_ecology"):
                    self.step_autonomous_ecology(self.current_room)
            m_narr = None
            if trans or battle or picked or m_logs or (self.turn_count % 8 == 0):
                m_narr, _ = self.step_simulation_world("character", p["name"], f"walk_{dx}_{dy}")
            parts = [x for x in [msg, ev_msg, "\n".join(ch_ev) if ch_ev else None, "\n".join(m_logs) if m_logs else None, "\n".join(ai_logs) if ai_logs else None, f"You acquired: {', '.join(picked)}!" if picked else None] if x]
            self.scene_dirty = True

            return {
                "player_id": p["id"], "player_name": p["name"], "player_class": p["class"], "player_x": p["x"], "player_y": p["y"], "player_facing": p.get("facing", "east"), "is_moving": bool(p.get("is_moving", False)),
                "players": list(self.players.values()), "collided": collided, "transition": trans, "battle_triggered": battle,
                "room_id": self.current_room, "room_name": self.rooms_def.get(self.current_room, {}).get("name", self.current_room),
                "message": "\n".join(parts) if parts else None, "model_narration": m_narr, "picked_up": picked, "inventory": self.inventory,
                "char_stats": self.get_player_char_stats(p["id"]), "is_won": self.is_won, "turn": self.turn_count,
                "living_world": self.get_living_world_payload(p["id"]) if hasattr(self, "get_living_world_payload") else None,
            }

    def get_inspectable_objects(self) -> list[dict]:
        objs, b = [], self.room_bounds.get(self.current_room, {})
        W, H = b.get("width", 1024), b.get("height", 768)
        for obs in b.get("obstacles", []):
            r, name = (obs["rect"], obs.get("name", "Terrain Obstacle")) if isinstance(obs, dict) else (obs, "Solid Obstacle")
            scenery_cls = self.classify_scenery_object(name)
            is_disc = self.is_object_discovered("obstacle", name)
            disp_name = name if is_disc else "Undiscovered Terrain"
            disp_detail = f"{scenery_cls['label']} (Physical obstacle)" if is_disc else "Unexamined terrain fixture"
            vis_spec = self.compositor.build_entity_visual_spec(category="scenery", name=name) if hasattr(self, "compositor") else None
            objs.append({
                "name": disp_name,
                "raw_name": name,
                "discovered": is_disc,
                "type": "scenery",
                "kind": scenery_cls["kind"],
                "visual_spec": vis_spec,
                "layer": "Scenery Object Layer",
                "detail": disp_detail,
                "rect": list(r)
            })
        for portal in b.get("portals", []):
            r, t = portal["rect"], portal.get("target", "")
            t_name = self.rooms_def.get(t, {}).get("name", t.replace('_', ' ').title())
            gid = self.find_gate(self.current_room, t)
            l_st = (" [Unlocked]" if gid in self.unlocked_gates else f" [Locked - Requires {self.gates_def[gid].get('key_item', 'Key')}]") if gid else ""
            p_name = portal.get("name", "Exit")
            is_disc = self.is_object_discovered("portal", p_name, t)
            disp_name = f"{p_name}{l_st}" if is_disc else "Unexplored Passage"
            disp_detail = f"Travel ({portal.get('direction', 'exit')}) to {t_name}" if is_disc else "Passage concealed or yet to be unsealed"
            objs.append({
                "name": disp_name,
                "raw_name": p_name,
                "discovered": is_disc,
                "type": "portal",
                "layer": "Portal / Passage Layer",
                "detail": disp_detail,
                "rect": list(r)
            })
        for idx, it_name in enumerate(self.room_items.get(self.current_room, [])):
            objs.append({"name": it_name, "raw_name": it_name, "discovered": True, "type": "item", "layer": "Ground Salvage Layer", "detail": "Ground item (Walk over or type 'take' to claim)", "rect": [min(W - GRID_SQ, int(W * 0.48) + idx * GRID_SQ), int(H * 0.62), GRID_SQ, GRID_SQ]})
        tm = getattr(self, "terminology", {})
        hp_lbl, role_lbl = tm.get("hp_label", "HP"), tm.get("sheet_role", "Hero").title()
        for m in self.get_monsters_in_room(self.current_room):
            m_name = m.get("name", "Threat")
            raw_m_name = m.get("raw_name", m_name)
            mx, my = int(m.get("x", 400)), int(m.get("y", 300))
            is_disc = self.is_object_discovered("monster", raw_m_name)
            disp_name = m_name if is_disc else "Lurking Threat"
            det = f"{m_name} | Spd {m.get('speed_ft', 30)}ft ({m.get('archetype', 'brute').title()}) | {hp_lbl}: {m.get('hp')}/{m.get('max_hp')} | Guard: {m.get('ac')} | Threat {m.get('cr')} | Atk: {m.get('attacks', 'Strike')}" if is_disc else "Hostile unit concealed in sector"
            objs.append({"name": disp_name, "raw_name": m_name, "discovered": is_disc, "type": "monster", "layer": "Hostile Threat Layer", "detail": det, "rect": [mx, my, GRID_SQ, GRID_SQ]})
        active = self.get_players_in_room(self.current_room) or [{"id": "default", "name": self.char_stats.get("name", "Adventurer"), "class": self.char_stats.get("class", "Adventurer"), "hp": self.char_stats.get("current_hp", 36), "max_hp": self.char_stats.get("max_hp", 36), "ac": self.char_stats.get("armor_class", 18), "x": self.player_x, "y": self.player_y, "z": 64.0}]
        for p in active:
            px, py, cls = p.get("x", self.player_x), p.get("y", self.player_y), p.get("class", "Adventurer")
            pz = max(15, min(180, int(round(float(p.get("z", GRID_SQ))))))
            objs.append({"name": f"{p.get('name', role_lbl)} ({cls})", "raw_name": p.get("name", role_lbl), "discovered": True, "player_id": p.get("id", ""), "type": "character", "layer": "Party Squad Layer", "detail": f"{role_lbl} Avatar | {cls} | {hp_lbl}: {p.get('hp', 36)}/{p.get('max_hp', 36)} | Guard: {p.get('ac', 18)}", "rect": [int(px - pz // 2), int(py - pz // 2), pz, pz]})
        def_lang = getattr(self, "default_language", "Common")
        for npc in self.get_npcs_in_room(self.current_room):
            nx, ny = int(npc.get("x", 400)), int(npc.get("y", 300))
            n_name, n_title = npc.get("name", "Citizen"), npc.get("title", "NPC")
            objs.append({"name": f"{n_name} ({n_title})", "raw_name": n_name, "npc_id": npc.get("id"), "discovered": True, "type": "npc", "layer": "NPC / Dialogue Layer", "detail": f"Allied NPC | {n_title} | Spoken Dialects: {', '.join(npc.get('languages', [def_lang]))} (Click or type 'talk {n_name}')", "rect": [nx - GRID_SQ // 2, ny - GRID_SQ // 2, GRID_SQ, GRID_SQ]})
        return objs

    def get_room_description(self) -> str:
        r_info = self.rooms_def.get(self.current_room, {})
        desc = [f"\n{'='*65}\n[SECTOR] {r_info.get('name', self.current_room)}\n{'='*65}"]
        if r_info.get("desc"):
            desc.append(r_info["desc"])
        elif hasattr(self, "get_narrative_harmony_payload"):
            nh = self.get_narrative_harmony_payload()
            if nh.get("vignette"):
                desc.append(nh["vignette"])
        if self.room_monsters.get(self.current_room): desc.append("\n[HOSTILE FORCES & ANOMALIES]:\n" + "\n".join(f"  * {m} (Hostile/Ready)" for m in self.room_monsters[self.current_room]))
        npcs_here = self.get_npcs_in_room(self.current_room)
        if npcs_here: desc.append("\n[ALLIED ENVOYS & CITIZENS]:\n" + "\n".join(f"  * {n['name']} ({n['title']}) - Speaks {', '.join(n['languages'])}" for n in npcs_here))
        if self.room_items.get(self.current_room): desc.append("\n[VISIBLE SALVAGE & RELICS]:\n" + "\n".join(f"  * {it}" for it in self.room_items[self.current_room]))
        desc.append("\n[EXITS & CONDUITS]:")
        for d in ("north", "south", "east", "west", "up", "down"):
            if d in r_info:
                tr, ed = r_info[d]
                g = self.find_gate(self.current_room, tr)
                st = (f" [SEALED - Requires {self.gates_def[g].get('key_item', 'Key')}]" if g not in self.unlocked_gates else " [UNSEALED]") if g else ""
                desc.append(f"  * {d.upper()}: {ed}{st}")
        desc.append(f"\n[INVENTORY]: {', '.join(self.inventory) if self.inventory else '(empty)'}")
        return "\n".join(desc)

    def find_gate(self, from_room: str, to_room: str):
        return next((gid for gid, g in self.gates_def.items() if g.get("room") == from_room and g.get("target_room") == to_room), None)

    def step_simulation_world(self, actor_type: str, actor_name: str, action_text: str, outcome: dict | None = None) -> tuple[str, str | None]:
        obs_names = [o.get("name", "") if isinstance(o, dict) else "Obstacle" for o in self.room_bounds.get(self.current_room, {}).get("obstacles", [])]
        ext_list = getattr(self, "extractable_items", [])
        ext_trigs = []
        if isinstance(ext_list, list):
            ext_trigs = [w for ext in ext_list for w in ext.get("trigger_words", [])] + [fk for ext in ext_list for fk in ext.get("fixture_keywords", [])]
        ctx = {"room": self.current_room, "turn": self.turn_count, "hp": self.char_stats.get("current_hp", 36), "max_hp": self.char_stats.get("max_hp", 36), "level": self.char_stats.get("level", 1), "monsters": list(self.room_monsters.get(self.current_room, [])), "items": list(self.room_items.get(self.current_room, [])), "inventory": list(self.inventory), "obstacles": obs_names, "known_monsters": [m.lower() for m in list(self.bestiary_def.keys()) + list(self.dragons_def.keys())], "extractable_triggers": ext_trigs}
        nr = self.world_model.infer_transition(actor_type, actor_name, action_text, ctx)
        segs = [nr["narration"]]
        if actor_type == "character":
            mons = self.room_monsters.get(self.current_room, [])
            if mons and not any(w in action_text.lower() for w in ("attack", "kill", "fight", "slay", "hit", "strike")):
                segs.append(self.world_model.infer_transition("monster", mons[0], "counter_stalk", ctx)["narration"])
            if self.turn_count % 3 == 0:
                segs.append(self.world_model.infer_transition("background", "environment", f"ambient_tick_{self.turn_count}", ctx)["narration"])
        try:
            effective_outcome = outcome or {
                "reward": 0.05,
                "hp_delta": 0,
                "items_acquired": 0,
                "combat_hit": 1 if any(w in action_text.lower() for w in ("hit", "strike", "attack")) else 0,
                "defeated_foes": 0,
                "room_changed": 0,
                "action_type": action_text.split("_")[0] if "_" in action_text else action_text.split(" ")[0]
            }
            self.world_model.learn_step(actor_type, actor_name, action_text, ctx, effective_outcome)
            if self.world_model.learning_step_count % 10 == 0:
                self.world_model.save_weights(WORLD_MODEL_WEIGHTS_PATH)
            self._log_dnd_experience(actor_type, actor_name, action_text, ctx, effective_outcome, nr.get("narration", ""))
        except Exception:
            pass
        return "\n".join(segs), nr.get("action_override_message")

    def _log_dnd_experience(self, actor_type: str, actor_name: str, action_text: str, ctx: dict, outcome: dict, narration: str):
        try:
            from .core_models import enqueue_async_io
            entry = {
                "timestamp": time.time(),
                "actor_type": actor_type,
                "actor_name": actor_name,
                "action": action_text,
                "room": ctx.get("room", ""),
                "turn": ctx.get("turn", 0),
                "hp": ctx.get("hp", 0),
                "reward": float(outcome.get("reward", 0.0)),
                "hit": bool(outcome.get("hit", outcome.get("combat_hit", False))),
                "narration": narration,
                "items": list(ctx.get("items", [])),
                "inventory": list(ctx.get("inventory", [])),
                "monsters": list(ctx.get("monsters", []))
            }
            history = getattr(self, "_exp_history_cache", None)
            if history is None:
                history = []
                if os.path.exists(SHARED_EXPERIENCE_LOG_PATH):
                    try:
                        with open(SHARED_EXPERIENCE_LOG_PATH, "r", encoding="utf-8") as f:
                            loaded = json.load(f)
                        if isinstance(loaded, list):
                            history = loaded[-1999:]
                    except Exception:
                        history = []
                self._exp_history_cache = history
            history.append(entry)
            if len(history) > 2000:
                del history[:len(history) - 2000]
            snapshot = list(history)
            def _write_hist(snap=snapshot, path=SHARED_EXPERIENCE_LOG_PATH):
                os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
                with open(path, "w", encoding="utf-8") as f:
                    json.dump(snap, f, ensure_ascii=False, separators=(",", ":"))
            enqueue_async_io("experience_history", _write_hist)
        except Exception:
            pass

    def converse_with_npc(self, user_input: str, player_id: str = None) -> str:
        """Manages bidirectional conversations with NPCs via cached skill lore and CC-ELM."""
        speaker = self._speaker(player_id)
        speaker_name = (speaker or {}).get("name") or self.char_stats.get("name", "Adventurer")
        speaker_langs, def_lang = self.get_character_languages(speaker), getattr(self, "default_language", "Common")
        s_room = (speaker or {}).get("room", self.current_room)
        room_npcs = self.get_npcs_in_room(s_room) or (self.get_npcs_in_room(self.current_room) if s_room != self.current_room else [])
        cmd_raw = user_input.strip()
        if not room_npcs:
            start_disp = self.rooms_def.get(self.start_room, {}).get("name", self.start_room)
            return f"There is no one here named '{user_input}' to converse with. Look around or explore {start_disp}!"

        m_talk = re.match(r"^(?:talk\s+to|speak\s+with|converse\s+with|ask|query|chat\s+with|tell)\s+([^:\?]+?)(?:\s+(?:about|regarding|on)\s+(.+)|:|\?|$)", cmd_raw, re.IGNORECASE)
        npc_query = m_talk.group(1).strip() if m_talk else cmd_raw
        topic_text = (m_talk.group(2) or "").strip() if m_talk else cmd_raw
        n_ans = evaluate_jev_decision(npc_query, {"npc": Choice(criteria={str(i): f"{n.get('id', '')} {n.get('name', '')}" for i, n in enumerate(room_npcs)})})["npc"]
        target_npc = room_npcs[int(n_ans.choice)] if n_ans.choice else room_npcs[0]
        if not m_talk and target_npc.get("name"):
            topic_text = re.sub(rf"\b(?:talk\s+to|ask|speak\s+with)?\s*{re.escape(target_npc['name'].split()[0])}\w*\b", "", cmd_raw, flags=re.IGNORECASE).strip(" ?:about,")

        npc_name, npc_title = target_npc.get("name", "Citizen"), target_npc.get("title", "Envoy")
        shared_langs = [l for l in speaker_langs if l in target_npc.get("languages", [def_lang])]
        spoken_lang = shared_langs[0] if shared_langs else def_lang
        clean_topic, topics_dict = topic_text.strip().lower(), target_npc.get("topics", {})
        if not clean_topic or clean_topic in ("hello", "hi", "greetings", "hail", "talk"):
            hints = ", ".join(topics_dict.keys()) if topics_dict else "sector rumors"
            return f'[{npc_name.upper()} ({npc_title})]: speaks in {spoken_lang},\n  "{target_npc.get("greeting", "Greetings.")}"\n\n💬 (Ask {npc_name.split()[-1]} about: {hints}, or ask open-domain questions.)'

        if topics_dict:
            t_ans = evaluate_jev_decision(clean_topic, {"t": Choice(criteria={tk: f"{tk.replace('_', ' ')} {ts}" for tk, ts in topics_dict.items()})})["t"]
            if t_ans.choice and (len(topics_dict) == 1 or t_ans.confidence >= 0.40):
                return f'[{speaker_name.upper()}]: asks in {spoken_lang} about {t_ans.choice.replace("_", " ")}.\n[{npc_name.upper()} ({npc_title})]: responds in {spoken_lang},\n  "{topics_dict[t_ans.choice]}"'

        lore = getattr(self, "lore_paragraphs", [])
        if lore:
            l_ans = evaluate_jev_decision(clean_topic, {"lore": Choice(criteria={str(i): p for i, p in enumerate(lore[:20])})})["lore"]
            if l_ans.choice and l_ans.confidence >= 0.20:
                return f'[{speaker_name.upper()}]: inquires in {spoken_lang}, "{topic_text}?"\n[{npc_name.upper()} ({npc_title})]: leans in and recounts in {spoken_lang},\n  "{lore[int(l_ans.choice)]}..."'

        thought = self.world_model.think(f"npc:{npc_name} topic:{topic_text}", num_tokens=20)[0] if getattr(self, "world_model", None) else ""
        reply = thought or "Stay vigilant on the road ahead."
        return f'[{speaker_name.upper()}]: speaks in {spoken_lang}, "{topic_text}?"\n[{npc_name.upper()} ({npc_title})]: replies in {spoken_lang},\n  "{reply}"'

    def answer_natural_language_query(self, user_input: str) -> str:
        """Answers natural language questions about the sector, objects, inventory, and Continuum lore via CC-ELM."""
        q_raw = user_input.strip()
        room = self.current_room
        r_name = self.rooms_def.get(room, {}).get("name", room.replace("_", " ").title())
        obs_names = [o.get("name", "") if isinstance(o, dict) else str(o) for o in self.room_bounds.get(room, {}).get("obstacles", [])]
        mon_names = [m.get("name", "") for m in self.get_monsters_in_room(room)]
        room_items = list(self.room_items.get(room, []))
        ext_list = [e for e in (getattr(self, "extractable_items", []) or []) if room in e.get("allowed_rooms", [e.get("room")] if e.get("room") else [])]

        candidates = {}
        for i, ext in enumerate(ext_list):
            inm = ext.get("item_name", "")
            status = "You have already retrieved this component." if inm in self.inventory else f"Can be salvaged/taken ({ext.get('success_message', 'Use take command')})"
            candidates[f"ext_{i}"] = (f"{inm} {' '.join(ext.get('fixture_keywords', []) + ext.get('trigger_words', []))}", f"Upon scanning {r_name}, {inm}: {status}")
        if obs_names:
            candidates["obstacles"] = (f"structures obstacles fixtures walls {' '.join(obs_names)}", f"Visible structures in {r_name}: {', '.join(obs_names)}.")
        if mon_names:
            candidates["monsters"] = (f"monsters enemies threats hostiles foes {' '.join(mon_names)}", f"Hostile units present: {', '.join(mon_names)}.")
        if room_items:
            candidates["items"] = (f"items loot salvage take ground {' '.join(room_items)}", f"Salvageable items in sector: {', '.join(room_items)}.")
        candidates["inventory"] = ("inventory pack carrying bag pockets gear", f"You are currently carrying: {', '.join(self.inventory) if self.inventory else 'nothing'}.")

        resp = evaluate_jev_decision(q_raw, {"q": Choice(criteria={k: v[0] for k, v in candidates.items()})})["q"]
        if resp.choice and resp.confidence >= 0.25:
            return candidates[resp.choice][1]
        if hasattr(self, "world_model") and self.world_model:
            thought, _ = self.world_model.think(f"sector:{r_name} query:{q_raw} items:{','.join(room_items)}", num_tokens=24)
            if thought:
                return f"Regarding '{user_input}' in {r_name}: {thought}"
        return f"Regarding '{user_input}': Sector telemetry shows no anomalies beyond what is listed in the sector overview."

    def execute_command(self, user_input: str, player_id: str = None) -> str:
        self.turn_count += 1
        cmd = user_input.strip().lower()
        actor = (self.players.get(player_id) or {}).get("name") or self.char_stats.get("name", "Adventurer")
        if cmd in ("1", "2", "3", "4", "5"):
            p = self.register_player(player_id or "player_1", archetype_index=int(cmd) - 1)
            tm = getattr(self, "terminology", {})
            return f"{tm.get('sheet_role', 'Hero').title()} Archetype Selected: {p['name']} ({p['class']}) — {tm.get('hp_label', 'HP')}: {p['hp']}/{p['max_hp']} | Guard: {p['ac']}\n{self.get_room_description()}"
        ev_msg, _ = self.check_events_command(user_input)
        if ev_msg:
            narr, _ = self.step_simulation_world("character", actor, user_input)
            self.scene_dirty = True
            return f"{narr}\n\n{ev_msg}\n{self.get_room_description()}"

        if (travel_match := re.search(r"^(?:travel|fast\s*travel|teleport|warp|portal\s+to|goto)\s+(.+)$", cmd)):
            narr, _ = self.step_simulation_world("character", actor, user_input)
            dest_q = travel_match.group(1).strip()
            r_crit = {k: f"{k.replace('_', ' ')} {v.get('name', '')}" for k, v in self.rooms_def.items()}
            r_ans = evaluate_jev_decision(dest_q, {"r": Choice(criteria=r_crit)})["r"] if r_crit else None
            if r_ans and r_ans.choice and r_ans.confidence >= 0.25:
                return f"{narr}\n\n{self.fast_travel_to_sector(r_ans.choice, player_id)}\n{self.get_room_description()}"
            return f"Fast-travel destination '{dest_q}' not found on the World Map. Try 'travel {self.start_room}'."

        if hasattr(self, "handle_living_world_command"):
            lw_exp = self.handle_living_world_command(user_input, player_id=player_id, explicit_only=True)
            if lw_exp:
                narr, _ = self.step_simulation_world("character", actor, user_input)
                return f"{narr}\n{lw_exp}"

        crit = dict(getattr(self, "intent_criteria", {}) or {}) or {"attack": "attack", "move": "go move", "look": "look", "take": "take", "inventory": "inventory", "use": "use", "rest": "rest"}
        intent = "dialogue" if (self.is_free_conversation(cmd, player_id) and not cmd.endswith("?")) else ("question" if cmd.endswith("?") else evaluate_jev_decision(cmd, {"intent": Choice(criteria=crit)})["intent"].choice)
        long_toks = getattr(self, "terminology", {}).get("long_rest_name", "long rest").lower().split()
        is_long = any(w in cmd for w in ("long", "sleep", *long_toks))
        self.in_game_minutes += (480.0 if is_long else 60.0) if intent == "rest" else (0.1 if intent == "attack" else 1.0)
        narr, ov_msg = self.step_simulation_world("character", actor, user_input)

        if intent == "question": return f"{narr}\n{self.answer_natural_language_query(user_input)}"
        if intent == "dialogue": return self.converse_with_npc(user_input, player_id=player_id)
        if intent == "salutation":
            room_npcs = self.get_npcs_in_room((self.players.get(player_id) or {}).get("room", self.current_room))
            if room_npcs and any(tok in cmd for n in room_npcs for tok in n.get("name", "").lower().split()):
                return self.converse_with_npc(user_input, player_id=player_id)
            return self.respond_to_salutation(player_id, user_input)

        if ov_msg and (tm := re.search(r"(?:take|get|grab|pick\s*up|loot|salvage)\s+(.+)", cmd)):
            res = self.take_item(tm.group(1).strip())
            return f"{narr}\n{res if not res.startswith('There is no') else ov_msg}"

        if intent == "rest": return f"{narr}\n{self.long_rest() if is_long else self.short_rest()}"
        if any(w in cmd for w in ("level up", "levelup", "ascend")): return f"{narr}\n{self.level_up()}"
        if intent == "inventory":
            return f"{narr}\n{self.get_character_sheet_text(player_id) if any(w in cmd for w in ('stat', 'char', 'sheet')) else ('Carrying: ' + (', '.join(self.inventory) if self.inventory else 'nothing'))}"
        if intent == "move":
            dir_crit = {"north": "north n", "south": "south s", "east": "east e", "west": "west w", "up": "up u stairs climb", "down": "down d"}
            return f"{narr}\n{self.move(evaluate_jev_decision(cmd, {'d': Choice(criteria=dir_crit)})['d'].choice or 'north', player_id)}"
        if intent == "attack": return f"{narr}\n{self.combat(cmd, player_id=player_id)}"
        if intent == "take":
            tm = re.search(r"(?:take|get|grab|pick\s*up|loot|salvage)\s+(.+)", cmd)
            target = tm.group(1).strip() if tm else re.sub(r"\b(take|get|salvage)\b", "", cmd).strip()
            return f"{narr}\n{self.take_item(target)}"
        if intent == "drop":
            drm = re.search(r"(?:drop|discard|leave)\s+(.+)", cmd)
            return f"{narr}\n{self.drop_item(drm.group(1).strip() if drm else cmd.replace('drop', '').strip())}"
        if intent == "look": return f"{narr}\n{self.get_room_description()}"
        if intent == "save_load":
            if (sm := re.search(r"^save(?:\s+game)?(?:\s+(.+))?$", cmd)): return f"{narr}\n[SAVE]: {self.save_game((sm.group(1) or f'save_turn_{self.turn_count}').strip())}"
            if (lm := re.search(r"^load(?:\s+game)?\s+(.+)$", cmd)): return f"{narr}\n[LOAD]: {self.load_game(lm.group(1).strip())}\n{self.get_room_description()}"
            if (dlm := re.search(r"^delete(?:\s+game|\s+save)?\s+(.+)$", cmd)): return f"{narr}\n[DELETE]: {self.delete_game(dlm.group(1).strip())}"
            if (rnm := re.search(r"^rename(?:\s+game|\s+save)?\s+(\S+)\s+(?:to\s+)?(\S+)$", cmd)): return f"{narr}\n[RENAME]: {self.rename_game(rnm.group(1).strip(), rnm.group(2).strip())}"
            sl = self.list_saved_games()
            return f"{narr}\nNo saved games found." if not sl else "\n".join([f"{narr}\nSAVED CHRONICLES:"] + [f"  * {s['name']} | {s['room']} | Turn {s['turn']} | {s['size_bytes']} B" for s in sl])
        if intent == "use": return f"{narr}\n{self.use_item(cmd)}"
        if hasattr(self, "handle_living_world_command"):
            lw_sem = self.handle_living_world_command(user_input, player_id=player_id, explicit_only=False)
            if lw_sem:
                return f"{narr}\n{lw_sem}"
        return f"{narr}\nUnrecognized command '{user_input}'. Try: move, attack, take <item>, drop <item>, look, inventory, or save."

