"""Canonical catalog of 108 character actions & physical simulation metadata."""
import math
import re
import time

# Compact tuple schema: (id, category, label, icon, posture, phys_mode, duration_s, hand_pose, aliases)
_RAW_ACTIONS = [
    # 1. Locomotion & Acrobatics (16)
    ("jump", "Locomotion", "Jump", "🦘", "jump", "jump", 0.9, "open", "leap_up hop spring"),
    ("double_jump", "Locomotion", "Double Jump", "✨", "double_jump", "double_jump", 1.1, "open", "air_jump midair_leap"),
    ("run", "Locomotion", "Run / Sprint", "🏃", "run", "sprint", 4.0, "reins", "sprint dash_run jog"),
    ("dash", "Locomotion", "Burst Dash", "💨", "dash", "dash", 0.7, "none", "burst_step surge"),
    ("crouch", "Locomotion", "Crouch", "🧎", "crouch", "crouch", 8.0, "none", "duck stoop"),
    ("sneak", "Locomotion", "Stealth Sneak", "🥷", "sneak", "sneak", 8.0, "dagger", "stealth prowl creep tiptoe"),
    ("crawl", "Locomotion", "Low Crawl", "🦎", "crawl", "crawl", 6.0, "open", "army_crawl belly_crawl"),
    ("roll", "Locomotion", "Tumble Roll", "🌀", "roll", "roll", 0.85, "open", "tumble dodge_roll somersault"),
    ("backflip", "Locomotion", "Backflip", "🤸", "backflip", "backflip", 1.0, "open", "flip back_somersault"),
    ("cartwheel", "Locomotion", "Cartwheel", "⭕", "cartwheel", "cartwheel", 1.05, "open", "handspring sideflip"),
    ("slide", "Locomotion", "Knee Slide", "⚡", "slide", "slide", 0.95, "open", "power_slide baseball_slide"),
    ("broad_jump", "Locomotion", "Broad Leap", "🏹", "jump", "broad_leap", 1.0, "open", "long_jump vault_leap"),
    ("sidestep", "Locomotion", "Tactical Sidestep", "↔️", "dash", "sidestep", 0.7, "none", "evade strafe_step"),
    ("swim", "Locomotion", "Paddle Swim", "🏊", "swim", "swim", 5.0, "open", "tread_water splash"),
    ("glide", "Locomotion", "Spread Glide", "🪽", "fly", "glide", 8.0, "open", "soar_glide float_down"),
    ("land_brace", "Locomotion", "Superhero Land", "💥", "kneel", "slam_land", 1.3, "fist", "superhero_landing crash_land"),

    # 2. Climbing & Obstacles (12)
    ("climb_tree", "Climb", "Climb Nearest Tree", "🌳", "climb_tree", "climb_tree", 10.0, "open", "scale_tree tree_climb asc_tree"),
    ("climb_ladder", "Climb", "Climb Nearest Ladder", "🪜", "climb_ladder", "climb_ladder", 10.0, "open", "scale_ladder ladder_up"),
    ("climb_wall", "Climb", "Free-Climb Wall", "🧗", "climb_ladder", "climb_wall", 8.0, "open", "scale_wall rock_climb"),
    ("perch_branch", "Climb", "Perch on Branch", "🦅", "crouch", "perch", 8.0, "open", "roost branch_perch"),
    ("vault", "Climb", "Vault Obstacle", "🏃", "jump", "vault", 0.9, "open", "hurdle obstacle_vault"),
    ("mantle", "Climb", "Ledge Mantle", "🧗", "climb_ladder", "mantle", 1.4, "open", "pull_up ledge_grab"),
    ("rappel", "Climb", "Rope Rappel Down", "🪢", "climb_ladder", "rappel", 3.5, "reins", "descend_rope fast_rope"),
    ("swing_vine", "Climb", "Swing Across Gap", "🌿", "fly", "swing_vine", 1.8, "reins", "vine_swing rope_swing"),
    ("balance_beam", "Climb", "Tightrope Balance", "⚖️", "balance", "balance", 6.0, "open", "walk_beam edge_balance"),
    ("hang_ledge", "Climb", "Hang by Hands", "✊", "hang", "hang", 5.0, "reins", "dangle cliff_hang"),
    ("drop_down", "Climb", "Controlled Drop", "⬇️", "crouch", "drop_down", 1.1, "open", "let_go drop_off"),
    ("grapple", "Climb", "Grapple Zip", "🪝", "fly", "grapple", 1.2, "reins", "grappling_hook zip_line"),

    # 3. Combat Swings, Shots & Defense (18)
    ("swing_slash", "Combat", "Weapon Swing", "⚔️", "swing", "swing", 0.9, "sword", "swing slash strike_air cut"),
    ("heavy_cleave", "Combat", "Overhead Heavy Cleave", "🪓", "heavy_cleave", "heavy_cleave", 1.15, "sword", "overhead_slam smash_cleave"),
    ("thrust_stab", "Combat", "Forward Thrust", "🗡️", "thrust", "lunge_fwd", 0.9, "dagger", "lunge_stab pierce"),
    ("spin_attack", "Combat", "Whirlwind 360 Spin", "🌪️", "spin", "spin_attack", 1.1, "sword", "whirlwind tornado_slash"),
    ("uppercut", "Combat", "Rising Uppercut", "🥊", "uppercut", "uppercut_hop", 0.95, "fist", "sky_uppercut rising_blow"),
    ("pommel_strike", "Combat", "Pommel Bash", "🔨", "swing", "bash_fwd", 0.85, "hammer", "hilt_bash stun_hit"),
    ("defend_block", "Combat", "Defend / Raise Guard", "🛡️", "defend", "guard_stance", 5.0, "shield", "defend guard brace block_stance"),
    ("parry_riposte", "Combat", "Timed Parry Stance", "⚡", "parry", "parry", 1.6, "sword", "deflect counter_stance"),
    ("shield_wall", "Combat", "Locked Shield Wall", "🧱", "defend", "shield_wall", 6.0, "shield", "phalanx bulwark_stance"),
    ("brace_impact", "Combat", "Brace for Impact", "🦾", "crouch", "brace", 3.5, "shield", "hunker_down absorb"),
    ("draw_bow", "Combat", "Draw & Aim Bow", "🏹", "draw_bow", "aim_slow", 3.5, "draw", "nock_arrow aim_bow"),
    ("aim_shot", "Combat", "Snap Release Shot", "🎯", "draw_bow", "snap_shot", 1.0, "draw", "loose_arrow fire_arrow"),
    ("throw_dagger", "Combat", "Flourish Knife Throw", "🔪", "throw", "throw_step", 0.9, "dagger", "hurl_blade toss_knife"),
    ("cast_spell", "Combat", "Channel Arcane Cast", "🔮", "cast", "hover_pulse", 1.8, "cast", "weave_magic spell_cast"),
    ("channel_beam", "Combat", "Two-Hand Energy Surge", "🌟", "warm", "hover_pulse", 2.4, "open", "power_up charge_mana"),
    ("battle_stance", "Combat", "Ready Battle Stance", "⚔️", "defend", "ready", 5.0, "sword", "combat_ready square_up"),
    ("feint", "Combat", "Combat Feint", "🤺", "swing", "feint_step", 0.85, "sword", "fake_strike bait"),
    ("taunt_duel", "Combat", "Beckon Duel", "😤", "taunt", "chest_pound", 2.2, "fist", "provoke challenge_foe"),

    # 4. Stances, Rest & Recovery (15)
    ("kneel", "Stances", "Kneel Down", "🧎", "kneel", "kneel", 10.0, "open", "take_a_knee bend_knee"),
    ("genuflect", "Stances", "Solemn Knight Kneel", "🗡️", "kneel", "kneel", 10.0, "sword", "swear_oath knight_kneel"),
    ("sit_ground", "Stances", "Sit on Ground", "🪑", "sit", "sit", 12.0, "open", "sit sit_down have_a_seat"),
    ("cross_legged", "Stances", "Sit Cross-Legged", "🧘", "sit", "sit", 12.0, "open", "lotus_sit camp_sit"),
    ("sleep", "Stances", "Lie Down & Sleep", "😴", "sleep", "sleep", 18.0, "open", "lie_down slumber doze Zzz"),
    ("nap", "Stances", "Quick Catnap", "💤", "sleep", "sleep", 10.0, "open", "rest_eyes power_nap"),
    ("meditate", "Stances", "Floating Meditate", "🧘", "meditate", "levitate", 10.0, "open", "zen_focus commune_aether"),
    ("prone", "Stances", "Drop Prone", "🫥", "sleep", "prone", 8.0, "open", "hit_the_deck flat_on_ground"),
    ("stretch", "Stances", "Limber Morning Stretch", "🙆", "cheer", "stretch", 2.8, "open", "limber_up loosen_shoulders"),
    ("yawn", "Stances", "Big Tired Yawn", "🥱", "warm", "yawn", 2.4, "open", "sleepy_stretch"),
    ("shiver", "Stances", "Shiver in Cold", "🥶", "crouch", "shiver", 3.5, "fist", "brr cold_tremble"),
    ("warm_hands", "Stances", "Warm Hands at Fire", "🔥", "warm", "warm", 6.0, "open", "warm_by_fire toast_hands"),
    ("lean_wall", "Stances", "Casual Shoulder Lean", "🧱", "sit", "lean", 8.0, "reins", "cool_lean"),
    ("pray", "Stances", "Reverent Prayer", "🙏", "kneel", "pray", 6.0, "open", "blessing_prayer"),
    ("inspect_ground", "Stances", "Track Footprints", "🔎", "crouch", "crouch", 5.0, "open", "track_trail study_tracks"),

    # 5. Hunting, Slaying Animals, Cooking & Food (15)
    ("slay_animal", "Survival", "Slay Nearby Animal for Meat", "🥩", "hunt", "hunt_lunge", 1.8, "sword", "slay_animals hunt_meat kill_animal hunt"),
    ("slay_rabbit", "Survival", "Hunt Rabbit for Food", "🐇", "hunt", "hunt_lunge", 1.6, "dagger", "catch_rabbit kill_rabbit"),
    ("slay_fox", "Survival", "Hunt Fox / Pelts", "🦊", "hunt", "hunt_lunge", 1.8, "sword", "hunt_fox kill_fox"),
    ("hunt_deer", "Survival", "Stalk & Slay Wild Deer", "🦌", "hunt", "hunt_lunge", 2.2, "bow", "slay_deer venison_hunt"),
    ("stalk_prey", "Survival", "Low Stalk Prey", "🐾", "sneak", "sneak", 6.0, "bow", "track_animal creep_prey"),
    ("skin_game", "Survival", "Skin & Field Dress", "🔪", "kneel", "butcher", 2.8, "dagger", "dress_game harvest_hide"),
    ("butcher_meat", "Survival", "Butcher Fresh Cuts", "🍖", "kneel", "butcher", 2.5, "dagger", "carve_meat prep_meat"),
    ("build_campfire", "Survival", "Strike Sparks / Campfire", "🔥", "kneel", "spark_ground", 2.6, "fist", "make_fire kindle_hearth"),
    ("roast_meat", "Survival", "Roast Meat Over Fire", "🍗", "warm", "cook", 4.0, "reins", "cook_meat grill_venison sear"),
    ("cook_stew", "Survival", "Simmer Trail Stew", "🍲", "kneel", "cook", 4.5, "reins", "brew_stew boil_soup"),
    ("eat_food", "Survival", "Eat Cooked Food (+HP)", "🍽️", "eat", "eat", 2.5, "open", "eat_meat munch feast snack"),
    ("drink_water", "Survival", "Drink Canteen Water", "🥤", "eat", "drink", 2.2, "reins", "sip_water hydrate drink"),
    ("forage_berries", "Survival", "Forage Wild Berries", "🫐", "crouch", "forage", 2.5, "open", "pick_berries gather_fruit"),
    ("gather_herbs", "Survival", "Harvest Healing Herbs", "🌿", "kneel", "forage", 2.5, "open", "pick_herbs gather_flora"),
    ("chop_wood", "Survival", "Chop Firewood", "🪓", "heavy_cleave", "chop", 2.4, "hammer", "fell_wood split_logs"),

    # 6. Social & Expressive Gestures (18)
    ("wave", "Social", "Friendly Wave", "👋", "wave", "wave", 3.0, "open", "greet hello_wave"),
    ("highfive", "Social", "Paired High-Five", "🙌", "highfive", "highfive", 2.8, "open", "high_five slap_hand"),
    ("fistbump", "Social", "Paired Fist-Bump", "🤜", "fistbump", "fistbump", 2.4, "fist", "fist_bump knucks"),
    ("hug", "Social", "Warm Ally Hug", "🫂", "hug", "hug", 3.2, "open", "embrace comfort_hug"),
    ("salute", "Social", "Crisp Vanguard Salute", "🫡", "salute", "salute", 2.8, "open", "military_salute honor"),
    ("bow_courtesy", "Social", "Respectful Bow", "🙇", "bow", "bow", 2.6, "open", "deep_bow curtsy"),
    ("point", "Social", "Point Direction", "👉", "point", "point", 3.0, "cast", "point_ahead indicate"),
    ("beckon", "Social", "Beckon Squad Closer", "🤏", "wave", "beckon", 2.6, "open", "come_here wave_over"),
    ("clap", "Social", "Applaud & Clap", "👏", "clap", "clap", 3.2, "open", "applaud bravo"),
    ("cheer", "Social", "Victory Cheer", "🎉", "cheer", "cheer_hop", 3.2, "open", "hooray celebrate fist_pump"),
    ("laugh", "Social", "Hearty Laugh", "😄", "cheer", "bounce", 2.6, "open", "chuckle guffaw"),
    ("shrug", "Social", "Exaggerated Shrug", "🤷", "shrug", "shrug", 2.4, "open", "dunno clueless"),
    ("nod", "Social", "Affirmative Nod", "😌", "nod", "nod", 2.0, "none", "agree yes_nod"),
    ("shake_head", "Social", "Disagree Headshake", "🙅", "shake_head", "shake_head", 2.0, "none", "nope_shake"),
    ("facepalm", "Social", "Dramatic Facepalm", "🤦", "salute", "facepalm", 2.5, "open", "sigh_palm"),
    ("blow_kiss", "Social", "Send Flourish Kiss", "😘", "wave", "wave", 2.4, "open", "charm_wave"),
    ("flex", "Social", "Show Off Strength", "💪", "cheer", "flex", 3.0, "fist", "muscle_pose boast"),
    ("rally_cry", "Social", "Squad Rally Cry", "📣", "cheer", "rally_hop", 2.8, "sword", "war_cry inspire_party"),

    # 7. Music, Craft, Work & Dragon Flight (14)
    ("dance", "Performance & Dragon", "Victory Dance", "💃", "dance", "dance", 8.0, "open", "boogie groove party_dance"),
    ("play_lute", "Performance & Dragon", "Strum Lute", "🪕", "instrument", "music", 8.0, "reins", "lute music_lute"),
    ("play_drum", "Performance & Dragon", "Beat War Drum", "🥁", "instrument", "music", 8.0, "fist", "drum war_drum"),
    ("play_flute", "Performance & Dragon", "Play Silver Flute", "🪈", "instrument", "music", 8.0, "reins", "flute"),
    ("sing", "Performance & Dragon", "Belt Ballad Song", "🎤", "cheer", "sway", 6.0, "open", "hum_ballad chant"),
    ("whistle", "Performance & Dragon", "Call Whistle", "😙", "point", "whistle", 2.2, "open", "whistle_tune call_pet"),
    ("juggle", "Performance & Dragon", "Juggle Glowing Orbs", "🤹", "clap", "juggle", 5.0, "open", "toss_orbs tricks"),
    ("mine_ore", "Performance & Dragon", "Mine Crystal Vein", "⛏️", "heavy_cleave", "chop", 2.8, "hammer", "pickaxe_swing strike_rock"),
    ("hammer_forge", "Performance & Dragon", "Hammer Anvil", "🔨", "swing", "chop", 2.8, "hammer", "smithing anvil_work"),
    ("dig_earth", "Performance & Dragon", "Excavate Soil", "🪏", "kneel", "chop", 2.8, "reins", "shovel_dig"),
    ("fish_cast", "Performance & Dragon", "Cast Fishing Line", "🎣", "sit", "fish", 8.0, "reins", "angling go_fishing"),
    ("summon_dragon", "Performance & Dragon", "Call Dragon to Land", "🐉", "wave", "whistle", 3.0, "open", "land_dragon beckon_dragon call_dragon call_dragon_to_land"),
    ("mount_dragon", "Performance & Dragon", "Mount Sky Dragon", "🪽", "dragon_ride", "dragon_ride", 30.0, "reins", "ride_dragon hop_on_dragon ride_sky_dragon"),
    ("dragon_fire", "Performance & Dragon", "Unleash Dragon Fire & Smoke", "🔥", "dragon_ride", "dragon_fire", 2.5, "reins", "breathe_fire ignite_world burn"),
]

