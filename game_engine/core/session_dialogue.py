"""Free-form conversation with NPCs / talkable creatures that share a language with the speaker."""
import re
from .core_models import Choice, evaluate_jev_decision


class SessionDialogueMixin:
    def _dlg_speaker(self, player_id):
        return self.players.get(player_id) or next((p for p in self.players.values() if not p.get("is_ai")), next(iter(self.players.values()), None))

    def _dlg_room(self, speaker):
        return (speaker or {}).get("room") or self.current_room

    def _dlg_talkable_monsters(self, room):
        monster_talk = getattr(self, "monster_dialogue_talk", {})
        return [(m, k, info) for m in self.room_monsters.get(room, []) for k, info in monster_talk.items() if k in m.lower()]

    def is_free_conversation(self, cmd: str, player_id: str = None) -> bool:
        """True when text is conversational rather than a game command and someone is present."""
        c = cmd.strip().lower()
        if not c or c == "i":
            return False
        verbs = getattr(self, "custom_command_verbs", "")
        if verbs and re.match(rf"^(?:{verbs})\b", c, re.IGNORECASE):
            return False
        if not verbs and evaluate_jev_decision(c, {"m": Choice(criteria={
            "cmd": "go move walk run climb north south east west up down attack kill fight strike hit take get grab loot drop look survey inventory inv rest sleep use unlock save load",
            "talk": "say ask tell hello hi greetings why how who what please thank",
        })})["m"].choice == "cmd":
            return False
        room = self._dlg_room(self._dlg_speaker(player_id))
        return bool(self.get_npcs_in_room(room) or self._dlg_talkable_monsters(room))

    def _dlg_pick_path(self, paths, text):
        avail = [p for p in paths if f"dlg:{p['id']}" not in self.story_flags and (not p.get("requires") or p["requires"] in self.story_flags)]
        if not avail or not text.strip():
            return None
        crit = {str(i): f"{' '.join(p.get('keywords', []))} {p.get('reply', '')}" for i, p in enumerate(avail)}
        ans = evaluate_jev_decision(text, {"dlg": Choice(criteria=crit)})["dlg"]
        return avail[int(ans.choice)] if ans.choice and (len(avail) == 1 or ans.confidence >= 0.45) else None

    def _dlg_apply(self, path, speaker, player_id):
        fx, notes = path.get("effects", {}), []
        self.story_flags.add(f"dlg:{path['id']}")
        pid = player_id if player_id in self.players else (speaker or {}).get("id")
        cs = self.char_stats
        if fx.get("hp"):
            d = int(fx["hp"])
            cs["current_hp"] = max(1, min(cs.get("max_hp", 20), cs.get("current_hp", 20) + d))
            if pid in self.players:
                p = self.players[pid]
                p["hp"] = max(1, min(p.get("max_hp", 20), p.get("hp", 20) + d))
            notes.append(f"[HP {d:+d}] ({cs['current_hp']}/{cs.get('max_hp')})")
        if fx.get("xp"):
            cs["xp"] = cs.get("xp", 0) + int(fx["xp"])
            notes.append(f"[+{fx['xp']} XP]")
        if fx.get("give_item") and fx["give_item"] not in self.inventory:
            self.inventory.append(fx["give_item"])
            notes.append(f"[Received: {fx['give_item']}]")
        if fx.get("flag"):
            self.story_flags.add(fx["flag"])
        q = fx.get("quest")
        if q and f"quest:{q['id']}" not in self.story_flags:
            self.story_flags.add(f"quest:{q['id']}")
            notes.append(f"[NEW QUEST: {q['title']}] {q['desc']}")
        if fx.get("spawn"):
            lst = self.room_monsters.setdefault(self.current_room, [])
            for m in fx["spawn"]:
                if m not in lst:
                    lst.append(m)
        self.scene_dirty = True
        return notes

    def active_quests(self) -> list[str]:
        return sorted(f[6:] for f in self.story_flags if f.startswith("quest:"))

    def converse_with_npc(self, user_input: str, player_id: str = None) -> str:
        speaker = self._dlg_speaker(player_id)
        room = self._dlg_room(speaker)
        text = user_input.strip().lower()
        speaker_name = (speaker or {}).get("name", "Adventurer")
        langs = self.get_character_languages(speaker)
        npc_paths = getattr(self, "npc_dialogue_paths", {})

        # Talkable creature named in the command takes priority over NPCs
        for m_name, key, info in self._dlg_talkable_monsters(room):
            if key in text or m_name.lower() in text:
                shared = [l for l in langs if l in info["languages"]]
                if not shared:
                    return (f"[{m_name.upper()}]: snarls in {', '.join(info['languages'])}. "
                            "You do not share a language with it.")
                path = self._dlg_pick_path(info["paths"], text)
                lines = [f'[{speaker_name.upper()}]: says in {shared[0]}, "{user_input.strip()}"']
                if path:
                    lines.append(f"[{m_name.upper()}]: {path['text']}")
                    lines += self._dlg_apply(path, speaker, player_id)
                    if path.get("effects", {}).get("combat"):
                        lines.append(self.combat(f"attack {m_name}", player_id=player_id))
                else:
                    lines.append(f"[{m_name.upper()}]: {info['fallback']}")
                return "\n".join(lines)

        npcs = self.get_npcs_in_room(room)
        store = self.__dict__.setdefault("_dlg_last_target", {})
        target = None
        if npcs:
            n_ans = evaluate_jev_decision(text, {"n": Choice(criteria={str(i): f"{n['id']} {n['name']}" for i, n in enumerate(npcs)})})["n"]
            named = n_ans.confidence >= 0.45
            target = npcs[int(n_ans.choice)] if named else next((n for n in npcs if n["id"] == store.get(player_id)), npcs[0])
        if not target:
            return super().converse_with_npc(user_input, player_id=player_id)
        store[player_id] = target["id"]
        n_name = target["name"]
        def_lang = getattr(self, "default_language", "Common")
        shared = [l for l in langs if l in target.get("languages", [def_lang])] or [def_lang]
        path = self._dlg_pick_path(npc_paths.get(target["id"], []), text)
        if not path:
            q = user_input if named else f"talk to {n_name.split()[0]} about {user_input}"
            return super().converse_with_npc(q, player_id=player_id)
        lines = [f'[{speaker_name.upper()}]: says in {shared[0]}, "{user_input.strip()}"',
                 f"[{n_name.upper()} ({target.get('title', 'Envoy')})]: {path['text']}"]
        lines += self._dlg_apply(path, speaker, player_id)
        if path.get("effects", {}).get("combat"):
            lines.append(self.combat("attack", player_id=player_id))
        return "\n".join(lines)
