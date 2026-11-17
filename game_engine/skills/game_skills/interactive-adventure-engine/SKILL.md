---
name: interactive-adventure-engine
title: interactive-adventure-engine
type: reference/game-domain
description: Mathematical formalization and operational state-machine mechanics for deterministic interactive text-based and spatial adventure games, inventory management, topological room routing, entity AI, and victory sequence evaluation across arbitrary game worlds.
status: stable
generated:
  by: agent:google-antigravity
  at: '2026-11-15T09:45:00Z'
tags:
- interactive-engine
- game-state
- world-model
game:
  intent_criteria:
    attack: attack kill fight strike hit slay foes monsters weapon slash shoot cleave weave blast calibrate focus lock
    take: take get grab loot collect retrieve salvage item key cipher signet core cell pack pickup
    drop: drop discard leave place down
    move: go move walk climb north south east west up down stairs enter run forward n s e w u d
    look: look survey inspect describe room area surroundings scan explore l
    inventory: inventory items bag carrying equipment gear sheet stats character i inv
    rest: rest sleep short rest long rest heal recover camp calibrate field sanctuary convergence
    use: use unlock drink quaff cell key open chest activate lock door expand continuum
    save_load: save load delete rename list saves saved games
    dialogue: talk to speak with converse with ask query chat with tell talk
    salutation: hello hi hail greetings salutations good morning day evening well met
    question: what where who whom which how why is are was were can could would should does do did tell me search check inspect examine find
  hero_archetypes:
  - name: Adventurer
    class: Adventurer
    species: Humanoid
    level: 1
    hp: 30
    max_hp: 30
    ac: 14
    speed: 30
    weapon: Sword
    armor: Leather Armor
    languages: [Common]
    abilities:
      FORGE: {score: 14, mod: 2}
      FLOW: {score: 14, mod: 2}
      AEGIS: {score: 14, mod: 2}
      VOID: {score: 10, mod: 0}
      CHRONO: {score: 10, mod: 0}
      SYNAPSE: {score: 12, mod: 1}
    spells: []
    traits: []
  client:
    offline_help: "Commands: look, inventory, stats/sheet, examine <obj>, talk to <npc>, ask any '?' question, attack, take <item>, move/travel <room>."
    readonly_intents: [look, inventory, question, salutation]
    biome_rules:
      snow: "frost glacier snow ice mountain peak"
      dense_forest: "forest woods glade canopy jungle grove"
      clear: "town plaza hall tavern room chamber"
    visual_classification:
      character_archetypes:
        wizard: "wizard mage sorcerer caster arcane staff"
        rogue: "rogue thief assassin stealth scout dagger"
        archer: "archer ranger marksman bow hunter"
        cleric: "cleric priest paladin healer temple"
        fighter: "fighter warrior knight guardian sword shield"
      monsters:
        spider: "spider arachnid crawler web"
        wolf: "wolf hound dog beast predator"
        skeleton: "skeleton undead bone skull wraith"
        brute: "ogre troll brute giant boss golem"
        raider: "goblin raider bandit orc skirmisher"
    portrait_styles:
      fighter: {label: Fighter, torso: "#dde4ed", trim: "#1f6feb", accent: "#f3ba2f", pauldron: "#dde4ed", headgear: helm, weapon: sword, skin: "#ffd1a4", eye: "#238636"}
      wizard: {label: Wizard, torso: "#6e40c9", trim: "#388bfd", accent: "#78dcff", pauldron: "#5a3825", headgear: hat, weapon: staff, skin: "#ffd1a4", eye: "#2f81f7"}
      rogue: {label: Rogue, torso: "#2c1f18", trim: "#5a3825", accent: "#c8cdd7", pauldron: "#5a3825", headgear: hood, weapon: daggers, skin: "#ffd1a4", eye: "#238636"}
      cleric: {label: Cleric, torso: "#f3ba2f", trim: "#dde4ed", accent: "#ebc341", pauldron: "#dde4ed", headgear: circlet, weapon: hammer, skin: "#ffd1a4", eye: "#2f81f7"}
      archer: {label: Archer, torso: "#238636", trim: "#5a3825", accent: "#d7a537", pauldron: "#5a3825", headgear: hood, weapon: bow, skin: "#ffd1a4", eye: "#238636"}
    music_tracks:
      combat: {bpm: 132, roots: [164.81, 174.61, 196.00, 146.83], lead_ratios: [2, 2.12, 2.378, 2.67, 2.996, 3.17, 3.56], bass_mod: 2, chord_mod: 4, lead_mod: 3, third: 1.189}
      victory: {bpm: 116, roots: [261.63, 293.66, 329.63, 392.00], lead_ratios: [2, 2.245, 2.52, 2.996, 3.36], bass_mod: 4, chord_mod: 2, lead_mod: 1, third: 1.2599}
      exploration: {bpm: 92, roots: [220.00, 196.00, 174.61, 164.81], lead_ratios: [1, 1.122, 1.189, 1.334, 1.498, 1.681, 1.781, 2.0], bass_steps: [0, 8], chord_mod: 4, plucks: [0, 3, 6, 8, 10, 13], third: 1.189}
    atmosphere_presets:
      clear_fog: [2300, 11200]
      mist_fog: [1300, 7800]
      indoor: {bg: 527120, fog: 527120, fog_near: 500, fog_far: 1900, amb: 13686750, ambI: 0.70, dir: 15787730, dirI: 0.85, pos: [150, 500, 200]}
      period_criteria:
        dawn: "dawn sunrise first light early morning twilight amethyst"
        morning: "morning day bright sun forenoon clear"
        afternoon: "afternoon noon midday high sun zenith golden"
        dusk: "dusk sunset sundown twilight amber eveningfall"
        evening: "evening late twilight dusk nightfall stars"
        night: "night midnight dark lunar moonlight starlight"
      periods:
        dawn:
          badge: "🌅"
          bg: 2630458
          fog: 10185586
          amb: 16762265
          ambI: 0.78
          ambMist: 0.55
          dir: 16752230
          dirI: 0.95
          dirMist: 0.50
          pos: [-450, 250, 400]
          orb: 16743252
          stars: 95
          sky: [[0.0, "#121b33"], [0.24, "#2d3b66"], [0.42, "#9a5260"], [0.50, "#df9164"], [0.58, "#c27b5c"], [1.0, "#6a4e58"]]
          cloud: ["rgba(255, 182, 138, ", "rgba(190, 100, 95, 0)", 0.34, 0.62]
          env: {sky: ["#1c1b33", "#5d3855", "#e89065"], ground: ["#422a1b", "#1c120c"], sun: "rgba(255, 160, 90, 0.85)", bar_hi: "rgba(255, 255, 255, 0.65)", bar_lo: "rgba(160, 210, 255, 0.50)", bar_r: "rgba(255, 120, 60, 0.55)"}
        morning:
          badge: "☀️"
          bg: 3899064
          fog: 10208482
          amb: 16777215
          ambI: 0.88
          ambMist: 0.65
          dir: 16775917
          dirI: 1.10
          dirMist: 0.60
          pos: [-250, 650, 350]
          orb: 16775904
          sky: [[0.0, "#0f325c"], [0.22, "#245d94"], [0.42, "#69a2d2"], [0.50, "#b7d9f0"], [0.60, "#9fc4de"], [1.0, "#7294ae"]]
          cloud: ["rgba(245, 250, 255, ", "rgba(230, 240, 252, 0)", 0.38, 0.60, 0.68]
          env: {sky: ["#16487e", "#468bc7", "#9ed2f5"], ground: ["#4a4435", "#221e16"], sun: "rgba(255, 250, 230, 0.95)", bar_hi: "rgba(255, 255, 255, 0.65)", bar_lo: "rgba(160, 210, 255, 0.50)", bar_r: "rgba(255, 225, 170, 0.45)"}
        afternoon:
          badge: "☀️"
          bg: 2714792
          fog: 9156830
          amb: 16777215
          ambI: 0.92
          ambMist: 0.65
          dir: 16775399
          dirI: 1.18
          dirMist: 0.60
          pos: [200, 750, 200]
          orb: 16775904
          sky: [[0.0, "#0b2b52"], [0.22, "#1d568c"], [0.42, "#5e9ad0"], [0.50, "#a8d0ee"], [0.60, "#8fb8d8"], [1.0, "#688aa8"]]
          cloud: ["rgba(245, 250, 255, ", "rgba(230, 240, 252, 0)", 0.38, 0.60, 0.68]
          env: {sky: ["#103965", "#387bb8", "#8cb8e0"], ground: ["#4a4435", "#221e16"], sun: "rgba(255, 250, 230, 0.95)", bar_hi: "rgba(255, 255, 255, 0.65)", bar_lo: "rgba(160, 210, 255, 0.50)", bar_r: "rgba(255, 225, 170, 0.45)"}
        dusk:
          badge: "🌅"
          bg: 3284293
          fog: 9194072
          amb: 16425082
          ambI: 0.72
          ambMist: 0.48
          dir: 16025658
          dirI: 0.98
          dirMist: 0.42
          pos: [450, 200, -350]
          orb: 16743252
          sky: [[0.0, "#101228"], [0.22, "#341d48"], [0.40, "#802d48"], [0.50, "#e07a3f"], [0.58, "#8d4344"], [1.0, "#362336"]]
          cloud: ["rgba(255, 182, 138, ", "rgba(190, 100, 95, 0)", 0.34, 0.62]
          env: {sky: ["#18122b", "#752945", "#f4883a"], ground: ["#422a1b", "#1c120c"], sun: "rgba(255, 160, 90, 0.85)", bar_hi: "rgba(255, 255, 255, 0.65)", bar_lo: "rgba(160, 210, 255, 0.50)", bar_r: "rgba(255, 120, 60, 0.55)"}
        evening:
          badge: "☀️"
          bg: 1054512
          fog: 2372438
          amb: 7965620
          ambI: 0.52
          ambMist: 0.52
          dir: 6058662
          dirI: 0.58
          dirMist: 0.58
          pos: [300, 400, -300]
          orb: 15134195
          stars: 95
          aurora: true
          sky: [[0.0, "#040814"], [0.25, "#0c1630"], [0.44, "#1b2b52"], [0.52, "#2c3d68"], [1.0, "#141c32"]]
          cloud: ["rgba(28, 38, 62, ", "rgba(15, 22, 36, 0)", 0.26, 0.26, 0.55]
          env: {sky: ["#040712", "#0b1428", "#182542"], ground: ["#0e141a", "#05070a"], sun: "rgba(255, 250, 230, 0.95)", bar_hi: "rgba(100, 140, 210, 0.35)", bar_lo: "rgba(60, 90, 160, 0.30)", bar_r: "rgba(255, 225, 170, 0.45)"}
        night:
          badge: "🌙"
          bg: 395540
          fog: 1055796
          amb: 4545674
          ambI: 0.48
          ambMist: 0.34
          dir: 9480408
          dirI: 0.68
          dirMist: 0.34
          pos: [200, 550, -250]
          orb: 15134195
          stars: 420
          stars_overcast: 140
          aurora: true
          sky: [[0.0, "#010208"], [0.25, "#060c1e"], [0.45, "#0d1a38"], [0.52, "#162646"], [1.0, "#0a1224"]]
          cloud: ["rgba(28, 38, 62, ", "rgba(15, 22, 36, 0)", 0.26, 0.26, 0.55]
          env: {sky: ["#040712", "#0b1428", "#182542"], ground: ["#0e141a", "#05070a"], sun: "rgba(200, 220, 255, 0.45)", bar_hi: "rgba(100, 140, 210, 0.35)", bar_lo: "rgba(60, 90, 160, 0.30)", bar_r: "rgba(255, 225, 170, 0.45)"}
    ability_dom_map:
      FORGE: statStr
      FLOW: statDex
      AEGIS: statCon
      AETHER: statInt
      INSIGHT: statWis
      CHORUS: statCha
      STR: statStr
      DEX: statDex
      CON: statCon
      INT: statInt
      WIS: statWis
      CHA: statCha
    ability_display_order: [FORGE, FLOW, AEGIS, AETHER, INSIGHT, CHORUS, STR, DEX, CON, INT, WIS, CHA]
    weapon_sfx_criteria:
      bow: "bow longbow shortbow crossbow arrow quiver pulse-bow"
      spell_cast: "arcane staff spell wand magic blast bolt prism"
      heal: "heal sacred cure mend choir chime light blessing"
      attack: "sword blade axe dagger knife maul gavel hammer spear strike melee"
    weapon_criteria:
      dagger: "dagger daggers dirk knife stiletto shiv"
      sword: "sword longblade blade claymore sabre rapier"
      staff: "staff stave rod wand arcane prism orb"
      hammer: "hammer gavel maul mace warhammer"
      shield: "shield bulwark buckler aegis"
      tome: "tome codex book grimoire scroll"
      bow: "bow longbow shortbow crossbow pulse-bow"
    weapon_recipes:
      dagger:
        - {type: lathe, profile: [[0.22, -1.6], [0.30, -0.4], [0.24, 0.8], [0.34, 1.6]], segments: 10, mat: grip}
        - {type: octahedron, fixed: [0.48, 0], pos: [0, -1.85, 0], scale: [1, 1.35, 0.75], mat: gold}
        - {type: box, fixed: [2.8, 0.42, 0.82], pos: [0, 1.65, 0], mat: gold}
        - {type: box, fixed: [0.55, 0.55, 0.55], mirror_x: 1.4, pos: [1.4, 1.85, 0], rot: [0, 0, 0.6], mat: gold}
        - {type: blade, fixed: [0.85, 9.2, 0.22], pos: [0, 6.45, 0], mat: steel}
      daggers:
        - {type: lathe, profile: [[0.22, -1.6], [0.30, -0.4], [0.24, 0.8], [0.34, 1.6]], segments: 10, mat: grip}
        - {type: octahedron, fixed: [0.48, 0], pos: [0, -1.85, 0], scale: [1, 1.35, 0.75], mat: gold}
        - {type: box, fixed: [2.8, 0.42, 0.82], pos: [0, 1.65, 0], mat: gold}
        - {type: blade, fixed: [0.85, 9.2, 0.22], pos: [0, 6.45, 0], mat: steel}
      sword:
        - {type: lathe, profile: [[0.34, -2.0], [0.42, -0.5], [0.35, 0.8], [0.48, 2.0]], segments: 10, mat: grip}
        - {type: octahedron, fixed: [0.78, 0], pos: [0, -2.4, 0], scale: [1.1, 1.3, 0.7], mat: gold}
        - {type: box, fixed: [4.2, 0.62, 1.15], pos: [0, 2.15, 0], mat: gold}
        - {type: box, fixed: [0.75, 0.55, 0.75], mirror_x: 2.1, pos: [2.1, 2.45, 0], rot: [0, 0, -0.45], mat: gold}
        - {type: blade, fixed: [1.15, 19.2, 0.28], pos: [0, 12.0, 0], mat: steel}
      staff:
        - {type: lathe, profile: [[0.38, -10.0], [0.48, 2.0], [0.56, 12.5], [0.88, 13.8], [0.65, 14.5]], segments: 12, flutes: 6, flute_amp: 0.08, mat: grip}
        - {type: torus, fixed: [1.15, 0.22, 8, 14], pos: [0, 14.3, 0], rot: [1.5708, 0, 0], mat: gold}
        - {type: box, fixed: [0.28, 2.6, 0.28], mirror_x: 1.05, pos: [1.05, 15.6, 0], rot: [0, 0, 0.28], mat: gold}
        - {type: box, fixed: [0.28, 2.6, 0.28], pos: [0, 15.6, 1.05], rot: [-0.28, 0, 0], mat: gold}
        - {type: box, fixed: [0.28, 2.6, 0.28], pos: [0, 15.6, -1.05], rot: [0.28, 0, 0], mat: gold}
        - {type: crystal, fixed: [3.8, 0.75, 5], pos: [0, 14.8, 0], color: 5809919, emissive: 2060267, emissiveIntensity: 1.6}
      hammer:
        - {type: lathe, profile: [[0.42, -6.0], [0.48, 0.0], [0.56, 5.5], [0.85, 6.2]], segments: 10, mat: grip}
        - {type: box, fixed: [3.4, 2.8, 5.2], pos: [0, 5.2, 0], mat: steel}
        - {type: box, fixed: [3.8, 3.1, 1.1], pos: [0, 5.2, 2.2], mat: gold}
        - {type: box, fixed: [3.8, 3.1, 1.1], pos: [0, 5.2, -2.2], mat: gold}
        - {type: cone, fixed: [0.7, 2.4, 6], pos: [0, 5.2, -3.5], rot: [-1.5708, 0, 0], mat: steel}
      shield:
        - {type: shield_kite, fixed: [6.4, 11.8, 0.85], pos: [0, 0, 1.8], mat: shield}
        - {type: box, fixed: [1.0, 9.5, 0.35], pos: [0, 0, 2.45], mat: gold}
        - {type: octahedron, fixed: [1.35, 0], pos: [0, 0.8, 2.65], scale: [1, 1.25, 0.55], mat: gold}
      tome:
        - {type: box, fixed: [3.4, 4.8, 1.3], mat: tome}
        - {type: box, fixed: [3.1, 4.4, 0.9], pos: [0.25, 0, 0], color: 14800825}
        - {type: box, fixed: [1.1, 4.9, 1.45], pos: [-1.25, 0, 0], mat: gold}
        - {type: octahedron, fixed: [0.65, 0], pos: [0.4, 0, 0.72], scale: [1, 1.2, 0.4], mat: gold}
      bow:
        - {type: torus, fixed: [9.5, 0.38, 8, 22, 1.65], pos: [0, 0, -9.5], rot: [0, -1.5708, -0.825], mat: grip}
        - {type: box, fixed: [0.68, 2.1, 0.92], pos: [0, 0, 0], mat: gold}
        - {type: cylinder, fixed: [0.06, 0.06, 14.0, 6], pos: [0, 0, -3.05], color: 14536888}
    weapon_mounts:
      bow: {pos: [0, 0, 0], rot: [0, 0, -0.22]}
      staff: {pos: [0, 0, 0], rot: [0.18, 0, 0]}
      daggers: {pos: [0, 0, 0], rot: [1.32, 0, 0], offhand: dagger, off_pos: [0, 0, 0], off_rot: [1.32, 0, 0]}
      sword: {pos: [0, 0, 0], rot: [0.85, 0, 0], offhand: shield, off_pos: [0, 0, 0], off_rot: [0, -1.35, 0]}
      hammer: {pos: [0, 0, 0], rot: [0.82, 0, 0], offhand: shield, off_pos: [0, 0, 0], off_rot: [0, -1.35, 0]}
      default: {pos: [0, 0, 0], rot: [0.85, 0, 0]}
    headgear_recipes:
      helm:
        - {type: lathe, profile: [[3.9, 28.2], [4.1, 30.8], [3.5, 32.8], [1.8, 34.0], [0.1, 34.3]], segments: 14, mat: steel}
        - {type: box, fixed: [1.1, 2.2, 6.2], pos: [0, 33.4, 0.2], mat: gold}
        - {type: box, fixed: [1.6, 3.2, 2.8], mirror_x: 3.1, pos: [3.1, 27.6, 1.0], mat: steel}
        - {type: box, fixed: [5.0, 0.75, 0.55], pos: [0, 30.2, 3.9], mat: dark}
      hat:
        - {type: lathe, profile: [[3.6, 30.2], [7.8, 29.7], [8.6, 30.1], [5.8, 30.8], [3.8, 31.2], [2.2, 35.5], [0.2, 39.2]], segments: 16, mat: torso}
        - {type: torus, fixed: [3.9, 0.35, 8, 16], pos: [0, 31.2, 0], rot: [1.5708, 0, 0], mat: gold}
      hood:
        - {type: lathe, profile: [[5.2, 24.0], [4.5, 27.2], [4.4, 30.5], [3.2, 33.2], [0.3, 35.0]], segments: 12, pos: [0, 0, -0.5], rot: [-0.18, 0, 0], mat: pauldron}
      circlet:
        - {type: torus, fixed: [3.9, 0.42, 8, 18], pos: [0, 30.5, 0], rot: [1.5708, 0, 0], mat: gold}
        - {type: cone, fixed: [0.75, 2.4, 4], pos: [0, 31.8, 3.8], mat: gold}
        - {type: cone, fixed: [0.55, 1.6, 4], mirror_x: 2.2, pos: [2.2, 31.4, 3.2], rot: [0, 0, -0.25], mat: gold}
    gltf_headgear_recipes:
      hood:
        - {type: lathe, profile: [[3.8, -1.8], [3.4, 0.5], [3.2, 2.5], [2.0, 4.2], [0.2, 5.5]], segments: 12, pos: [0, 0.5, -0.5], rot: [-0.22, 0, 0], mat: cowl}
      circlet:
        - {type: torus, fixed: [2.9, 0.32, 8, 18], pos: [0, 2.0, 0], rot: [1.5708, 0, 0], mat: gold}
        - {type: crystal, fixed: [1.6, 0.4, 3], pos: [0, 2.2, 2.8], mat: gold}
    emblem_recipes:
      tabard:
        - {type: box, fixed: [5.2, 9.5, 0.8], pos: [0, -0.8, 2.8], mat: trim}
        - {type: cone, fixed: [1.4, 2.8, 3], pos: [0, 1.0, 3.3], rot: [0, 0, 3.1416], mat: gold}
      stole:
        - {type: box, fixed: [2.0, 9.5, 0.8], pos: [0, -0.8, 2.8], mat: gold}
        - {type: box, fixed: [4.8, 1.8, 0.85], pos: [0, 1.0, 2.9], mat: gold}
    rig_criteria:
      monsters:
        spider: "spider arachnid crawler web"
        wolf: "wolf hound dog beast stalker predator"
        skeleton: "skeleton undead bone skull wraith hollow automaton"
        brute: "ogre troll brute giant boss golem warden juggernaut"
        raider: "goblin raider bandit orc skirmisher scout lookout sentry"
        bow_check_ranged: "shortbow scout archer ranged pulse-bow marksman"
        bow_check_melee: "sword blade maul club spear dagger claw"
    humanoid_monster_parts:
      body:
        - {type: box, fixed: [10, 11, 6], pos: [0, 16, 0], mat: armor}
        - {type: box, fixed: [6.5, 6.5, 6], pos: [0, 24, 0], mat: skin}
        - {type: cone, fixed: [1.5, 4.5, 4], mirror_x: 3.8, pos: [3.8, 24.5, 0], rot: [0, 0, -1.2566], mat: skin}
        - {type: box, fixed: [1.4, 1.1, 0.4], mirror_x: 1.6, pos: [1.6, 24.8, 3.1], mat: iris}
        - {type: box, fixed: [0.5, 0.9, 0.45], mirror_x: 1.6, pos: [1.6, 24.8, 3.12], mat: pupil}
        - {type: cone, fixed: [0.3, 0.7, 3], mirror_x: 0.7, pos: [0.7, 22.9, 3.25], rot: [0, 0, 3.1416], mat: fang}
        - {type: box, fixed: [2.4, 0.9, 0.4], pos: [0, 22.8, 3.1], mat: mouth}
      ranged:
        - {type: torus, fixed: [7, 0.65, 6, 12, 2.3562], pos: [6.5, 17, 5], rot: [0, 1.5708, -0.3927], mat: wood}
      melee:
        - {type: blade, fixed: [1.3, 14.5, 0.32], pos: [6.5, 19, 7], rot: [0.85, 0, 0], mat: weapon}
        - {type: box, fixed: [3.4, 0.6, 0.9], pos: [6.5, 14.5, 2.5], rot: [0.85, 0, 0], mat: armor}
    floor_styles:
      criteria:
        wilds: "wilds road plain steppe trail path causeway"
        forest: "forest woods glade grove mountain crag"
        tavern: "tavern inn hall plank wood lodge"
        forge: "forge crucible furnace smithy anvil"
        town: "town plaza market square courtyard cobble"
        dungeon: "dungeon crypt vault cellar cavern cave ruins"
      presets:
        wilds: {grass: true, road: true}
        forest: {grass: true}
        mountain: {grass: true}
        tavern: {planks: true}
        forge: {glow: "rgba(46, 160, 67, "}
        town: {cobbles: true}
        dungeon: {}
    env_styles:
      cave: {stone: 2370101, dark: 1316896, crystal: 3705853, crystal_em: 2060267, light: 5809919}
      indoor: {stone: 4015184, dark: 2896704, wall: 4278098, wood: 4336152, chain: 1842722, lantern: 2236962, lantern_em: 14251782, light: 16754263}
    scenery_presets:
      criteria:
        omit: "wall bastion meridian perimeter enclosure boundary"
        pillar: "pillar column obelisk pylon"
        boulder: "boulder rock crag stone cliff"
        stump: "stump log fallen trunk wood"
        tree: "tree oak forest woods canopy grove"
        bramble: "bramble bush thicket ditch embankment shrub"
        building: "inn hall exchange taphouse post building house manor tower castle palisade"
        wall: "masonry barricade partition"
      templates:
        building:
          parts:
            - {type: box, rel_size: [1.04, 0.08, 1.04], pos: [0, 4, 0], mat: stone}
            - {type: box, rel_size: [0.98, 0.78, 0.98], min_size: [1, 115, 1], rel_pos: [0, 0.42, 0], min_pos_y: 59, mat: building}
            - {type: gable_roof, roof_of_rect: true, min_h: 44, rel_h: 0.36, color: 4860957, roughness: 0.82, userData: {isRoof: true, isBuildingRoof: true}}
        wall:
          min_h: 115
          parts:
            - {type: box, rel_size: [1, 1, 1], rel_pos: [0, 0.5, 0], mat: building}
    env_rules:
      cave: "cave cavern mine hideout tunnel grotto subterranean"
      indoor_roof: "dungeon crypt manor tavern forge study ruins cellar hall"
      mountain: "mountain crag tor peak ridge cliff"
      wild: "wild forest glade road plains causeway"
    sound_presets:
      step: [[t, 115, 45, 0.05, triangle, 0.12, 0], [n, 0.04, 900, 0.08, 0.01]]
      door: [[t, 160, 65, 0.22, square, 0.24, 0], [t, 90, 45, 0.35, sawtooth, 0.18, 0.06], [n, 0.12, 600, 0.12, 0.18]]
      hit: [[t, 170, 30, 0.20, sawtooth, 0.38, 0], [n, 0.16, 1200, 0.22, 0]]
      crit: [[t, 220, 30, 0.28, sawtooth, 0.48, 0], [n, 0.24, 1800, 0.35, 0], [t, 880, 440, 0.32, triangle, 0.35, 0.02], [t, 1320, 880, 0.25, sine, 0.28, 0.05]]
      attack: [[n, 0.14, 2400, 0.25, 0], [t, 750, 220, 0.16, sine, 0.20, 0.01]]
      miss: [[n, 0.12, 1400, 0.15, 0], [t, 480, 310, 0.12, triangle, 0.14, 0.02]]
      bow_shot: [[t, 1400, 320, 0.08, triangle, 0.32, 0], [t, 280, 160, 0.22, sine, 0.25, 0.03], [n, 0.07, 3200, 0.18, 0.02]]
      spell_cast: [[t, 523.25, 784.88, 0.35, sine, 0.18, 0], [t, 659.25, 988.88, 0.35, sine, 0.18, 0.04], [t, 783.99, 1175.99, 0.35, sine, 0.18, 0.08], [t, 1046.50, 1569.75, 0.35, sine, 0.18, 0.12], [t, 1318.51, 1977.77, 0.35, sine, 0.18, 0.16], [n, 0.3, 3000, 0.12, 0.08]]
      heal: [[t, 440, 528, 0.45, sine, 0.22, 0], [t, 554.37, 665.24, 0.45, sine, 0.22, 0.07], [t, 659.25, 791.1, 0.45, sine, 0.22, 0.14], [t, 880, 1056, 0.45, sine, 0.22, 0.21]]
      pickup: [[t, 659.25, 0, 0.15, sine, 0.24, 0], [t, 783.99, 0, 0.15, sine, 0.24, 0.045], [t, 987.77, 0, 0.15, sine, 0.24, 0.09], [t, 1318.51, 0, 0.15, sine, 0.24, 0.135]]
      rest: [[t, 196, 0, 0.55, triangle, 0.22, 0], [t, 246.94, 0, 0.55, triangle, 0.22, 0.08], [t, 293.66, 0, 0.55, triangle, 0.22, 0.16], [t, 392, 0, 0.55, triangle, 0.22, 0.24], [t, 493.88, 0, 0.55, triangle, 0.22, 0.32]]
      level_up: [[t, 392, 0, 0.35, triangle, 0.30, 0], [t, 493.88, 0, 0.35, triangle, 0.30, 0.06], [t, 587.33, 0, 0.35, triangle, 0.30, 0.12], [t, 783.99, 0, 0.35, triangle, 0.30, 0.18], [t, 987.77, 0, 0.35, triangle, 0.30, 0.24], [t, 1174.66, 0, 0.85, sine, 0.35, 0.36]]
      death: [[t, 180, 35, 0.7, sawtooth, 0.55, 0], [t, 110, 25, 1.1, sawtooth, 0.48, 0.15], [n, 0.9, 450, 0.35, 0.1]]
      respawn: [[t, 329.63, 0, 0.6, sine, 0.25, 0], [t, 392, 0, 0.6, sine, 0.25, 0.1], [t, 493.88, 0, 0.6, sine, 0.25, 0.2], [t, 659.25, 0, 0.6, sine, 0.25, 0.3], [t, 783.99, 0, 0.6, sine, 0.25, 0.4]]
      save_save: [[t, 700, 950, 0.08, sine, 0.15, 0], [t, 950, 1200, 0.10, triangle, 0.18, 0.06]]
      save_load: [[t, 880, 440, 0.16, triangle, 0.20, 0], [t, 440, 660, 0.22, sine, 0.22, 0.10]]
      save_delete: [[t, 120, 50, 0.15, sawtooth, 0.20, 0]]
      select_hero: [[t, 293.66, 0, 0.28, triangle, 0.26, 0], [t, 369.99, 0, 0.28, triangle, 0.26, 0.06], [t, 440, 0, 0.28, triangle, 0.26, 0.12], [t, 587.33, 0, 0.28, triangle, 0.26, 0.18]]
      victory: [[t, 523.25, 0, 0.28, triangle, 0.36, 0], [t, 659.25, 0, 0.28, triangle, 0.36, 0.18], [t, 783.99, 0, 0.32, triangle, 0.36, 0.36], [t, 1046.50, 0, 0.65, triangle, 0.36, 0.56], [t, 880, 0, 0.28, triangle, 0.36, 0.92], [t, 987.77, 0, 0.28, triangle, 0.36, 1.14], [t, 1046.50, 0, 0.85, triangle, 0.36, 1.36], [t, 1318.51, 0, 1.10, triangle, 0.36, 1.60]]
