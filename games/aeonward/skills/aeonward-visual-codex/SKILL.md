---
name: aeonward-visual-codex
title: aeonward-visual-codex
type: visual-codex
description: Exhaustive mathematical formalization, 2D/3D discrete entity geometry, procedural PBR texture generation, and
  volumetric rig specifications for all Vanguard archetypes, Continuum citizens, constructs, beasts, weapons, relics, and
  architectural scenery in The Aeonward Continuum.
status: stable
generated:
  by: agent:google-antigravity
  at: '2026-11-14T22:55:00Z'
tags:
- visual-codex
- volumetric-entities
- procedural-pbr
- aeonward
codex:
  characters:
    fighter:
      label: Aegis Vanguard
      model_asset: /characters/character_rogue.glb
      model_scale: 28.0
      model_offset:
      - 0
      - 14.0
      - 0
      scale: 1.0
      skin_color: 16765348
      parts:
      - name: torso
        type: box
        size:
        - 11
        - 13
        - 6.5
        pos:
        - 0
        - 18
        - 0
        material: steel
        color: 14542061
      - name: head
        type: box
        size:
        - 6.5
        - 7
        - 6.5
        pos:
        - 0
        - 27.5
        - 0
        material: skin
        color: 16765348
      - name: helm
        type: box
        size:
        - 7.2
        - 3.8
        - 7.2
        pos:
        - 0
        - 31.4
        - 0
        material: steel
        color: 14542061
      - name: shield
        type: box
        size:
        - 7
        - 13
        - 1.5
        pos:
        - -8.5
        - 17
        - 3.5
        material: royal_blue
        color: 2060267
      - name: blade
        type: box
        size:
        - 1.2
        - 18
        - 0.3
        pos:
        - 7.0
        - 21.0
        - 12.5
        material: steel
        color: 15265269
    wizard:
      label: Astral Wizard
      model_asset: /characters/character_wizard.glb
      model_scale: 28.0
      model_offset:
      - 0
      - 14.0
      - 0
      scale: 1.0
      skin_color: 16765348
      parts:
      - name: torso
        type: box
        size:
        - 10.5
        - 13
        - 6.2
        pos:
        - 0
        - 18
        - 0
        material: purple_robe
        color: 7225545
      - name: head
        type: box
        size:
        - 6.4
        - 7
        - 6.4
        pos:
        - 0
        - 27.5
        - 0
        material: skin
        color: 16765348
      - name: staff
        type: cylinder
        size:
        - 0.7
        - 0.8
        - 28
        - 8
        pos:
        - 7.5
        - 18
        - 5.0
        material: wood
        color: 9132587
      - name: orb
        type: sphere
        size:
        - 2.4
        - 12
        - 12
        pos:
        - 7.5
        - 32.5
        - 3.0
        material: arcane_crystal
        color: 5809919
    rogue:
      label: Veilblade Rogue
      model_asset: /characters/character_rogue.glb
      model_scale: 28.0
      model_offset:
      - 0
      - 14.0
      - 0
      scale: 0.96
      skin_color: 16765348
      parts:
      - name: torso
        type: box
        size:
        - 10
        - 12.5
        - 6
        pos:
        - 0
        - 17.5
        - 0
        material: dark_leather
        color: 2891544
      - name: head
        type: box
        size:
        - 6.2
        - 6.8
        - 6.2
        pos:
        - 0
        - 27
        - 0
        material: skin
        color: 16765348
      - name: hood
        type: box
        size:
        - 7.4
        - 7.8
        - 7.4
        pos:
        - 0
        - 28
        - -0.5
        material: dark_leather
        color: 1842204
      - name: dagger_r
        type: box
        size:
        - 0.8
        - 7.5
        - 0.22
        pos:
        - 7.0
        - 14.0
        - 7.5
        material: steel
        color: 15265269
      - name: dagger_l
        type: box
        size:
        - 0.8
        - 7.5
        - 0.22
        pos:
        - -7.0
        - 14.0
        - 7.5
        material: steel
        color: 15265269
    cleric:
      label: Sol-Cantor Arbiter
      model_asset: /characters/character_rogue.glb
      model_scale: 28.0
      model_offset:
      - 0
      - 14.0
      - 0
      scale: 1.0
      skin_color: 16765348
      parts:
      - name: torso
        type: box
        size:
        - 11.2
        - 12.8
        - 6.8
        pos:
        - 0
        - 18
        - 0
        material: gold
        color: 15972911
      - name: head
        type: box
        size:
        - 6.5
        - 7
        - 6.5
        pos:
        - 0
        - 27.5
        - 0
        material: skin
        color: 16765348
      - name: circlet
        type: cylinder
        size:
        - 4.2
        - 4.2
        - 1.8
        - 16
        pos:
        - 0
        - 30.5
        - 0
        material: gold
        color: 15972911
      - name: hammer
        type: box
        size:
        - 4.0
        - 4.0
        - 6.0
        pos:
        - 7.2
        - 21.5
        - 11.0
        material: steel
        color: 14542061
    archer:
      label: Horizon Strider
      model_asset: /characters/character_wizard.glb
      model_scale: 28.0
      model_offset:
      - 0
      - 14.0
      - 0
      scale: 1.0
      skin_color: 16765348
      parts:
      - name: torso
        type: box
        size:
        - 10.5
        - 12.8
        - 6.2
        pos:
        - 0
        - 18
        - 0
        material: leather
        color: 5912613
      - name: head
        type: box
        size:
        - 6.4
        - 7
        - 6.4
        pos:
        - 0
        - 27.5
        - 0
        material: skin
        color: 16765348
      - name: bow
        type: torus
        size:
        - 8.5
        - 0.75
        - 8
        - 16
        pos:
        - -7.5
        - 16
        - 5.0
        material: wood
        color: 9132587
  monsters:
    raider:
      label: Ashen Raider
      scale: 0.9
      skin_color: 5078075
      parts:
      - name: torso
        type: box
        size:
        - 9
        - 10
        - 5.5
        pos:
        - 0
        - 15
        - 0
        material: dark_leather
        color: 2891544
      - name: head
        type: box
        size:
        - 6
        - 6
        - 5.5
        pos:
        - 0
        - 23
        - 0
        material: orc_skin
        color: 5078075
      - name: blade
        type: box
        size:
        - 1.2
        - 12
        - 1.2
        pos:
        - 6
        - 17
        - 5
        material: steel
        color: 14542061
    brute:
      label: Ironclad Juggernaut
      scale: 1.25
      skin_color: 9262372
      parts:
      - name: torso
        type: box
        size:
        - 12.5
        - 14
        - 7.5
        pos:
        - 0
        - 20
        - 0
        material: dark_leather
        color: 2891544
      - name: head
        type: box
        size:
        - 8
        - 8
        - 7.5
        pos:
        - 0
        - 30
        - 0
        material: dark_skin
        color: 9262372
      - name: maul
        type: box
        size:
        - 2.0
        - 18
        - 2.0
        pos:
        - 8
        - 22
        - 7.5
        material: wood
        color: 9132587
    spider:
      label: Chrono-Weaver Arachnid
      scale: 1.15
      skin_color: 1446428
      parts:
      - name: cephalothorax
        type: sphere
        size:
        - 6
        - 14
        - 12
        pos:
        - 0
        - 7
        - 5
        material: spider_chitin
        color: 1446428
      - name: abdomen
        type: sphere
        size:
        - 10
        - 14
        - 12
        scale:
        - 1.1
        - 0.9
        - 1.4
        pos:
        - 0
        - 9
        - -8
        material: spider_chitin
        color: 2233136
    wolf:
      label: Aether-Stalker Hound
      scale: 1.15
      skin_color: 4339762
      parts:
      - name: body
        type: box
        size:
        - 7
        - 8
        - 14
        pos:
        - 0
        - 8
        - 0
        material: wolf_fur
        color: 4339762
      - name: head
        type: box
        size:
        - 5
        - 5
        - 6
        pos:
        - 0
        - 12
        - 8
        material: wolf_fur
        color: 4866876
    skeleton:
      label: Hollow Automaton
      scale: 1.0
      skin_color: 15131867
      parts:
      - name: ribcage
        type: box
        size:
        - 9
        - 7
        - 5
        pos:
        - 0
        - 19
        - 0
        material: bone
        color: 15131867
      - name: skull
        type: box
        size:
        - 5.5
        - 6
        - 5.5
        pos:
        - 0
        - 25
        - 0
        material: bone
        color: 15131867
  scenery:
    forge:
      label: Prime Solaris Crucible
      height: 38
      parts:
      - name: hearth_base
        type: box
        size:
        - 42
        - 16
        - 42
        pos:
        - 0
        - 8
        - 0
        material: stone
        color: 4015181
      - name: crucible_basin
        type: cylinder
        size:
        - 18
        - 14
        - 12
        - 16
        pos:
        - 0
        - 20
        - 0
        material: iron
        color: 2172461
      - name: solar_flame
        type: sphere
        size:
        - 10
        - 16
        - 16
        pos:
        - 0
        - 27
        - 0
        material: arcane_flame
        color: 2995696
        emissive: 2060267
        emissiveIntensity: 1.5
    chest:
      label: Aether Supply Vault
      height: 20
      parts:
      - name: box_body
        type: box
        size:
        - 24
        - 14
        - 16
        pos:
        - 0
        - 7
        - 0
        material: wood
        color: 5911578
      - name: gold_lock
        type: box
        size:
        - 3
        - 4
        - 1.2
        pos:
        - 0
        - 11
        - 8.4
        material: gold
        color: 13801762
    altar:
      label: Harmonic Resonance Dais
      height: 24
      parts:
      - name: plinth
        type: box
        size:
        - 38
        - 6
        - 24
        pos:
        - 0
        - 3
        - 0
        material: stone
        color: 2962235
      - name: slab
        type: box
        size:
        - 34
        - 16
        - 20
        pos:
        - 0
        - 14
        - 0
        material: stone
        color: 4475990
  client:
    prop_urls:
      - /models/chest.glb
      - /models/forge.glb
      - /models/altar.glb
      - /models/pillar.glb
      - /models/brazier.glb
      - /models/boulder.glb
      - /models/stump.glb
      - /models/wagon.glb
      - /models/table.glb
      - /models/town_well.glb
      - /models/sarcophagus.glb
      - /models/key.glb
      - /models/potion.glb
      - /models/crystal.glb
      - /models/scroll.glb
    item_models:
      key: {keywords: "key cipher", url: /models/key.glb}
      potion: {keywords: "potion elixir flask vial", url: /models/potion.glb}
      crystal: {keywords: "crystal core prism shard", url: /models/crystal.glb}
      scroll: {keywords: "scroll tome codex blueprint", url: /models/scroll.glb}
      chest: {keywords: "chest crate vault cache box", url: /models/chest.glb}
    obstacle_models:
      forge: {keywords: "forge crucible hearth kiln", url: /models/forge.glb}
      pillar: {keywords: "pillar column obelisk pylon", url: /models/pillar.glb}
      brazier: {keywords: "brazier fireplace torch", url: /models/brazier.glb}
      boulder: {keywords: "boulder rock crag stone cliff", url: /models/boulder.glb}
      stump: {keywords: "stump log fallen trunk", url: /models/stump.glb}
      wagon: {keywords: "wagon cart carriage skiff", url: /models/wagon.glb}
      table: {keywords: "table counter bar desk bench", url: /models/table.glb}
      well: {keywords: "well monument shrine fountain", url: /models/town_well.glb}
      relic: {keywords: "bed throne sarcophagus shelf relic", url: /models/sarcophagus.glb}
    portrait_styles:
      fighter: {label: Fighter, torso: "#dde4ed", trim: "#1f6feb", accent: "#f3ba2f", pauldron: "#dde4ed", headgear: helm, weapon: sword, skin: "#ffd1a4", eye: "#238636"}
      wizard: {label: Wizard, torso: "#6e40c9", trim: "#388bfd", accent: "#78dcff", pauldron: "#5a3825", headgear: hat, weapon: staff, skin: "#ffd1a4", eye: "#2f81f7"}
      rogue: {label: Rogue, torso: "#2c1f18", trim: "#5a3825", accent: "#c8cdd7", pauldron: "#5a3825", headgear: hood, weapon: daggers, skin: "#ffd1a4", eye: "#238636"}
      cleric: {label: Cleric, torso: "#f3ba2f", trim: "#dde4ed", accent: "#ebc341", pauldron: "#dde4ed", headgear: circlet, weapon: hammer, skin: "#ffd1a4", eye: "#2f81f7"}
      archer: {label: Archer, torso: "#238636", trim: "#5a3825", accent: "#d7a537", pauldron: "#5a3825", headgear: hood, weapon: bow, skin: "#ffd1a4", eye: "#238636"}
    token_styles:
      monster:
        spider: {keywords: "spider valerius arachnid web crawler", bg: "rgba(25, 20, 35, 0.95)", stroke: "#a03cdc", core: "#1e1928", eye: "#ff2828", shape: spider}
        skeleton: {keywords: "skeleton ghoul pyre_wraith wraith hollow automaton bone", bg: "rgba(35, 40, 45, 0.95)", stroke: "#d2dce6", core: "#e1e6eb", eye: "#141414", shape: skull}
        brute: {keywords: "warden varakh malakor dravok ogre orc juggernaut brute titan", bg: "rgba(70, 35, 25, 0.95)", stroke: "#dc5032", core: "#874b2d", eye: "#ffc83c", shape: brute}
        raider: {keywords: "skirmisher scavenger raider lookout sentry grunt goblin", bg: "rgba(50, 70, 35, 0.95)", stroke: "#82b450", core: "#5f8741", eye: "#ff3c3c", shape: raider}
      item:
        key: {keywords: "key cipher signet", bg: "rgba(20, 40, 30, 0.95)", stroke: "#50d278", core: "#ffd700", shape: key}
        crystal: {keywords: "crystal core prism relic", bg: "rgba(20, 40, 30, 0.95)", stroke: "#50d278", core: "#2ed255", shape: crystal}
        chest: {keywords: "chest cache potion scroll supply", bg: "rgba(20, 40, 30, 0.95)", stroke: "#50d278", core: "#a06e28", shape: chest}
    rig_criteria:
      monsters:
        spider: "spider valerius arachnid crawler web"
        wolf: "wolf hound dog beast stalker predator"
        skeleton: "skeleton hollow automaton wraith bone skull undead"
        brute: "warden varakh malakor dravok ogre orc juggernaut titan brute boss"
        raider: "skirmisher scavenger raider lookout sentry grunt archer scout goblin"
        bow_check_ranged: "shortbow scout archer ranged pulse-bow marksman"
        bow_check_melee: "sword blade maul club spear dagger claw"
    hero_presets:
      fighter:
        roughness: 0.18
        metalness: 0.96
        env: 3.2
        body_color: 14212580
        joint_color: 13938487
        metallic_map: true
        emblem: tabard
        headgear: none
        right_hand: sword
        left_hand: shield
        pose: {l_arm_pitch: -0.26, r_arm_pitch: -0.26, arm_adduct: 0.42, l_elbow: -0.54, r_elbow: -0.54, leg_adduct: 0.06}
      wizard:
        roughness: 0.52
        metalness: 0.15
        env: 1.8
        body_color: 16777215
        joint_color: 16777215
        emblem: none
        headgear: none
        right_hand: staff
        left_hand: tome
        custom_rigs: [character_wizard]
        pose: {l_arm_pitch: -0.20, r_arm_pitch: -0.32, arm_adduct: 0.38, l_elbow: -0.58, r_elbow: -0.52, leg_adduct: 0.08}
        right_align: {offset: [-0.010, 0.070, 0.008], dir: [-0.08, 0.94, 0.33], edge: [0.0, 0.0, 1.0]}
        left_align: {offset: [0.011, 0.071, 0.009], dir: [0.20, 0.35, 0.91], edge: [0.0, 1.0, 0.0]}
      rogue:
        roughness: 0.58
        metalness: 0.32
        env: 1.4
        body_color: 2826520
        joint_color: 1448477
        emblem: none
        headgear: hood
        right_hand: dagger
        left_hand: dagger
        custom_rigs: [character_rogue]
        pose: {l_arm_pitch: -0.26, r_arm_pitch: -0.26, arm_adduct: 0.42, l_elbow: -0.54, r_elbow: -0.54, leg_adduct: 0.06}
        right_align: {offset: [0.016, 0.062, -0.003], dir: [-0.18, 0.15, 0.97], edge: [0.0, 1.0, 0.0]}
        left_align: {offset: [-0.015, 0.059, -0.003], dir: [0.18, 0.15, 0.97], edge: [0.0, 1.0, 0.0]}
      cleric:
        roughness: 0.22
        metalness: 0.94
        env: 3.0
        body_color: 15265009
        joint_color: 13938487
        metallic_map: true
        emblem: stole
        headgear: circlet
        right_hand: hammer
        left_hand: shield
        pose: {l_arm_pitch: -0.26, r_arm_pitch: -0.26, arm_adduct: 0.42, l_elbow: -0.54, r_elbow: -0.54, leg_adduct: 0.06}
      archer:
        roughness: 0.62
        metalness: 0.18
        env: 2.0
        body_color: 2328118
        joint_color: 5912613
        emblem: none
        headgear: none
        right_hand: none
        left_hand: bow
        pose: {l_arm_pitch: -0.26, r_arm_pitch: -0.26, arm_adduct: 0.42, l_elbow: -0.54, r_elbow: -0.54, leg_adduct: 0.06}
    scenery_presets:
      criteria:
        omit: "wall bastion meridian perimeter enclosure boundary"
        pillar: "pillar column obelisk pylon"
        forge: "forge crucible furnace kiln"
        brazier: "brazier hearth fireplace torch"
        boulder: "boulder rock crag stone cliff"
        stump: "stump log fallen trunk wood"
        wagon: "wagon cart carriage skiff"
        horse: "horse steed beast draught mount"
        furniture: "table counter bar bench desk"
        tree: "tree oak forest woods canopy grove"
        bramble: "bramble bush thicket ditch embankment shrub"
        nature: "nature ridge outcrop ledge"
        chasm: "stream water chasm void canal pool pit"
        monument: "well monument shrine fountain"
        relic: "bed throne sarcophagus shelf relic"
        building: "inn hall exchange taphouse post building house manor tower castle palisade"
        wall: "masonry barricade partition"
      templates:
        forge:
          light: {color: 3055683, intensity: 3.4, dist: 280, offset_y: 12}
          parts:
            - {type: box, rel_size: [1.04, 0.16, 1.04], rel_pos: [0, 0.08, 0], mat: stone}
            - {type: box, rel_size: [0.92, 0.42, 0.92], rel_pos: [0, 0.34, 0], mat: stone}
            - {type: torus, fixed: [12, 1.4, 8, 18], rel_pos: [0, 0.62, 0], rot: [1.5708, 0, 0], color: 3685440}
            - {type: flame, fixed: [16, 7.5, 6], rel_pos: [0, 0.58, 0], mat: forge}
        brazier:
          light: {color: 16742144, intensity: 3.0, dist: 240, offset_y: 10}
          parts:
            - {type: lathe, profile: [[11, 0], [8, 3], [7.2, 11], [13, 16], [13.8, 18.5]], segments: 14, flutes: 6, flute_amp: 0.08, mat: stone}
            - {type: torus, fixed: [13.5, 1.1, 8, 18], fixed_pos_y: 18.5, rot: [1.5708, 0, 0], color: 2962228}
            - {type: flame, fixed: [14, 6.8, 5], fixed_pos_y: 16.5, color: 16753920, emissive: 16729344, emissiveIntensity: 1.0}
        wagon:
          shadow: true
          parts:
            - {type: box, rel_size: [0.92, 0.12, 0.78], rel_pos: [0, 0.28, 0], mat: wood}
            - {type: box, rel_size: [0.90, 0.28, 0.08], rel_pos: [0, 0.46, 0.36], mat: wood}
            - {type: box, rel_size: [0.90, 0.28, 0.08], rel_pos: [0, 0.46, -0.36], mat: wood}
            - {type: torus, fixed: [11, 0.75, 8, 14, 3.1416], rel_pos: [-0.26, 0.55, 0], rot: [0, 1.5708, 0], color: 13090226}
            - {type: torus, fixed: [11, 0.75, 8, 14, 3.1416], rel_pos: [0.26, 0.55, 0], rot: [0, 1.5708, 0], color: 13090226}
            - {type: spoked_wheel, fixed: [9.5, 2.0, 8], rel_pos: [-0.36, 0.32, 0.42], color: 4007959}
            - {type: spoked_wheel, fixed: [9.5, 2.0, 8], rel_pos: [0.36, 0.32, 0.42], color: 4007959}
            - {type: spoked_wheel, fixed: [9.5, 2.0, 8], rel_pos: [-0.36, 0.32, -0.42], color: 4007959}
            - {type: spoked_wheel, fixed: [9.5, 2.0, 8], rel_pos: [0.36, 0.32, -0.42], color: 4007959}
        furniture:
          parts:
            - {type: box, rel_size: [1.0, 0.14, 1.0], rel_pos: [0, 0.85, 0], mat: wood}
            - {type: box, rel_size: [0.14, 0.82, 0.14], rel_pos: [-0.38, 0.41, -0.38], mat: wood}
            - {type: box, rel_size: [0.14, 0.82, 0.14], rel_pos: [0.38, 0.41, -0.38], mat: wood}
            - {type: box, rel_size: [0.14, 0.82, 0.14], rel_pos: [-0.38, 0.41, 0.38], mat: wood}
            - {type: box, rel_size: [0.14, 0.82, 0.14], rel_pos: [0.38, 0.41, 0.38], mat: wood}
            - {type: box, rel_size: [0.76, 0.10, 0.12], rel_pos: [0, 0.25, 0], mat: wood}
        monument:
          parts:
            - {type: box, fixed: [42, 4, 42], pos: [0, 2, 0], mat: stone}
            - {type: box, fixed: [32, 16, 32], pos: [0, 12, 0], mat: stone}
            - {type: box, fixed: [38, 3, 38], pos: [0, 21, 0], mat: stone}
            - {type: box, fixed: [3.2, 18, 3.2], mirror_x: 13, pos: [13, 31, 13], mat: wood}
            - {type: box, fixed: [3.2, 18, 3.2], mirror_x: 13, pos: [13, 31, -13], mat: wood}
            - {type: gable_roof, fixed: [40, 16, 38], pos: [0, 40, 0], mat: wood}
        relic:
          parts:
            - {type: box, rel_size: [1.02, 0.20, 1.02], rel_pos: [0, 0.10, 0], mat: stone}
            - {type: box, rel_size: [0.88, 0.62, 0.86], rel_pos: [0, 0.48, 0], mat: relic}
            - {type: gable_roof, rel_size: [0.94, 0.24, 0.92], rel_pos: [0, 0.78, 0], mat: relic}
        nature:
          min_h: 95
          parts:
            - {type: rock, rel_size: [0.55, 0.55, 0.55], rel_pos: [0, 0.42, 0], mat: stone}
            - {type: rock, rel_size: [0.38, 0.35, 0.38], rel_pos: [0.22, 0.25, 0.18], seed: 4, mat: stone}
        chasm:
          fixed_h: 2
          parts:
            - {type: box, rel_size: [1, 1, 1], fixed_pos_y: 1, mat: chasm_water}
        horse:
          dual_when_wide: [70, 55]
          parts:
            - {type: lathe, profile: [[4.5, -13], [7.8, -7], [8.2, 4], [6.5, 11], [2.5, 14]], segments: 14, pos: [0, 11.5, 0], rot: [0, 0, 1.5708], color: 6040598}
            - {type: box, fixed: [7.5, 2.5, 9.5], pos: [0, 17.8, 0], color: 9127187}
            - {type: lathe, profile: [[4.2, 0], [3.6, 5], [2.8, 10]], segments: 10, pos: [12.0, 14.0, 0], rot: [0, 0, -0.58], color: 6040598}
            - {type: box, fixed: [8.0, 4.0, 4.2], pos: [19.2, 22.2, 0], rot: [0, 0, -0.45], color: 6040598}
            - {type: cone, fixed: [1.1, 3.0, 4], pos: [16.8, 25.2, 1.5], color: 1839370}
            - {type: cone, fixed: [1.1, 3.0, 4], pos: [16.8, 25.2, -1.5], color: 1839370}
            - {type: box, fixed: [9.0, 2.2, 1.8], pos: [13.5, 19.2, 0], rot: [0, 0, 0.92], color: 1839370}
            - {type: cone, fixed: [1.8, 10.5, 6], pos: [-15.5, 11.5, 0], rot: [0, 0, 0.55], color: 1839370}
            - {type: cylinder, fixed: [1.6, 1.0, 11], pos: [8.0, 5.5, 3.8], color: 6040598}
            - {type: cylinder, fixed: [1.6, 1.0, 11], pos: [8.0, 5.5, -3.8], color: 6040598}
            - {type: cylinder, fixed: [1.8, 1.0, 11], pos: [-8.0, 5.5, 3.8], color: 6040598}
            - {type: cylinder, fixed: [1.8, 1.0, 11], pos: [-8.0, 5.5, -3.8], color: 6040598}
    item_fallbacks:
      criteria:
        key: "key cipher signet"
        potion: "potion elixir flask vial"
        crystal: "crystal core prism shard"
        scroll: "scroll tome blueprint codex"
        chest: "chest crate vault cache box"
      templates:
        key:
          light: 16766720
          parts:
            - {type: torus, fixed: [3.2, 0.85, 8, 14], mirror_x: 2.2, pos: [2.2, 15.2, 0], color: 16766720}
            - {type: torus, fixed: [3.2, 0.85, 8, 14], pos: [0, 17.8, 0], color: 16766720}
            - {type: lathe, profile: [[0.5, 0.5], [1.2, 2.5], [1.1, 13.0], [1.9, 13.8]], segments: 12, color: 16766720}
            - {type: box, fixed: [4.2, 2.4, 1.2], pos: [2.2, 3.2, 0], color: 16766720}
        potion:
          light: 15680580
          parts:
            - {type: lathe, profile: [[4.2, 0.2], [6.5, 4.8], [6.4, 8.2], [2.4, 12.2], [2.2, 15.6], [3.0, 16.5]], segments: 14, flutes: 8, flute_amp: 0.07, color: 14427686, opacity: 0.92}
            - {type: torus, fixed: [2.4, 0.4, 8, 14], pos: [0, 14.8, 0], rot: [1.5708, 0, 0], color: 16766720}
            - {type: cylinder, fixed: [2.0, 1.6, 2.8, 12], pos: [0, 17.6, 0], color: 9132587}
        crystal:
          light: 3055683
          parts:
            - {type: rock, fixed: [8.5, 4.2, 8.5], pos: [0, 1.5, 0], color: 4475990}
            - {type: crystal, fixed: [18, 3.4, 6], pos: [0, 2.2, 0], color: 3055683, emissive: 2060267, emissiveIntensity: 0.9}
        scroll:
          parts:
            - {type: cylinder, fixed: [2.3, 2.3, 13, 14], pos: [0, 2.5, -3.2], rot: [0, 0, 1.5708], color: 15454905}
            - {type: cylinder, fixed: [2.1, 2.1, 13, 14], pos: [0, 2.2, 3.4], rot: [0, 0, 1.5708], color: 15454905}
            - {type: box, fixed: [12.5, 0.5, 6.8], pos: [0, 1.4, 0], color: 15454905}
            - {type: cylinder, fixed: [1.8, 1.9, 0.8, 10], pos: [0, 2.0, 0.2], color: 12131356}
        chest:
          light: 8316807
          parts:
            - {type: box, fixed: [22, 12, 15], pos: [0, 6.5, 0], color: 10513960}
            - {type: cylinder, fixed: [7.4, 7.4, 21.6, 14], pos: [0, 12.5, 0], rot: [0, 0, 1.5708], color: 10513960}
            - {type: box, fixed: [22.6, 1.6, 15.6], pos: [0, 12.2, 0], color: 3028024}
            - {type: box, fixed: [3.6, 4.4, 1.5], pos: [0, 10.5, 8.1], color: 16096779}
    rig_recipes:
      spider:
        body:
          - {type: lathe, profile: [[1.2, -5], [5.8, -1.5], [6.2, 2.5], [2.5, 6.2]], segments: 12, flutes: 6, flute_amp: 0.08, pos: [0, 7, 5], rot: [1.5708, 0, 0], color: 1446428}
          - {type: lathe, profile: [[1.5, -13], [9.5, -6], [11.2, 1], [6.5, 8], [1.2, 11]], segments: 14, flutes: 8, flute_amp: 0.07, pos: [0, 10, -8.5], rot: [1.45, 0, 0], color: 2233136, key: spiderAbdomen}
          - {type: cylinder, fixed: [0.8, 0.5, 3.2, 8], mirror_x: 1.2, pos: [1.2, 5, 9.8], rot: [0.4, 0, 0], color: 1446428}
          - {type: cone, fixed: [0.45, 2.5, 6], mirror_x: 1.2, pos: [1.2, 3.2, 10.6], rot: [-0.55, 0, 0.22], color: 656653}
        eyes: [[-2.6, 8.2, 10.2, 0.65], [-0.9, 8.4, 10.7, 0.8], [0.9, 8.4, 10.7, 0.8], [2.6, 8.2, 10.2, 0.65], [-1.8, 9.3, 9.8, 0.55], [-0.6, 9.4, 10.2, 0.65], [0.6, 9.4, 10.2, 0.65], [1.8, 9.3, 9.8, 0.55]]
      wolf:
        body:
          - {type: lathe, profile: [[2.5, -5], [5.8, -1], [5.5, 3], [2.2, 6]], segments: 12, pos: [0, 11.2, 3.0], rot: [1.5708, 0, 0], color: 4339762}
          - {type: lathe, profile: [[2.2, -4.5], [4.6, 0], [4.2, 4.5], [2.0, 6]], segments: 12, pos: [0, 10.5, -4.2], rot: [1.5708, 0, 0], color: 4339762}
          - {type: cylinder, fixed: [2.8, 3.9, 6.5, 10], pos: [0, 13.8, 7.6], rot: [0.7854, 0, 0], color: 4339762}
        head:
          - {type: lathe, profile: [[2.2, -2.8], [3.4, -0.4], [3.0, 2.0], [1.4, 3.2]], segments: 10, rot: [1.5708, 0, 0], color: 4339762}
          - {type: box, fixed: [2.3, 2.0, 4.6], pos: [0, -0.6, 3.3], color: 4339762}
          - {type: octahedron, fixed: [0.75, 0], pos: [0, -0.1, 5.5], scale: [1, 0.7, 0.8], color: 2040616}
          - {type: cone, fixed: [0.25, 0.9, 4], mirror_x: 0.75, pos: [0.75, -1.6, 4.2], rot: [3.1416, 0, 0], color: 16118762}
          - {type: cone, fixed: [0.22, 0.8, 4], mirror_x: 0.75, pos: [0.75, -1.8, 4.5], color: 16118762}
          - {type: cone, fixed: [0.95, 3.0, 5], mirror_x: 1.7, pos: [1.7, 3.3, -0.4], rot: [-0.25, 0, -0.35], color: 4339762}
          - {type: sphere, fixed: [0.55, 6, 6], mirror_x: 1.2, pos: [1.2, 0.9, 2.3], mat: iris}
        tail:
          - {type: cylinder, fixed: [0.9, 1.5, 6, 8], pos: [0, -2.5, -2], rot: [-0.7854, 0, 0], color: 4339762}
          - {type: cone, fixed: [1.4, 5.5, 6], pos: [0, -5.5, -4.5], rot: [-1.0472, 0, 0], color: 8023138}
      skeleton:
        body:
          - {type: cylinder, fixed: [0.85, 0.65, 14, 10], mirror_x: 3, pos: [3, 7, 0], mat: bone}
          - {type: box, fixed: [8.2, 2.0, 4.2], pos: [0, 14, 0], mat: bone}
          - {type: cylinder, fixed: [0.9, 0.9, 9, 8], pos: [0, 18.5, 0], mat: bone}
          - {type: torus, fixed: [3.6, 0.55, 6, 12], pos: [0, 17.5, 0], rot: [1.5708, 0, 0], scale: [1.2, 0.72, 1], mat: bone}
          - {type: torus, fixed: [4.2, 0.6, 6, 12], pos: [0, 19.6, 0], rot: [1.5708, 0, 0], scale: [1.2, 0.72, 1], mat: bone}
          - {type: torus, fixed: [4.4, 0.65, 6, 12], pos: [0, 21.5, 0], rot: [1.5708, 0, 0], scale: [1.2, 0.72, 1], mat: bone}
          - {type: lathe, profile: [[1.9, 23.2], [2.7, 25.0], [2.9, 27.2], [1.8, 28.8], [0.2, 29.2]], segments: 12, mat: bone}
          - {type: box, fixed: [2.8, 1.6, 2.2], pos: [0, 24.4, 1.8], mat: bone}
          - {type: octahedron, fixed: [0.75, 0], mirror_x: 1.15, pos: [1.15, 26.2, 2.5], mat: dark}
          - {type: cone, fixed: [0.28, 0.7, 3], mirror_x: 0.7, pos: [0.7, 23.5, 2.75], rot: [0, 0, 3.1416], color: 16444375}
          - {type: cylinder, fixed: [0.7, 0.6, 12, 8], pos: [-6, 17, 0], mat: bone}
          - {type: cylinder, fixed: [0.7, 0.6, 12, 8], pos: [6, 17, 2], rot: [-0.5, 0, 0], mat: bone, key: weaponMount}
          - {type: box, fixed: [2.8, 0.5, 0.7], pos: [6.2, 15.2, 4.2], rot: [1.0472, 0, 0], mat: bone}
          - {type: blade, fixed: [1.0, 15.0, 0.25], pos: [6.4, 19.5, 10.5], rot: [1.0472, 0, 0], mat: steel}
