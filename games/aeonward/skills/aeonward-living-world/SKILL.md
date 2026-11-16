---
name: aeonward-living-world
title: Aeonward Living World & Sandbox Systems Codex
type: game-systems
description: Skill-driven definitions, CC-ELM semantic criteria, procedural 3D recipes, audio presets, elemental combo matrices, chemistry chains, mounts, battle pets, vehicles, destructibles, building blueprints, pastimes, and ecology rules for Tiers 1-7.
status: stable
codex:
  client:
    sound_presets:
      hit_heavy: [[t, 130, 28, 0.28, sawtooth, 0.50, 0], [t, 65, 22, 0.34, triangle, 0.42, 0.01], [n, 0.22, 950, 0.36, 0.0]]
      bone_crunch: [[n, 0.14, 1600, 0.34, 0], [t, 190, 42, 0.16, square, 0.28, 0.015], [n, 0.12, 700, 0.28, 0.04]]
      parry_clang: [[t, 1480, 1120, 0.22, triangle, 0.34, 0], [t, 2240, 1760, 0.28, sine, 0.26, 0.01], [n, 0.08, 3600, 0.20, 0]]
      stagger_thud: [[t, 110, 32, 0.35, sine, 0.45, 0], [n, 0.18, 420, 0.30, 0.02]]
      loot_common: [[t, 523.25, 659.25, 0.16, sine, 0.20, 0]]
      loot_rare: [[t, 587.33, 0, 0.18, triangle, 0.24, 0], [t, 739.99, 0, 0.18, triangle, 0.24, 0.07], [t, 880.0, 0, 0.26, sine, 0.28, 0.14]]
      loot_epic: [[t, 523.25, 0, 0.20, triangle, 0.26, 0], [t, 659.25, 0, 0.20, triangle, 0.26, 0.06], [t, 783.99, 0, 0.22, triangle, 0.28, 0.12], [t, 1046.50, 0, 0.40, sine, 0.32, 0.18]]
      loot_legendary: [[t, 440.0, 0, 0.22, triangle, 0.28, 0], [t, 554.37, 0, 0.22, triangle, 0.28, 0.06], [t, 659.25, 0, 0.24, triangle, 0.30, 0.12], [t, 880.0, 0, 0.32, triangle, 0.32, 0.18], [t, 1318.5, 0, 0.65, sine, 0.34, 0.26]]
      chest_pop: [[t, 220, 440, 0.12, square, 0.22, 0], [t, 880, 1320, 0.16, sine, 0.22, 0.06], [t, 1174, 1568, 0.20, sine, 0.20, 0.12], [n, 0.10, 2600, 0.16, 0.04]]
      jump: [[t, 180, 420, 0.12, sine, 0.18, 0]]
      glide_open: [[n, 0.24, 1600, 0.16, 0], [t, 330, 620, 0.26, sine, 0.15, 0.02]]
      grapple_zip: [[t, 880, 1760, 0.10, sawtooth, 0.18, 0], [n, 0.18, 2800, 0.20, 0.04], [t, 660, 240, 0.14, triangle, 0.20, 0.12]]
      climb_step: [[n, 0.05, 850, 0.12, 0], [t, 140, 95, 0.06, triangle, 0.12, 0.01]]
      dodge_roll: [[n, 0.15, 1300, 0.18, 0], [t, 240, 110, 0.12, sine, 0.15, 0]]
      telegraph: [[t, 540, 290, 0.22, sawtooth, 0.28, 0], [t, 810, 440, 0.18, triangle, 0.22, 0.08]]
      ping_look: [[t, 784, 988, 0.15, sine, 0.22, 0]]
      ping_ambush: [[t, 660, 440, 0.14, sawtooth, 0.22, 0], [t, 660, 440, 0.14, sawtooth, 0.22, 0.14]]
      ping_loot: [[t, 880, 1318, 0.18, triangle, 0.22, 0]]
      ping_regroup: [[t, 440, 587, 0.22, triangle, 0.22, 0]]
      highfive: [[n, 0.08, 3200, 0.30, 0], [t, 523.25, 784.0, 0.22, sine, 0.25, 0.02]]
      emote_lute: [[t, 329.63, 327.0, 0.42, triangle, 0.20, 0], [t, 392.0, 390.0, 0.42, triangle, 0.20, 0.16], [t, 493.88, 491.0, 0.55, triangle, 0.20, 0.32]]
      emote_drum: [[t, 110, 45, 0.18, sine, 0.32, 0], [t, 110, 45, 0.18, sine, 0.28, 0.22], [n, 0.08, 500, 0.18, 0.22]]
      emote_flute: [[t, 587.33, 600.0, 0.40, sine, 0.18, 0], [t, 659.25, 659.25, 0.45, sine, 0.18, 0.20], [t, 783.99, 783.99, 0.55, sine, 0.18, 0.42]]
      fish_cast: [[n, 0.12, 2000, 0.14, 0], [t, 420, 180, 0.16, sine, 0.16, 0.10]]
      fish_catch: [[t, 523.25, 0, 0.16, sine, 0.24, 0], [t, 659.25, 0, 0.16, sine, 0.24, 0.08], [t, 1046.50, 0, 0.35, triangle, 0.28, 0.16]]
      dice_roll: [[n, 0.06, 2200, 0.16, 0], [n, 0.06, 2600, 0.16, 0.07], [n, 0.05, 1900, 0.14, 0.14]]
      combo_fire: [[n, 0.35, 1400, 0.34, 0], [t, 220, 60, 0.38, sawtooth, 0.32, 0.02]]
      combo_shatter: [[t, 1760, 620, 0.20, triangle, 0.28, 0], [n, 0.24, 4200, 0.32, 0.02]]
      combo_shock: [[t, 1200, 320, 0.18, square, 0.24, 0], [n, 0.22, 3400, 0.24, 0.03]]
      cannon_boom: [[t, 95, 24, 0.45, sawtooth, 0.48, 0], [n, 0.40, 650, 0.42, 0.01]]
      breach_shatter: [[t, 110, 28, 0.40, sawtooth, 0.42, 0], [n, 0.36, 1200, 0.36, 0.02], [n, 0.28, 600, 0.28, 0.10]]
      dig_earth: [[n, 0.14, 700, 0.22, 0], [t, 130, 70, 0.12, triangle, 0.16, 0.02]]
      tower_collapse: [[t, 80, 20, 0.85, sawtooth, 0.50, 0], [n, 0.85, 500, 0.44, 0.05], [n, 0.65, 900, 0.32, 0.25]]
    loot_rarities:
      criteria:
        legendary: "prime solaris core crown eternal sovereign scepter eclipsed sun mantle zenith astrolabe"
        epic: "signet cipher compass prism conduit staff gravity maul thunder glaive shadowstep ricochet skyward"
        rare: "sabre cloak greaves pauldrons ingot coil fragment shard core armor plate"
        uncommon: "cell capacitor infusion potion elixir vial oil flask grenade bolts"
        common: "sword scroll torch rope timber stone fish"
      styles:
        legendary: {label: Legendary, color: 16766720, beam_height: 155, intensity: 1.8, chime: loot_legendary}
        epic: {label: Epic, color: 11141375, beam_height: 120, intensity: 1.4, chime: loot_epic}
        rare: {label: Rare, color: 3705853, beam_height: 92, intensity: 1.1, chime: loot_rare}
        uncommon: {label: Uncommon, color: 4176208, beam_height: 68, intensity: 0.85, chime: loot_rare}
        common: {label: Common, color: 13684944, beam_height: 44, intensity: 0.55, chime: loot_common}
    photo_filters:
      none: {label: "Crystal Clear", css: "none", tint: "rgba(0,0,0,0)", stamp: "AEONWARD CONTINUUM"}
      sunset: {label: "Warm Cliffside Sunset", css: "sepia(0.28) saturate(1.45) contrast(1.08) brightness(1.04)", tint: "rgba(255,140,60,0.12)", stamp: "SOLARIS GOLDEN HOUR"}
      astral_noir: {label: "Astral Noir", css: "grayscale(0.75) contrast(1.35) brightness(0.92)", tint: "rgba(70,110,200,0.14)", stamp: "ECLIPSE CHRONICLES"}
      parchment: {label: "Expedition Postcard", css: "sepia(0.55) contrast(1.12) saturate(0.85)", tint: "rgba(210,175,115,0.15)", stamp: "WISH YOU WERE HERE"}
      vibrant: {label: "Radiant Starforge", css: "saturate(1.65) contrast(1.14) brightness(1.06)", tint: "rgba(56,189,248,0.08)", stamp: "MERIDIAN EXPEDITION"}
      frost_mist: {label: "Glacial Frost Mist", css: "hue-rotate(15deg) saturate(0.85) brightness(1.08) contrast(1.05)", tint: "rgba(180,230,255,0.16)", stamp: "FROSTSPIRE PASS"}
      emerald_grotto: {label: "Bioluminescent Grotto", css: "saturate(1.35) hue-rotate(-10deg) contrast(1.15)", tint: "rgba(46,204,113,0.12)", stamp: "WHISPERWOOD GROVE"}
    wardrobe_silhouettes:
      vanguard_plate: {label: "Vanguard Plate", key: fighter, headgear: helm}
      astral_robe: {label: "Astral Weaver Robe", key: wizard, headgear: hat}
      veilblade_coat: {label: "Veilblade Coat", key: rogue, headgear: hood}
      strider_cloak: {label: "Horizon Strider Cloak", key: archer, headgear: hood}
      arbiter_mantle: {label: "Sol-Cantor Mantle", key: cleric, headgear: circlet}
    dye_palettes:
      solaris_gold: {name: "Solaris Gold", primary: "#c8a45c", trim: "#1f6feb", accent: "#ecd698"}
      eclipse_violet: {name: "Eclipse Violet", primary: "#6e40c9", trim: "#f0883e", accent: "#c084fc"}
      frostbite_azure: {name: "Frostbite Azure", primary: "#1f6feb", trim: "#e6edf3", accent: "#56d4ff"}
      sylphic_emerald: {name: "Sylphic Emerald", primary: "#238636", trim: "#c8a45c", accent: "#7ee787"}
      crimson_bastion: {name: "Crimson Bastion", primary: "#9e2323", trim: "#2c1f18", accent: "#ff7b72"}
      obsidian_ash: {name: "Obsidian Ash", primary: "#24292f", trim: "#58a6ff", accent: "#8b949e"}
      brass_clockwork: {name: "Brass Clockwork", primary: "#8b5a2b", trim: "#f3ba2f", accent: "#78dcff"}
      starlight_ivory: {name: "Starlight Ivory", primary: "#dde4ed", trim: "#6e40c9", accent: "#ffd700"}
    world_pings:
      look: {label: "Look Here!", icon: "👁️", color: 5809919, chime: ping_look}
      ambush: {label: "Ambush!", icon: "⚠️", color: 16267844, chime: ping_ambush}
      loot: {label: "Loot!", icon: "💎", color: 16766720, chime: ping_loot}
      regroup: {label: "Regroup!", icon: "🛡️", color: 4176208, chime: ping_regroup}
      combo: {label: "Combo Ready!", icon: "⚡", color: 13801762, chime: ping_loot}
    emotes:
      sit: {label: "Sit", icon: "🪑", posture: "sit"}
      warm: {label: "Warm Hands", icon: "🔥", posture: "warm"}
      wave: {label: "Wave", icon: "👋", posture: "wave"}
      cheer: {label: "Cheer", icon: "🎉", posture: "cheer"}
      dance: {label: "Dance", icon: "💃", posture: "dance"}
      highfive: {label: "High-Five", icon: "🙌", posture: "highfive", paired: true}
      lute: {label: "Play Lute", icon: "🪕", posture: "instrument", chime: emote_lute, notes: [329.63, 392.0, 493.88, 587.33]}
      drum: {label: "Play Drum", icon: "🥁", posture: "instrument", chime: emote_drum, notes: [110.0, 146.83, 110.0, 164.81]}
      flute: {label: "Play Flute", icon: "🪈", posture: "instrument", chime: emote_flute, notes: [587.33, 659.25, 783.99, 880.0]}
    magnetic_landmarks:
      - {id: lm_signal_tower, kind: signal_tower, name: "Smoking Signal Tower", x: -1650, z: -1550, color: 16744234, icon: "🔥"}
      - {id: lm_ribcage_arch, kind: ribcage_arch, name: "Leviathan Ribcage Arch", x: 1850, z: -1450, color: 15131867, icon: "🦴"}
      - {id: lm_glowing_shrine, kind: glowing_shrine, name: "Aurora Meridian Shrine", x: 1150, z: 1650, color: 5809919, icon: "⛩️"}
      - {id: lm_mushroom_grotto, kind: mushroom_grotto, name: "Luminous Mushroom Grotto", x: -1950, z: 1350, color: 11141375, icon: "🍄"}
      - {id: lm_sunken_citadel, kind: sunken_citadel, name: "Sunken Golden Citadel", x: 2450, z: 950, color: 16766720, icon: "🏛️"}
    biomes:
      sea_cliffs: {name: "Windswept Sea Cliffs", keywords: "cliff sea coast windglass causeway shore", ground: "#3b4f54", accent: "#56d4ff", fog: 6786968}
      mushroom_grotto: {name: "Bioluminescent Mushroom Grotto", keywords: "grotto mushroom cavern tidal bioluminescent spore", ground: "#1f2a38", accent: "#d2a8ff", fog: 2497082}
      sunken_citadel: {name: "Sunken Citadel", keywords: "citadel ruins observatory sunken aqueduct reliquary", ground: "#3a352c", accent: "#f3ba2f", fog: 3946032}
      silver_forest: {name: "Whisperwood Silver Forest", keywords: "forest whisperwood glade canopy grove woods", ground: "#233d2e", accent: "#7ee787", fog: 2635818}
      glacial_peaks: {name: "Frostspire Glacial Peaks", keywords: "frost glacier peak mountain snow spire pass", ground: "#5c6f7e", accent: "#bde0fe", fog: 7373712}
    mount_recipes:
      sand_skink:
        name: "Drifting Sand-Skink"
        parts:
          - {type: lathe, profile: [[2.5, -13], [6.2, -5], [6.8, 4], [5.2, 11], [2.2, 14]], segments: 12, flutes: 6, flute_amp: 0.08, pos: [0, 7.5, 0], rot: [1.5708, 0, 0], color: 12687438}
          - {type: box, fixed: [8.5, 4.2, 9.5], pos: [0, 9.2, 14.5], rot: [0.12, 0, 0], color: 14130016}
          - {type: cone, fixed: [1.6, 5.5, 4], pos: [0, 12.0, 5.0], rot: [-0.35, 0, 0], color: 10370606}
          - {type: cone, fixed: [1.4, 5.0, 4], pos: [0, 11.8, -1.0], rot: [-0.35, 0, 0], color: 10370606}
          - {type: cone, fixed: [3.2, 19, 7], pos: [0, 6.2, -19], rot: [-1.42, 0, 0], color: 11172410}
          - {type: box, fixed: [3.4, 6.5, 3.8], mirror_x: 6.8, pos: [6.8, 3.5, 8], rot: [0, 0, 0.28], color: 9857064}
          - {type: box, fixed: [3.4, 6.5, 3.8], mirror_x: 6.8, pos: [6.8, 3.5, -8], rot: [0, 0, 0.28], color: 9857064}
          - {type: box, fixed: [9.5, 2.2, 9.8], pos: [0, 13.6, 0], color: 10370606}
      crag_panther:
        name: "Cliff-Leaping Crag Panther"
        parts:
          - {type: lathe, profile: [[3.0, -12], [4.8, -4], [5.6, 5], [4.4, 12], [2.0, 14]], segments: 12, pos: [0, 11.2, 0], rot: [1.5708, 0, 0], color: 3616834}
          - {type: box, fixed: [6.8, 5.8, 8.2], pos: [0, 14.2, 13.8], color: 4471630}
          - {type: box, fixed: [3.6, 2.8, 3.8], pos: [0, 12.8, 17.5], color: 4471630}
          - {type: cone, fixed: [1.4, 3.8, 4], mirror_x: 2.2, pos: [2.2, 18.2, 12.8], rot: [0, 0, -0.22], color: 4471630}
          - {type: cylinder, fixed: [1.6, 1.0, 10.5, 8], mirror_x: 4.5, pos: [4.5, 5.2, 8], color: 3616834}
          - {type: cylinder, fixed: [1.6, 1.0, 10.5, 8], mirror_x: 4.5, pos: [4.5, 5.2, -8], color: 3616834}
          - {type: cylinder, fixed: [0.9, 0.5, 16, 8], pos: [0, 11.5, -16], rot: [-1.05, 0, 0], color: 3616834}
      ash_drake:
        name: "Two-Seat Ash-Drake"
        parts:
          - {type: lathe, profile: [[3.0, -15], [6.5, -5], [7.2, 5], [5.2, 13], [2.5, 16]], segments: 12, pos: [0, 14.5, 0], rot: [1.5708, 0, 0], color: 7876904}
          - {type: lathe, profile: [[3.2, 0], [2.6, 6], [2.2, 11]], segments: 10, pos: [0, 16.5, 13.5], rot: [0.75, 0, 0], color: 7876904}
          - {type: box, fixed: [7.5, 5.2, 10.5], pos: [0, 22.8, 20.5], rot: [0.15, 0, 0], color: 9388848}
          - {type: cone, fixed: [1.1, 6.2, 5], mirror_x: 2.4, pos: [2.4, 25.5, 15.8], rot: [-0.85, 0, 0.25], color: 2962228}
          - {type: box, fixed: [24, 1.2, 2.2], mirror_x: 17, pos: [17, 19.5, 5], rot: [0, 0.25, 0.34], color: 9388848}
          - {type: box, fixed: [26, 0.7, 11.5], mirror_x: 18, pos: [18, 17.5, 0.5], rot: [0, 0, 0.24], color: 12541990}
          - {type: cone, fixed: [3.2, 22, 6], pos: [0, 13, -22], rot: [-1.42, 0, 0], color: 7876904}
          - {type: box, fixed: [10, 2.2, 16], pos: [0, 21.0, -1], color: 13149276}
      traveling_peddler:
        name: "Traveling Peddler Pack-Beast"
        parts:
          - {type: lathe, profile: [[1.9, -8.5], [4.4, -3.5], [4.3, 2.5], [4.8, 5.5], [2.1, 8.2]], segments: 12, scale: [0.85, 1.0, 1.15], pos: [0, 9.2, 0], rot: [1.5708, 0, 0], color: 11895352}
          - {type: cylinder, fixed: [1.8, 2.9, 7.2, 8], pos: [0, 12.2, 6.8], rot: [0.65, 0, 0], color: 11895352}
          - {type: cylinder, fixed: [2.2, 2.0, 4.2, 8], pos: [0, 15.0, 9.8], rot: [1.35, 0, 0], color: 11895352}
          - {type: cylinder, fixed: [0.75, 1.45, 3.4, 7], pos: [0, 14.3, 12.2], rot: [1.65, 0, 0], color: 11895352}
          - {type: cone, fixed: [0.55, 2.8, 4], mirror_x: 1.15, pos: [1.15, 16.8, 8.6], rot: [-0.18, 0, -0.28], color: 11895352}
          - {type: box, fixed: [8.4, 2.2, 8.0], pos: [0, 12.2, -0.5], color: 8206894}
          - {type: box, fixed: [2.8, 4.4, 6.2], mirror_x: 4.5, pos: [4.5, 10.2, -1.8], color: 6438948}
          - {type: box, fixed: [0.6, 4.6, 5.8], mirror_x: 5.9, pos: [5.9, 10.2, -1.8], color: 13149276}
          - {type: flame, fixed: [2.6, 1.1, 4], pos: [-4.8, 12.2, 3.0], color: 16766720, emissive: 16750899, emissiveIntensity: 1.1}
          - {type: cone, fixed: [1.0, 6.2, 6], pos: [0, 9.6, -9.8], rot: [-0.95, 0, 0], color: 4860957}
          - {type: cylinder, fixed: [1.15, 0.65, 8.2, 8], pivot: [-2.4, 8.0, 4.8], pos: [-2.4, 4.0, 4.8], color: 11895352, key: leg_fl}
          - {type: cylinder, fixed: [1.15, 0.65, 8.2, 8], pivot: [2.4, 8.0, 4.8], pos: [2.4, 4.0, 4.8], color: 11895352, key: leg_fr}
          - {type: cylinder, fixed: [1.15, 0.65, 8.2, 8], pivot: [-2.4, 8.0, -4.8], pos: [-2.4, 4.0, -4.8], color: 11895352, key: leg_bl}
          - {type: cylinder, fixed: [1.15, 0.65, 8.2, 8], pivot: [2.4, 8.0, -4.8], pos: [2.4, 4.0, -4.8], color: 11895352, key: leg_br}
    pet_recipes:
      storm_fox:
        parts:
          - {type: lathe, profile: [[1.6, -5.5], [3.0, -1], [2.8, 3.5], [1.4, 5.8]], segments: 10, pos: [0, 5.5, 0], rot: [1.5708, 0, 0], color: 3705853}
          - {type: box, fixed: [4.2, 3.8, 4.4], pos: [0, 8.2, 6.0], color: 14542061}
          - {type: box, fixed: [2.2, 1.8, 3.0], pos: [0, 7.2, 9.0], color: 14542061}
          - {type: cone, fixed: [1.1, 3.2, 4], mirror_x: 1.5, pos: [1.5, 11.2, 5.8], rot: [0, 0, -0.2], color: 5809919}
          - {type: cylinder, fixed: [0.7, 0.5, 4.5, 6], mirror_x: 1.7, pos: [1.7, 2.2, 3.2], color: 3705853}
          - {type: cylinder, fixed: [0.7, 0.5, 4.5, 6], mirror_x: 1.7, pos: [1.7, 2.2, -3.2], color: 3705853}
          - {type: cone, fixed: [2.2, 8.2, 6], pos: [0, 7.0, -8.0], rot: [-1.1, 0, 0], color: 16777215}
      frost_cub:
        parts:
          - {type: lathe, profile: [[2.0, -5.5], [3.8, -1], [3.6, 3.5], [2.0, 5.8]], segments: 10, pos: [0, 5.8, 0], rot: [1.5708, 0, 0], color: 12442360}
          - {type: box, fixed: [5.0, 4.4, 4.6], pos: [0, 8.0, 6.2], color: 14676988}
          - {type: box, fixed: [2.6, 2.0, 2.2], pos: [0, 7.2, 8.8], color: 14676988}
          - {type: cylinder, fixed: [1.1, 0.85, 4.5, 8], mirror_x: 2.0, pos: [2.0, 2.2, 3.2], color: 12442360}
          - {type: cylinder, fixed: [1.1, 0.85, 4.5, 8], mirror_x: 2.0, pos: [2.0, 2.2, -3.2], color: 12442360}
      ember_hatchling:
        parts:
          - {type: lathe, profile: [[1.6, -5], [3.8, -1], [3.5, 3.5], [1.8, 5.8]], segments: 10, pos: [0, 8.5, 0], rot: [1.35, 0, 0], color: 15757622}
          - {type: box, fixed: [3.2, 2.8, 4.5], pos: [0, 13.8, 4.2], rot: [0.18, 0, 0], color: 15757622}
          - {type: cone, fixed: [0.55, 2.8, 4], mirror_x: 1.2, pos: [1.2, 15.8, 2.8], rot: [-0.8, 0, 0.25], color: 16766720}
          - {type: box, fixed: [8.8, 0.6, 4.2], mirror_x: 5.8, pos: [5.8, 10.6, 0], rot: [0, 0, 0.35], color: 16744234}
          - {type: cone, fixed: [1.4, 8.0, 5], pos: [0, 6.0, -6.5], rot: [-1.2, 0, 0], color: 15757622}
      clockwork_beetle:
        parts:
          - {type: lathe, profile: [[4.8, 2.0], [5.4, 3.5], [4.2, 5.2], [1.8, 6.2]], segments: 12, flutes: 2, flute_amp: 0.08, color: 13149276}
          - {type: box, fixed: [3.6, 2.2, 2.8], pos: [0, 3.2, 5.2], color: 9857064}
          - {type: cone, fixed: [0.55, 2.6, 4], mirror_x: 1.6, pos: [1.6, 3.2, 7.2], rot: [1.4, 0, 0.3], color: 5911578}
          - {type: cylinder, fixed: [0.35, 0.25, 3.5, 6], mirror_x: 4.8, pos: [4.8, 1.8, 2.5], rot: [0, 0, 0.85], color: 4860957}
          - {type: cylinder, fixed: [0.35, 0.25, 3.5, 6], mirror_x: 4.8, pos: [4.8, 1.8, -2.5], rot: [0, 0, 0.85], color: 4860957}
          - {type: crystal, fixed: [4.5, 1.1, 4], pos: [0, 5.6, 0], color: 5809919, emissive: 2060267, emissiveIntensity: 1.1}
    building_recipes:
      timber_wall:
        parts:
          - {type: box, fixed: [66, 8, 18], pos: [0, 4, 0], color: 5265502}
          - {type: box, fixed: [64, 42, 13], pos: [0, 27, 0], color: 7359020}
          - {type: box, fixed: [5.5, 50, 15.5], mirror_x: 28, pos: [28, 25, 0], color: 4860957}
          - {type: box, fixed: [68, 6, 16], pos: [0, 50, 0], color: 4860957}
      watchtower:
        parts:
          - {type: box, fixed: [56, 10, 56], pos: [0, 5, 0], color: 5265502}
          - {type: box, fixed: [48, 86, 48], pos: [0, 52, 0], color: 6778226}
          - {type: box, fixed: [58, 8, 58], pos: [0, 96, 0], color: 7359020}
          - {type: box, fixed: [12, 8, 8], mirror_x: 23, pos: [23, 104, 25], color: 6778226}
          - {type: box, fixed: [12, 8, 8], mirror_x: 23, pos: [23, 104, -25], color: 6778226}
          - {type: gable_roof, fixed: [56, 32, 56], pos: [0, 100, 0], color: 4860957}
      rope_bridge:
        parts:
          - {type: box, fixed: [96, 3.8, 34], pos: [0, 2, 0], color: 8740406}
          - {type: cylinder, fixed: [1.8, 2.1, 24, 8], mirror_x: 42, pos: [42, 12, 15], color: 5911578}
          - {type: cylinder, fixed: [1.8, 2.1, 24, 8], mirror_x: 42, pos: [42, 12, -15], color: 5911578}
          - {type: box, fixed: [88, 1.4, 1.4], pos: [0, 21, 15], color: 11172410}
          - {type: box, fixed: [88, 1.4, 1.4], pos: [0, 21, -15], color: 11172410}
      cozy_hearth:
        light: {color: 16747574, intensity: 3.6, dist: 280}
        parts:
          - {type: torus, fixed: [16, 3.8, 8, 14], pos: [0, 2.8, 0], rot: [1.5708, 0, 0], color: 6778226}
          - {type: cylinder, fixed: [2.0, 2.0, 22, 8], pos: [0, 4.5, 0], rot: [0.25, 0.4, 1.35], color: 5911578}
          - {type: cylinder, fixed: [2.0, 2.0, 22, 8], pos: [0, 4.5, 0], rot: [-0.25, 1.6, 1.35], color: 5911578}
          - {type: flame, fixed: [20, 8.0, 6], pos: [0, 3.0, 0], color: 16750899, emissive: 16724736, emissiveIntensity: 1.2}
      lantern_post:
        light: {color: 16766720, intensity: 3.0, dist: 240}
        parts:
          - {type: box, fixed: [10, 4, 10], pos: [0, 2, 0], color: 5265502}
          - {type: lathe, profile: [[3.2, 4], [2.4, 12], [2.0, 48], [2.6, 50]], segments: 10, color: 3685440}
          - {type: box, fixed: [14, 2.2, 2.2], pos: [6, 48, 0], color: 3685440}
          - {type: cylinder, fixed: [0.5, 0.5, 5, 6], pos: [11.5, 45.5, 0], color: 2962228}
          - {type: cone, fixed: [5.5, 4.2, 6], pos: [11.5, 43.0, 0], color: 2962228}
          - {type: flame, fixed: [5.5, 2.4, 4], pos: [11.5, 36.5, 0], color: 16766720, emissive: 16750899, emissiveIntensity: 1.1}
          - {type: box, fixed: [6.8, 0.9, 6.8], pos: [11.5, 36.2, 0], color: 2962228}
      bazaar_rug:
        parts:
          - {type: box, fixed: [72, 1.4, 52], pos: [0, 0.7, 0], color: 10370606}
          - {type: box, fixed: [60, 1.8, 40], pos: [0, 1.0, 0], color: 13149276}
          - {type: lathe, profile: [[2.5, 0], [4.5, 3], [4.0, 6.5], [1.8, 8.5], [2.6, 9.5]], segments: 12, pos: [-26, 1.5, -18], color: 12687438}
      map_table:
        parts:
          - {type: box, fixed: [56, 3.2, 38], pos: [0, 18.2, 0], color: 7359020}
          - {type: box, fixed: [48, 1.2, 30], pos: [0, 20.1, 0], color: 14536888}
          - {type: box, fixed: [3.6, 17, 3.6], mirror_x: 22, pos: [22, 8.5, 13], color: 5911578}
          - {type: box, fixed: [3.6, 17, 3.6], mirror_x: 22, pos: [22, 8.5, -13], color: 5911578}
          - {type: box, fixed: [42, 2.4, 2.4], pos: [0, 6.0, 0], color: 5911578}
      timber_hall:
        parts:
          - {type: box, fixed: [118, 8, 96], pos: [0, 4, 0], color: 5265502}
          - {type: box, fixed: [110, 58, 88], pos: [0, 36, 0], color: 7359020}
          - {type: box, fixed: [6, 58, 92], mirror_x: 52, pos: [52, 36, 0], color: 4860957}
          - {type: gable_roof, fixed: [118, 40, 96], pos: [0, 65, 0], color: 5911578}
    vehicle_recipes:
      galleon_airship:
        parts:
          - {type: hull, fixed: [72, 24, 148], pos: [0, 14, 0], color: 7359020}
          - {type: hull, fixed: [62, 6, 134], pos: [0, 26, 0], color: 9857064}
          - {type: box, fixed: [48, 14, 34], pos: [0, 35, -48], color: 5911578}
          - {type: cylinder, fixed: [2.8, 3.8, 96, 10], pos: [0, 70, 0], color: 5911578}
          - {type: cylinder, fixed: [1.4, 1.4, 58, 8], pos: [0, 74, 4], rot: [0, 0, 1.5708], color: 5911578}
          - {type: box, fixed: [54, 42, 2.5], pos: [0, 72, 10], color: 15458000}
          - {type: lathe, profile: [[6, -42], [20, -24], [24, 0], [20, 24], [6, 42]], segments: 14, pos: [0, 122, 0], rot: [1.5708, 0, 0], color: 12131356}
      rolling_wagon:
        parts:
          - {type: box, fixed: [58, 5, 96], pos: [0, 12, 0], color: 7359020}
          - {type: box, fixed: [56, 14, 3], mirror_x: 27, pos: [27, 21, 0], rot: [0, 1.5708, 0], color: 7359020}
          - {type: spoked_wheel, fixed: [12, 4.5, 8], mirror_x: 32, pos: [32, 12, 30], color: 4860957}
          - {type: spoked_wheel, fixed: [12, 4.5, 8], mirror_x: 32, pos: [32, 12, -30], color: 4860957}
          - {type: cylinder, fixed: [28, 28, 86, 14, 1], pos: [0, 32, 0], rot: [1.5708, 0, 0], color: 14536888}
      sailing_skiff:
        parts:
          - {type: hull, fixed: [44, 16, 98], pos: [0, 9, 0], color: 8740406}
          - {type: cylinder, fixed: [2, 2.5, 68, 8], pos: [0, 42, 0], color: 5911578}
          - {type: cylinder, fixed: [1.1, 1.1, 40, 8], pos: [0, 48, 3], rot: [0, 0, 1.5708], color: 5911578}
          - {type: box, fixed: [36, 36, 2], pos: [0, 48, 7], color: 15458000}
    destructible_recipes:
      masonry_wall:
        parts:
          - {type: box, fixed: [60, 8, 26], pos: [0, 4, 0], color: 5265502}
          - {type: box, fixed: [56, 46, 21], pos: [0, 30, 0], color: 7370104}
      earth_mound:
        parts:
          - {type: rock, fixed: [26, 14, 24], pos: [0, 4, 0], color: 6045492}
          - {type: rock, fixed: [16, 10, 15], pos: [12, 2, 8], seed: 5, color: 5265502}
      castle_tower:
        parts:
          - {type: box, fixed: [60, 8, 60], pos: [0, 4, 0], color: 5265502}
          - {type: box, fixed: [52, 42, 52], pos: [0, 28, 0], color: 6778226}
          - {type: gable_roof, fixed: [58, 24, 58], pos: [0, 49, 0], color: 4860957}
      explosive_keg:
        parts:
          - {type: lathe, profile: [[8.8, 0], [11.2, 6], [11.5, 11], [11.2, 15], [8.8, 20]], segments: 14, color: 12071464}
          - {type: torus, fixed: [10.6, 0.65, 8, 14], pos: [0, 4.5, 0], rot: [1.5708, 0, 0], color: 3026478}
          - {type: torus, fixed: [11.3, 0.65, 8, 14], pos: [0, 15.5, 0], rot: [1.5708, 0, 0], color: 3026478}
          - {type: flame, fixed: [4.5, 1.8, 4], pos: [0, 20.2, 0], color: 16753920, emissive: 16729344, emissiveIntensity: 1.2}
    chemistry_props:
      tallgrass:
        parts:
          - {type: grass_tuft, fixed: [14, 22], pos: [0, 0, 0], color: 11706674}
          - {type: grass_tuft, fixed: [12, 18], pos: [9, 0, 6], rot: [0, 0.9, 0], color: 10390066}
      rain_puddle:
        parts: [{type: cylinder, fixed: [36, 36, 0.8, 20], pos: [0, 0.4, 0], color: 2457282, opacity: 0.72, roughness: 0.08}]
      perched_boulder:
        parts:
          - {type: rock, fixed: [18, 15, 17], pos: [0, 4, 0], seed: 3, color: 7370104}
      oil_barrel:
        parts:
          - {type: lathe, profile: [[8.2, 0], [10.4, 6], [10.6, 10], [10.4, 15], [8.2, 20]], segments: 14, color: 4860957}
          - {type: torus, fixed: [10.2, 0.6, 8, 14], pos: [0, 5, 0], rot: [1.5708, 0, 0], color: 2236962}
          - {type: torus, fixed: [10.2, 0.6, 8, 14], pos: [0, 15, 0], rot: [1.5708, 0, 0], color: 2236962}
      frost_crystal:
        parts:
          - {type: rock, fixed: [10, 4.5, 10], pos: [0, 1.5, 0], color: 5265502}
          - {type: crystal, fixed: [18, 3.8, 6], pos: [0, 2.5, 0], color: 5690623, emissive: 2060267, emissiveIntensity: 1.0}

