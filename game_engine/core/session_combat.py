"""Deterministic skill-based combat encounters, momentum combo chains, inventory manipulation, calibration rests, persistence, and 2D/3D visual rendering."""
import os, sys, re, time, math, glob, json, io, base64, zlib, struct, copy
import numpy as np
from PIL import Image, ImageDraw
try:
    import simplejpeg
except ImportError:
    simplejpeg = None
_CV2_MOD = False

def _get_cv2():
    global _CV2_MOD
    if _CV2_MOD is False:
        try:
            import cv2 as _c
            _c.setUseOptimized(True)
            _c.ocl.setUseOpenCL(False)
            _CV2_MOD = _c
        except Exception:
            _CV2_MOD = None
    return _CV2_MOD
from .constants import SAVES_DIR, GRID_SQ, SAVE_FRAME_TO_DISK, FRAME_OUT, WORLD_MODEL_WEIGHTS_PATH, SHARED_EXPERIENCE_LOG_PATH
from .core_models import Choice, evaluate_jev_decision

class SessionCombatMixin:
    def _term(self, key: str, default):
        return getattr(self, "terminology", {}).get(key, default)

    def fast_travel_to_sector(self, dest_room: str, player_id: str = None) -> str:
        """Instant open-world fast travel to any charted sector across the game world."""
        with self.state_lock:
            world_name = self._term("world_name", "realm")
            if dest_room not in self.rooms_def:
                return f"Sector '{dest_room}' does not exist in the {world_name}."
            old_room = self.current_room
            self.current_room = dest_room
            self.visited_rooms.add(dest_room)
            sp = self.room_bounds.get(dest_room, {}).get("spawn", [512, 384])
            self.player_x, self.player_y = float(sp[0]), float(sp[1])
            p = self.get_player(player_id) if player_id else None
            if p:
                p["room"] = dest_room
                p["x"], p["y"] = self.player_x, self.player_y
            for pid, op in self.players.items():
                if pid != (player_id or "player_1"):
                    op["room"] = dest_room
                    op["x"], op["y"] = self.find_open_position(self.player_x, self.player_y, exclude_player_id=pid, min_spacing=64.0)
            self.scene_dirty = True
            dest_name = self.rooms_def.get(dest_room, {}).get("name", dest_room.replace('_', ' ').title())
            return f"🌀 [FAST TRAVEL]: Warped across the {world_name} from {old_room.replace('_', ' ').title()} to {dest_name}."

    def move(self, direction: str, player_id: str = None) -> str:
        r_info = self.rooms_def.get(self.current_room, {})
        if direction not in r_info: return f"You cannot go {direction.upper()} from here."
        t_room, _ = r_info[direction]
        gid = self.find_gate(self.current_room, t_room)
        u_msg = ""
        if gid:
            self.unlocked_gates.add(gid)
        old_room = self.current_room
        self.current_room = t_room
        self.visited_rooms.add(t_room)
        matching_portal = next((p for p in self.room_bounds.get(old_room, {}).get("portals", []) if p.get("target") == t_room), None)
        sp = matching_portal.get("target_spawn") if matching_portal and matching_portal.get("target_spawn") else self.room_bounds.get(self.current_room, {}).get("spawn", [360, 390])
        self.player_x, self.player_y = sp[0], sp[1]
        for pid, po in self.players.items():
            po["room"] = t_room
            po["x"], po["y"] = (float(sp[0]), float(sp[1])) if pid == player_id else self.find_open_position(sp[0], sp[1], exclude_player_id=pid, min_spacing=64.0)
        self.scene_dirty = True; self.check_win()
        return f"{u_msg}{self.get_room_description()}"

    def combat_detailed(self, user_input: str, player_id: str = None) -> tuple[str, bool, dict]:
        is_atk = any(w in user_input.lower() for w in ("attack", "kill", "fight", "slay", "hit", "strike", "cleave", "weave", "shoot"))
        res = self.execute_command(user_input, player_id=player_id)
        m_logs = self.step_monsters_turn(self.current_room)
        ai_logs = self.step_ai_party_members(leader_player_id=player_id, allow_combat=True)
        extra_logs = (m_logs or []) + (ai_logs or [])
        if extra_logs:
            res = f"{res}\n" + "\n".join(extra_logs)
        combat_info = getattr(self, "last_combat_result", None) or {}
        return res, is_atk and any(k in res for k in ("strike down", "slain", "secured", "neutralized")), combat_info

    def compute_skill_value(self, expr_str: str) -> tuple[int, list[int], int]:
        """
        100% deterministic skill-based value resolver (replaces legacy dice notation with exact midpoint/fixed mastery values).
        Returns (total, components, modifier).
        """
        if not expr_str or not isinstance(expr_str, str):
            return 0, [], 0
        s = expr_str.strip().replace(" ", "").lower()
        m = re.match(r"^(\d*)d(\d+)([+-]\d+)?$", s)
        if not m:
            try:
                val = int(s)
                return val, [val], 0
            except ValueError:
                return 0, [], 0
        num = int(m.group(1)) if m.group(1) else 1
        sides = int(m.group(2))
        mod = int(m.group(3)) if m.group(3) else 0
        if sides <= 0 or num <= 0:
            return mod, [], mod
        fixed_unit = max(1, (sides + 1) // 2 + 1)
        vals = [fixed_unit for _ in range(num)]
        total = sum(vals) + mod
        return total, vals, mod

    def roll_dice(self, dice_str: str) -> tuple[int, list[int], int]:
        """Deterministic compatibility alias for compute_skill_value (zero RNG)."""
        return self.compute_skill_value(dice_str)

    def roll_d20(self, advantage: bool = False, disadvantage: bool = False) -> tuple[int, list[int]]:
        """Deterministic skill mastery check (zero RNG). Returns exact mastery score."""
        base = 18 if (advantage and not disadvantage) else (12 if (disadvantage and not advantage) else 15)
        return base, [base]

    def get_equipped_weapon_info(self, player_id: str = None) -> dict:
        """Determines the equipped weapon and its Optimal Spacing Band via CC-ELM codex matching."""
        codex = getattr(self, "weapons_codex", [])
        p = self.players.get(player_id or "player_1") or {}
        active_w = p.get("active_weapon") or p.get("weapon") or (p.get("char_stats") or {}).get("weapon")
        pool = ([active_w] if active_w else []) + [it for it in self.inventory if it != active_w]
        if isinstance(codex, list) and codex:
            if pool:
                crit = {str(i): f"{e.get('name', '')} {' '.join(e.get('name_keywords', []))}" for i, e in enumerate(codex)}
                target_str = active_w or " ".join(pool)
                ans = evaluate_jev_decision(target_str, {"w": Choice(criteria=crit)})["w"]
                if ans.choice and ans.confidence >= 0.30:
                    res = dict(codex[int(ans.choice)])
                    res["name"] = active_w or next((it for it in pool if any(w in it.lower() for w in res.get("name_keywords", []))), pool[0])
                    return res
            return dict(codex[0])
        return {
            "name": active_w or getattr(self, "initial_inv", "Blade"), "base_damage": 10, "damage_dice": "10",
            "ability": self._term("ability_keys", ("STR",))[0], "damage_type": "slashing", "type": "melee", "reach_ft": 10,
            "max_dist_px": 135.0, "optimal_min_px": 35.0, "optimal_max_px": 120.0, "is_melee": True, "category": "Melee"
        }

    def finish_room_combat(self, room_id: str = None) -> list[str]:
        """
        Finalizes combat victory deterministically when all hostile forces in a sector have been neutralized.
        Awards guaranteed Sovereign Marks, Aether Shards, and deterministic gear spoils.
        """
        r_id = room_id or self.current_room
        mons = list(self.room_monsters.get(r_id, []))
        if not mons:
            return []
        slain = list(mons)
        for m in slain:
            if m in self.room_monsters.get(r_id, []):
                self.room_monsters[r_id].remove(m)
            self.defeated_monsters.add(m)
        self.monster_states[r_id] = []
        gp, sp, cp, drops = 0, 0, 0, []
        for m in slain:
            li = self.loot_tables_def.get(m)
            if not li and self.loot_tables_def:
                l_ans = evaluate_jev_decision(m, {"lt": Choice(options=list(self.loot_tables_def))})["lt"]
                li = self.loot_tables_def.get(l_ans.choice) if l_ans.confidence >= 0.40 else None
            if li:
                gp += int(li.get(self._term("gp_key", "gp"), li.get("gp", 20)))
                sp += int(li.get(self._term("sp_key", "sp"), li.get("sp", 12)))
                r_it = self.room_items.setdefault(r_id, [])
                for gi in li.get("guaranteed_items", []):
                    if gi not in r_it and gi not in self.inventory:
                        r_it.append(gi)
                        drops.append(gi)
                det_gear = li.get("deterministic_gear") or li.get("random_weapon_pool") or []
                if det_gear:
                    chosen_gear = evaluate_jev_decision(m, {"g": Choice(options=det_gear)})["g"].choice
                    if chosen_gear and chosen_gear not in r_it and chosen_gear not in self.inventory:
                        r_it.append(chosen_gear)
                        drops.append(chosen_gear)
            else:
                gp += 15
                sp += 10
        w = self.char_stats.setdefault("wealth", {"gp": 0, "sp": 0, "cp": 0})
        w["gp"] += gp; w["sp"] += sp; w["cp"] += cp
        notes = []
        if gp > 0 or sp > 0:
            gp_lbl, sp_lbl = self._term("gp_label", "Gold"), self._term("sp_label", "Silver")
            notes.append(f"Bounty & Salvage Recovered: +{gp} {gp_lbl} (GP), +{sp} {sp_lbl} (SP) (Reserve: {w['gp']} GP, {w['sp']} SP)")
        if drops:
            for d in drops:
                if hasattr(self, "_emit_fx") and hasattr(self, "classify_loot_rarity"):
                    rinfo = self.classify_loot_rarity(d)
                    self._emit_fx("loot_drop", item=d, rarity=rinfo["rarity"], color=rinfo["color"], chime=rinfo["chime"])
            notes.append(f"Tactical Spoils Recovered: {', '.join(drops)} (Use 'take <item>' or walk near to vacuum)")
        ch_ev = self.check_storyline_advancement()
        xp_g = len(slain) * 150
        rested = int((self.players.get("player_1") or {}).get("rested_turns", 0))
        if rested > 0:
            xp_g = int(round(xp_g * 1.15))
        self.char_stats["xp"] = self.char_stats.get("xp", 0) + xp_g
        contribs = set(getattr(self, "encounter_contributors", {}).pop(r_id, set()))
        for op_id in contribs:
            op = self.players.get(op_id)
            if op and "char_stats" in op and op_id != "player_1":
                op["char_stats"]["xp"] = op["char_stats"].get("xp", 0) + xp_g
        if len(contribs) > 1:
            w["gp"] += 15
            notes.append(f"🤝 [JUMP-IN CREDIT]: {len(contribs)} allies shared full {xp_g} XP & +15 GP Co-op Spoils!")
        for bid, b_def in list(getattr(self, "active_bounties", {}).items()):
            if b_def.get("target") in slain or b_def.get("room") == r_id:
                del self.active_bounties[bid]
                self.completed_bounties.add(bid)
                w["gp"] += int(b_def.get("reward_gp", 100))
                if b_def.get("reward_item") and b_def["reward_item"] not in self.inventory:
                    self.inventory.append(b_def["reward_item"])
                if hasattr(self, "_emit_fx"):
                    self._emit_fx("bounty_complete", title=b_def.get("title"), reward=b_def.get("reward_item"), chime="loot_legendary")
                notes.append(f"📜✅ [BOUNTY COMPLETE — {b_def.get('title')}]: +{b_def.get('reward_gp')} GP & **{b_def.get('reward_item')}**!")
        for rv in list(getattr(self, "active_rivals", [])):
            if rv.get("name") in slain or rv.get("room") == r_id:
                self.active_rivals.remove(rv)
                w["gp"] += 75
                notes.append(f"⚔️🔥 [NEMESIS VANQUISHED]: You settled the grudge with {rv.get('name')}! (+75 GP)")
        if getattr(self, "active_world_event", None) and self.active_world_event.get("room") == r_id:
            ev_msg = self.advance_world_event(1, "player_1")
            if ev_msg:
                notes.append(ev_msg)
        self.scene_dirty = True
        return [f"🏆 Sector Secured! All hostile forces in {self.rooms_def.get(r_id, {}).get('name', r_id)} have been neutralized! (+{xp_g} Mastery XP)"] + notes + ch_ev

    def combat(self, cmd: str, player_id: str = None) -> str:
        """
        100% Deterministic Skill-Based Combat Engine:
        - Optimal Weapon Spacing Band (Sweet-Spot Mastery: 1.25x damage & +35 Momentum)
        - Vector Flanking Geometry (+25% Flanking bonus when striking opposite allies or from advantageous vector)
        - Momentum & Combo Chain (Every 3rd chained strike or >=100 Momentum triggers a 2.0x Apex Finisher)
        - Zero random dice rolls or chance misses.
        """
        cmd_low = cmd.strip().lower()
        cs = self.get_player_char_stats(player_id)

        # Support tactical skill stances & calibration commands
        if any(w in cmd_low for w in ("calibrate", "focus", "lock")):
            cs["momentum"] = min(100, int(cs.get("momentum", 0)) + 50)
            cs["stance"] = "Precision Lock"
            return f"🎯 [TACTICAL CALIBRATION]: You lock telemetry onto hostile weak-points! Momentum surges to {cs['momentum']}/100 and Stance set to Precision Lock (+25% next strike)."

        mons = self.room_monsters.get(self.current_room, [])
        if not mons:
            self.last_combat_result = {"hit": False, "reason": "no_foes"}
            return "There are no hostile threats in this sector."

        p = self.get_player(player_id) if player_id else None
        px = float(p.get("x", self.player_x)) if p else float(self.player_x)
        py = float(p.get("y", self.player_y)) if p else float(self.player_y)

        # Resolve primary skill attribute modifier
        abilities = cs.get("abilities", {})
        w_info = self.get_equipped_weapon_info(player_id)
        ab_keys = self._term("ability_keys", ("STR",))
        pref_ab = w_info.get("ability", ab_keys[0])
        ab_entry = abilities.get(pref_ab) or abilities.get(ab_keys[0]) or abilities.get("STR") or {"mod": 3}
        skill_mod = int(ab_entry.get("mod", 3)) if isinstance(ab_entry, dict) else 3
        prof = int(cs.get("proficiency_bonus", 2))
        mastery_rating = 15 + skill_mod + prof

        # Select target monster (either named in command or nearest alive unit)
        m_list = self.get_monsters_in_room(self.current_room)
        target_m = None
        for m in m_list:
            if m.get("name", "").lower() in cmd_low or m.get("raw_name", "").lower() in cmd_low:
                target_m = m
                break
        if not target_m and len(m_list) > 1 and cmd_low not in ("attack", "hit", "strike", "fight", "slay", "kill"):
            m_crit = {str(i): f"{m.get('name', '')} {m.get('raw_name', '')}" for i, m in enumerate(m_list)}
            m_resp = evaluate_jev_decision(cmd_low, {"target": Choice(criteria=m_crit)})["target"]
            if m_resp.choice and m_resp.confidence >= 0.45:
                target_m = m_list[int(m_resp.choice)]
        if not target_m and m_list:
            target_m = min(m_list, key=lambda m: math.hypot((m["x"] + 32) - px, (m["y"] + 32) - py))

        target_guard = int(target_m.get("ac", 13)) if target_m else 13
        target_name = target_m.get("name", mons[0]) if target_m else mons[0]

        tx = float(target_m["x"] + 32) if target_m else float(px + 64)
        ty = float(target_m["y"] + 32) if target_m else float(py)

        dist_px = math.hypot(tx - px, ty - py)
        dist_ft = round(dist_px / 12.8, 1)

        max_dist_px = float(w_info.get("max_dist_px", 135.0))
        opt_min_px = float(w_info.get("optimal_min_px", 35.0))
        opt_max_px = float(w_info.get("optimal_max_px", 120.0))
        reach_ft = w_info.get("reach_ft", 10)
        weapon_name = w_info.get("name", getattr(self, "initial_inv", "Weapon"))

        # Tactical Lunge / Repositioning into Optimal Sweet-Spot Band if within movement stride
        charge_limit_px = 460.0 + max_dist_px
        if dist_px > max_dist_px:
            if dist_px <= charge_limit_px:
                ang = math.atan2(py - ty, px - tx)
                desired_dist = (opt_min_px + min(opt_max_px, max_dist_px)) * 0.5
                new_px = tx + desired_dist * math.cos(ang)
                new_py = ty + desired_dist * math.sin(ang)
                found_spot = False
                if not self.check_collision(new_px, new_py):
                    found_spot = True
                else:
                    for test_angle in [ang + math.pi/4, ang - math.pi/4, ang + math.pi/2, ang - math.pi/2, 0, math.pi/2, math.pi, -math.pi/2]:
                        c_px = tx + desired_dist * math.cos(test_angle)
                        c_py = ty + desired_dist * math.sin(test_angle)
                        if not self.check_collision(c_px, c_py):
                            new_px, new_py = c_px, c_py
                            found_spot = True
                            break
                if found_spot:
                    if p:
                        p["x"], p["y"] = round(new_px, 1), round(new_py, 1)
                    self.player_x, self.player_y = round(new_px, 1), round(new_py, 1)
                    px, py = new_px, new_py
                    dist_px = math.hypot(tx - px, ty - py)
                    dist_ft = round(dist_px / 12.8, 1)
            else:
                self.last_combat_result = {
                    "hit": False,
                    "reason": "out_of_range",
                    "distance_ft": dist_ft,
                    "reach_ft": reach_ft,
                    "weapon": weapon_name,
                    "target_name": target_name,
                    "target_x": tx,
                    "target_y": ty
                }
                return (f"🚫 Target beyond tactical stride! {target_name} is {dist_ft} ft away ({int(dist_px)}px). "
                        f"Your {weapon_name} has an effective reach of {reach_ft} ft. Advance closer to engage!")

        # 1. Optimal Weapon Spacing Band (Sweet-Spot Mastery)
        is_sweet_spot = (opt_min_px <= dist_px <= opt_max_px)
        spacing_mult = 1.25 if is_sweet_spot else 1.0
        spacing_tag = "SWEET-SPOT SPACING (1.25x)" if is_sweet_spot else "STANDARD REACH (1.0x)"

        # 2. Vector Flanking Geometry Check
        flank_mult = 1.0
        allies = [op for op in self.get_players_in_room(self.current_room) if op.get("id") != (p.get("id") if p else "player_1")]
        for ally in allies:
            ax, ay = float(ally.get("x", px)), float(ally.get("y", py))
            v1x, v1y = px - tx, py - ty
            v2x, v2y = ax - tx, ay - ty
            m1, m2 = math.hypot(v1x, v1y), math.hypot(v2x, v2y)
            if m1 > 5.0 and m2 > 5.0:
                cos_ang = (v1x * v2x + v1y * v2y) / (m1 * m2)
                if cos_ang < -0.25: # Positioned on opposite flank vector
                    flank_mult = 1.25
                    break

        # 3. Momentum & Harmonic Combo Chain
        combo = int(cs.get("combo_chain", 0)) + 1
        mom_gain = 35 if is_sweet_spot else 25
        momentum = min(100, int(cs.get("momentum", 0)) + mom_gain)
        is_apex = (momentum >= 100) or (combo % 3 == 0)

        if is_apex:
            apex_mult = 2.0
            momentum = 0
        else:
            apex_mult = 1.0

        cs["combo_chain"] = combo
        cs["momentum"] = momentum
        self.char_stats["combo_chain"] = combo
        self.char_stats["momentum"] = momentum

        if hasattr(self, "record_encounter_contributor"):
            self.record_encounter_contributor(self.current_room, p.get("id") if p else (player_id or "player_1"))

        # 4. Deterministic Skill Damage Formula (+ Stagger, Sidekick Scaling, Curses, Playstyle Gear)
        base_w_dmg = int(w_info.get("base_damage", 11))
        guard_mitigation = max(0, (target_guard - 12) // 2)
        stagger_mult = 1.75 if (target_m and float(target_m.get("staggered_until", 0.0)) > time.time()) else 1.0
        scale_mult = self.compute_sidekick_scale(p, self.current_room) if hasattr(self, "compute_sidekick_scale") else 1.0
        curse_mult = 1.4 if (getattr(self, "labyrinth_state", None) or {}).get("curse") == "glass_cannon" else 1.0
        raw_dmg = (base_w_dmg + skill_mod + prof - guard_mitigation) * spacing_mult * flank_mult * apex_mult * stagger_mult * scale_mult * curse_mult
        if cs.get("stance") == "Precision Lock":
            raw_dmg *= 1.25
            cs["stance"] = "Balanced"
        dmg = max(6, int(round(raw_dmg)))

        self.last_combat_result = {
            "hit": True,
            "reason": "hit",
            "is_crit": is_apex or stagger_mult > 1.0,
            "damage": dmg,
            "roll": mastery_rating,
            "atk_bonus": skill_mod + prof,
            "total_atk": mastery_rating,
            "target_ac": target_guard,
            "target_name": target_name,
            "weapon": weapon_name,
            "spacing_band": spacing_tag,
            "momentum": momentum,
            "combo_chain": combo,
            "target_x": tx,
            "target_y": ty
        }

        if hasattr(self, "_emit_fx"):
            self._emit_fx("hit_impact", is_crit=(is_apex or stagger_mult > 1.0), x=tx, y=ty, dmg=dmg, chime="crit" if (is_apex or stagger_mult > 1.0) else "hit_heavy")

        perk_notes = []
        if target_m:
            target_m["hp"] = max(0, int(target_m.get("hp", 10)) - dmg)
            if target_m["hp"] <= 0:
                self.defeated_monsters.add(target_m.get("id", target_m["name"]))
                self.defeated_monsters.add(target_m.get("raw_name", target_m["name"]))
            # Playstyle-bending gear perks (Ricochet / Crescent Shockwave)
            inv_low = " ".join(self.inventory).lower()
            other_foes = [om for om in m_list if om is not target_m and om.get("hp", 0) > 0]
            if other_foes and ("ricochet" in inv_low or "storm" in inv_low or "moon" in inv_low):
                ric = other_foes[0]
                ric["hp"] = max(0, int(ric.get("hp", 10)) - 10)
                if ric["hp"] <= 0:
                    self.defeated_monsters.add(ric.get("id", ric["name"]))
                    self.defeated_monsters.add(ric.get("raw_name", ric["name"]))
                self._emit_fx("combo_detonate", title="Playstyle Gear Chain!", color=5809919, x=ric["x"] + 32, y=ric["y"] + 32, radius=90.0, chime="combo_shatter")
                perk_notes.append(f"⚡ [GEAR PERK]: Strike ricochets onto {ric['name']} for 10 bonus damage!")

            # Active Battle Pet Combat Assist
            act_pid = p.get("id") if p else (player_id or "player_1")
            pet = getattr(self, "player_pets", {}).get(act_pid)
            if pet:
                p_abil = pet.get("ability", "Spark")
                p_dmg = int(pet.get("dmg", 8))
                if "repair" in p_abil.lower() or "shield" in p_abil.lower():
                    if p:
                        p["hp"] = min(p.get("max_hp", 36), p.get("hp", 36) + 4)
                    cs["current_hp"] = min(cs.get("max_hp", 36), cs.get("current_hp", 36) + 4)
                    perk_notes.append(f"🐾 [PET ASSIST — {pet['name']}]: {p_abil} patches your armor for +4 Vitality!")
                else:
                    pet_target = target_m if target_m.get("hp", 0) > 0 else (other_foes[0] if other_foes else None)
                    if pet_target:
                        pet_target["hp"] = max(0, int(pet_target.get("hp", 10)) - p_dmg)
                        if pet_target["hp"] <= 0:
                            self.defeated_monsters.add(pet_target.get("id", pet_target["name"]))
                            self.defeated_monsters.add(pet_target.get("raw_name", pet_target["name"]))
                        pet_elem = "shock" if "spark" in p_abil.lower() else ("frost" if "glacial" in p_abil.lower() else "fire")
                        if hasattr(self, "_emit_fx"):
                            self._emit_fx("hit_impact", is_crit=False, x=pet_target["x"] + 32, y=pet_target["y"] + 32, dmg=p_dmg, chime="combo_shock" if pet_elem == "shock" else "hit_heavy")
                        perk_notes.append(f"🐾 [PET ASSIST — {pet['name']}]: {p_abil} strikes {pet_target['name']} for {p_dmg} {pet_elem} damage!")
                        if hasattr(self, "check_and_trigger_combos"):
                            perk_notes.extend(self.check_and_trigger_combos(pet_elem, pet_target["x"] + 32, pet_target["y"] + 32, act_pid))

        combo_notes = self.check_and_trigger_combos(w_info.get("damage_type", "slashing"), tx, ty, p.get("id") if p else player_id) if hasattr(self, "check_and_trigger_combos") else []
        remaining_m = [m for m in m_list if m.get("hp", 0) > 0]
        banner = "⚡ APEX FINISHER (2.0x)! " if is_apex else ("💥 STAGGER PUNISH! " if stagger_mult > 1.0 else ("🎯 SWEET-SPOT STRIKE! " if is_sweet_spot else "⚔️ TACTICAL STRIKE! "))
        flank_note = " + Vector Flank" if flank_mult > 1.0 else ""
        dmg_desc = f"[{spacing_tag}{flank_note} | Combo #{combo} | Momentum {momentum}/100] deals {dmg} damage"

        if remaining_m:
            self.scene_dirty = True
            if target_m and target_m.get("hp", 0) <= 0:
                return "\n".join([f"{banner}{dmg_desc}! You strike down {target_name}! ({len(remaining_m)} hostile unit{'s' if len(remaining_m) != 1 else ''} remaining!)"] + perk_notes + combo_notes)
            return "\n".join([f"{banner}{dmg_desc} to {target_name}! ({target_m['hp']}/{target_m['max_hp']} {self._term('hp_label', 'HP')} remaining)"] + perk_notes + combo_notes)

        victory_notes = self.finish_room_combat(self.current_room)
        summary = f"{banner}{dmg_desc}! You strike down {target_name}!"
        return "\n".join([summary] + perk_notes + combo_notes + victory_notes)

    def take_item(self, target: str) -> str:
        tc = target.strip().lower()
        items = self.room_items.get(self.current_room, [])
        m = next((it for it in items if tc in it.lower() or it.lower() in tc), None)
        if not m and items and tc:
            it_crit = {it: it for it in items}
            it_resp = evaluate_jev_decision(tc, {"item": Choice(criteria=it_crit)})["item"]
            if it_resp.choice and (len(items) == 1 or it_resp.confidence >= 0.55):
                m = it_resp.choice
        if m:
            items.remove(m); self.inventory.append(m)
            if hasattr(self, "_emit_fx") and hasattr(self, "classify_loot_rarity"):
                rinfo = self.classify_loot_rarity(m)
                self._emit_fx("loot_pickup", item=m, rarity=rinfo["rarity"], color=rinfo["color"], chime=rinfo["chime"])
            ch_ev = self.check_storyline_advancement()
            self.scene_dirty = True; self.check_win()
            return "\n".join([f"You secure the {m} in your tactical pack."] + ch_ev)
        already_inv = next((i for i in self.inventory if tc and (tc in i.lower() or i.lower() in tc)), None)
        if already_inv:
            return f"You already secured the {already_inv} in your tactical pack."
        already_taken_ext = None
        ext_list = getattr(self, "extractable_items", [])
        if isinstance(ext_list, list):
            for ext in ext_list:
                tr = ext.get("room")
                inm = ext.get("item_name", "")
                match_ext = any(w in tc for w in ext.get("trigger_words", [])) or (tc in inm.lower() or inm.lower() in tc)
                if not match_ext:
                    fks = ext.get("fixture_keywords", [])
                    match_ext = any(fk in tc or tc in fk for fk in fks)
                if match_ext:
                    if self.current_room in ext.get("allowed_rooms", [tr] if tr else []):
                        rk, rf = ext.get("required_key_contains"), ext.get("required_flag")
                        if rk and rf not in self.story_flags and not any(rk in i.lower() for i in self.inventory): return ext.get("locked_message", "It is sealed.")
                        if inm in self.inventory:
                            if not already_taken_ext:
                                already_taken_ext = ext
                            if any(w in tc for w in ext.get("trigger_words", [])) or (tc in inm.lower() or inm.lower() in tc):
                                return ext.get("already_taken_message", f"You already salvaged {inm}.")
                            continue
                        self.inventory.append(inm); self.salvaged_parts.add(ext.get("id", f"{self.current_room}:{inm}")); self.scene_dirty = True
                        return ext.get("success_message", f"You salvaged: {inm}.")
                    return ext.get("alternate_room_message") or f"There are no {tc} here to salvage."
        if already_taken_ext:
            return already_taken_ext.get("already_taken_message", f"You have already salvaged all components from the {target}.")
        return f"There is no '{target}' here to take. Inspect the sector description or hover over objects on the tactical map."

    def get_takeable_items(self, player_id: str = None, reach_px: float = 140.0) -> list[dict]:
        """Returns items in the current sector within character's reach that can be taken or salvaged."""
        p = self.get_player(player_id) if player_id else {"x": self.player_x, "y": self.player_y}
        px, py = float(p.get("x", self.player_x)), float(p.get("y", self.player_y))
        b = self.room_bounds.get(self.current_room, {})
        W, H = b.get("width", 1024), b.get("height", 768)
        res = []

        for idx, it_name in enumerate(self.room_items.get(self.current_room, [])):
            ix = min(W - GRID_SQ, int(W * 0.48) + idx * GRID_SQ) + GRID_SQ // 2
            iy = int(H * 0.62) + GRID_SQ // 2
            dist = math.hypot(px - ix, py - iy)
            if dist <= reach_px:
                res.append({
                    "name": it_name,
                    "target": it_name,
                    "type": "ground",
                    "dist_ft": round(dist / 12.8, 1)
                })

        obstacles = b.get("obstacles", [])
        ext_list = getattr(self, "extractable_items", [])
        if isinstance(ext_list, list):
            for ext in ext_list:
                tr = ext.get("room")
                allowed = ext.get("allowed_rooms", [tr] if tr else [])
                if self.current_room not in allowed:
                    continue
                inm = ext.get("item_name", "")
                if inm in self.inventory:
                    continue
                rk = ext.get("required_key_contains")
                rf = ext.get("required_flag")
                if rk and rf not in self.story_flags and not any(rk in i.lower() for i in self.inventory):
                    continue

                target_rect = None
                specific_keywords = ext.get("fixture_keywords") or [w for w in ext.get("trigger_words", []) if len(w) > 3]
                for kw in specific_keywords:
                    for obs in obstacles:
                        o_name = (obs.get("name", "") if isinstance(obs, dict) else "").lower()
                        if kw in o_name:
                            target_rect = obs.get("rect") if isinstance(obs, dict) else obs
                            break
                    if target_rect:
                        break

                if target_rect and len(target_rect) == 4:
                    ox, oy, ow, oh = target_rect
                    cx = max(ox, min(px, ox + ow))
                    cy = max(oy, min(py, oy + oh))
                    dist = math.hypot(px - cx, py - cy)
                else:
                    dist = 0.0

                if dist <= reach_px:
                    res.append({
                        "name": inm,
                        "target": inm,
                        "type": "extractable",
                        "dist_ft": round(dist / 12.8, 1)
                    })

        return res

    def drop_item(self, target: str) -> str:
        m = next((it for it in self.inventory if target.lower() in it.lower()), None)
        if not m: return f"You are not carrying '{target}'."
        self.inventory.remove(m); self.room_items[self.current_room].append(m); self.scene_dirty = True
        return f"You set down the {m}."

    def use_item(self, cmd: str) -> str:
        cmd_clean = cmd.strip().lower()
        if self.inventory:
            inv_ans = evaluate_jev_decision(cmd_clean, {"it": Choice(criteria={it: f"cell capacitor potion healing elixir draught {it}" for it in self.inventory})})["it"]
            cell_match = inv_ans.choice if (inv_ans.choice and any(k in inv_ans.choice.lower() for k in ("cell", "capacitor", "potion", "healing", "elixir", "draught")) and (len(self.inventory) == 1 or inv_ans.confidence >= 0.30)) else None
        else:
            cell_match = None

        if cell_match and evaluate_jev_decision(cmd_clean, {"act": Choice(criteria={"heal": "use cell capacitor potion drink quaff heal", "other": "unlock gate open door key"})})["act"].choice == "heal":
            tier = evaluate_jev_decision(cell_match, {"t": Choice(criteria={"30": "supreme overcharged", "20": "greater enhanced", "14": "standard cell potion elixir"})})["t"].choice
            heal_amt = int(tier or 14)
            self.inventory.remove(cell_match)
            cs = self.char_stats
            prev_hp = cs["current_hp"]
            cs["current_hp"] = min(cs["max_hp"], cs["current_hp"] + heal_amt)
            cs["momentum"] = min(100, int(cs.get("momentum", 0)) + 25)
            for p in self.players.values(): p["hp"] = cs["current_hp"]
            self.scene_dirty = True
            hp_lbl = self._term("hp_label", "HP")
            return f"⚡ You discharge the {cell_match}! Deterministic harmonic pulse restores +{cs['current_hp'] - prev_hp} {hp_lbl} ({cs['current_hp']}/{cs['max_hp']} {hp_lbl}) and grants +25 Momentum!"

        for gid, g in self.gates_def.items():
            rk = g.get("key_item")
            if g.get("room") == self.current_room and gid not in self.unlocked_gates and rk and any(rk.lower() in it.lower() for it in self.inventory):
                self.unlocked_gates.add(gid)
                return g.get("unlock_message", f"You unseal the gateway with {rk}!")
        return "Nothing happens."

    def short_rest(self) -> str:
        """Deterministic short recovery (replaces random short rest dice)."""
        cs = self.char_stats
        hp_lbl, cell_lbl = self._term("hp_label", "HP"), self._term("cell_label", "Charge")
        rest_name = self._term("short_rest_name", "Short Rest")
        warmth = f" {self.apply_rested_warmth('player_1')}" if hasattr(self, "apply_rested_warmth") else ""
        if cs.get("hit_dice_remaining", 1) > 0 and cs["current_hp"] < cs["max_hp"]:
            ab_keys = self._term("ability_keys", ("STR", "DEX", "CON", "INT", "WIS", "CHA"))
            con_mod = cs.get("abilities", {}).get(ab_keys[2] if len(ab_keys) > 2 else "CON", cs.get("abilities", {}).get("CON", {})).get("mod", 3)
            actual_heal = min(cs["max_hp"] - cs["current_hp"], 12 + int(con_mod))
            cs["current_hp"] += actual_heal
            cs["hit_dice_remaining"] = max(0, int(cs.get("hit_dice_remaining", 1)) - 1)
            cs["momentum"] = min(100, int(cs.get("momentum", 0)) + 30)
            for p in self.players.values(): p["hp"] = min(p["max_hp"], p["hp"] + actual_heal)
            return f"🔧 {rest_name} complete: Expended 1 {cell_lbl} for a deterministic +{actual_heal} {hp_lbl} restoration ({cs['current_hp']}/{cs['max_hp']} {hp_lbl}) and +30 Momentum. Remaining {cell_lbl}s: {cs['hit_dice_remaining']}.{warmth}"
        return f"{rest_name} complete: {hp_lbl} is at {cs['current_hp']}/{cs['max_hp']} (Armor systems optimal).{warmth}"

    def long_rest(self) -> str:
        """Deterministic full recovery (replaces long rest)."""
        rest_name = self._term("long_rest_name", "Long Rest")
        if self.room_monsters.get(self.current_room): return f"Cannot initiate {rest_name} while hostile forces are present!"
        hp_lbl, cell_lbl = self._term("hp_label", "HP"), self._term("cell_label", "Charge")
        cs = self.char_stats
        cs["current_hp"] = cs["max_hp"]
        cs["hit_dice_remaining"] = max(3, int(cs.get("level", 1)) + 2)
        cs["momentum"] = 50
        for p in self.players.values(): p["hp"] = p["max_hp"]; p["is_downed"] = False
        warmth = f" {self.apply_rested_warmth('player_1')}" if hasattr(self, "apply_rested_warmth") else ""
        return f"✨ {rest_name} complete! {hp_lbl} fully restored ({cs['max_hp']}/{cs['max_hp']}), all {cs['hit_dice_remaining']} {cell_lbl}s recharged, and Momentum primed at 50/100!{warmth}"

    def level_up(self) -> str:
        """Deterministic Mastery Ascension (replaces random level-up hit die roll)."""
        cs = self.char_stats
        if cs.get("xp", 0) < cs.get("next_level_xp", 300): return f"Need {cs.get('next_level_xp', 300) - cs.get('xp', 0)} more Mastery XP to ascend."
        hp_lbl, cell_lbl = self._term("hp_label", "HP"), self._term("cell_label", "Charge")
        ab_keys = self._term("ability_keys", ("STR", "DEX", "CON", "INT", "WIS", "CHA"))
        cs["level"] = int(cs.get("level", 1)) + 1; cs["next_level_xp"] = int(cs.get("next_level_xp", 300) * 2.0)
        con_mod = cs.get("abilities", {}).get(ab_keys[2] if len(ab_keys) > 2 else "CON", cs.get("abilities", {}).get("CON", {})).get("mod", 3)
        hp_gain = 10 + int(con_mod)
        cs["max_hp"] += hp_gain; cs["current_hp"] = cs["max_hp"]
        cs["hit_dice_remaining"] = cs["level"] + 2
        cs["hit_dice"] = f"{cs['hit_dice_remaining']} {cell_lbl}s"
        for p in self.players.values(): p["max_hp"] += hp_gain; p["hp"] = p["max_hp"]
        return f"*** MASTERY ASCENSION! *** Attained Tier {cs['level']}! Deterministic {hp_lbl} capacity increased by +{hp_gain} (Max {hp_lbl}: {cs['max_hp']})."

    def get_character_sheet_text(self, player_id: str = None) -> str:
        cs = self.get_player_char_stats(player_id)
        ab_keys = tuple(self._term("ability_keys", ("STR", "DEX", "CON", "INT", "WIS", "CHA")))
        ab_items = [(k, v) for k, v in cs.get("abilities", {}).items() if k in ab_keys] or list(cs.get("abilities", {}).items())
        ab_str = ", ".join(f"{k}: {v['score']} ({'+' if v['mod']>=0 else ''}{v['mod']})" for k, v in ab_items)
        hp_lbl, role_lbl = self._term("hp_label", "HP"), self._term("sheet_role", "HERO")
        return f"{'='*65}\n{role_lbl}: {cs['name'].upper()} ({cs['species']} {cs['class']} Tier {cs['level']})\n{hp_lbl}: {cs['current_hp']}/{cs['max_hp']} | Guard: {cs['armor_class']} | Momentum: {cs.get('momentum', 0)}/100 (Combo #{cs.get('combo_chain', 0)}) | XP: {cs.get('xp',0)}/{cs.get('next_level_xp',300)}\nMastery Attributes: {ab_str}\n{'='*65}"

    def serialize_state_to_vector_bytes(self) -> bytes:
        sd = {
            "skill_name": self.skill_name, "title": self.title, "current_room": self.current_room,
            "player_x": float(self.player_x), "player_y": float(self.player_y), "player_radius": float(self.player_radius),
            "inventory": list(self.inventory), "room_items": {k: list(v) for k, v in self.room_items.items()},
            "room_monsters": {k: list(v) for k, v in self.room_monsters.items()},
            "unlocked_gates": list(self.unlocked_gates), "defeated_monsters": list(self.defeated_monsters),
            "triggered_events": list(self.triggered_events), "completed_chapters": list(self.completed_chapters),
            "story_flags": list(self.story_flags), "turn_count": int(self.turn_count),
            "in_game_minutes": float(getattr(self, "in_game_minutes", 0.0)), "is_won": bool(self.is_won),
            "is_over": bool(self.is_over), "char_stats": self.char_stats, "saved_at": time.time(),
            "camp_stash": list(getattr(self, "camp_stash", [])),
            "saved_blueprints": copy.deepcopy(getattr(self, "saved_blueprints", {})),
            "placed_structures": copy.deepcopy(getattr(self, "placed_structures", {})),
            "shared_map_pins": list(getattr(self, "shared_map_pins", [])),
            "outpost_states": copy.deepcopy(getattr(self, "outpost_states", {})),
            "active_rivals": list(getattr(self, "active_rivals", [])),
            "player_pets": copy.deepcopy(getattr(self, "player_pets", {})),
            "completed_bounties": list(getattr(self, "completed_bounties", ())),
            "dug_tunnels": copy.deepcopy(getattr(self, "dug_tunnels", {})),
            "room_destructibles": copy.deepcopy(getattr(self, "room_destructibles", {})),
        }
        sv = self.world_model.encode_action("savestate", self.char_stats.get("name", "hero"), self.current_room, {"room": self.current_room, "turn": self.turn_count})
        jb = json.dumps(sd, ensure_ascii=False).encode("utf-8")
        cj, cv = zlib.compress(jb, 9), zlib.compress(sv.astype(np.float32).tobytes(), 9)
        return struct.pack("<4sIIII", b"AETV", 1, len(jb), len(sv), len(cj)) + cj + cv

    def deserialize_state_from_vector_bytes(self, raw_bytes: bytes) -> dict:
        magic, _, _, _, cj_len = struct.unpack("<4sIIII", raw_bytes[:20])
        if magic not in (b"AETV", b"DNDV"): raise ValueError("Invalid save file header")
        sd = json.loads(zlib.decompress(raw_bytes[20:20 + cj_len]).decode("utf-8"))
        self.current_room, self.player_x, self.player_y = sd.get("current_room", self.start_room), float(sd.get("player_x", 360)), float(sd.get("player_y", 390))
        self.inventory = list(sd.get("inventory", []))
        self.room_items = {k: list(v) for k, v in sd.get("room_items", {}).items()}
        self.room_monsters = {k: list(v) for k, v in sd.get("room_monsters", {}).items()}
        self.unlocked_gates, self.defeated_monsters = set(sd.get("unlocked_gates", [])), set(sd.get("defeated_monsters", []))
        self.triggered_events, self.completed_chapters, self.story_flags = set(sd.get("triggered_events", [])), set(sd.get("completed_chapters", [])), set(sd.get("story_flags", []))
        self.turn_count, self.in_game_minutes, self.is_won, self.is_over = int(sd.get("turn_count", 0)), float(sd.get("in_game_minutes", 0.0)), bool(sd.get("is_won", False)), bool(sd.get("is_over", False))
        if "char_stats" in sd: self.char_stats = sd["char_stats"]
        for k, df in (("camp_stash", []), ("saved_blueprints", {}), ("placed_structures", {}), ("shared_map_pins", []), ("outpost_states", {}), ("active_rivals", []), ("player_pets", {}), ("dug_tunnels", {}), ("room_destructibles", {})):
            if k in sd: setattr(self, k, sd[k])
        if "completed_bounties" in sd:
            self.completed_bounties = set(sd["completed_bounties"])
        for po in self.players.values(): po["room"], po["x"], po["y"] = self.current_room, self.player_x, self.player_y
        self.scene_dirty = True; self.check_win()
        return sd

    def save_game(self, slot_name: str) -> str:
        cn = re.sub(r"[^a-zA-Z0-9_\- ]", "", slot_name).strip() or f"save_{int(time.time())}"
        blob = self.serialize_state_to_vector_bytes()
        with open(os.path.join(SAVES_DIR, f"{cn}.aetsave"), "wb") as f: f.write(blob)
        self.world_model.save_weights(WORLD_MODEL_WEIGHTS_PATH)
        return f"Chronicle saved to '{cn}' ({len(blob)} bytes)."

    def load_game(self, slot_name: str) -> str:
        cn = slot_name.replace(".aetsave", "").replace(".dndsave", "").strip()
        fp = os.path.join(SAVES_DIR, f"{cn}.aetsave")
        if not os.path.exists(fp):
            fp = os.path.join(SAVES_DIR, f"{cn}.dndsave")
        if not os.path.exists(fp): return f"Save '{cn}' not found."
        with open(fp, "rb") as f: self.deserialize_state_from_vector_bytes(f.read())
        return f"Loaded '{cn}' in {self.rooms_def.get(self.current_room, {}).get('name', self.current_room)} (Turn {self.turn_count})."

    def delete_game(self, slot_name: str) -> str:
        cn = slot_name.replace(".aetsave", "").replace(".dndsave", "").strip()
        for ext in (".aetsave", ".dndsave"):
            fp = os.path.join(SAVES_DIR, f"{cn}{ext}")
            if os.path.exists(fp):
                os.remove(fp)
                return f"Deleted save '{cn}'."
        return f"Save '{cn}' not found."

    def rename_game(self, old_name: str, new_name: str) -> str:
        oc = old_name.replace(".aetsave", "").replace(".dndsave", "").strip()
        nc = re.sub(r"[^a-zA-Z0-9_\- ]", "", new_name.replace(".aetsave", "").replace(".dndsave", "")).strip()
        for ext in (".aetsave", ".dndsave"):
            op = os.path.join(SAVES_DIR, f"{oc}{ext}")
            if os.path.exists(op) and nc:
                np_ = os.path.join(SAVES_DIR, f"{nc}.aetsave")
                os.rename(op, np_)
                return f"Renamed '{oc}' to '{nc}'."
        return "Invalid save rename request."

    def list_saved_games(self) -> list[dict]:
        saves = []
        for fp in glob.glob(os.path.join(SAVES_DIR, "*.aetsave")) + glob.glob(os.path.join(SAVES_DIR, "*.dndsave")):
            sn = os.path.basename(fp).replace(".aetsave", "").replace(".dndsave", "")
            sz, mt = os.path.getsize(fp), time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(os.path.getmtime(fp)))
            meta = {"name": sn, "size_bytes": sz, "modified": mt, "room": "Unknown", "level": 1, "turn": 0, "hp": self._term("hp_label", "HP")}
            try:
                with open(fp, "rb") as f: b = f.read(4096)
                if len(b) >= 20 and b[:4] in (b"AETV", b"DNDV"):
                    _, _, _, _, cjl = struct.unpack("<4sIIII", b[:20])
                    sd = json.loads(zlib.decompress(b[20:20 + cjl]).decode("utf-8"))
                    meta.update({"room": sd.get("current_room", "Unknown"), "turn": sd.get("turn_count", 0), "level": sd.get("char_stats", {}).get("level", 1), "hp": f"{sd.get('char_stats',{}).get('current_hp')}/{sd.get('char_stats',{}).get('max_hp')}"})
            except Exception: pass
            saves.append(meta)
        return sorted(saves, key=lambda s: s["modified"], reverse=True)

    def check_win(self):
        tr, ri = self.win_def.get("target_room"), self.win_def.get("required_item")
        if tr and self.current_room == tr and ri and any(ri.lower() in it.lower() for it in self.inventory):
            self.is_won = True

    def render_current_frame(self, room_id: str = None) -> Image.Image:
        tr = room_id or self.current_room
        rp = self.get_players_in_room(tr) or [{"x": self.player_x, "y": self.player_y, "z": 64.0, "facing": getattr(self, "player_facing", "east"), "name": self.char_stats.get("name", "Adventurer"), "class": self.char_stats.get("class", "Adventurer")}]
        monsters = self.get_monsters_in_room(tr)
        filtered_portals = []
        for p in self.room_bounds.get(tr, {}).get("portals", []):
            cp = dict(p)
            p_name = cp.get("name", "")
            t_room = cp.get("target", "")
            if not self.is_object_discovered("portal", p_name, t_room):
                cp["name"] = ""
            filtered_portals.append(cp)
        return self.compositor.render_game_frame(tr, self.room_items.get(tr, []), monsters, rp, filtered_portals, obstacles=self.room_bounds.get(tr, {}).get("obstacles", []))

    def _encode_jpeg(self, img: Image.Image) -> bytes:
        cv2 = None if simplejpeg is not None else _get_cv2()
        if simplejpeg is not None:
            rgb = img if img.mode == "RGB" else img.convert("RGB")
            jpg_bytes = simplejpeg.encode_jpeg(np.asarray(rgb), quality=50, colorspace="RGB", colorsubsampling="420", fastdct=True)
        elif cv2 is not None:
            arr = np.asarray(img)
            if img.mode == "RGBA":
                bgr = cv2.cvtColor(arr, cv2.COLOR_RGBA2BGR)
            elif img.mode == "RGB":
                bgr = cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)
            else:
                bgr = cv2.cvtColor(np.asarray(img.convert("RGB")), cv2.COLOR_RGB2BGR)
            params = [int(cv2.IMWRITE_JPEG_QUALITY), 50, int(cv2.IMWRITE_JPEG_OPTIMIZE), 0, int(cv2.IMWRITE_JPEG_SAMPLING_FACTOR), int(cv2.IMWRITE_JPEG_SAMPLING_FACTOR_420)]
            _, enc = cv2.imencode(".jpg", bgr, params)
            jpg_bytes = enc.tobytes()
        else:
            rgb = img if img.mode == "RGB" else img.convert("RGB")
            buf = io.BytesIO()
            rgb.save(buf, format="JPEG", quality=50)
            jpg_bytes = buf.getvalue()
        self.last_jpg_bytes = jpg_bytes
        return jpg_bytes

    def render_and_encode_mjpeg_packet(self, room_id: str = None) -> bytes:
        jpg_bytes = self._encode_jpeg(self.render_current_frame(room_id))
        return b"Content-Type: image/jpeg\r\nContent-Length: " + str(len(jpg_bytes)).encode() + b"\r\n\r\n" + jpg_bytes + b"\r\n--frame\r\n"

    def get_frame_base64(self, room_id: str = None, fast: bool = False) -> str:
        self.scene_dirty = True
        img = self.render_current_frame(room_id)
        if fast:
            return f"data:image/jpeg;base64,{base64.b64encode(self._encode_jpeg(img)).decode('ascii')}"
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode('ascii')}"

    def get_time_and_weather(self, room_id: str = None) -> dict:
        """Calculates deterministic day cycle time of day and atmospheric conditions."""
        turn = self.turn_count
        mins = getattr(self, "in_game_minutes", 0.0)
        total_hours = 9.0 + (mins / 60.0)
        hours_float = total_hours % 24.0
        hour_int = int(hours_float)
        minute_int = int((hours_float - hour_int) * 60)
        time_str = f"{hour_int:02d}:{minute_int:02d}"

        env_cfg = getattr(self, "environment_conditions", {})
        period_defs = env_cfg.get("periods", {"dawn": "Dawn", "morning": "Morning", "afternoon": "Afternoon", "dusk": "Dusk", "evening": "Evening", "night": "Night"})
        period = next((p for lo, hi, p in ((5.0, 7.0, "dawn"), (7.0, 12.0, "morning"), (12.0, 17.0, "afternoon"), (17.0, 19.5, "dusk"), (19.5, 22.0, "evening")) if lo <= hours_float < hi), "night")
        day_num = int(total_hours // 24) + 1
        weather_seed = (day_num * 37 + (int(mins // 60) * 19)) % 100
        weather_defs = env_cfg.get("weather", {"clear": "Clear Skies", "cloudy": "Cloudy", "overcast": "Overcast", "misty": "Misty"})
        weather = next((w for th, w in ((45, "clear"), (75, "cloudy"), (90, "overcast")) if weather_seed < th), "misty")
        target_room = room_id or self.current_room
        theme_type = self.compositor.get_room_theme(target_room).get("type", "vault")
        q_room = f"{target_room.replace('_', ' ')} {'' if 'bluff' in target_room else theme_type}"
        is_outdoor = evaluate_jev_decision(q_room, {"env": Choice(criteria={
            "indoor": "vault catacomb cavern caverns reliquary loom war hall conservatory foundry heart tavern manor cellar study crypt dungeon labyrinth floor sector",
            "outdoor": "steppe plaza glacier forest causeway ravine bluff canopy courtyard pass quarry glade watchtower aqueduct berth gate",
        })})["env"].choice == "outdoor"
        return {
            "turn": turn, "day": day_num, "hour": hours_float, "time_str": time_str,
            "period": period, "period_label": period_defs.get(period, period.title()),
            "weather": weather, "weather_label": weather_defs.get(weather, weather.title()), "is_outdoor": is_outdoor
        }

    def get_entities_vector_bytes(self) -> bytes:
        facing_map = {'east': 0, 'southeast': 1, 'south': 2, 'southwest': 3, 'west': 4, 'northwest': 5, 'north': 6, 'northeast': 7}
        now = time.time()
        records = []
        for p in self.get_players_in_room(self.current_room):
            nid = p.get('numeric_id')
            if nid is None:
                nid = (zlib.crc32(p['id'].encode('utf-8')) & 0x7FFF) | 0x8000
                p['numeric_id'] = nid
            f_code = facing_map.get(str(p.get('facing', 'east')).lower(), 0)
            is_mov = bool(p.get('is_moving') and (now - p.get('last_move_time', 0.0) < 0.45))
            if not is_mov and p.get('is_moving'):
                p['is_moving'] = False
            flags = (1 if p.get('is_ai') else 0) | (4 if is_mov else 0)
            records.append((int(nid) & 0xFFFF, int(f_code), int(flags), float(p.get('x', 512)), float(p.get('y', 384)), float(p.get('z', 64.0))))

        for m in self.get_monsters_in_room(self.current_room):
            if not self.is_object_discovered('monster', m.get('raw_name', m.get('name', ''))):
                continue
            nid = m.get('numeric_id')
            if nid is None:
                nid = (zlib.crc32(m['id'].encode('utf-8')) & 0x7FFF) | 0x8000
                m['numeric_id'] = nid
            f_code = facing_map.get(str(m.get('facing', 'west')).lower(), 4)
            is_mov = bool(m.get('is_moving') and (now - m.get('last_move_time', 0.0) < 0.45))
            if not is_mov and m.get('is_moving'):
                m['is_moving'] = False
            flags = 2 | (4 if is_mov else 0)
            records.append((int(nid) & 0xFFFF, int(f_code), int(flags), float(m.get('x', 512)) + 32.0, float(m.get('y', 384)) + 32.0, 0.0))

        header = struct.pack('<4sBBHI', b'DNDV', 1, len(records), 0, int(self.turn_count))
        buf = bytearray(header)
        for r in records:
            buf.extend(struct.pack('<HBBfff', r[0], r[1], r[2], r[3], r[4], r[5]))
        return bytes(buf)

    def build_room_static_payload(self, r: str) -> dict:
        """Builds cacheable static room theme, obstacles, and portals (independent of discovery flags)."""
        b = self.room_bounds.get(r, {})
        obs_list = []
        for obs in b.get("obstacles", []):
            r_rect = obs["rect"] if isinstance(obs, dict) else obs
            o_name = obs.get("name", "Terrain Obstacle") if isinstance(obs, dict) else "Terrain Obstacle"
            scenery_cls = self.classify_scenery_object(o_name)
            obs_list.append({
                "name": o_name, "raw_name": o_name, "rect": list(r_rect),
                "kind": scenery_cls["kind"], "label": scenery_cls["label"], "height": scenery_cls["height"]
            })
        port_list = [{**p, "display_name": p.get("name", "Exit")} for p in b.get("portals", [])]
        return {"theme": self.compositor.get_room_theme(r), "obstacles": obs_list, "portals": port_list}

    def get_3d_scene_payload(self, player_id: str = None, include_static: bool = True, room_id: str = None, static_override: dict = None) -> dict:
        r = room_id or self.current_room
        b = self.room_bounds.get(r, {})
        W, H = b.get("width", 1024), b.get("height", 768)
        now = time.time()
        def _nid_mov(ent: dict) -> tuple[int, bool]:
            if ent.get("numeric_id") is None:
                ent["numeric_id"] = (zlib.crc32(ent["id"].encode("utf-8")) & 0x7FFF) | 0x8000
            mov = bool(ent.get("is_moving", False) and (now - ent.get("last_move_time", 0.0) < 0.45))
            if not mov and ent.get("is_moving"):
                ent["is_moving"] = False
            return int(ent["numeric_id"]), mov

        dh, nd = getattr(self, "default_hero", {}), getattr(self, "npc_defaults", {})
        def_lang = getattr(self, "default_language", "Common")
        p_list, m_list, it_list, npc_list = [], [], [], []
        for p in self.get_players_in_room(r):
            nid, is_mov = _nid_mov(p)
            p_cls = p.get("class", dh.get("class", "Adventurer"))
            p_list.append({
                "id": p.get("id"), "numeric_id": nid, "name": p.get("name", dh.get("name", "Adventurer")),
                "class": p_cls, "species": p.get("species", dh.get("species", "Humanoid")),
                "x": float(p.get("x", 512)), "y": float(p.get("y", 384)), "z": float(p.get("z", 64.0)),
                "facing": p.get("facing", "east"), "hp": p.get("hp", 32), "max_hp": p.get("max_hp", 32),
                "ac": p.get("ac", 16), "is_ai": bool(p.get("is_ai", False)), "is_moving": is_mov,
                "token_category": "player", "token_name": p_cls,
                "is_downed": bool(p.get("is_downed", False)), "downed_until": float(p.get("downed_until", 0.0)),
                "mount": p.get("mount"), "emote": p.get("emote"), "active_weapon": p.get("active_weapon"),
                "rested_turns": int(p.get("rested_turns", 0)),
                "appearance": p.get("appearance") or {"silhouette": "default", "headgear": "default", "palette": "default", "cloak": True},
                "visual_spec": p.get("visual_spec") or (self.compositor.build_entity_visual_spec(category="player", name=p.get("name"), char_class=p.get("class")) if hasattr(self, "compositor") else None)
            })
        for m in self.get_monsters_in_room(r):
            raw, disp_name = m.get("raw_name", m.get("name", "")), m.get("name")
            nid, m_is_mov = _nid_mov(m)
            m_list.append({
                "id": m.get("id"), "numeric_id": nid, "name": disp_name, "raw_name": raw,
                "discovered": self.is_object_discovered("monster", raw),
                "x": float(m.get("x", 512)), "y": float(m.get("y", 384)), "facing": m.get("facing", "west"),
                "is_moving": m_is_mov, "archetype": m.get("archetype", "brute"),
                "hp": m.get("hp", 15), "max_hp": m.get("max_hp", 15), "ac": m.get("ac", 13), "speed_ft": m.get("speed_ft", 30),
                "is_staggered": bool(m.get("staggered_until", 0.0) > now),
                "windup_until": float(m.get("windup_until", 0.0)), "telegraph_radius": float(m.get("telegraph_radius", 0.0)),
                "token_category": "monster", "token_name": m.get("name", "Threat"),
                "visual_spec": m.get("visual_spec") or (self.compositor.build_entity_visual_spec(category="monster", name=disp_name) if hasattr(self, "compositor") else None)
            })
        for idx, it_name in enumerate(self.room_items.get(r, [])):
            rarity = self.classify_loot_rarity(it_name) if hasattr(self, "classify_loot_rarity") else {"rarity": "common", "color": 13684944}
            it_list.append({"name": it_name, "raw_name": it_name, "rarity": rarity, "discovered": True, "x": float(min(W - GRID_SQ, int(W * 0.48) + idx * GRID_SQ) + GRID_SQ // 2), "y": float(int(H * 0.62) + GRID_SQ // 2), "token_category": "item", "token_name": it_name})
        for npc in self.get_npcs_in_room(r):
            nid, _ = _nid_mov(npc)
            npc_list.append({
                "id": npc.get("id"), "numeric_id": nid, "name": npc.get("name"),
                "title": npc.get("title", nd.get("title", "Citizen")), "species": npc.get("species", nd.get("species", "Humanoid")),
                "class": npc.get("class", nd.get("class", "Citizen")), "discovered": True,
                "x": float(npc.get("x", 400)), "y": float(npc.get("y", 300)), "facing": npc.get("facing", "south"),
                "languages": list(npc.get("languages", nd.get("languages", [def_lang]))), "greeting": npc.get("greeting", nd.get("greeting", "Greetings.")),
                "token_category": "npc", "token_name": npc.get("name"),
                "visual_spec": npc.get("visual_spec") or (self.compositor.build_entity_visual_spec(category="npc", name=npc.get("name"), char_class=npc.get("class", "Citizen")) if hasattr(self, "compositor") else None)
            })
        payload = {
            "room_id": r,
            "room_name": self.rooms_def.get(r, {}).get("name", r.replace("_", " ").title()),
            "width": W,
            "height": H,
            "spawn": b.get("spawn", [512, 384]),
            "time_weather": self.get_time_and_weather(room_id=r),
            "players": p_list,
            "monsters": m_list,
            "npcs": npc_list,
            "items": it_list
        }
        if hasattr(self, "get_living_world_payload"):
            payload["living_world"] = self.get_living_world_payload(player_id)
        if include_static:
            st = static_override if static_override is not None else self.build_room_static_payload(r)
            payload["theme"] = st["theme"]
            payload["obstacles"] = [{**o, "discovered": self.is_object_discovered("obstacle", o["raw_name"])} for o in st["obstacles"]]
            payload["portals"] = [{**p, "discovered": self.is_object_discovered("portal", p.get("name", "Exit"), p.get("target", ""))} for p in st["portals"]]
        return payload