living_world:
  scaling_rules: {min_scale: 0.55, max_scale: 1.35, mentor_bonus_gp: 15, mentor_bonus_xp: 50}
  rested_comfort:
    base_duration_turns: 25
    comfort_items: ["cozy_hearth", "bazaar_rug", "lantern_post", "timber_hall", "map_table"]
    tier_bonuses:
      1: {label: "Campfire Warmth", xp_bonus: 1.15, momentum_bonus: 10, regen: 2}
      2: {label: "Cozy Shelter", xp_bonus: 1.25, momentum_bonus: 15, regen: 4}
      3: {label: "Hearth Sanctuary", xp_bonus: 1.40, momentum_bonus: 25, regen: 6}
---
# Generic Interactive Adventure Game Engine Skill (interactive-adventure-engine)

Formalizes deterministic interactive environment simulation, discrete state transitions, inventory systems, creature behavioral AI, locked barrier systems, topological routing, and victory condition verifications for arbitrary games.

Specific game environments are decoupled and defined completely as modular skills in `<game-directory>/skills/<game-name>/SKILL.md` (e.g. `aeonward-continuum` or any custom game). The engine parses graph topologies, rooms, gates, items, entities, and victory criteria directly from each game's specification.

---

## 1. Abstract State-Space Formalization

