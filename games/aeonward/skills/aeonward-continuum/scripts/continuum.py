"""Aeonward Continuum skill extension loaded dynamically by GameSession.load_skill()."""


class ContinuumMixin:
    """Skill-resident procedural sector expansion for The Aeonward Continuum."""

    def execute_command(self, user_input: str, player_id: str = None) -> str:
        cmd = (user_input or "").strip().lower()
        if any(p in cmd for p in ("expand continuum", "explore rift", "open rift", "chart sector")):
            self.turn_count += 1
            return self.expand_continuum_storyline()
        return super().execute_command(user_input, player_id)

    def use_item(self, cmd: str) -> str:
        if any(k in (cmd or "").strip().lower() for k in ("expand", "continuum", "rift")):
            return self.expand_continuum_storyline()
        return super().use_item(cmd)

    def expand_continuum_storyline(self) -> str:
        """Synthesizes and links a new skill-configured procedural Sector, Boss, Relic, and Chapter."""
        with self.state_lock:
            self.expansion_index = getattr(self, "expansion_index", 12) + 1
            sec_num = self.expansion_index
            cfg = self.game_data.get("continuum_expansion", {})
            themes = cfg.get("sector_themes") or [["Frontier Sector", "Uncharted Sanctuary", "vault", "Sector Sovereign", "Frontier Relic"]]
            t_name, t_color, _, boss_base, relic_base = themes[(sec_num - 13) % len(themes)]
            slug = lambda s: s.lower().replace(" ", "_").replace("-", "_")
            new_room_id = f"sector_{sec_num}_{slug(t_name)}"
            full_name = f"Sector {sec_num}: The {t_name}"
            boss_name = f"{boss_base} of Sector {sec_num}"
            guard_name = f"{cfg.get('guard_prefix', 'Sector Sentinel Mk-')}{sec_num}"
            relic_name = f"{relic_base} #{sec_num}"
            hub = cfg.get("hub_room", self.start_room)
            hub_name = cfg.get("hub_name", self.rooms_def.get(hub, {}).get("name", hub))
            prev_t = themes[(sec_num - 14) % len(themes)][0]
            anchor = cfg.get("initial_anchor", hub) if sec_num == 13 else f"sector_{sec_num - 1}_{slug(prev_t)}"
            anchor = anchor if anchor in self.rooms_def else (hub if hub in self.rooms_def else self.current_room)
            anchor_name = self.rooms_def.get(anchor, {}).get("name", anchor)

            self.rooms_def.setdefault(anchor, {"name": anchor})["north"] = [new_room_id, f"Newly stabilized Rift Bridge to {full_name}"]
            self.rooms_def[new_room_id] = {
                "name": full_name, "color": t_color,
                "desc": f"Surveyor stakes and weathered lantern mounts mark where earlier {t_name} scouts left half-drawn maps beside {boss_name}'s perimeter.",
                "south": [anchor, f"Return south to {anchor_name}"],
                "west": [hub, f"Direct Slipstream Recall to {hub_name}"],
                "items": [relic_name], "monsters": [boss_name, guard_name],
            }
            self.room_items[new_room_id], self.room_monsters[new_room_id], self.room_npcs[new_room_id] = [relic_name], [boss_name, guard_name], []

            tier, d_sec = min(10, 5 + (sec_num - 12) // 2), max(1, sec_num - 12)
            b_hp, g_hp = 50 + d_sec * 6, 28 + d_sec * 3
            self.bestiary_def[boss_name] = {
                "name": boss_name, "type": "Continuum Sovereign", "cr": str(tier), "level": tier, "hp": b_hp, "max_hp": b_hp,
                "ac": 16, "speed": "35 ft, Astral Phase", "attacks": f"Continuum Glaive (+{tier+2} to hit, {11 + d_sec} astral)",
                "detail": f"Tier {tier} Boss | Vitality: {b_hp} | Guard: 16",
            }
            self.bestiary_def[guard_name] = {
                "name": guard_name, "type": "Continuum Construct", "cr": str(max(2, tier - 2)), "level": max(2, tier - 2), "hp": g_hp, "max_hp": g_hp,
                "ac": 15, "speed": "30 ft", "attacks": getattr(self, "default_guard_attack", f"Halberd (+{tier} to hit, {7 + d_sec} damage)"),
                "detail": f"Tier {max(2, tier-2)} Construct | Guard: 15",
            }
            self.loot_tables_def[boss_name] = {
                "cr": str(tier), "difficulty": "Continuum Sovereign", "sovereign_marks": 120 + d_sec * 20, "aether_shards": 75 + d_sec * 15,
                "currency": "gp", "guaranteed_items": [relic_name], "deterministic_gear": [f"{cfg.get('weapon_prefix', 'Sovereign Blade Mk-')}{sec_num}"],
            }

            if anchor in self.room_bounds:
                ports = [p for p in self.room_bounds[anchor].get("portals", []) if p.get("direction") != "north"]
                ports.append({"direction": "north", "target": new_room_id, "name": f"Rift Bridge to {full_name}", "rect": [450, 0, 124, 48], "target_spawn": [512, 680]})
                self.room_bounds[anchor]["portals"] = ports
            self.room_bounds[new_room_id] = {
                "width": 1024, "height": 768, "spawn": [512, 620],
                "obstacles": [dict(o) for o in cfg.get("wall_obstacles", [])] + [{"name": f"{t_name} Resonance Monolith", "rect": [465, 310, 90, 90]}],
                "portals": [
                    {"direction": "south", "target": anchor, "name": f"Return to {anchor_name}", "rect": [450, 720, 124, 48], "target_spawn": [512, 90]},
                    {"direction": "west", "target": hub, "name": f"Slipstream Recall to {hub_name}", "rect": [0, 320, 48, 128], "target_spawn": [512, 384]},
                ],
            }
            self.chapters_def[f"chapter_{sec_num - 4}_continuum_sector_{sec_num}"] = {
                "title": f"Chapter {sec_num - 4}: Expedition into {full_name}",
                "completion_trigger": {"slain_monsters": [boss_name], "has_items": [relic_name]},
                "actions": {"broadcast_message": f">>> [CHAPTER {sec_num - 4} COMPLETE — GUILD SURVEY]: Stabilized {full_name} after resolving {boss_name}'s blockade, claiming {relic_name} for the Concordat Atlas!", "award_bonus_item": cfg.get("bonus_item", "Aether Cell"), "trigger_state": f"sector_{sec_num}_secured"},
            }
            self.scene_dirty = True
            self.world_model.infer_transition("background", "Continuum", f"expand_{new_room_id}", {"room": new_room_id})
            return f"🌌 [CONTINUUM EXPANSION]: Unlocked {full_name} (NORTH from {anchor_name}) | Threat: {boss_name} & {guard_name} | Chapter {sec_num - 4}: Claim {relic_name}!"