living_world:
  intent_criteria:
    ping: "ping mark spot signal look here ambush loot regroup combo beacon"
    emote: "emote sit chair stool bench warm hands lute drum flute music wave cheer dance highfive fistbump hug"
    gift: "gift share toss give item friend ally drop"
    revive: "revive rescue heal up pull downed comrade ally second wind"
    craft: "craft forge brew make synthesize recipe upgrade anvil"
    stash: "stash deposit dump store camp chest storage compare"
    equip: "equip swap weapon wield switch loadouts reinvent respec"
    wardrobe: "dye color palette paint wardrobe transmog outfit cloak silhouette"
    movement_toy: "glide glider wings grapple hook tether climb wall ledge dodge roll parry block"
    weapon_skill: "skill q e r special technique burst oil flask frost mist volt grenade"
    mount: "mount summon ride sand skink panther drake peddler traveling pack beast mule hop dismount passenger"
    bounty: "bounty poster wanted hunt contract bazaar rug shop buy trade"
    pet: "tame pet companion feed fox cub hatchling beetle name pet"
    labyrinth: "labyrinth dungeon vault enter delve curse"
    build: "build place structure wall tower bridge hearth lantern rug map table blueprint save deploy"
    vehicle: "ship airship galleon wagon skiff board helm wheel sails cannon fire cannon crew"
    outpost: "outpost supply fort escort reinforce upgrade frontier"
    chemistry: "ignite burn freeze shock push boulder oil grass puddle keg"
    destructible: "breach blast smash demolish tunnel dig mine wall tower"
    pastime: "fish cast reel catch dice gamble roll riddle decode note chalk ghost echo"
    cartography: "map table share map pin marker reveal cartography"
    voice: "say shout whisper proximity voice radio callout"
    spare: "spare mercy yield parley truce disarm nonlethal forgive"
    reflect: "reflect campfire breakfast quiet interlude harmony litmus chronicle"

  weapon_skill_kits:
    sword:
      family: Longblade & Shield
      skills:
        q: {name: "Crescent Cleave", element: solar, field: solar_flame, dmg_mult: 1.35, reach_bonus: 35, desc: "Sweeping solar arc that ignites dry grass & oil slicks."}
        e: {name: "Skyward Shield Bash", element: kinetic, launch: true, stagger: true, dmg_mult: 1.15, desc: "Launches targets or allies skyward & shatters frozen foes."}
        r: {name: "Aegis Whirlwind", element: kinetic, aoe: true, dmg_mult: 1.65, desc: "360-degree kinetic spin triggering combo fields."}
    daggers:
      family: Twin Phase-Daggers
      skills:
        q: {name: "Oil-Flask Toss", element: oil, field: oil_slick, dmg_mult: 0.85, desc: "Coats the target area in flammable oil slick."}
        e: {name: "Phase Shadowstep", element: void, shadow_decoy: true, dmg_mult: 1.25, desc: "Dashes behind target leaving an exploding shadow."}
        r: {name: "Eviscerate Flank", element: kinetic, dmg_mult: 1.85, desc: "Devastating backstab that detonates Void or Shatter combos."}
    staff:
      family: Chrono-Prism Staff
      skills:
        q: {name: "Frost Mist Nova", element: frost, field: frost_mist, dmg_mult: 1.0, desc: "Creates a chilling Frost Mist & freezes water into ice bridges."}
        e: {name: "Volt Arc Conduit", element: shock, field: storm_aura, dmg_mult: 1.30, desc: "Chains lightning across rain puddles & storm fields."}
        r: {name: "Solaris Ray", element: fire, dmg_mult: 1.75, desc: "Concentrated fire beam detonating oil slicks & explosive kegs."}
    bow:
      family: Meridian Pulse-Bow
      skills:
        q: {name: "Igniting Flare Arrow", element: fire, dmg_mult: 1.25, desc: "Blazing arrow that detonates oil & dry tallgrass at range."}
        e: {name: "Frost-Tip Volley", element: frost, field: frost_mist, dmg_mult: 1.20, desc: "Freezes ground & puddles across a broad cone."}
        r: {name: "Ricochet Piercer", element: kinetic, ricochet: 2, dmg_mult: 1.55, desc: "High-velocity arrow bouncing between foes and shattering frost."}
    hammer:
      family: Resonance Gavel
      skills:
        q: {name: "Sanctum Mend Pulse", element: solar, heal: 14, desc: "Heals nearby squadmates & revives downed allies in aura."}
        e: {name: "Seismic Breach Slam", element: kinetic, breach: true, stagger: true, dmg_mult: 1.40, desc: "Cracks destructible walls, rolls boulders & staggers bosses."}
        r: {name: "Solaris Consecration", element: fire, field: solar_flame, dmg_mult: 1.60, desc: "Drops a burning solar ring that triggers fire combos."}
    glaive:
      family: Thunder-Glaive
      skills:
        q: {name: "Volt Sweep", element: shock, field: storm_aura, dmg_mult: 1.30, desc: "Electrifies nearby water puddles and chains lightning."}
        e: {name: "Sky-Vault Thrust", element: kinetic, launch: true, dmg_mult: 1.40, desc: "Pole-vaults upward into glider height while striking."}
        r: {name: "Tempest Cyclone", element: shock, aoe: true, dmg_mult: 1.75, desc: "Spinning storm tempest."}
    scepter:
      family: Eclipse Scepter
      skills:
        q: {name: "Void Singularity", element: void, field: void_snare, pull: true, dmg_mult: 1.20, desc: "Pulls enemies inward and primes Eclipse combos."}
        e: {name: "Solaris Ignition", element: fire, field: solar_flame, dmg_mult: 1.45, desc: "Ignites oil, grass, and void singularities."}
        r: {name: "Astral Cataclysm", element: solar, aoe: true, dmg_mult: 2.0, desc: "Detonates every combo field in the sector."}

  playstyle_gear:
    shadowstep_greaves: {name: "Shadowstep Greaves", keywords: "shadowstep greaves dash boots", perk: "dodge_explosive_shadow", desc: "Dodging leaves an exploding shadow decoy dealing 14 AoE void damage."}
    ricochet_bow: {name: "Ricochet Skull-Bow", keywords: "ricochet skull bow pulse", perk: "arrow_bounce_2", desc: "Ranged shots automatically bounce to up to 2 nearby enemies."}
    skyward_bulwark: {name: "Skyward Bulwark Shield", keywords: "skyward bulwark shield", perk: "launch_allies_enemies", desc: "Shield bash launches allies high for gliding plunges or sends foes flying."}
    prism_echo_blade: {name: "Prism Echo Blade", keywords: "prism echo blade sword", perk: "crescent_wave", desc: "Every 2nd strike launches a ranged prism wave."}
    chrono_magnet_gloves: {name: "Chrono-Magnet Gloves", keywords: "chrono magnet gloves", perk: "pull_loot_and_foes", desc: "Doubles loot vacuum radius and pulls enemies into Sweet-Spot range."}

  material_tags: ["ore", "ingot", "crystal", "shard", "herb", "timber", "wood", "stone", "oil", "cell", "capacitor", "fish", "trout", "koi", "pearl", "fragment", "bolt"]

  crafting_recipes:
    Harmonic Aether Cell: {ingredients: {"Aether": 1}, fallback_gp: 15, desc: "Restores Vitality & +25 Momentum."}
    Starfire Oil Flask: {ingredients: {"Herb": 1}, fallback_gp: 12, desc: "Creates an Oil Slick combo field on throw."}
    Frost-Mist Vial: {ingredients: {"Crystal": 1}, fallback_gp: 14, desc: "Creates a Frost Mist combo field & freezes water."}
    Volt-Coil Grenade: {ingredients: {"Ingot": 1}, fallback_gp: 18, desc: "Creates a Storm Aura & shocks puddles."}
    Shadowstep Greaves: {ingredients: {"Void": 1}, fallback_gp: 45, desc: "Dodge-rolling leaves exploding shadow decoys."}
    Ricochet Skull-Bow: {ingredients: {"Timber": 1}, fallback_gp: 50, desc: "Arrows bounce between up to 2 nearby skulls."}
    Skyward Bulwark Shield: {ingredients: {"Iron": 1}, fallback_gp: 48, desc: "Bash launches teammates or enemies skyward."}
    Timber Bundle: {ingredients: {}, fallback_gp: 10, desc: "Construction timber for modular camps."}

  combo_matrix:
    blazing_inferno:
      need_field: "oil oil_slick dry_grass"
      trigger_element: "fire solar flame ignite blaze flare sun"
      title: "BLAZING INFERNO!"
      damage: 24
      radius: 165
      color: 16744234
      chime: combo_fire
      desc: "Oil ignites into a roaring fireball engulfing nearby foes!"
    shatter_burst:
      need_field: "frost frost_mist ice"
      trigger_element: "kinetic physical arrow slash strike bash slam bolt cannon"
      title: "SHATTER BURST!"
      damage: 22
      radius: 155
      color: 5690623
      chime: combo_shatter
      desc: "Frozen mist shatters into razor-sharp crystalline shards!"
    arc_overload:
      need_field: "water rain_puddle storm storm_aura"
      trigger_element: "shock volt lightning tempest arc"
      title: "ARC LIGHTNING CHAIN!"
      damage: 20
      radius: 190
      color: 16771665
      chime: combo_shock
      desc: "Electrified mist arcs violently across every creature nearby!"
    eclipse_implosion:
      need_field: "void void_snare"
      trigger_element: "solar fire astral starlight"
      title: "ECLIPSE IMPLOSION!"
      damage: 26
      radius: 170
      color: 11141375
      chime: combo_fire
      desc: "Void and Solar energy implode in a gravitational nova!"

  world_chemistry:
    grass_fire:
      prop_kind: tallgrass
      trigger_element: "fire solar flame ignite flare"
      result_state: burning
      title: "WILDFIRE SMOKE SCREEN!"
      desc: "Dry tallgrass erupts in flames, smoking out hidden ambushes!"
    puddle_freeze:
      prop_kind: rain_puddle
      trigger_element: "frost ice cold"
      result_state: frozen_bridge
      title: "SOLID ICE BRIDGE!"
      desc: "Water flashes into thick translucent ice you can safely stride across!"
    puddle_shock:
      prop_kind: rain_puddle
      trigger_element: "shock volt lightning"
      result_state: electrified
      title: "ELECTRIFIED PUDDLE!"
      desc: "Crackling voltage surges across the water!"
    boulder_roll:
      prop_kind: perched_boulder
      trigger_element: "kinetic bash slam breach strike push cannon"
      result_state: rolled
      title: "BOULDER AVALANCHE!"
      desc: "The perched boulder thunderously rolls downhill, crushing foes in its path!"
    keg_blast:
      prop_kind: oil_barrel
      trigger_element: "fire solar blast cannon kinetic"
      result_state: exploded
      title: "CHAIN-REACTION BLAST!"
      desc: "The volatile keg detonates, blasting nearby structures and hostiles!"

  mounts:
    sand_skink: {name: "Drifting Sand-Skink", speed_mult: 1.55, jump_mult: 1.15, seats: 1, saddle_y: 11.5, ability: "Drift Boost", desc: "High-speed desert lizard that drifts around tight corners."}
    crag_panther: {name: "Cliff-Leaping Crag Panther", speed_mult: 1.40, jump_mult: 2.10, seats: 1, saddle_y: 14.2, ability: "Cliff Leap", desc: "Springs effortlessly up sheer cliffs and ridges."}
    ash_drake: {name: "Two-Seat Ash-Drake", speed_mult: 1.50, jump_mult: 1.75, seats: 2, saddle_y: 18.0, glide: true, ability: "Two-Seat Soar", desc: "Soars smoothly while a second friend rides behind firing bows/spells."}
    traveling_peddler: {name: "Traveling Peddler Pack-Beast", speed_mult: 1.45, jump_mult: 1.35, seats: 2, saddle_y: 12.2, wildlife_kind: "peddler", ability: "Caravan Trot", desc: "Loyal crimson-blanketed pack mule from the room — hop aboard the Traveling Peddler and ride through any sector!"}

  battle_pets:
    storm_fox: {name: "Storm-Fox", biome: "frostspire_pass", treat: "Starlight Koi", ability: "Chain Spark", dmg: 8, desc: "Swift frost-lightning fox that zaps foes and fetches loot."}
    frost_cub: {name: "Frost-Cub", biome: "whisperwood_canopy", treat: "Moonfin Trout", ability: "Glacial Nudge", dmg: 9, desc: "Sturdy bear cub that chills attackers."}
    ember_hatchling: {name: "Ember-Drake Hatchling", biome: "ashfall_quarry", treat: "Aether Pearl", ability: "Cinder Puff", dmg: 10, desc: "Fiery hatchling whose sparks ignite oil & grass!"}
    clockwork_beetle: {name: "Clockwork Beetle", biome: "solhaven_plaza", treat: "Star-Iron Ingot", ability: "Shield Repair", dmg: 7, desc: "Golden automaton scarab that patches your Guard."}

  bounties:
    - {id: bounty_varakh_kin, target: "Kragga the Iron-Scarred", room: "thornmire_ravine", title: "Wanted: Kragga the Iron-Scarred", reward_gp: 85, reward_item: "Skyward Bulwark Shield", desc: "Terrorizing caravans in Thornmire Ravine with seismic slams."}
    - {id: bounty_ember_witch, target: "Pyre-Matron Zira", room: "ashfall_quarry", title: "Wanted: Pyre-Matron Zira", reward_gp: 110, reward_item: "Starfire Oil Flask", desc: "Igniting oil slicks along Ashfall Meteorite Quarry."}
    - {id: bounty_shadow_stalker, target: "Night-Fang Vexis", room: "whisperwood_canopy", title: "Wanted: Night-Fang Vexis", reward_gp: 125, reward_item: "Shadowstep Greaves", desc: "Ambushes travelers under the Whisperwood Silver Canopy."}
    - {id: bounty_sluice_siphon, target: "Siphon-Drake Korv", room: "verdigris_aqueduct", title: "Wanted: Siphon-Drake Korv", reward_gp: 135, reward_item: "Frost-Mist Vial", desc: "Clogging the Verdigris Aqueduct sluices with corroded relay scrap."}
    - {id: bounty_frost_raider, target: "Rime-Breaker Torv", room: "frostspire_pass", title: "Wanted: Rime-Breaker Torv", reward_gp: 165, reward_item: "Chrono-Magnet Gloves", desc: "Shivering survey cairns along Frostspire Glacial Pass."}
    - {id: bounty_chrono_stalker, target: "Hour-Eater Nyxara", room: "chrono_monolith_glade", title: "Wanted: Hour-Eater Nyxara", reward_gp: 190, reward_item: "Prism Echo Blade", desc: "Hunting rift scouts between the time-suspended obelisks."}
    - {id: bounty_spire_warden, target: "Pendulum-Knight Vael", room: "sector_9_chrono_spire", title: "Wanted: Pendulum-Knight Vael", reward_gp: 240, reward_item: "Ricochet Skull-Bow", desc: "Guarding stolen First Meridian clockwork inside Sector IX."}

  labyrinth_curses:
    low_gravity: {name: "Low-Gravity Vaults", gravity_mult: 0.42, jump_mult: 2.1, desc: "Every leap sends heroes and monsters soaring gracefully through the air!"}
    volatile_death: {name: "Volatile Death", explode_on_death: true, blast_dmg: 14, desc: "Every defeated creature detonates in a playful chain-reaction burst!"}
    torchlit_abyss: {name: "Torchlit Abyss", dark_ambient: true, torch_radius: 260, desc: "Pitch-black ancient vaults illuminated only by warm flickering torches!"}
    hyper_tempo: {name: "Hyper-Tempo Frenzy", speed_mult: 1.45, momentum_mult: 1.5, desc: "Blistering movement speed and supercharged Momentum combos!"}

  dynamic_world_events:
    caravan_crisis:
      name: "Meridian Caravan Siege"
      stages:
        - {stage: 1, goal: "Escort the Meridian Caravan safely across the pass", target_progress: 3}
        - {stage: 2, goal: "Shatter the 3 Eclipse Ritual Barriers", target_progress: 3}
        - {stage: 3, goal: "Topple the Towering Obsidian Colossus (scales with squad size)", boss: "Obsidian Meridian Colossus", base_hp: 95, per_player_hp: 35}

  vehicles:
    galleon_airship: {name: "Concordat Sky-Galleon", stations: ["helm", "sails", "cannon"], base_speed: 26, cannon_dmg: 28, desc: "Multi-crew galleon airship with helm, trimmable sails, and booming cannons."}
    rolling_wagon: {name: "Armored Meridian Wagon", stations: ["helm", "sails", "cannon"], base_speed: 22, cannon_dmg: 22, desc: "Heavy overland supply wagon with roof turret."}
    sailing_skiff: {name: "Veridian Canal Skiff", stations: ["helm", "sails", "cannon"], base_speed: 24, cannon_dmg: 20, desc: "Swift multi-crew skiff."}

  frontier_outposts:
    windglass_causeway: {name: "Windglass Waystation", tier: 1, tier_names: ["Smoldering Ruins", "Timber Camp", "Palisade Fort", "Bustling Walled Bastion"]}
    thornmire_ravine: {name: "Thornmire Watchpost", tier: 1, tier_names: ["Ashen Outpost", "Scout Camp", "Stone Watchfort", "Fortified Trade Haven"]}
    whisperwood_canopy: {name: "Whisperwood Lodge", tier: 1, tier_names: ["Abandoned Clearing", "Ranger Camp", "Canopy Citadel", "Luminous Sylvan Town"]}

  ecology_rules:
    wildlife_behaviors:
      wolf_stalk: "wolf stalk hunt deer prey chase"
      deer_flee: "deer graze flee run hide"
      bandit_ambush: "bandit raid ambush peddler merchant"
      guard_patrol: "guard patrol protect escort defend"
    rival_scars:
      fire: {scar: "Charred", counter: "Fireproof Obsidian Plate", taunt: "Your flames only tempered my steel, operative!"}
      ranged: {scar: "One-Eyed", counter: "Arrow-Catcher Buckler", taunt: "I caught your last pulse-bolt with my teeth!"}
      melee: {scar: "Iron-Jawed", counter: "Counter-Spike Pauldrons", taunt: "Remember that duel? Wait till you feel my upgraded maul!"}
      shock: {scar: "Storm-Touched", counter: "Grounded Copper Greaves", taunt: "Lightning bends to me now, Vanguard!"}

  pastimes:
    fishing_catches:
      - {name: "Moonfin Trout", rarity: common, keywords: "clear morning afternoon pond stream"}
      - {name: "Starlight Koi", rarity: uncommon, keywords: "dusk evening night aurora shimmer"}
      - {name: "Aether Pearl", rarity: rare, keywords: "aqueduct tidal cavern deep crystal"}
      - {name: "Sunken Sovereign Boot", rarity: common, keywords: "muddy overcast misty"}
      - {name: "Chrono-Scale Sturgeon", rarity: epic, keywords: "glacier frostspire rift"}
    riddles:
      - {id: riddle_sunspire, prompt: "I watch Solhaven from high above, yet Echo-Wraiths cloud my lens. Bring light north of the Plaza!", answer_keywords: "sunspire watchtower prism shard", hint_room: "sunspire_watchtower", reward_item: "Aether Pearl", reward_gp: 40}
      - {id: riddle_aqueduct, prompt: "Copper and moss carry song beneath the Conservatory. Strike the stream with frost to walk dry-shod!", answer_keywords: "verdigris aqueduct ice water canal", hint_room: "verdigris_aqueduct", reward_item: "Starlight Koi", reward_gp: 45}
      - {id: riddle_loom, prompt: "Three Council petitions lie stacked by violet coils; blue ink warns against another burned valley.", answer_keywords: "loom malakor cedarhollow petitions shunt", hint_room: "alchemical_loom", reward_item: "Volt-Coil Grenade", reward_gp: 55}
      - {id: riddle_starforge, prompt: "Deep below Frostspire's chill, Vespera guards the glowing solar heart.", answer_keywords: "starforge prime solaris core vespera", hint_room: "heart_of_the_starforge", reward_item: "Overcharged Aether Cell", reward_gp: 60}
      - {id: riddle_roundtable, prompt: "No single throne awaits in Sector XII—only limestone carved for twelve guild crests.", answer_keywords: "round table twelve crests chronos meridian", hint_room: "sector_12_throne_of_eternity", reward_item: "Aether Pearl", reward_gp: 90}
    seed_notes:
      - {room: "windglass_causeway", author: "Scout Merrin", text: "Chalk Arrow -> Beware the rigged Aether-Convoy ahead! Bring Fire for the oil slicks.", x: 420, y: 410}
      - {room: "sunken_reliquary", author: "Quartermaster Havelock", text: "Read the cistern ration ledger—Varakh's miners froze first. 'spare' ends fights cleanly once weakened.", x: 440, y: 500}
      - {room: "sub_vault_catacombs", author: "Artificer Korin", text: "Timed Parry [Q] during a red slam wind-up staggers the Enforcer Captain!", x: 380, y: 460}
      - {room: "verdigris_aqueduct", author: "Wayfarer Nyx", text: "Cast Frost on the canal puddles to freeze solid ice bridges!", x: 360, y: 400}
      - {room: "obsidian_dreadnought_berth", author: "Rigger Tamsin", text: "Gunner crew unpinned half the ordnance racks—keep the Leviathan hull intact for winter grain runs!", x: 460, y: 420}
      - {room: "heart_of_the_starforge", author: "Commander Kaelen", text: "Mention Korin's rebuilt gauges and Cedarhollow when speaking with Vespera before the clash.", x: 480, y: 470}
      - {room: "sector_9_chrono_spire", author: "Archivist Lyra Vael", text: "Inverted pendulums still keep First Meridian time—study the Sector XII crests to finish the cycle.", x: 500, y: 430}

  scaling_rules:
    min_scale: 0.55
    max_scale: 1.35
    mentor_bonus_gp: 15
    mentor_bonus_xp: 50

  rested_comfort:
    base_duration_turns: 25
    comfort_items: ["cozy_hearth", "bazaar_rug", "lantern_post", "timber_hall", "map_table"]
    tier_bonuses:
      1: {label: "Campfire Warmth", xp_bonus: 1.15, momentum_bonus: 10, regen: 2}
      2: {label: "Cozy Shelter", xp_bonus: 1.25, momentum_bonus: 15, regen: 4}
      3: {label: "Hearth Sanctuary", xp_bonus: 1.40, momentum_bonus: 25, regen: 6}

  destructibles:
    windglass_causeway:
      - {id: dest_wall_1, kind: masonry_wall, name: "Cracked Syndicate Barricade", x: 640, y: 210, w: 64, h: 48, hp: 25, max_hp: 25}
      - {id: dest_mound_1, kind: earth_mound, name: "Soft Ridge Earth Mound (Dig Tunnel)", x: 280, y: 540, w: 56, h: 56, hp: 20, max_hp: 20}
    thornmire_ravine:
      - {id: dest_tower_base, kind: castle_tower, name: "Watchtower Base Support", x: 740, y: 260, w: 60, h: 60, hp: 30, max_hp: 30, floor: 0, supports: ["dest_tower_top"]}
      - {id: dest_tower_top, kind: castle_tower, name: "Watchtower Upper Battlement", x: 740, y: 260, w: 60, h: 60, hp: 30, max_hp: 30, floor: 1, supported_by: "dest_tower_base"}
    citadel_bastion_courtyard:
      - {id: dest_citadel_wall, kind: masonry_wall, name: "Bastion Breach Wall", x: 480, y: 180, w: 72, h: 44, hp: 35, max_hp: 35}
      - {id: dest_bastion_base, kind: castle_tower, name: "Bastion Tower Pillar", x: 240, y: 260, w: 60, h: 60, hp: 35, max_hp: 35, floor: 0, supports: ["dest_bastion_spire"]}
      - {id: dest_bastion_spire, kind: castle_tower, name: "Bastion Tower Spire", x: 240, y: 260, w: 60, h: 60, hp: 30, max_hp: 30, floor: 1, supported_by: "dest_bastion_base"}

  narrative_harmony:
    guild_title: "Concordat Expedition Vanguard"
    looming_threat:
      name: "The Second Eclipse Resonance"
      prep_bonus_per_shard: 0.05
      desc: "The Second Eclipse settles above the Starforge—every archaeological shard uncovered, outpost supplied, and skirmish resolved prepares the Concordat for Vespera's crucible and the Twelve-Crest Round-Table."
    archaeological_shards:
      windglass_causeway: {id: "shard_causeway", title: "Splintered Rail-Bolt Ledger", lore: "Courier manifests prove the Cedarhollow relief rig carried strictly insulated Aether Cells, not gold bullion."}
      thornmire_ravine: {id: "shard_thornmire", title: "Charred Scout's Ring", lore: "Carved inside the iron band: 'Keep the watchtower lit — no vanguard walks the mist alone.'"}
      sunken_reliquary: {id: "shard_reliquary", title: "Warden's Oath Tablet", lore: "Varakh's garrison rationed lantern oil by the spoonful for stranded miners long before the Eclipse sealed their gates."}
      solhaven_plaza: {id: "shard_solhaven", title: "Guild Charter Fragment", lore: "Dozens of smith, weaver, and courier signatures crowd this parchment—Solhaven was never held by a lone savior, only a stubborn guild."}
      brass_lantern_conservatory: {id: "shard_conservatory", title: "Cedar Table Sketch-Plate", lore: "Charcoal diagrams etched by young Vespera and Malakor show safe heat-exchange loops never approved by the Council."}
      observatory_bluff: {id: "shard_observatory", title: "Cracked Sextant Mirror", lore: "Marginal scratchings chart the First Ignition's shockwave radiating outward from Cedarhollow toward the twelve outer sectors."}
      sub_vault_catacombs: {id: "shard_catacombs", title: "Harbor Watch Ration Tag", lore: "Stamped 'LOWER DOCK WINTER TRUST'—proving Malakor's enforcers guarded transformer coils solely to pay for coal."}
      alchemical_loom: {id: "shard_loom", title: "Blue-Ink Bypass Margin", lore: "Vespera's crisp cursive warns Malakor: 'Bleed the palace surge before Solhaven repeats Cedarhollow's ash.'"}
      whisperwood_canopy: {id: "shard_whisperwood", title: "Silvan–Kharzadic Root-Ring", lore: "Silver boughs grew smoothly around dwarven bronze survey stakes, proving both peoples tended the canopy aqueducts together."}
      citadel_bastion_courtyard: {id: "shard_bastion", title: "Unfinished Lantern Blueprint", lore: "Marginal notes read: 'Build the hearth wide enough for four wet cloaks, two packs, and every courier off the wind.'"}
      sovereign_war_hall: {id: "shard_war_hall", title: "Cedarhollow Evacuation Order", lore: "An unsigned order from the First Ignition bears Dravok's private tally of thirty-four lowland wagons lost on his watch."}
      frostspire_pass: {id: "shard_frostspire", title: "Frozen Surveyor Pennant", lore: "Frost-stiffened silk still carries Korin's compass bearing straight down toward the warm mineral vents below."}
      tidal_resonance_caverns: {id: "shard_tidal", title: "Tide-Stained Astrolabe Gear", lore: "Scratch-marks along the brass teeth chart high-water escape routes chiseled by flooding miners."}
      heart_of_the_starforge: {id: "shard_starforge", title: "Fused Cedarhollow House-Key", lore: "Melted beside the outer crucible ring—proof Vespera chose eternal ice out of grief, not cruelty."}
      sunspire_watchtower: {id: "shard_sunspire", title: "Heliograph Shutter Log", lore: "Copper tape records the final relay before the Eclipse: 'Keep Solhaven Plaza warm; we'll hold the eastern ridge.'"}
      verdigris_aqueduct: {id: "shard_aqueduct", title: "Bronze Sluice Tally", lore: "Chiseled into the mossy keystone: 'Sixteen families below this pipe—never shut the winter flow.'"}
      ashfall_quarry: {id: "shard_quarry", title: "Star-Iron Rail Seal", lore: "Foundry marks show meteoritic ore destined for bridge beams rather than Dreadnought armor."}
      obsidian_dreadnought_berth: {id: "shard_dreadnought", title: "Unpinned Ordnance Pin", lore: "Dockworkers secretly filed the bomb-rack cotters thin so the Sky-Dreadnought could fly grain relief cleanly."}
      chrono_monolith_glade: {id: "shard_glade", title: "Time-Pressed Silver Leaf", lore: "An autumn leaf suspended inside amber quartz ticks softly to the First Meridian's original pulse."}
      astral_rift_conduit: {id: "shard_conduit", title: "Wayfarer Guild Atlas Scrap", lore: "Twelve compass roses converge on one blank island labeled: 'Return with all hands before charting XIII.'"}
      sector_9_chrono_spire: {id: "shard_sector_9", title: "Stopped Pendulum Weight", lore: "Engraved with the hour Cedarhollow fell: 'Grief freezes clocks; only courage winds them forward.'"}
      sector_10_aether_foundry: {id: "shard_sector_10", title: "Ignis's Apprentice Hammer-Mark", lore: "Double-struck star-iron seal showing Solhaven smiths and Kharzadic forgemasters once shared a single anvil."}
      sector_11_void_observatory: {id: "shard_sector_11", title: "Parabolic Horizon Plate", lore: "Etched coordinates map eleven dimmed beacons waiting for Solhaven's twelfth light to answer."}
      sector_12_throne_of_eternity: {id: "shard_sector_12", title: "Twelfth Limestone Crest", lore: "An uncarved circular slot at the Round-Table awaits the Concordat Expedition Vanguard's own guild mark."}
    environmental_vignettes:
      windglass_causeway: "beside the overturned Cedarhollow relief rig rests a child's carved wooden sword propped cleanly against a dented vanguard buckler."
      thornmire_ravine: "chalk tally marks along the shattered bridge post count forty-seven lanterns carried safely through the fog — and stop at forty-eight."
      sunken_reliquary: "stone benches face a cold dry fountain where travelers still leave spare miners' boots neatly paired for strangers."
      solhaven_plaza: "a cafe table stands set with four steaming mugs and an unrolled parchment map weighted down by an iron compass."
      brass_lantern_conservatory: "wet travel cloaks steam gently beside banked cedar coals while a kettle whistles above old blue-ink blueprint stains."
      observatory_bluff: "fallen sextant arms still point stubbornly toward the amber horizon beside chalked grid petitions weighted with pebbles."
      sub_vault_catacombs: "folded wool blankets and battered tin lunchboxes sit tucked neatly beside humming transformer coils."
      alchemical_loom: "stacks of rejected safety petitions anchor copper workbench corners while violet phase arcs trace steady heartbeat rhythms."
      whisperwood_canopy: "silver chimes hang from low boughs beside a hollow trunk stuffed with dry tinder, Kharzadic survey stakes, and waterproofed chalk."
      citadel_bastion_courtyard: "deep rail-bolt scars pepper the stone gatehouse while twin camp chairs remain warm beside a stack of brass casings."
      sovereign_war_hall: "a sprawling slate evacuation map tracks cliff bastion supply lines while crossed-out lowland villages linger in pale chalk."
      frostspire_pass: "frozen expedition flags snap briskly in the gale, angled downward toward warm mineral steam rising from the caverns."
      tidal_resonance_caverns: "dark salt tide-lines climb six feet up the marble columns, topped by frantic chisel notches marking where survivors climbed free."
      heart_of_the_starforge: "charred cedar rafters arch over cold blue stasis rings gripping a trembling golden-cyan plasma hearth."
      sunspire_watchtower: "tilted heliograph mirrors catch faint amber noonlight, flashing silent copper code across Solhaven's roofs."
      verdigris_aqueduct: "clear mountain water slips around mossy bronze sluice gates marked with helpful chalk stepping-stones."
      ashfall_quarry: "glowing meteoritic ore carts stand pre-coupled toward the southern repair cranes rather than the weapons foundry."
      obsidian_dreadnought_berth: "fresh shipyard chalk tallies winter grain tonnage directly across the Dreadnought's repainted bomb bay doors."
      chrono_monolith_glade: "silver autumn leaves hang mid-fall between humming obelisks, casting twin amber and cyan shadows."
      astral_rift_conduit: "dozens of guild pennant streamers flutter around a limestone camp where returning squads pin fresh charcoal trails."
      sector_9_chrono_spire: "suspended brass pendulum weights hover silently above an inverted spiral stair etched with navigator glyphs."
      sector_10_aether_foundry: "cold starlight crucibles encircle an orbital anvil still warm along three overlapping guild hammer-prints."
      sector_11_void_observatory: "shattered parabolic glass mirrors catch distant horizon beacons like fireflies across deep space."
      sector_12_throne_of_eternity: "twelve worn stools ring a simple limestone round-table beneath quiet starlight—built for counsel, never conquest."
    campfire_reflections:
      - "A kettle whistles softly over crackling embers; somebody passes roasted chestnuts around while Solhaven's distant horizon bells chime the hour."
      - "No sirens, no urgent horn — only wind brushing silver grass and teammates trading quiet sketches over warm solar-leaf tea."
      - "Your party oils blades, patches leather straps, and laughs about yesterday's wild near-miss under a slow canopy of stars."
      - "Quartermaster Havelock's extra wool socks dry beside the sparks while somebody taps out Cedarhollow's old harvest cadence on a shield rim."
      - "Wayfarer Nyx's charcoal map unrolls beside the coals; every crossed-out danger mark now carries a small cheerful lantern symbol beside it."
      - "Nobody rushes the watch change—even the battle pet curls warm between two packs while frost ticks quietly off cooled pauldrons."
      - "Someone sets an extra tin mug beside the fire out of habit—whether for Varakh's miners, Malakor's watch, or the courier who left the wooden blade."
      - "Sparks lift into the amber Eclipse haze, glowing twice as steady now that Sunspire's mirrors answer the plaza hearths below."
      - "Korin's oil rag smells sharply of cedar pitch and brass polish—familiar workshop warmth miles beyond the Astral Rift."
      - "Beneath Sector XII's stars, the campfire circle looks remarkably like a miniature twelve-crest round-table built out of packs and coats."
    world_reactions:
      sword: {keywords: "sword longblade sabre blade sun-forged", line: "Kaelen eyes your Sun-Forged Longblade: 'Balanced edge—keep your Sweet-Spot tempo steady so heat cuts cleanly without flaring wide.'"}
      daggers: {keywords: "dagger knife twin shadow phase", line: "Nyx glances at your twin phase-blades: 'Whisper-steel again? Keep close to the flanks—one clean slip ends it before the alarm sounds.'"}
      staff: {keywords: "staff wand arcana spell prism", line: "Lyra nods toward your crackling focus: 'Feel the static around your staff? Pair a Frost Mist with anyone's spark and watch the room light up.'"}
      bow: {keywords: "bow arrow quiver pulse ranged", line: "Merrin eyes your pulse-bow: 'High ground ahead, strider—pin their firing lanes while the vanguard holds the line below.'"}
      hammer: {keywords: "hammer maul shield axe gavel", line: "Kaelen grins at your heavy iron: 'Notice how every Syndicate raider steps back when that hammer hits the flagstones? Good.'"}
      scepter: {keywords: "scepter eclipsed sun solaris", line: "Korin whistles softly at the Eclipsed Scepter: 'Steady hands on that arc—keep it cooling the wards instead of scorching them.'"}
      glaive: {keywords: "glaive thunder polearm reach", line: "Havelock eyes your Thunder-Glaive's notches: 'Citadel steel, rebalanced for lowland reach—make every Sweet-Spot sweep count.'"}
      wounded: {keywords: "wounded hurt critical low hp bleeding", line: "Your armor hangs scarred and splintered—a passing scout whispers: 'Hold steady near the hearth before plunging deeper, friend.'"}
      merciful: {keywords: "spare mercy truce peace nonlethal", line: "Word of your restraint runs ahead of you: 'Half the Harbor Watch laid down their bolts when they heard nobody was out for slaughter.'"}
      breacher: {keywords: "breach smash tunnel dig collapse", line: "Dust coats your boots from carved stone shortcuts: 'Walls mean very little when a Concordat squad brings its own tunnels.'"}
      continuum: {keywords: "continuum meridian crown mantle crest", line: "Nyx salutes your Meridian crest: 'Twelve traditions, one open sky—the uncharted sectors remember who shared the fire.'"}