Any game session in the engine is represented by a deterministic state tuple:
$$\mathcal{S} = (\mathcal{L}_p, \mathcal{I}_p, \mathcal{R}, \mathcal{G}, \mathcal{E}, \mathcal{F}, \Omega)$$

Where:
- $\mathcal{L}_p$: Current location/room identifier of player entity(ies) $p \in \mathcal{P}$.
- $\mathcal{I}_p$: Current inventory, equipment, and resource loadout of player $p$.
- $\mathcal{R}$: Room graph topology $\{r_i = (\text{id}_i, \text{name}_i, \text{description}_i, \text{exits}_i, \text{items}_i, \text{features}_i)\}$.
- $\mathcal{G}$: Gate & boundary state dictionary $\{g_k = (\text{from}_k, \text{to}_k, \text{key\_req}_k, \text{is\_locked}_k)\}$.
- $\mathcal{E}$: Active entity states (NPCs, enemies, bosses, allies) with localized HP, behavior states, and positions.
- $\mathcal{F}$: World story flags, variable triggers, and persistent event histories.
- $\Omega \in \{\text{ACTIVE}, \text{VICTORY}, \text{DEFEAT}\}$: High-level game progression status.

---

## 2. Deterministic Transition Functions

State transitions follow a discrete transition function $\mathcal{T}: \mathcal{S} \times \mathcal{A} \rightarrow \mathcal{S}'$:

1. **Navigation ($\text{MOVE}(d)$)**:
   - Validates direction $d \in \{\text{north}, \text{south}, \text{east}, \text{west}, \text{up}, \text{down}, \dots\}$ against $\mathcal{R}[\mathcal{L}_p].\text{exits}$.
   - Checks if passage is obstructed by gate $g \in \mathcal{G}$. If locked and player carries $\text{key\_req}$, state updates $\text{is\_locked} \leftarrow \text{False}$.
   - Updates $\mathcal{L}_p \leftarrow r_{\text{dest}}$ and triggers on-enter room events in $\mathcal{F}$.

2. **Inventory Manipulation ($\text{TAKE}(i), \text{DROP}(i), \text{USE}(i, t)$)**:
   - Atomic transfer between room item pool $\mathcal{R}[\mathcal{L}_p].\text{items}$ and player inventory $\mathcal{I}_p$.
   - Validates capacity, prerequisite tags, and consumable effects (healing, buffs, unlocks).

3. **Entity Interaction & Combat ($\text{ATTACK}(e), \text{CAST}(s, e), \text{TALK}(e, \dots)$)**:
   - Deterministic turn cadence evaluating initiative, range bands, hit calculation, damage mitigation, and condition effects.
   - Monster turn scheduler executing behavior trees (patrol, aggro pursuit, flee, spellcast).