CHARACTER_ACTIONS = [
    {
        "id": row[0], "category": row[1], "label": row[2], "icon": row[3],
        "posture": row[4], "phys_mode": row[5], "duration": row[6],
        "hand_pose": row[7], "aliases": row[8],
    }
    for row in _RAW_ACTIONS
]
ACTIONS_BY_ID = {a["id"]: a for a in CHARACTER_ACTIONS}

_FOOD_ITEMS = [
    ("Raw Rabbit Haunch", "Cooked Rabbit Roast", 6),
    ("Raw Venison Cut", "Seared Venison Steak", 10),
    ("Wild Fox Haunch", "Herb-Crusted Roast", 8),
    ("Wild Meadow Berries", "Sweet Berry Tart", 5),
]
_RAW_FOOD_MAP = {raw: cooked for raw, cooked, _ in _FOOD_ITEMS}
_EDIBLE_HEAL = {cooked: hp for _, cooked, hp in _FOOD_ITEMS}
_EDIBLE_HEAL.update({raw: max(2, hp // 2) for raw, _, hp in _FOOD_ITEMS})
_EDIBLE_HEAL.update({"Starlight Koi": 7, "Moonfin Trout": 7, "Travel Rations": 8})


def get_action_catalog_payload():
    return CHARACTER_ACTIONS


def match_character_action(query: str, explicit_only: bool = True):
    """Matches a user string to one of the 108 character actions (or None)."""
    q = (query or "").strip().lower()
    if not q:
        return None
    norm = re.sub(r"[^a-z0-9\s]", " ", q).strip()
    norm_us = norm.replace(" ", "_")
    if norm_us in ACTIONS_BY_ID:
        return ACTIONS_BY_ID[norm_us]
    # Exact single-word or direct alias match first (keeps standard commands like 'attack gob', 'go north', 'look', 'long rest' safe)
    if norm in ACTIONS_BY_ID:
        return ACTIONS_BY_ID[norm]
    toks = set(norm.split())
    for a in CHARACTER_ACTIONS:
        alias_words = a["aliases"].split()
        label_low = a["label"].lower()
        if any(norm == al.replace("_", " ") for al in alias_words) or norm == label_low:
            return a
        if explicit_only and any(al.replace("_", " ") in norm and ("_" in al or len(al) >= 4) for al in alias_words):
            if norm not in ("attack", "move", "go", "look", "rest", "long rest", "short rest", "take", "drop", "inventory", "use", "stats"):
                if not re.match(r"^(?:go|move|walk)\s+(?:north|south|east|west|up|down|n|s|e|w)\b", norm):
                    return a
    if not explicit_only and toks:
        best, best_sc = None, 0
        for a in CHARACTER_ACTIONS:
            words = set([a["id"], *a["id"].split("_"), *a["aliases"].replace("_", " ").split(), *a["label"].lower().split()])
            sc = len(toks & words)
            if sc > best_sc:
                best, best_sc = a, sc
        if best and best_sc > 0:
            return best
    return None


def perform_character_action(game, query: str, player_id: str = None) -> str:
    """Executes any of the 108 character actions with real inventory, companion & physics state."""
    p = game.get_player(player_id)
    act = match_character_action(query, explicit_only=False) or ACTIONS_BY_ID["wave"]
    aid = act["id"]
    now = time.time()
    dur = float(act["duration"] or 2.5)
    p["emote"] = {
        "key": aid, "posture": act["posture"], "phys_mode": act["phys_mode"],
        "label": act["label"], "icon": act["icon"], "hand_pose": act["hand_pose"],
        "duration": dur, "ts": now,
    }
    p["is_sitting"] = act["posture"] in ("sit", "sleep")
    p["emote_until"] = now + max(1.5, dur)
    extra = ""

    # Paired social interactions pull nearest AI ally cleanly
    if aid in ("highfive", "fistbump", "hug"):
        near = [op for op in game.get_players_in_room(game.current_room) if op["id"] != p["id"] and math.hypot(op["x"] - p["x"], op["y"] - p["y"]) <= 240.0]
        if near:
            partner = min(near, key=lambda op: math.hypot(op["x"] - p["x"], op["y"] - p["y"]))
            partner["x"] = round(p["x"] + 36.0, 1)
            partner["y"] = round(p["y"], 1)
            partner["emote"] = dict(p["emote"], ts=now)
            partner["emote_until"] = now + dur
            game._emit_fx("highfive_pair", a=p["id"], b=partner["id"], x=(p["x"] + partner["x"]) * 0.5, y=p["y"], chime="highfive")
            extra = f" — {partner['name']} joins right in!"

    # Hunting & Slaying animals for meat
    elif aid in ("slay_animal", "slay_rabbit", "slay_fox", "hunt_deer", "skin_game", "butcher_meat"):
        loot_name = "Raw Venison Cut" if aid == "hunt_deer" else ("Raw Rabbit Haunch" if aid == "slay_rabbit" else ("Wild Fox Haunch" if aid == "slay_fox" else "Raw Rabbit Haunch"))
        game.inventory.append(loot_name)
        p["xp"] = int(p.get("xp", 0)) + 8
        game._emit_fx("hit_impact", x=p["x"] + 16, y=p["y"], is_crit=True, chime="sword_hit")
        extra = f" 🥩 Harvested [{loot_name}] into your pack! Use 'roast meat' over fire and 'eat food' to heal."

    elif aid in ("forage_berries", "gather_herbs"):
        found = "Wild Meadow Berries" if aid == "forage_berries" else "Solaris Herb"
        game.inventory.append(found)
        extra = f" 🌿 Gathered [{found}] into your pack!"

    elif aid in ("roast_meat", "cook_stew", "build_campfire"):
        cooked_one = None
        for idx, it in enumerate(list(game.inventory)):
            if it in _RAW_FOOD_MAP:
                cooked_one = _RAW_FOOD_MAP[it]
                game.inventory[idx] = cooked_one
                break
        if cooked_one:
            extra = f" 🔥 Roasted into steaming [{cooked_one}]! Type 'eat food' to restore HP."
        elif aid == "build_campfire":
            game.warmth_buff = True
            extra = " 🔥 Warm campfire crackles brightly nearby (+Warmth & cooking ready)."
        else:
            extra = " 🔥 Fire blazes ready — hunt animals ('slay rabbit') or fish ('fish') to roast food!"

    elif aid in ("eat_food", "drink_water"):
        eaten, heal = None, 4
        for idx, it in enumerate(list(game.inventory)):
            if it in _EDIBLE_HEAL:
                eaten = game.inventory.pop(idx)
                heal = _EDIBLE_HEAL[eaten]
                break
        old_hp = int(p.get("hp", 10))
        max_hp = int(p.get("max_hp", 20))
        p["hp"] = min(max_hp, old_hp + heal)
        gained = p["hp"] - old_hp
        extra = f" 😋 Enjoyed [{eaten or 'Trail Rations'}] (+{gained} HP, now {p['hp']}/{max_hp})!"

    elif aid == "sleep":
        old_hp = int(p.get("hp", 10))
        max_hp = int(p.get("max_hp", 20))
        p["hp"] = min(max_hp, old_hp + max(2, max_hp // 6))
        extra = f" 💤 Drifts off peacefully (+{p['hp'] - old_hp} HP recovered)."

    elif aid in ("mount_dragon",):
        return game.summon_mount("ash_drake", player_id)

    elif aid == "dragon_fire":
        game._emit_fx("combo_detonate", title="DRAGONFIRE IGNITION!", x=p["x"] + 28, y=p["y"], color=16736800)
        extra = " 🔥 Ignis-Vael bathes the earth in roaring flames & billowing smoke!"

    game._emit_fx("character_action", player_id=p["id"], action_id=aid, posture=act["posture"], phys_mode=act["phys_mode"], x=p["x"], y=p["y"])
    game.scene_dirty = True
    return f"{act['icon']} [{p['name']} — {act['label']}]: {act['posture'].replace('_', ' ').title()}{extra}"