---
# The Aeonward Continuum Visual & Volumetric Codex (`aeonward-visual-codex`)

This skill formalizes the 2D/3D procedural entity geometry, material shaders, and skeletal articulation rigs for **The Aeonward Continuum: Chronicles of the Eclipsed Starforge**.

## 1. Playable Vanguard Archetypes
- **Aegis Vanguard (`fighter`)**: Heavy kinetic plate, Aegis Bastion Shield, and Sun-Forged Longblade.
- **Astral Weaver (`wizard`)**: Harmonic weave vestments, Singularity Prism Staff, and Chrono-Lens Codex.
- **Veilblade Stalker (`rogue`)**: Phase-weave shadow brigandine, Twin Resonant Dirks, and Shadow Cowl.
- **Sol-Cantor Arbiter (`cleric`)**: Radiant Sovereign plate, Harmonic Choir Hammer, and Aether Reliquary Shield.
- **Horizon Strider (`archer`)**: Wind-runnerbrigandine, Magnetic Longbow, and Recon Vector Quiver.

## 2. Continuum Bestiary Rigs
- **Ashen Raiders & Syndicate Cutthroats (`raider`)**: Agile skirmishers wielding serrated kinetic blades and pulse bows.
- **Ironclad Juggernauts & Wardens (`brute`)**: Towering shock-troopers and warlords with heavy seismic mauls.
- **Chrono-Weaver Arachnids (`spider`)**: 8-legged articulated phase-spiders with crystalline chitin.
- **Aether-Stalker Hounds (`wolf`)**: Quadruped digitigrade predators attuned to harmonic trails.
- **Hollow Automatons (`skeleton`)**: Ancient clockwork-and-ossified guardians of the Sunken Vaults.