4. **Living World & Dynamic Synthesis ($\text{EXPAND}()$)**:
   - Programmatic generation of new sectors, connective corridors, encounter tables, and narrative objectives linked seamlessly to the active graph.

---

## 3. Modular Game Skill Specification (YAML Schema)

Every compatible game defines its domain model in the frontmatter of its `SKILL.md` file under the root `game:` key:

```yaml
game:
  title: "Title of the Game"
  start_room: "room_id_initial"
  initial_inventory: ["Item Name 1", "Item Name 2"]
  intro_message: "Opening narrative lore and briefing..."
  
  # Topological room graph
  rooms:
    room_id_initial:
      name: "Chamber Name"
      desc: "Descriptive narrative shown upon entering..."
      north: "room_id_adjacent"
      items: ["Key Item", "Consumable Potion"]
      monsters: ["Guardian Drake"]
      
  # Obstacles and barriers
  gates:
    gate_id:
      from: "room_id_initial"
      to: "room_id_adjacent"
      key: "Key Item"
      locked: true
      
  # Victory conditions
  win_condition:
    required_room: "throne_room"
    required_item: "Sacred Relic"
    required_flags: ["boss_slain"]
```

---

## 4. Cross-Game Compatibility Guidelines

- **Zero Game-Specific Constants in Engine Core**: Never hardcode room keys, enemy names, or asset URLs in `game_engine/core`.
- **Decoupled Asset Resolution**: Asset paths are relative to each game's `assets/` directory (e.g. `games/<game_name>/assets/`).
- **Extensible Action Space**: Custom command verbs and puzzle interactions hook dynamically via the game's YAML event triggers and dialogue state machine.