---
# Aeonward Living World & Sandbox Systems (`aeonward-living-world`)

Data-driven skill specification powering Tiers 1–7 across sensory combat weight, fluid traversal, loot theater, zero-chore crafting, photo postcards, drop-in social play, shared nodes & revives, sidekick scaling, cartography tables, pastimes, proximity spatial voice, telegraphed combat & combo fields, playstyle-bending gear, 2-seat mounts, bounties & bazaars, biomes, world events, battle pets, shifting labyrinths, modular building blueprints, multi-crew airships/wagons, evolving outposts, world chemistry, autonomous wildlife & nemesis rivals, destructible collapsing castles, and seamless unbroken crowds.

## Storyline & Narrative Harmony Integration
- **Cedarhollow & Second Eclipse Arc**: Every room across Acts I–VIII (all 24 core sectors) carries a dedicated `archaeological_shard` and `environmental_vignette` linking the First Ignition tragedy at Cedarhollow, Varakh's miner rations, Malakor's blue-ink shunts, Dravok's evacuation ledger, Vespera's frost-stasis fear, and Chronos-Prime's twelve-crest Round-Table.
- **Mercy & Non-Lethal Agency**: Sparing weakened foes (`spare`) advances `faction_goodwill`, resonates with dialogue paths (`varakh_truce`, `enforcer_parley`, `syndicate_parley`, `malakor_reconcile`), and dynamically shifts `world_reactions`.
