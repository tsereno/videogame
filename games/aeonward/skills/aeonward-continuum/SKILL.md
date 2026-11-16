---
name: aeonward-continuum
description: 'Deterministic skill-based tactical RPG campaign set in The Aeonward Continuum: Chronicles of the Eclipsed Starforge, featuring 8 multi-act storyline chapters and an infinitely expanding Astral Rift Continuum.'
game:
  id: aeonward-continuum
  title: 'The Aeonward Continuum: Chronicles of the Eclipsed Starforge'
  aliases:
  - aeonward
  - aeonward-continuum
  - starforge
  - eclipsed starforge
  - continuum
  start_room: windglass_causeway
  initial_inventory: Sun-Forged Longblade
  gates:
    loom_conduit_gate:
      key_item: Meridian Brass Cipher
      room: sub_vault_catacombs
      target_room: alchemical_loom
      locked_message: The harmonic bulkhead to The Alchemical Loom hums against your gauntlets—sealed against Solhaven's inspectors. It requires the Meridian Brass Cipher.
      unlock_message: You slot the Meridian Brass Cipher into the harmonic lock. Brass rings click into Cedarhollow's old calibration cadence, and the Loom gateway unseals!
    sovereign_bastion_gate:
      key_item: Loom Resonance Signet
      room: citadel_bastion_courtyard
      target_room: sovereign_war_hall
      locked_message: Dravok's kinetic barrier to the Sovereign War-Hall crackles with storm-cell voltage, barring lowland crews. It requires the Loom Resonance Signet.
      unlock_message: The Loom Resonance Signet matches the rampart frequency! Storm-pylons stand down and the kinetic barrier parts before you.
    starforge_sanctum_gate:
      key_item: Astral Compass Key
      room: tidal_resonance_caverns
      target_room: heart_of_the_starforge
      locked_message: The celestial iris guarding the Heart of the Starforge is frozen beneath stasis rime! It requires the Astral Compass Key.
      unlock_message: You turn the Astral Compass Key inside the celestial iris. Starlight floods the chasm as the ancient Starforge crucible unseals!
  dragons: {}
  win_condition:
    target_room: solhaven_plaza
    required_item: Prime Solaris Core
    message: THE MERIDIAN HOLDS! Alongside your Concordat wayfarers, you reconciled Vespera's stasis fear with the Prime Solaris Core and carried its balanced warmth home to Solhaven Sovereign Plaza. Lanterns reignite from the outer miners' wards to the eastern aqueducts—proving fire shared by a guild need never burn another Cedarhollow, while uncharted horizons open across the Astral Conduit.
  intro_message: Ash-tinted snow drifts across the Windglass Causeway, where a wrecked Concordat fuel rig—stenciled 'CEDARHOLLOW RELIEF'—lies half-buried in the ditch with rail-bolt scars along its tanks. As the Second Eclipse dims noon to amber, field crews range outward to trace siphoned Aether cells, mend silent beacons, and confront the fractures dividing Solhaven's winter survival. Beside the cold rig, Scout Merrin watches the ridge near a child's wooden blade and a split buckler.
  rooms:
    windglass_causeway:
      name: Windglass Causeway (Convoy Wreckage)
      color: Crystalline Steppe
      desc: "Frost and glass-dust gather inside rail-bolt craters along the overturned Aether-Rig stenciled 'CEDARHOLLOW RELIEF'; beside a split Concordat buckler leans a child's carved wooden blade, while far north the watch-smoke of Thornmire rises across the gorge."
      north:
      - thornmire_ravine
      - A jagged canyon trail ascending toward the smoke plumes of Thornmire Ravine
      east:
      - solhaven_plaza
      - The paved meridian highway leading east toward the warm brass lanterns of Solhaven Sovereign Plaza
      items: []
      monsters: []
      npcs:
      - Scout Merrin
    thornmire_ravine:
      name: Thornmire Ravine
      color: Razor-Quartz Canyon
      desc: "Chalk tally marks on a splintered bridge beam stop abruptly at forty-eight. Overhead, rope-bridges frame the towering sandstone arch of the Sunken Reliquary."
      south:
      - windglass_causeway
      - Return south down to Windglass Causeway
      north:
      - sunken_reliquary
      - The echoing stone archway of the Sunken Reliquary
      items: []
      monsters:
      - Ashen Syndicate Lookout
      - Aether-Stalker Hound
    sunken_reliquary:
      name: Sunken Reliquary (Warden Varakh's Bastion)
      color: Bioluminescent Vault
      desc: "Pairs of mud-caked miners' boots sit lined beside dry cistern benches; crates of contraband fuel cells are stenciled carefully: 'Outer Ward Shelters — Equal Ration.'"
      south:
      - thornmire_ravine
      - Exit south to Thornmire Ravine
      items:
      - Meridian Brass Cipher
      monsters:
      - Warden Varakh the Ironbound
      - Gilded Clockwork Hound
      - Sub-Warden Skirmisher
    solhaven_plaza:
      name: Solhaven Sovereign Plaza
      color: Brass & Limestone Hub
      desc: "A stone map table sits outdoors surrounded by four tin camp mugs and pinned route strings. Even as the Eclipse dims noon to amber, apprentice smiths keep three braziers stoked for returning survey squads."
      west:
      - windglass_causeway
      - West highway back to Windglass Causeway
      east:
      - brass_lantern_conservatory
      - Ornamental archway into The Brass Lantern Conservatory
      south:
      - observatory_bluff
      - Steep stepped avenue ascending toward the cracked glass dome of Observatory Bluff
      items: []
      monsters: []
      npcs:
      - Quartermaster Havelock
      - Archivist Lyra Vael
      - Consul Vennick
      north:
      - sunspire_watchtower
      - Brass lift ascending toward the golden beacon mirror of Sunspire Signal Watchtower
    brass_lantern_conservatory:
      name: The Brass Lantern Conservatory
      color: Warm Solar Hearth
      desc: "Wet travel cloaks steam gently beside banked cedar coals while a kettle whistles undisturbed. For a quiet breath here, nobody sounds an alarm."
      west:
      - solhaven_plaza
      - West exit to Solhaven Sovereign Plaza
      north:
      - windglass_causeway
      - Overland shortcut back to the Windglass Causeway
      items: []
      monsters: []
      npcs:
      - Curator Toren
      - Commander Kaelen
      - Envoy Soren
    observatory_bluff:
      name: Observatory Bluff Ruins
      color: Shattered Astrolabe Dome
      desc: "Cracked brass sextants still point toward a faint solar rim above frosted stone steps. Chalk notes taped to a fallen column petition the Council for grid repairs."
      north:
      - solhaven_plaza
      - Downhill avenue back to Solhaven Sovereign Plaza
      south:
      - sub_vault_catacombs
      - Spiral bronze stair descending into the Sub-Vault Catacombs
      items: []
      monsters:
      - Gilded Enforcer Sentry
    sub_vault_catacombs:
      name: Sub-Vault Catacombs (Enforcer Garrison)
      color: Obsidian Conduit Hall
      desc: "Tin lunchboxes and folded blankets line the cool transformer niches—mercenary harbor watch keeping warm beside glowing shunt coils."
      north:
      - observatory_bluff
      - Stairway ascending to Observatory Bluff
      up:
      - observatory_bluff
      - Stairway ascending to Observatory Bluff
      south:
      - alchemical_loom
      - Harmonic sealed gateway to The Alchemical Loom (requires Meridian Brass Cipher)
      items: []
      monsters:
      - Gilded Enforcer Squad
      - Hollow Automaton Wardens
      - Rift-Gazer Anomaly
    alchemical_loom:
      name: The Alchemical Loom (Malakor's Sanctum)
      color: Violet Resonance Chamber
      desc: "Stack upon stack of rejected grid-safety petitions weight down copper workbench corners beside humming phase regulators; beyond the east arch lies emerald star-filtered leaves."
      north:
      - sub_vault_catacombs
      - Exit north to Sub-Vault Catacombs
      east:
      - whisperwood_canopy
      - Hidden phase-conduit tunnel emerging at Whisperwood Canopy
      items:
      - Loom Resonance Signet
      - Malakor's Bypass Schematic
      monsters:
      - Arch-Artificer Malakor
      - Homunculus Phase-Drone
    whisperwood_canopy:
      name: Whisperwood Silver Canopy
      color: Luminous Silver Forest
      desc: "Silver chimes sway below ancient boughs grown around old Kharzadic aqueduct survey stakes; Ranger Sylva tends the lantern line where the high north mist holds the iron chains of Vaelen's Sky-Citadel."
      west:
      - alchemical_loom
      - Phase-conduit back into The Alchemical Loom
      north:
      - citadel_bastion_courtyard
      - Suspension sky-bridge climbing toward the iron chains of Vaelen's Reach Bastion Courtyard
      south:
      - solhaven_plaza
      - Valley descent trail returning to Solhaven Sovereign Plaza
      items: []
      monsters:
      - Volt-Skitter Swarm (Pack of 3)
      npcs:
      - Ranger Sylva
      east:
      - chrono_monolith_glade
      - Luminous trail into the Chrono-Monolith Fracture Glade
      down:
      - ashfall_quarry
      - Rocky descent to the Ashfall Meteorite Quarry
    citadel_bastion_courtyard:
      name: Vaelen's Reach Bastion Courtyard
      color: Sky-Fortress Ramparts
      desc: "Heavy storm-chains groan against wind gusts high above the cloudline; brass rail-casings litter the parapet beside neatly stacked winter emergency coats."
      south:
      - whisperwood_canopy
      - Sky-bridge south to Whisperwood Canopy
      north:
      - sovereign_war_hall
      - Kinetic barrier gate to the Sovereign War-Hall (requires Loom Resonance Signet)
      items: []
      monsters:
      - Sky-Citadel Halberdier
      - Iron-Plated Goliath
    sovereign_war_hall:
      name: Sovereign War-Hall (Dravok's Command)
      color: Crimson Banner Keep
      desc: "A sprawling slate relief map dominates the keep, etched with evacuation altitudes and crossed-out lowland supply towns."
      south:
      - citadel_bastion_courtyard
      - Exit south to Bastion Courtyard
      east:
      - frostspire_pass
      - High-altitude wind-tunnel leading across the white peaks of Frostspire Pass
      items:
      - Astral Compass Key
      monsters:
      - High Commander Dravok and his War-Beast
      - Mirage Infiltrator Vex
    frostspire_pass:
      name: Frostspire Glacial Pass
      color: Permafrost Zenith Ridge
      desc: "Frozen surveyor flags snap briskly in razor wind, pointing downward where warm mineral mist curls out of the Tidal Resonance Caverns."
      west:
      - sovereign_war_hall
      - Passage back into the Sovereign War-Hall
      south:
      - tidal_resonance_caverns
      - Glacial elevator descending into the Tidal Resonance Caverns
      north:
      - whisperwood_canopy
      - Mountain switchback returning to Whisperwood Canopy
      items: []
      monsters:
      - Frost-Bound Marauder
      - Glacial Behemoth
    tidal_resonance_caverns:
      name: Tidal Resonance Caverns
      color: Echoing Abyssal Grotto
      desc: "Dark salt tide-lines stain marble pillars six feet high, scored with chisel handholds carved by flooding miners escaping toward warm cavern pools."
      north:
      - frostspire_pass
      - Ascent back to Frostspire Pass
      south:
      - heart_of_the_starforge
      - Celestial iris gate framing the golden glow of the Heart of the Starforge (requires Astral Compass Key)
      items: []
      monsters:
      - Chrono-Weaver Arachnid
      - Abyssal Tide-Lurker
    heart_of_the_starforge:
      name: The Heart of the Starforge
      color: Incandescent Solar Crucible
      desc: "Cold blue stasis rings grip a trembling golden-cyan plasma hearth; seared basalt arches carry charred cedar rafters from the First Ignition—when Cedarhollow burned and Vespera swore fire would never run free again."
      north:
      - tidal_resonance_caverns
      - Iris portal back out to Tidal Resonance Caverns
      items:
      - Prime Solaris Core
      - Vespera's Charred Cedar Locket
      monsters:
      - Vespera the Eclipse Architect
      - Solaris Core Sentinel
      - Void-Phase Arachnid
    sunspire_watchtower:
      name: Sunspire Signal Watchtower
      color: Amber Prism Spire
      desc: "Huge heliograph prisms hang crooked on rusted gimbals, overlooking both Solhaven's roofs and the green mossy span of Verdigris Aqueduct."
      south:
      - solhaven_plaza
      - Descend the brass lift back to Solhaven Sovereign Plaza
      east:
      - verdigris_aqueduct
      - Elevated stone causeway crossing to Verdigris Aqueduct
      items:
      - Solaris Prism Shard
      monsters:
      - Echo-Wraith Resonator
    verdigris_aqueduct:
      name: Verdigris Sunken Aqueduct
      color: Copper-Moss Canal
      desc: "Clear mountain runoff pools along bronze sluice gates clogged with verdigris silt; chalk trail markers along the ledge highlight safe stepping stones."
      west:
      - sunspire_watchtower
      - Elevated causeway returning to Sunspire Watchtower
      south:
      - brass_lantern_conservatory
      - Subterranean service stair into The Brass Lantern Conservatory
      items: []
      monsters:
      - Rust-Shell Automaton
      - Aether-Leach Swarm
    ashfall_quarry:
      name: Ashfall Meteorite Quarry
      color: Basalt Star-Crater
      desc: "Smoldering meteoritic slag illuminates mining carts stuffed with raw Star-Iron destined cleanly for frontier rebuilding."
      east:
      - whisperwood_canopy
      - Forest trail back to Whisperwood Silver Canopy
      north:
      - obsidian_dreadnought_berth
      - Heavy rail-tunnel leading to the Obsidian Dreadnought Berth
      items:
      - Star-Iron Ingot
      monsters:
      - Basalt Crusher Golem
      - Ashen Excavators (Squad of 3)
    obsidian_dreadnought_berth:
      name: Obsidian Sky-Dreadnought Berth
      color: Suspended Iron Hangar
      desc: "Riveted airship plates hang over open mist like a sleeping Leviathan, ringed with winch cranes and spare cargo harnesses."
      south:
      - ashfall_quarry
      - Rail-tunnel south to Ashfall Meteorite Quarry
      east:
      - citadel_bastion_courtyard
      - Docking gangway to Vaelen's Reach Bastion Courtyard
      items:
      - Dreadnought Ignition Coil
      monsters:
      - Dreadnought Gunner Captain
      - Clockwork Bombardier
    chrono_monolith_glade:
      name: Chrono-Monolith Fracture Glade
      color: Time-Suspended Grove
      desc: "Silver autumn leaves hang mid-fall beside humming obelisks, quietly framing the shimmering eastern threshold of the Astral Rift Conduit."
      west:
      - whisperwood_canopy
      - Silver path back to Whisperwood Canopy
      north:
      - astral_rift_conduit
      - Glowing dimensional threshold to the Astral Rift Conduit
      items:
      - Temporal Anchor Crystal
      monsters:
      - Chrono-Stalker Panther
      - Phase-Echo Mirage
    astral_rift_conduit:
      name: The Astral Rift Conduit (Living Continuum Nexus)
      color: Prismatic Horizon Gate
      desc: "Dozens of guild pennant streamers flutter around a calm limestone expedition camp where crews swap compass readings before crossing uncharted bridges."
      south:
      - chrono_monolith_glade
      - Step back through the threshold to Chrono-Monolith Glade
      west:
      - solhaven_plaza
      - Direct Astral Slipstream portal back to Solhaven Sovereign Plaza
      north:
      - sector_9_chrono_spire
      - 'Uncharted Continuum Gate leading to Sector IX: The Sunken Chrono-Spire'
      items:
      - Continuum Wayfinder Compass
      monsters: []
      npcs:
      - Wayfarer Nyx
      - Master Artificer Korin
    sector_9_chrono_spire:
      name: 'Sector IX: The Sunken Chrono-Spire'
      color: Inverted Temporal Cathedral
      desc: "Suspended pendulum weights drift silently overhead inside an inverted brass belltower built by forgotten Starforge navigators."
      south:
      - astral_rift_conduit
      - Return south to the Astral Rift Conduit
      north:
      - sector_10_aether_foundry
      - 'Ascending gravity-lift to Sector X: Celestial Aether-Foundry'
      items:
      - Chrono-Spire Core Fragment
      monsters:
      - Archon of the Broken Hour
      - Temporal Sentinel
    sector_10_aether_foundry:
      name: 'Sector X: Celestial Aether-Foundry'
      color: Molten Starlight Forge
      desc: "Cold crucibles await rekindling around an orbital anvil wide enough to forge bridge girders and guild airship keels alike."
      south:
      - sector_9_chrono_spire
      - 'Gravity-lift descending to Sector IX: Sunken Chrono-Spire'
      east:
      - sector_11_void_observatory
      - 'Starlight bridge to Sector XI: The Horizon Void-Observatory'
      items:
      - Astral Alloy Plate
      monsters:
      - Foundry Forgemaster Ignis
      - Molten Slag Automaton
    sector_11_void_observatory:
      name: 'Sector XI: The Horizon Void-Observatory'
      color: Deep-Space Glass Dome
      desc: "Shattered parabolic mirrors reflect distant warm beacons across dark glass catwalks, pointing upward toward the Zenith Throne."
      west:
      - sector_10_aether_foundry
      - 'Starlight bridge back to Sector X: Celestial Aether-Foundry'
      north:
      - sector_12_throne_of_eternity
      - 'Singularity stair ascending to Sector XII: Throne of the Eternal Meridian'
      items:
      - Void-Lens Astrolabe
      monsters:
      - Nebula Weaver Savant
      - Star-Eater Parasite
    sector_12_throne_of_eternity:
      name: 'Sector XII: Throne of the Eternal Meridian'
      color: Golden Astral Zenith
      desc: "Around a simple limestone round-table etched with twelve weathered guild crests—never a solitary throne—stars trace the slow turning of the shared Continuum."
      south:
      - sector_11_void_observatory
      - 'Singularity stair back to Sector XI: Void-Observatory'
      west:
      - astral_rift_conduit
      - Zenith Recall Portal to the Astral Rift Conduit
      items:
      - Crown of the Eternal Continuum
      monsters:
      - Sovereign Chronos-Prime
      - Aetherial Honor Guard
  bestiary:
    Ashen Syndicate Ambush:
      name: Ashen Syndicate Ambush (4 Raiders)
      type: Syndicate Skirmishers
      cr: '1'
      level: 1
      hp: 28
      max_hp: 28
      ac: 14
      speed: 30 ft, Phase-Step
      attacks: Kinetic Blade (+4 to hit, 6 kinetic), Pulse Bow (+4 to hit, 5 kinetic)
      detail: 'Tier 1 Ambush | 4 Raiders | Vitality: 28 | Guard: 14 | Threat 1'
    Aether-Stalker Hound:
      name: Aether-Stalker Hound
      type: Aether Beast
      cr: '1'
      level: 1
      hp: 12
      max_hp: 12
      ac: 13
      speed: 40 ft, Harmonic Scent, Pack Flanking
      attacks: Resonant Jaws (+4 to hit, 6 piercing)
      detail: 'Tier 1 Beast | Vitality: 12 | Guard: 13 | Threat 1'
    Warden Varakh the Ironbound:
      name: Warden Varakh the Ironbound
      type: Syndicate Juggernaut
      cr: '2'
      level: 2
      hp: 28
      max_hp: 28
      ac: 15
      speed: 30 ft, Kinetic Bulwark, Seismic Slam
      attacks: Gravity Maul (+5 to hit, 9 kinetic)
      detail: 'Tier 2 Boss | Vitality: 28 | Guard: 15 | Threat 2'
    Gilded Clockwork Hound:
      name: Gilded Clockwork Hound
      type: Automaton Construct
      cr: '1'
      level: 2
      hp: 16
      max_hp: 16
      ac: 14
      speed: 40 ft, Overdrive Pounce
      attacks: Steel Fangs (+5 to hit, 7 slashing)
      detail: 'Tier 2 Construct | Vitality: 16 | Guard: 14 | Threat 1'
    Sub-Warden Skirmisher:
      name: Sub-Warden Skirmisher
      type: Syndicate Officer
      cr: '1'
      level: 2
      hp: 12
      max_hp: 12
      ac: 14
      speed: 30 ft, Evasive Dash
      attacks: Shock Lash (+4 to hit, 5 volt)
      detail: 'Tier 2 Officer | Vitality: 12 | Guard: 14 | Threat 1'
    Gilded Enforcer Sentry:
      name: Gilded Enforcer Sentry
      type: Syndicate Cutthroat
      cr: '1'
      level: 1
      hp: 12
      max_hp: 12
      ac: 12
      speed: 30 ft
      attacks: Sabre (+3 to hit, 5 slashing), Repeater Crossbow (+3 to hit, 5 piercing)
      detail: 'Tier 1 Sentry | Vitality: 12 | Guard: 12 | Threat 1'
    Gilded Enforcer Squad:
      name: Gilded Enforcer Squad (3 Enforcers)
      type: Syndicate Mercenaries
      cr: '2'
      level: 2
      hp: 33
      max_hp: 33
      ac: 14
      speed: 30 ft, Crossfire Link
      attacks: Twin Sabres (+4 to hit, 6 slashing)
      detail: 'Tier 2 Squad | 3 Enforcers | Vitality: 33 | Guard: 14 | Threat 2'
    Hollow Automaton Wardens:
      name: Hollow Automaton Wardens (3 Automatons)
      type: Ancient Construct
      cr: '1'
      level: 1
      hp: 36
      max_hp: 36
      ac: 13
      speed: 30 ft, Kinetic Plating
      attacks: Ancient Halberd (+4 to hit, 6 slashing)
      detail: 'Tier 1 Construct | Vitality: 36 | Guard: 13 | Threat 1'
    Rift-Gazer Anomaly:
      name: Rift-Gazer Anomaly
      type: Void Entity
      cr: '3'
      level: 3
      hp: 42
      max_hp: 42
      ac: 15
      speed: 30 ft, Chrono-Sight 120 ft, Harmonic Distortion
      attacks: Entropy Beam (9 astral), Rift Claws (+4 to hit, 6 kinetic)
      detail: 'Tier 3 Anomaly | Vitality: 42 | Guard: 15 | Threat 3'
    Arch-Artificer Malakor:
      name: Arch-Artificer Malakor
      type: Renegade Resonator
      cr: '3'
      level: 4
      hp: 26
      max_hp: 26
      ac: 15
      speed: 30 ft, Harmonic Projection
      attacks: Prism Conduit Staff (+5 to hit, 8 astral)
      detail: 'Tier 3 Boss | Vitality: 26 | Guard: 15 | Threat 3'
    Homunculus Phase-Drone:
      name: Homunculus Phase-Drone
      type: Aether Construct
      cr: '1'
      level: 2
      hp: 10
      max_hp: 10
      ac: 13
      speed: 40 ft, Phase Blink
      attacks: Arc Needle (+4 to hit, 4 volt)
      detail: 'Tier 1 Drone | Vitality: 10 | Guard: 13 | Threat 1'
    Volt-Skitter Swarm (Pack of 3):
      name: Volt-Skitter Swarm (Pack of 3)
      type: Canopy Parasites
      cr: '1'
      level: 1
      hp: 15
      max_hp: 15
      ac: 13
      speed: 40 ft, Static Discharge
      attacks: Siphon Mandibles (+4 to hit, 4 volt)
      detail: 'Tier 1 Swarm | Vitality: 15 | Guard: 13 | Threat 1'
    Sky-Citadel Halberdier:
      name: Sky-Citadel Halberdier
      type: Bastion Guard
      cr: '2'
      level: 2
      hp: 16
      max_hp: 16
      ac: 15
      speed: 30 ft, Phalanx Wall
      attacks: Storm Halberd (+4 to hit, 7 slashing)
      detail: 'Tier 2 Guard | Vitality: 16 | Guard: 15 | Threat 2'
    Iron-Plated Goliath:
      name: Iron-Plated Goliath
      type: Siege Titan
      cr: '3'
      level: 3
      hp: 45
      max_hp: 45
      ac: 15
      speed: 35 ft, Crushing Charge
      attacks: Piston Cleaver (+6 to hit, 10 kinetic)
      detail: 'Tier 3 Titan | Vitality: 45 | Guard: 15 | Threat 3'
    High Commander Dravok and his War-Beast:
      name: High Commander Dravok and his War-Beast
      type: Citadel Warlord
      cr: '4'
      level: 4
      hp: 48
      max_hp: 48
      ac: 16
      speed: 30 ft, Sovereign Decree
      attacks: Thunder-Glaive (+6 to hit, 10 kinetic)
      detail: 'Tier 4 Boss | Vitality: 48 | Guard: 16 | Threat 4'
    Mirage Infiltrator Vex:
      name: Mirage Infiltrator Vex
      type: Phase-Shifter Operative
      cr: '3'
      level: 3
      hp: 32
      max_hp: 32
      ac: 15
      speed: 35 ft, Holo-Decoy
      attacks: Phase-Blades (+5 to hit, 8 piercing)
      detail: 'Tier 3 Operative | Vitality: 32 | Guard: 15 | Threat 3'
    Frost-Bound Marauder:
      name: Frost-Bound Marauder
      type: Glacial Raider
      cr: '2'
      level: 2
      hp: 18
      max_hp: 18
      ac: 14
      speed: 30 ft, Rime Cleave
      attacks: Cryo-Greataxe (+5 to hit, 8 cryo)
      detail: 'Tier 2 Raider | Vitality: 18 | Guard: 14 | Threat 2'
    Glacial Behemoth:
      name: Glacial Behemoth
      type: Permafrost Colossus
      cr: '3'
      level: 3
      hp: 44
      max_hp: 44
      ac: 14
      speed: 30 ft, Avalanche Smash
      attacks: Glacier Pillar (+6 to hit, 11 cryo)
      detail: 'Tier 3 Colossus | Vitality: 44 | Guard: 14 | Threat 3'
    Chrono-Weaver Arachnid:
      name: Chrono-Weaver Arachnid
      type: Phase Arachnid
      cr: '2'
      level: 2
      hp: 22
      max_hp: 22
      ac: 14
      speed: 35 ft, Temporal Snare
      attacks: Phase-Venom Fangs (+5 to hit, 7 astral)
      detail: 'Tier 2 Arachnid | Vitality: 22 | Guard: 14 | Threat 2'
    Abyssal Tide-Lurker:
      name: Abyssal Tide-Lurker
      type: Subterranean stalker
      cr: '2'
      level: 2
      hp: 24
      max_hp: 24
      ac: 13
      speed: 30 ft, Hydro-Jet
      attacks: Coral Talons (+4 to hit, 7 slashing)
      detail: 'Tier 2 Stalker | Vitality: 24 | Guard: 13 | Threat 2'
    Vespera the Eclipse Architect:
      name: Vespera the Eclipse Architect
      type: Supreme Void-Weaver
      cr: '5'
      level: 5
      hp: 46
      max_hp: 46
      ac: 16
      speed: 35 ft, Singularity Collapse
      attacks: Eclipse Scepter (+6 to hit, 11 astral)
      detail: 'Tier 5 Supreme Boss | Vitality: 46 | Guard: 16 | Threat 5'
    Solaris Core Sentinel:
      name: Solaris Core Sentinel
      type: Radiant Construct
      cr: '4'
      level: 4
      hp: 36
      max_hp: 36
      ac: 15
      speed: 35 ft, Solar Flare
      attacks: Plasma Lance (+6 to hit, 10 solar)
      detail: 'Tier 4 Sentinel | Vitality: 36 | Guard: 15 | Threat 4'
    Void-Phase Arachnid:
      name: Void-Phase Arachnid
      type: Apex Arachnid
      cr: '3'
      level: 3
      hp: 26
      max_hp: 26
      ac: 15
      speed: 40 ft, Void Tether
      attacks: Null-Fangs (+5 to hit, 8 astral)
      detail: 'Tier 3 Apex Arachnid | Vitality: 26 | Guard: 15 | Threat 3'
    Ashen Syndicate Lookout:
      name: Ashen Syndicate Lookout
      type: Syndicate Scout
      cr: '1'
      level: 1
      hp: 8
      max_hp: 8
      ac: 13
      speed: 30 ft, Camouflage
      attacks: Pulse Bow (+4 to hit, 5 kinetic)
      detail: 'Tier 1 Scout | Vitality: 8 | Guard: 13 | Threat 1'
    Echo-Wraith Resonator:
      name: Echo-Wraith Resonator
      type: Harmonic Specter
      cr: '2'
      level: 2
      hp: 20
      max_hp: 20
      ac: 14
      speed: 35 ft, Phase Glide
      attacks: Sonic Wail (+4 to hit, 7 resonance)
      detail: 'Tier 2 Specter | Vitality: 20 | Guard: 14 | Threat 2'
    Rust-Shell Automaton:
      name: Rust-Shell Automaton
      type: Corroded Construct
      cr: '2'
      level: 2
      hp: 24
      max_hp: 24
      ac: 14
      speed: 25 ft, Heavy Plating
      attacks: Hydraulic Clamp (+5 to hit, 8 kinetic)
      detail: 'Tier 2 Construct | Vitality: 24 | Guard: 14 | Threat 2'
    Aether-Leach Swarm:
      name: Aether-Leach Swarm
      type: Canal Parasites
      cr: '1'
      level: 1
      hp: 14
      max_hp: 14
      ac: 13
      speed: 30 ft, Swim
      attacks: Siphon Bite (+4 to hit, 5 volt)
      detail: 'Tier 1 Swarm | Vitality: 14 | Guard: 13 | Threat 1'
    Basalt Crusher Golem:
      name: Basalt Crusher Golem
      type: Mineral Siege Construct
      cr: '3'
      level: 3
      hp: 38
      max_hp: 38
      ac: 15
      speed: 25 ft, Meteoric Impact
      attacks: Star-Iron Fist (+6 to hit, 10 kinetic)
      detail: 'Tier 3 Golem | Vitality: 38 | Guard: 15 | Threat 3'
    Ashen Excavators (Squad of 3):
      name: Ashen Excavators (Squad of 3)
      type: Syndicate Miners
      cr: '2'
      level: 2
      hp: 26
      max_hp: 26
      ac: 13
      speed: 30 ft
      attacks: Plasma Cutter (+4 to hit, 7 solar)
      detail: 'Tier 2 Squad | Vitality: 26 | Guard: 13 | Threat 2'
    Dreadnought Gunner Captain:
      name: Dreadnought Gunner Captain
      type: Citadel Artillery Officer
      cr: '3'
      level: 3
      hp: 34
      max_hp: 34
      ac: 15
      speed: 30 ft, Suppressing Barrage
      attacks: Rotary Rail-Cannon (+5 to hit, 9 kinetic)
      detail: 'Tier 3 Officer | Vitality: 34 | Guard: 15 | Threat 3'
    Clockwork Bombardier:
      name: Clockwork Bombardier
      type: Ordnance Automaton
      cr: '2'
      level: 2
      hp: 22
      max_hp: 22
      ac: 14
      speed: 30 ft
      attacks: Aether Mortar (+5 to hit, 8 solar)
      detail: 'Tier 2 Construct | Vitality: 22 | Guard: 14 | Threat 2'
    Chrono-Stalker Panther:
      name: Chrono-Stalker Panther
      type: Temporal Predator
      cr: '3'
      level: 3
      hp: 30
      max_hp: 30
      ac: 15
      speed: 45 ft, Time-Skip Pounce
      attacks: Phase Claws (+5 to hit, 8 slashing)
      detail: 'Tier 3 Predator | Vitality: 30 | Guard: 15 | Threat 3'
    Phase-Echo Mirage:
      name: Phase-Echo Mirage
      type: Temporal Anomaly
      cr: '2'
      level: 2
      hp: 18
      max_hp: 18
      ac: 14
      speed: 35 ft
      attacks: Fracture Bolt (+4 to hit, 6 astral)
      detail: 'Tier 2 Anomaly | Vitality: 18 | Guard: 14 | Threat 2'
    Archon of the Broken Hour:
      name: Archon of the Broken Hour
      type: Chrono-Sovereign
      cr: '5'
      level: 5
      hp: 52
      max_hp: 52
      ac: 16
      speed: 35 ft, Pendulum Reversal
      attacks: Halberd of Stolen Seconds (+7 to hit, 12 astral)
      detail: 'Tier 5 Boss | Vitality: 52 | Guard: 16 | Threat 5'
    Temporal Sentinel:
      name: Temporal Sentinel
      type: Chrono-Construct
      cr: '3'
      level: 3
      hp: 28
      max_hp: 28
      ac: 15
      speed: 30 ft
      attacks: Chrono-Pike (+5 to hit, 8 kinetic)
      detail: 'Tier 3 Sentinel | Vitality: 28 | Guard: 15 | Threat 3'
    Foundry Forgemaster Ignis:
      name: Foundry Forgemaster Ignis
      type: Starforge Titan
      cr: '5'
      level: 5
      hp: 56
      max_hp: 56
      ac: 16
      speed: 30 ft, Solar Anvil Strike
      attacks: Star-Hammer (+7 to hit, 13 solar)
      detail: 'Tier 5 Boss | Vitality: 56 | Guard: 16 | Threat 5'
    Molten Slag Automaton:
      name: Molten Slag Automaton
      type: Thermal Construct
      cr: '3'
      level: 3
      hp: 30
      max_hp: 30
      ac: 14
      speed: 25 ft
      attacks: Magma Jet (+5 to hit, 9 solar)
      detail: 'Tier 3 Construct | Vitality: 30 | Guard: 14 | Threat 3'
    Nebula Weaver Savant:
      name: Nebula Weaver Savant
      type: Astral Astromancer
      cr: '5'
      level: 5
      hp: 48
      max_hp: 48
      ac: 16
      speed: 35 ft, Gravity Well
      attacks: Quasar Orb (+7 to hit, 12 astral)
      detail: 'Tier 5 Savant | Vitality: 48 | Guard: 16 | Threat 5'
    Star-Eater Parasite:
      name: Star-Eater Parasite
      type: Void Entity
      cr: '3'
      level: 3
      hp: 26
      max_hp: 26
      ac: 15
      speed: 40 ft
      attacks: Entropy Mandibles (+5 to hit, 8 astral)
      detail: 'Tier 3 Entity | Vitality: 26 | Guard: 15 | Threat 3'
    Sovereign Chronos-Prime:
      name: Sovereign Chronos-Prime
      type: Apex Continuum Architect
      cr: '6'
      level: 6
      hp: 65
      max_hp: 65
      ac: 17
      speed: 40 ft, Horizon Convergence
      attacks: Blade of the First Meridian (+8 to hit, 15 astral)
      detail: 'Tier 6 Apex Boss | Vitality: 65 | Guard: 17 | Threat 6'
    Aetherial Honor Guard:
      name: Aetherial Honor Guard
      type: Zenith Paladin
      cr: '4'
      level: 4
      hp: 36
      max_hp: 36
      ac: 16
      speed: 35 ft
      attacks: Zenith Greatsword (+6 to hit, 10 solar)
      detail: 'Tier 4 Guard | Vitality: 36 | Guard: 16 | Threat 4'
  loot_tables:
    Ashen Syndicate Ambush:
      cr: '1'
      difficulty: Syndicate Skirmish
      sovereign_marks: 18
      aether_shards: 12
      currency: gp
      guaranteed_items: []
      deterministic_gear:
      - Syndicate Pulse Shortbow (Range 650, +1 Flow)
      - Harmonic Aether Cell
    Warden Varakh the Ironbound:
      cr: '2'
      difficulty: Bastion Warden
      sovereign_marks: 45
      aether_shards: 25
      currency: gp
      guaranteed_items:
      - Meridian Brass Cipher
      deterministic_gear:
      - Varakh's Gravity Maul (+2 Forge, Seismic Impact)
      - Aegis Capacitor Core
    Gilded Enforcer Squad:
      cr: '2'
      difficulty: Enforcer Garrison
      sovereign_marks: 32
      aether_shards: 18
      currency: gp
      guaranteed_items: []
      deterministic_gear:
      - Gilded Enforcer Sabre (+1 Flow)
      - Harmonic Aether Cell
    Arch-Artificer Malakor:
      cr: '3'
      difficulty: Loom Mastermind
      sovereign_marks: 65
      aether_shards: 40
      currency: gp
      guaranteed_items:
      - Loom Resonance Signet
      deterministic_gear:
      - Malakor's Prism Conduit Staff (+2 Aether, Harmonic Beam)
      - Phase-Step Cloak
    High Commander Dravok and his War-Beast:
      cr: '4'
      difficulty: Citadel Warlord
      sovereign_marks: 95
      aether_shards: 55
      currency: gp
      guaranteed_items:
      - Astral Compass Key
      deterministic_gear:
      - Dravok's Thunder-Glaive (+2 Forge, Extended Reach)
      - Sky-Citadel Star Map
    Vespera the Eclipse Architect:
      cr: '5'
      difficulty: Eclipse Architect
      sovereign_marks: 150
      aether_shards: 90
      currency: gp
      guaranteed_items:
      - Prime Solaris Core
      deterministic_gear:
      - Scepter of the Eclipsed Sun (+3 Aether, Apex Nova)
      - Crown of Harmonic Convergence
  events:
    wrecked_convoy_investigation:
      room: windglass_causeway
      name: Ashen Syndicate Convoy Ambush
      description: Investigating the wrecked Aether-Rig convoy or approaching it triggers Ashen Syndicate raiders springing from the crystalline ridges.
      trigger:
        command_patterns:
        - .*investigat.*rig.*
        - .*examin.*rig.*
        - .*look.*rig.*
        - .*check.*rig.*
        - .*search.*rig.*
        - .*investigat.*convoy.*
        - .*examin.*convoy.*
        - .*investigat.*wagon.*
        - .*investigat.*horse.*
        proximity:
          obstacle_keywords:
          - rig
          - convoy
          center:
          - 560
          - 390
          radius: 95
      actions:
        spawn_monsters:
        - Ashen Syndicate Ambush
        battle_mode: true
        scene_change: windglass_causeway_ambush.png
        message: Pry open the frost-sealed rig hatch and insulated cell crates tumble out empty—Siphoned, not smashed. Sharp bone-whistles snap from the windglass ridge as shivering Syndicate scavengers drop into firing lanes for the remaining tanks!
    rift_gazer_resonance:
      room: sub_vault_catacombs
      name: Rift-Gazer Chrono-Pulse
      description: Examining the glowing aether rift in the catacombs triggers the Rift-Gazer's harmonic resonance.
      trigger:
        command_patterns:
        - .*examin.*rift.*
        - .*look.*rift.*
        - .*investigat.*crevasse.*
        - .*investigat.*pit.*
        proximity:
          center:
          - 580
          - 480
          radius: 80
      actions:
        message: 'Cold glass chimes vibrate through your gauntlets—showing a brief double-exposure of Solhaven both dark in ice and burning in solar flare before the Rift-Gazer unfolds from the fissure.'
    wooden_blade_memorial:
      room: windglass_causeway
      name: Cedarhollow Courier Blade
      description: Inspecting the child's wooden blade beside the split buckler reveals its Cedarhollow courier tag.
      trigger:
        command_patterns:
        - .*(?:examin|inspect|look|check|investigat|study|read).*(?:blade|wooden|buckler|child).*
      actions:
        message: 'Tied to the pine hilt is a brass Cedarhollow apprentice tag stamped with a sunburst. Whoever carried the buckler stood between the convoy raiders and an empty shelter wagon.'
    solhaven_astrolabe_chime:
      room: solhaven_plaza
      name: Meridian Astrolabe Grid Projection
      description: Examining or approaching the Solaris Meridian Astrolabe Fountain reveals which wards have gone dark.
      trigger:
        command_patterns:
        - .*(?:examin|inspect|look|check|investigat|study|read).*(?:astrolabe|fountain|projection).*
        proximity:
          obstacle_keywords:
          - astrolabe
          - fountain
          center:
          - 512
          - 382
          radius: 95
      actions:
        message: 'Amber ley-lines shimmer above the brass rings: outer wards to the west and north blink dark one by one, while a single violet bypass pulse thrums deep beneath Observatory Bluff.'
    reliquary_ration_ledger:
      room: sunken_reliquary
      name: Varakh's Shelter Ration Ledger
      description: Inspecting the cistern crates or miners' boots uncovers Varakh's ration records.
      trigger:
        command_patterns:
        - .*(?:examin|inspect|look|check|investigat|study|read).*(?:ledger|crate|cistern|boot|ration).*
      actions:
        message: 'Inside the cistern ledger, every diverted Aether Cell is logged down to the wick beside children''s boot sizes and foundry shifts—Varakh never kept a single coin for himself.'
    loom_denied_petitions:
      room: alchemical_loom
      name: Vespera's Blue-Ink Margin Notes
      description: Examining Malakor's denied grid petitions reveals Vespera's handwriting in the margins.
      trigger:
        command_patterns:
        - .*(?:examin|inspect|look|check|investigat|study|read).*(?:petition|workbench|shunt|blueprint|margin).*
      actions:
        message: 'Beneath three stamped Council rejections sits a schematic in crisp blue ink: "Bleed the surge into the deep loom—Solhaven must never witness another Cedarhollow." Signed simply: V.'
    war_hall_evacuation_slate:
      room: sovereign_war_hall
      name: Citadel High-Altitude Evacuation Slate
      description: Inspecting Dravok's slate relief map reveals which towns were written off.
      trigger:
        command_patterns:
        - .*(?:examin|inspect|look|check|investigat|study|read).*(?:slate|relief|evacuat).*
      actions:
        message: 'Chalk rings encircle only the upper cliff bastions; Windglass, Thornmire, and Solhaven''s lower docks are struck through with dates marking projected grid collapse.'
    starforge_cedar_scars:
      room: heart_of_the_starforge
      name: Echoes of the First Ignition
      description: Inspecting the stasis rings or charred cedar rafters reveals why Vespera chose eternal frost.
      trigger:
        command_patterns:
        - .*(?:examin|inspect|look|check|investigat|study|read).*(?:stasis|crucible|scar|cedar|ring).*
      actions:
        message: 'Fused inside the crucible''s outer brass ring is a row of charred cedar house-keys—relics Vespera carried out of Cedarhollow the night the First Ignition ran unchecked.'
    sunspire_heliograph_log:
      room: sunspire_watchtower
      name: Unanswered Heliograph Pulse
      description: Inspecting the crooked heliograph gimbals reveals the last signal from Verdigris Aqueduct.
      trigger:
        command_patterns:
        - .*(?:examin|inspect|look|check|investigat|study|read).*(?:mirror|prism|gimbal|heliograph).*
      actions:
        message: 'A brass shutter-tape loops endlessly on the cracked mirror frame: "AQUEDUCT FREEZING—HOLD SOLHAVEN HEAT—ANY SQUAD READING THIS, WE STAYED AT THE SLUICE."'
    dreadnought_hull_conversion:
      room: obsidian_dreadnought_berth
      name: Shipyard Relief Markings
      description: Inspecting the Leviathan hull plates reveals quiet sabotage by the berth crew.
      trigger:
        command_patterns:
        - .*(?:examin|inspect|look|check|investigat|study|read).*(?:hull|plate|crane|leviathan|berth).*
      actions:
        message: 'Underneath Dravok''s crimson squadron paint, dockworkers chalked fresh cargo tonnage numbers across the bomb racks—already measuring the Sky-Dreadnought for grain sacks.'
    eternal_roundtable_oath:
      room: sector_12_throne_of_eternity
      name: The Twelve-Crest Round-Table
      description: Examining the limestone round-table reveals the founding oath of the Continuum.
      trigger:
        command_patterns:
        - .*(?:examin|inspect|look|check|investigat|study|read).*(?:table|round.?table|crest|limestone).*
      actions:
        message: 'Twelve worn tool-marks—a miner''s pick, a weaver''s prism, a courier''s horn, a lantern-hook—ring the limestone edge around one shared inscription: "NO SINGLE CROWN KEEPS THE SUN LIT."'
  storyline_chapters:
    chapter_1_silent_spire:
      title: 'Chapter 1: Fuel Cartels & The Sunken Reliquary'
      completion_trigger:
        slain_monsters:
        - Ashen Syndicate Ambush
        - Warden Varakh the Ironbound
        has_items:
        - Meridian Brass Cipher
      actions:
        broadcast_message: '>>> [CHAPTER 1 COMPLETE — CEDARHOLLOW''S TRAIL]: Varakh''s Reliquary ledger proves the hijacked cells warmed trapped miners, not profiteers. With the Meridian Brass Cipher in hand, Solhaven''s western fuel lanes reopen toward a deeper truth.'
        award_bonus_item: Harmonic Aether Cell
        trigger_state: solhaven_secured
    chapter_2_alchemical_loom:
      title: 'Chapter 2: The Conservatory Grid & Alchemical Loom'
      completion_trigger:
        slain_monsters:
        - Gilded Enforcer Squad
        - Arch-Artificer Malakor
        has_items:
        - Loom Resonance Signet
      actions:
        broadcast_message: '>>> [CHAPTER 2 COMPLETE — SHUNTS IN BLUE INK]: Malakor''s Loom stands stabilized and Harbor Watch rations resume—yet Vespera''s blue-ink margin notes reveal she taught him to bypass Solhaven before vanishing north toward Vaelen''s Reach.'
        award_bonus_item: Chrono-Step Capacitor
        trigger_state: citadel_path_revealed
    chapter_3_vaelens_reach:
      title: 'Chapter 3: The Sky-Citadel of Vaelen''s Reach'
      completion_trigger:
        slain_monsters:
        - High Commander Dravok and his War-Beast
        has_items:
        - Astral Compass Key
      actions:
        broadcast_message: '>>> [CHAPTER 3 COMPLETE — THE LOWLANDS SHALL NOT BE ABANDONED]: Dravok''s elitist evacuation lock shatters alongside his storm-pylons. With the Astral Compass Key secured, your vanguard descends into Frostspire Pass to answer Vespera''s fear at its root.'
        award_bonus_item: Graviton Strider Greaves
        trigger_state: starforge_unsealed
    chapter_4_eclipsed_starforge:
      title: 'Chapter 4: Heart of the Starforge (Balance vs. Stasis)'
      completion_trigger:
        slain_monsters:
        - Vespera the Eclipse Architect
        has_items:
        - Prime Solaris Core
      actions:
        broadcast_message: '>>> [CHAPTER 4 COMPLETE — FIRE WITHOUT ASHES]: Vespera''s stasis rings part cleanly above Cedarhollow''s charred cedar relics. Carrying the balanced Prime Solaris Core, you prove warmth can be shared without burning—and the Astral Conduit opens wide!'
        award_bonus_item: Scepter of the Eclipsed Sun
        trigger_state: campaign_climax
        expand_world: true
    chapter_5_sunspire_reclamation:
      title: 'Chapter 5: The Sunspire Beacon & Verdigris Aqueducts'
      completion_trigger:
        slain_monsters:
        - Echo-Wraith Resonator
        - Rust-Shell Automaton
        has_items:
        - Solaris Prism Shard
      actions:
        broadcast_message: '>>> [CHAPTER 5 COMPLETE — SIGNAL ACROSS THE TENEMENTS]: Sunspire''s heliograph locks true onto Solhaven''s dome while thawed aqueducts surge warm water back through the Lower Dock pipes.'
        award_bonus_item: Sunspire Vanguard Crest
        trigger_state: sunspire_restored
    chapter_6_sky_dreadnought:
      title: 'Chapter 6: Relief Conversion at the Obsidian Sky-Dreadnought Berth'
      completion_trigger:
        slain_monsters:
        - Basalt Crusher Golem
        - Dreadnought Gunner Captain
        has_items:
        - Dreadnought Ignition Coil
      actions:
        broadcast_message: '>>> [CHAPTER 6 COMPLETE — WARSHIP TO GRAIN-ARK]: With Dravok''s gunnery deck stood down, berth riggers strip the cannons from the Obsidian Sky-Dreadnought—launching the first relief galleon loaded with Star-Iron and winter grain.'
        award_bonus_item: Dreadnought Kinetic Pauldrons
        trigger_state: dreadnought_secured
    chapter_7_chrono_spire:
      title: 'Chapter 7: Beyond the Rift — The Sunken Chrono-Spire & Celestial Foundry'
      completion_trigger:
        slain_monsters:
        - Archon of the Broken Hour
        - Foundry Forgemaster Ignis
        has_items:
        - Chrono-Spire Core Fragment
        - Astral Alloy Plate
      actions:
        broadcast_message: '>>> [CHAPTER 7 COMPLETE — THE PENDULUM RESTARTS]: Beyond the Rift, time resumes inside the Chrono-Spire and Forgemaster Ignis''s orbital crucibles glow once more—forging bridge keels for every Concordat camp instead of siege hulls.'
        award_bonus_item: Star-Forged Aegis Greatsword
        trigger_state: foundry_relit
    chapter_8_eternal_meridian:
      title: 'Chapter 8: Zenith of the Eternal Meridian & Guild Horizon'
      completion_trigger:
        slain_monsters:
        - Sovereign Chronos-Prime
        has_items:
        - Crown of the Eternal Continuum
      actions:
        broadcast_message: '>>> [CHAPTER 8 COMPLETE — TWELVE CRESTS, ONE SKY]: At the limestone Round-Table of Sector XII, Sovereign Chronos-Prime steps aside to name the Concordat Guild stewards of the Eternal Meridian. Command ''expand continuum'' anytime to chart the next horizon!'
        award_bonus_item: Mantle of the Continuum Sovereign
        trigger_state: eternal_meridian_mastered
        expand_world: true
  room_bounds:
    windglass_causeway:
      width: 1024
      height: 768
      spawn:
      - 220
      - 390
      obstacles:
      - name: Wrecked Aether-Rig Convoy
        rect:
        - 520
        - 355
        - 85
        - 65
      - name: Windglass Crystal Monolith
        rect:
        - 310
        - 180
        - 64
        - 64
      portals:
      - direction: north
        target: thornmire_ravine
        name: A jagged canyon trail ascending into Thornmire Ravine
        rect: &id001
        - 450
        - 0
        - 124
        - 48
        target_spawn: &id002
        - 512
        - 680
      - direction: east
        target: solhaven_plaza
        name: The paved meridian highway leading east to Solhaven Sovereign Plaza
        rect: &id005
        - 976
        - 320
        - 48
        - 128
        target_spawn: &id006
        - 90
        - 384
    thornmire_ravine:
      width: 1024
      height: 768
      spawn:
      - 512
      - 620
      obstacles: []
      portals:
      - direction: north
        target: sunken_reliquary
        name: The echoing stone archway of the Sunken Reliquary
        rect: *id001
        target_spawn: *id002
      - direction: south
        target: windglass_causeway
        name: Return south down to Windglass Causeway
        rect: &id003
        - 450
        - 720
        - 124
        - 48
        target_spawn: &id004
        - 512
        - 90
    sunken_reliquary:
      width: 1024
      height: 768
      spawn:
      - 512
      - 620
      obstacles: []
      portals:
      - direction: south
        target: thornmire_ravine
        name: Exit south to Thornmire Ravine
        rect: *id003
        target_spawn: *id004
    solhaven_plaza:
      width: 1024
      height: 768
      spawn:
      - 512
      - 620
      obstacles:
      - name: Solaris Meridian Astrolabe Fountain
        rect:
        - 475
        - 345
        - 75
        - 75
      portals:
      - direction: north
        target: sunspire_watchtower
        name: Brass lift ascending to Sunspire Signal Watchtower
        rect: *id001
        target_spawn: *id002
      - direction: south
        target: observatory_bluff
        name: Steep stepped avenue ascending to Observatory Bluff
        rect: *id003
        target_spawn: *id004
      - direction: east
        target: brass_lantern_conservatory
        name: Ornamental archway into The Brass Lantern Conservatory
        rect: *id005
        target_spawn: *id006
      - direction: west
        target: windglass_causeway
        name: West highway back to Windglass Causeway
        rect: &id007
        - 0
        - 320
        - 48
        - 128
        target_spawn: &id008
        - 930
        - 384
    brass_lantern_conservatory:
      width: 1024
      height: 768
      spawn:
      - 512
      - 620
      obstacles: []
      portals:
      - direction: north
        target: windglass_causeway
        name: Overland shortcut back to the Windglass Causeway
        rect: *id001
        target_spawn: *id002
      - direction: west
        target: solhaven_plaza
        name: West exit to Solhaven Sovereign Plaza
        rect: *id007
        target_spawn: *id008
    observatory_bluff:
      width: 1024
      height: 768
      spawn:
      - 512
      - 620
      obstacles: []
      portals:
      - direction: north
        target: solhaven_plaza
        name: Downhill avenue back to Solhaven Sovereign Plaza
        rect: *id001
        target_spawn: *id002
      - direction: south
        target: sub_vault_catacombs
        name: Spiral bronze stair descending into the Sub-Vault Catacombs
        rect: *id003
        target_spawn: *id004
    sub_vault_catacombs:
      width: 1024
      height: 768
      spawn:
      - 512
      - 620
      obstacles:
      - name: Luminous Aether Rift Fissure
        rect:
        - 540
        - 440
        - 90
        - 70
      portals:
      - direction: north
        target: observatory_bluff
        name: Stairway ascending to Observatory Bluff
        rect: *id001
        target_spawn: *id002
      - direction: south
        target: alchemical_loom
        name: Harmonic sealed gateway to The Alchemical Loom (requires Meridian Brass Cipher)
        rect: *id003
        target_spawn: *id004
      - direction: up
        target: observatory_bluff
        name: Stairway ascending to Observatory Bluff
        rect:
        - 260
        - 0
        - 110
        - 48
        target_spawn:
        - 512
        - 650
    alchemical_loom:
      width: 1024
      height: 768
      spawn:
      - 512
      - 620
      obstacles: []
      portals:
      - direction: north
        target: sub_vault_catacombs
        name: Exit north to Sub-Vault Catacombs
        rect: *id001
        target_spawn: *id002
      - direction: east
        target: whisperwood_canopy
        name: Hidden phase-conduit tunnel emerging at Whisperwood Canopy
        rect: *id005
        target_spawn: *id006
    whisperwood_canopy:
      width: 1024
      height: 768
      spawn:
      - 512
      - 620
      obstacles: []
      portals:
      - direction: north
        target: citadel_bastion_courtyard
        name: Suspension sky-bridge to Vaelen's Reach Bastion Courtyard
        rect: *id001
        target_spawn: *id002
      - direction: south
        target: solhaven_plaza
        name: Valley descent trail returning to Solhaven Sovereign Plaza
        rect: *id003
        target_spawn: *id004
      - direction: east
        target: chrono_monolith_glade
        name: Luminous trail into the Chrono-Monolith Fracture Glade
        rect: *id005
        target_spawn: *id006
      - direction: west
        target: alchemical_loom
        name: Phase-conduit back into The Alchemical Loom
        rect: *id007
        target_spawn: *id008
      - direction: down
        target: ashfall_quarry
        name: Rocky descent to the Ashfall Meteorite Quarry
        rect:
        - 260
        - 720
        - 110
        - 48
        target_spawn:
        - 512
        - 110
    citadel_bastion_courtyard:
      width: 1024
      height: 768
      spawn:
      - 512
      - 620
      obstacles: []
      portals:
      - direction: north
        target: sovereign_war_hall
        name: Kinetic barrier gate to the Sovereign War-Hall (requires Loom Resonance Signet)
        rect: *id001
        target_spawn: *id002
      - direction: south
        target: whisperwood_canopy
        name: Sky-bridge south to Whisperwood Canopy
        rect: *id003
        target_spawn: *id004
    sovereign_war_hall:
      width: 1024
      height: 768
      spawn:
      - 512
      - 620
      obstacles: []
      portals:
      - direction: south
        target: citadel_bastion_courtyard
        name: Exit south to Bastion Courtyard
        rect: *id003
        target_spawn: *id004
      - direction: east
        target: frostspire_pass
        name: High-altitude wind-tunnel leading to Frostspire Pass
        rect: *id005
        target_spawn: *id006
    frostspire_pass:
      width: 1024
      height: 768
      spawn:
      - 512
      - 620
      obstacles: []
      portals:
      - direction: north
        target: whisperwood_canopy
        name: Mountain switchback returning to Whisperwood Canopy
        rect: *id001
        target_spawn: *id002
      - direction: south
        target: tidal_resonance_caverns
        name: Glacial elevator descending into the Tidal Resonance Caverns
        rect: *id003
        target_spawn: *id004
      - direction: west
        target: sovereign_war_hall
        name: Passage back into the Sovereign War-Hall
        rect: *id007
        target_spawn: *id008
    tidal_resonance_caverns:
      width: 1024
      height: 768
      spawn:
      - 512
      - 620
      obstacles: []
      portals:
      - direction: north
        target: frostspire_pass
        name: Ascent back to Frostspire Pass
        rect: *id001
        target_spawn: *id002
      - direction: south
        target: heart_of_the_starforge
        name: Celestial iris gate to the Heart of the Starforge (requires Astral Compass Key)
        rect: *id003
        target_spawn: *id004
    heart_of_the_starforge:
      width: 1024
      height: 768
      spawn:
      - 512
      - 620
      obstacles:
      - name: Prime Solaris Crucible Ring
        rect:
        - 460
        - 280
        - 100
        - 100
      portals:
      - direction: north
        target: tidal_resonance_caverns
        name: Iris portal back out to Tidal Resonance Caverns
        rect: *id001
        target_spawn: *id002
    sunspire_watchtower:
      width: 1024
      height: 768
      spawn:
      - 512
      - 620
      obstacles: []
      portals:
      - direction: south
        target: solhaven_plaza
        name: Descend the brass lift back to Solhaven Sovereign Plaza
        rect: *id003
        target_spawn: *id004
      - direction: east
        target: verdigris_aqueduct
        name: Elevated stone causeway crossing to Verdigris Aqueduct
        rect: *id005
        target_spawn: *id006
    verdigris_aqueduct:
      width: 1024
      height: 768
      spawn:
      - 512
      - 620
      obstacles: []
      portals:
      - direction: south
        target: brass_lantern_conservatory
        name: Subterranean service stair into The Brass Lantern Conservatory
        rect: *id003
        target_spawn: *id004
      - direction: west
        target: sunspire_watchtower
        name: Elevated causeway returning to Sunspire Watchtower
        rect: *id007
        target_spawn: *id008
    ashfall_quarry:
      width: 1024
      height: 768
      spawn:
      - 512
      - 620
      obstacles: []
      portals:
      - direction: north
        target: obsidian_dreadnought_berth
        name: Heavy rail-tunnel leading to the Obsidian Dreadnought Berth
        rect: *id001
        target_spawn: *id002
      - direction: east
        target: whisperwood_canopy
        name: Forest trail back to Whisperwood Silver Canopy
        rect: *id005
        target_spawn: *id006
    obsidian_dreadnought_berth:
      width: 1024
      height: 768
      spawn:
      - 512
      - 620
      obstacles: []
      portals:
      - direction: south
        target: ashfall_quarry
        name: Rail-tunnel south to Ashfall Meteorite Quarry
        rect: *id003
        target_spawn: *id004
      - direction: east
        target: citadel_bastion_courtyard
        name: Docking gangway to Vaelen's Reach Bastion Courtyard
        rect: *id005
        target_spawn: *id006
    chrono_monolith_glade:
      width: 1024
      height: 768
      spawn:
      - 512
      - 620
      obstacles: []
      portals:
      - direction: north
        target: astral_rift_conduit
        name: Glowing dimensional threshold to the Astral Rift Conduit
        rect: *id001
        target_spawn: *id002
      - direction: west
        target: whisperwood_canopy
        name: Silver path back to Whisperwood Canopy
        rect: *id007
        target_spawn: *id008
    astral_rift_conduit:
      width: 1024
      height: 768
      spawn:
      - 512
      - 620
      obstacles: []
      portals:
      - direction: north
        target: sector_9_chrono_spire
        name: 'Uncharted Continuum Gate leading to Sector IX: The Sunken Chrono-Spire'
        rect: *id001
        target_spawn: *id002
      - direction: south
        target: chrono_monolith_glade
        name: Step back through the threshold to Chrono-Monolith Glade
        rect: *id003
        target_spawn: *id004
      - direction: west
        target: solhaven_plaza
        name: Direct Astral Slipstream portal back to Solhaven Sovereign Plaza
        rect: *id007
        target_spawn: *id008
    sector_9_chrono_spire:
      width: 1024
      height: 768
      spawn:
      - 512
      - 620
      obstacles: []
      portals:
      - direction: north
        target: sector_10_aether_foundry
        name: 'Ascending gravity-lift to Sector X: Celestial Aether-Foundry'
        rect: *id001
        target_spawn: *id002
      - direction: south
        target: astral_rift_conduit
        name: Return south to the Astral Rift Conduit
        rect: *id003
        target_spawn: *id004
    sector_10_aether_foundry:
      width: 1024
      height: 768
      spawn:
      - 512
      - 620
      obstacles: []
      portals:
      - direction: south
        target: sector_9_chrono_spire
        name: 'Gravity-lift descending to Sector IX: Sunken Chrono-Spire'
        rect: *id003
        target_spawn: *id004
      - direction: east
        target: sector_11_void_observatory
        name: 'Starlight bridge to Sector XI: The Horizon Void-Observatory'
        rect: *id005
        target_spawn: *id006
    sector_11_void_observatory:
      width: 1024
      height: 768
      spawn:
      - 512
      - 620
      obstacles: []
      portals:
      - direction: north
        target: sector_12_throne_of_eternity
        name: 'Singularity stair ascending to Sector XII: Throne of the Eternal Meridian'
        rect: *id001
        target_spawn: *id002
      - direction: west
        target: sector_10_aether_foundry
        name: 'Starlight bridge back to Sector X: Celestial Aether-Foundry'
        rect: *id007
        target_spawn: *id008
    sector_12_throne_of_eternity:
      width: 1024
      height: 768
      spawn:
      - 512
      - 620
      obstacles: []
      portals:
      - direction: south
        target: sector_11_void_observatory
        name: 'Singularity stair back to Sector XI: Void-Observatory'
        rect: *id003
        target_spawn: *id004
      - direction: west
        target: astral_rift_conduit
        name: Zenith Recall Portal to the Astral Rift Conduit
        rect: *id007
        target_spawn: *id008
  extractable_items:
  - id: windglass_causeway:Kinetic Rail-Bolts
    room: windglass_causeway
    allowed_rooms:
    - windglass_causeway
    item_name: Kinetic Rail-Bolts (x5)
    trigger_words:
    - bolt
    - bolts
    - rail-bolt
    - arrows
    - ammunition
    fixture_keywords:
    - rig
    - convoy
    - wreckage
    - chassis
    success_message: You salvage 5 intact Kinetic Rail-Bolts from the punctured armor plating of the Aether-Rig.
    already_taken_message: You have already salvaged the Kinetic Rail-Bolts from the Aether-Rig.
  - id: windglass_causeway:Harmonic Aether Cell
    room: windglass_causeway
    allowed_rooms:
    - windglass_causeway
    item_name: Harmonic Aether Cell
    trigger_words:
    - cell
    - capacitor
    - battery
    - aether cell
    fixture_keywords:
    - rig
    - convoy
    - engine
    success_message: You uncouple a charged Harmonic Aether Cell from the rig's auxiliary housing.
    already_taken_message: You already extracted the Harmonic Aether Cell from the rig.
  - id: solhaven_plaza:Cedarhollow Relief Seal
    room: solhaven_plaza
    allowed_rooms:
    - solhaven_plaza
    item_name: Cedarhollow Relief Seal
    trigger_words:
    - relief seal
    - cedarhollow seal
    - seal
    - emblem
    fixture_keywords:
    - astrolabe
    - fountain
    success_message: You lift a soot-darkened Cedarhollow Relief Seal tucked beneath the Astrolabe Fountain's brass rim.
    already_taken_message: You already recovered the Cedarhollow Relief Seal from the Astrolabe Fountain.
  hero_archetypes:
  - name: Aegis Vanguard
    species: Solarborn
    class: Vanguard (Bastion)
    level: 1
    xp: 0
    next_level_xp: 300
    hp: 36
    max_hp: 36
    ac: 18
    speed: 30
    hit_dice: 3 Aether Cells
    hit_dice_remaining: 3
    languages: &id009
    - Concordat Common
    - Kharzadic
    weapon: Sun-Forged Longblade
    armor: Solaris Bastion Plate & Aegis Shield
    abilities: &id010
      FORGE:
        score: 16
        mod: 3
      FLOW:
        score: 14
        mod: 2
      AEGIS:
        score: 16
        mod: 3
      AETHER:
        score: 12
        mod: 1
      INSIGHT:
        score: 14
        mod: 2
      CHORUS:
        score: 14
        mod: 2
      STR:
        score: 16
        mod: 3
      DEX:
        score: 14
        mod: 2
      CON:
        score: 16
        mod: 3
      INT:
        score: 12
        mod: 1
      WIS:
        score: 14
        mod: 2
      CHA:
        score: 14
        mod: 2
    skills: &id011
    - Kinetic Bulwark (+5)
    - Vector Interception (+5)
    - Shield Breaker (+5)
    features_2024: &id012
    - Aegis Surge (Restore 12 Vitality & +35 Momentum)
    - Bastion Stance (+2 Guard & Poise Immunity)
    - Apex Kinetic Cleave (2.0x Finisher at 100 Momentum)
    spells_and_powers: &id013
    - Kinetic Shockwave
    - Bastion Phalanx
    wealth: &id014
      gp: 25
      sp: 10
      cp: 0
  - name: Horizon Strider
    species: Vaelorin
    class: Strider (Marksman)
    level: 1
    xp: 0
    next_level_xp: 300
    hp: 32
    max_hp: 32
    ac: 16
    speed: 35
    hit_dice: 3 Aether Cells
    hit_dice_remaining: 3
    languages:
    - Concordat Common
    - Vaelorin
    weapon: Meridian Pulse-Bow
    armor: Windglass Brigandine
    abilities:
      FORGE:
        score: 12
        mod: 1
      FLOW:
        score: 18
        mod: 4
      AEGIS:
        score: 14
        mod: 2
      AETHER:
        score: 14
        mod: 2
      INSIGHT:
        score: 16
        mod: 3
      CHORUS:
        score: 12
        mod: 1
      STR:
        score: 12
        mod: 1
      DEX:
        score: 18
        mod: 4
      CON:
        score: 14
        mod: 2
      INT:
        score: 14
        mod: 2
      WIS:
        score: 16
        mod: 3
      CHA:
        score: 12
        mod: 1
    skills:
    - Ballistic Calibration (+6)
    - Ridge Stealth (+6)
    - Chrono-Tracking (+5)
    features_2024:
    - Sweet-Spot Mastery (+35% Ranged Optimal Band Damage)
    - Vector Pinning Shot
    - Gale-Step Reposition
    spells_and_powers:
    - Target Lock Telemetry
    - Ricochet Pulse Volley
    wealth:
      gp: 25
      sp: 10
      cp: 0
  - name: Sol-Cantor Arbiter
    species: Kharzadic
    class: Arbiter (Harmonic)
    level: 1
    xp: 0
    next_level_xp: 300
    hp: 34
    max_hp: 34
    ac: 18
    speed: 30
    hit_dice: 3 Aether Cells
    hit_dice_remaining: 3
    languages:
    - Concordat Common
    - Kharzadic
    - Astral-Cant
    weapon: Resonance Gavel
    armor: Choral Sun-Mail & Sanctum Buckler
    abilities:
      FORGE:
        score: 14
        mod: 2
      FLOW:
        score: 12
        mod: 1
      AEGIS:
        score: 16
        mod: 3
      AETHER:
        score: 16
        mod: 3
      INSIGHT:
        score: 18
        mod: 4
      CHORUS:
        score: 16
        mod: 3
      STR:
        score: 14
        mod: 2
      DEX:
        score: 12
        mod: 1
      CON:
        score: 16
        mod: 3
      INT:
        score: 16
        mod: 3
      WIS:
        score: 18
        mod: 4
      CHA:
        score: 16
        mod: 3
    skills:
    - Harmonic Restoration (+6)
    - Resonance Lore (+5)
    - Concordat Diplomacy (+5)
    features_2024:
    - Choral Renewal (Deterministic Party Vitality Pulse)
    - Solaris Ward
    - Harmonic Judgement
    spells_and_powers:
    - Solaris Flare
    - Harmonic Mend
    - Aegis Resonance
    - Sunburst Convergence
    wealth:
      gp: 25
      sp: 10
      cp: 0
  - name: Veilblade Rogue
    species: Sylphic
    class: Rogue (Veilblade Stalker)
    level: 1
    xp: 0
    next_level_xp: 300
    hp: 30
    max_hp: 30
    ac: 16
    speed: 40
    hit_dice: 3 Aether Cells
    hit_dice_remaining: 3
    languages:
    - Concordat Common
    - Sylphic
    - Shadow-Cipher
    weapon: Twin Phase-Daggers
    armor: Mirage Weave Leathers
    abilities:
      FORGE:
        score: 12
        mod: 1
      FLOW:
        score: 18
        mod: 4
      AEGIS:
        score: 14
        mod: 2
      AETHER:
        score: 16
        mod: 3
      INSIGHT:
        score: 14
        mod: 2
      CHORUS:
        score: 14
        mod: 2
      STR:
        score: 12
        mod: 1
      DEX:
        score: 18
        mod: 4
      CON:
        score: 14
        mod: 2
      INT:
        score: 16
        mod: 3
      WIS:
        score: 14
        mod: 2
      CHA:
        score: 14
        mod: 2
    skills:
    - Phase Infiltration (+7)
    - Cipher Decoding (+7)
    - Vector Flanking (+6)
    features_2024:
    - Phase-Backstab (+50% Flanking Geometry Bonus)
    - Blink Evasion
    - Shadow Momentum Chain
    spells_and_powers:
    - Phase-Step Ambush
    - Veil Shroud
    wealth:
      gp: 25
      sp: 10
      cp: 0
  - name: Astral Wizard
    species: Vaelorin
    class: Wizard (Astral Weaver)
    level: 1
    xp: 0
    next_level_xp: 300
    hp: 28
    max_hp: 28
    ac: 15
    speed: 30
    hit_dice: 3 Aether Cells
    hit_dice_remaining: 3
    languages:
    - Concordat Common
    - Vaelorin
    - Astral-Cant
    weapon: Chrono-Prism Staff
    armor: Starlight Conduit Robes
    abilities:
      FORGE:
        score: 10
        mod: 0
      FLOW:
        score: 16
        mod: 3
      AEGIS:
        score: 14
        mod: 2
      AETHER:
        score: 18
        mod: 4
      INSIGHT:
        score: 16
        mod: 3
      CHORUS:
        score: 14
        mod: 2
      STR:
        score: 10
        mod: 0
      DEX:
        score: 16
        mod: 3
      CON:
        score: 14
        mod: 2
      INT:
        score: 18
        mod: 4
      WIS:
        score: 16
        mod: 3
      CHA:
        score: 14
        mod: 2
    skills:
    - Astral Engineering (+7)
    - Chrono-Calculus (+7)
    - Rift Navigation (+6)
    features_2024:
    - Aether Overcharge (Guaranteed Multi-Target Harmonic Cascade)
    - Prism Barrier
    - Singularity Convergence
    spells_and_powers:
    - Aether Lance
    - Prism Nova
    - Temporal Stasis
    - Starforge Beam
    wealth:
      gp: 25
      sp: 10
      cp: 0
  initial_char_stats:
    name: Aegis Vanguard
    species: Solarborn
    class: Vanguard (Bastion)
    level: 1
    xp: 0
    next_level_xp: 300
    hp: 36
    max_hp: 36
    ac: 18
    speed: 30
    hit_dice: 3 Aether Cells
    hit_dice_remaining: 3
    languages: *id009
    weapon: Sun-Forged Longblade
    armor: Solaris Bastion Plate & Aegis Shield
    abilities: *id010
    skills: *id011
    features_2024: *id012
    spells_and_powers: *id013
    wealth: *id014
    current_hp: 36
    armor_class: 18
    proficiency_bonus: 2
    momentum: 0
    combo_chain: 0
    stance: Balanced
  walkthrough_commands:
  - command: investigate rig
  - command: attack
  - command: attack
  - command: attack
  - command: attack
  - command: north
  - command: attack
  - command: attack
  - command: north
  - command: attack
  - command: attack
  - command: attack
  - command: attack
  - command: attack
  - command: take Meridian Brass Cipher
  - command: south
  - command: south
  - command: east
  - command: talk to Quartermaster Havelock
  - command: east
  - command: talk to Commander Kaelen
  - command: west
  - command: south
  - command: attack
  - command: south
  - command: attack
  - command: attack
  - command: attack
  - command: attack
  - command: attack
  - command: attack
  - command: attack
  - command: south
  - command: attack
  - command: attack
  - command: attack
  - command: take Loom Resonance Signet
  - command: east
  - command: attack
  - command: attack
  - command: attack
  - command: north
  - command: attack
  - command: attack
  - command: attack
  - command: attack
  - command: north
  - command: attack
  - command: attack
  - command: attack
  - command: attack
  - command: attack
  - command: take Astral Compass Key
  - command: east
  - command: attack
  - command: attack
  - command: attack
  - command: attack
  - command: south
  - command: attack
  - command: attack
  - command: attack
  - command: south
  - command: attack
  - command: attack
  - command: attack
  - command: attack
  - command: attack
  - command: attack
  - command: take Prime Solaris Core
  - command: north
  - command: north
  - command: north
  - command: south
  npcs:
    scout_merrin:
      id: scout_merrin
      name: Scout Merrin
      title: Cedarhollow Relief Outrider
      species: Solarborn
      class: Strider
      room: windglass_causeway
      x: 155.0
      y: 345.0
      facing: east
      languages:
      - Concordat Common
      greeting: Keep low behind the monolith, Vanguard! Raiders hit this Cedarhollow relief rig with heavy rail-bolts and hauled its insulated Aether Cells north toward Thornmire.
      topics:
        rig: The tanks weren't shattered—someone uncoupled the cryo-valves cleanly with a foundry wrench before the ambush dropped.
        blade: That wooden blade belonged to a Cedarhollow courier apprentice who refused to leave the shelter wagon behind.
        varakh: We spotted Warden Varakh's Ironbound foundry banners moving up toward the Sunken Reliquary.
    ranger_sylva:
      id: ranger_sylva
      name: Ranger Sylva
      title: Silver Canopy Cartographer
      species: Sylphic
      class: Strider
      room: whisperwood_canopy
      x: 205.0
      y: 520.0
      facing: north
      languages:
      - Concordat Common
      - Sylphic
      - Vaelorin
      greeting: Tread lightly beneath the silver chimes, Vanguard. Both Kharzadic aqueduct smiths and Vaelorin weavers carved these survey stakes before the First Ignition broke trust.
      topics:
        citadel: High Commander Dravok sealed Vaelen's Sky-Citadel above us—hoarding storm cells while striking lowland outposts off his evacuation slate.
        aqueduct: The old canopy pipes still link Solhaven to the Ashfall ridges if someone clears the quarry and sky-berth below.
        continuum: Follow the luminous trail east through Chrono-Monolith Glade to reach Wayfarer Nyx's camp at the Astral Rift Conduit.
    curator_toren:
      id: curator_toren
      name: Curator Toren
      title: Keeper of the Brass Lantern Conservatory
      species: Solarborn
      class: Arbiter
      room: brass_lantern_conservatory
      x: 420.0
      y: 320.0
      facing: south
      languages:
      - Concordat Common
      greeting: Welcome to the Brass Lantern Conservatory, Vanguard! Ever since the Gilded Enforcers seized Observatory Bluff, Solhaven's harmonic grid has been flickering.
      topics:
        enforcers: The Gilded Enforcers have fortified the Sub-Vault Catacombs beneath Observatory Bluff. Most are unpaid Harbor Watch guarding heating meters for their families.
        solhaven: Solhaven is the prime meridian hub of the Solar Concordat, powered by the ancient Starforge ley-lines.
        hearth: Rest by the solar hearth anytime to recalibrate your Aether Cells and restore your Vitality.
        cedarhollow: Before the First Ignition burned Cedarhollow, Vespera and Malakor sat right here at Toren's cedar table sketching safe heat-exchange loops.
    commander_kaelen:
      id: commander_kaelen
      name: Commander Kaelen
      title: Veteran Bastion Marshal
      species: Vaelorin
      class: Vanguard
      room: brass_lantern_conservatory
      x: 540.0
      y: 360.0
      facing: west
      languages:
      - Concordat Common
      - Vaelorin
      greeting: Hold your stance firm, operative! Those Gilded Enforcers answer to a renegade engineer calling himself Arch-Artificer Malakor.
      topics:
        malakor: Malakor seized the Alchemical Loom beneath Observatory Bluff after the Council shelved three grid-safety petitions. Use the Meridian Brass Cipher to breach his sanctum!
        tactics: Keep your weapon within its Optimal Sweet-Spot band for +25% damage and +25 Momentum. At 100 Momentum, your next strike triggers a 2.0x Apex Finisher!
        sunspire: Echo-Wraiths have disrupted the Sunspire Watchtower north of the plaza. Clearing it will restore our upper telemetry and thaw the eastern tenement pipes.
        vespera: Vespera was our chief Meridian Architect until Cedarhollow burned. Now she trusts frost stasis more than mortal hands.
    envoy_soren:
      id: envoy_soren
      name: Envoy Soren
      title: Solar Concordat Emissary
      species: Solarborn
      class: Vanguard
      room: brass_lantern_conservatory
      x: 640.0
      y: 420.0
      facing: north
      languages:
      - Concordat Common
      - Kharzadic
      greeting: Thank the Solaris Stars you survived the Windglass ambush! High Commander Dravok holds the Astral Compass Key inside the Sky-Citadel of Vaelen's Reach.
      topics:
        dravok: High Commander Dravok commands the Sky-Citadel north of Whisperwood Canopy. You will need the Loom Resonance Signet to drop his kinetic gate.
        starforge: The Heart of the Starforge lies beyond Frostspire Pass and the Tidal Resonance Caverns. Vespera the Eclipse Architect must not lock its core in eternal frost!
        korin: Master Artificer Korin has established a forward camp at the Astral Rift Conduit east of Whisperwood.
    quartermaster_havelock:
      id: quartermaster_havelock
      name: Quartermaster Havelock
      title: Solhaven Armory & Salvage Master
      species: Kharzadic
      class: Vanguard
      room: solhaven_plaza
      x: 340.0
      y: 420.0
      facing: east
      languages:
      - Concordat Common
      - Kharzadic
      greeting: Well met at the Sovereign Plaza depot! My Aether-Rig was carrying relief cells toward the outer miners when Varakh's riders intercepted the Windglass convoy.
      topics:
        supplies: I keep Harmonic Aether Cells and calibrated blades in stock for Concordat operatives defending Solhaven.
        reliquary: Warden Varakh the Ironbound holed up in the Sunken Reliquary north of Thornmire Ravine with my Meridian Brass Cipher—and every outer ward heating ration!
        cedarhollow: My brother forged the Cedarhollow aqueduct valves. When the flare took the valley, nobody in the Council chambers ever answered our roll call.
    archivist_lyra_vael:
      id: archivist_lyra_vael
      name: Archivist Lyra Vael
      title: Scholar of the Starforge
      species: Vaelorin
      class: Weaver
      room: solhaven_plaza
      x: 512.0
      y: 290.0
      facing: south
      languages:
      - Concordat Common
      - Vaelorin
      - Astral-Cant
      greeting: May the Meridian stars align your vectors. I am tracking the harmonic tremors radiating from the Eclipsed Starforge.
      topics:
        vespera: Vespera the Eclipse Architect seeks to freeze the Prime Solaris Core into silent stasis so fire can never burn another Cedarhollow—even if the world freezes dark.
        continuum: East of Whisperwood lies the Chrono-Monolith Glade and the Astral Rift Conduit—where twelve ancient guild crests await heirs at the Round-Table of Sector XII.
        eclipse: The Second Eclipse isn't a blind storm—it is the fractured First Meridian Astrolabe pulling heat out of alignment across all twelve sectors!
    consul_vennick:
      id: consul_vennick
      name: Consul Vennick
      title: Civic Magistrate of Solhaven
      species: Solarborn
      class: Arbiter
      room: solhaven_plaza
      x: 680.0
      y: 420.0
      facing: west
      languages:
      - Concordat Common
      greeting: On behalf of the Sovereign Council of Solhaven, I authorize full Sovereign Marks for every Syndicate blockade lifted and every outer ward rekindled!
      topics:
        bounty: Settle Warden Varakh, stabilize Malakor's Loom, open Dravok's Sky-Citadel, and reconcile Vespera's Starforge lock!
        dreadnought: Syndicate saboteurs are outfitting an Obsidian Sky-Dreadnought in the berth north of Ashfall Quarry—reclaim it intact for grain relief!
        petitions: I know the Council stalled Malakor's grid petitions too long. Spare who you can; Solhaven needs builders left standing when spring breaks.
    wayfarer_nyx:
      id: wayfarer_nyx
      name: Wayfarer Nyx
      title: Astral Rift Navigator
      species: Sylphic
      class: Stalker
      room: astral_rift_conduit
      x: 430.0
      y: 380.0
      facing: south
      languages:
      - Concordat Common
      - Sylphic
      - Astral-Cant
      greeting: The Continuum never ends, Vanguard. Every time you stabilize a sector or command 'expand continuum', new fractured realms anchor themselves to this gate!
      topics:
        rift: Beyond this conduit lie Sector IX (The Sunken Chrono-Spire), Sector X (Celestial Aether-Foundry), Sector XI (Void-Observatory), Sector XII (Throne of the Eternal Meridian), and infinite procedural sectors beyond!
        expand: Speak or type 'expand continuum' at any time to chart and open a brand-new procedural Continuum Sector!
        chronos: Sovereign Chronos-Prime isn't a conqueror—they've held the Round-Table seat open for twelve guild traditions since the First Meridian fractured.
    master_artificer_korin:
      id: master_artificer_korin
      name: Master Artificer Korin
      title: Chief Engineer of the Starforge
      species: Kharzadic
      class: Weaver
      room: astral_rift_conduit
      x: 590.0
      y: 380.0
      facing: south
      languages:
      - Concordat Common
      - Kharzadic
      - Astral-Cant
      greeting: By the First Meridian, you made it! Keep your weapon spacing in the Sweet-Spot and chain your techniques to 100 Momentum!
      topics:
        starforge: Once the Prime Solaris Core is returned to Solhaven Sovereign Plaza, the Meridian Beacons will shine across all Continuum sectors.
        upgrades: Every boss weapon you claim—from Varakh's Gravity Maul to the Scepter of the Eclipsed Sun—expands your Sweet-Spot reach and base harmonic output!
        vespera: Vespera was my apprentice once—until the night Cedarhollow burned. Tell her the new crucible gauges hold; we never stopped fixing what broke.
  weapons_codex:
  - name_keywords:
    - scepter of the eclipsed sun
    - eclipsed sun
    base_damage: 18
    damage_dice: '18'
    ability: AETHER
    damage_type: solar-astral
    type: ranged
    reach_ft: 55
    max_dist_px: 720.0
    optimal_min_px: 140.0
    optimal_max_px: 680.0
    is_melee: false
    category: Ranged
    lore: 'Notched along the silver arc: three valleys burned during the First Ignition; calibrated to cool rather than destroy.'
  - name_keywords:
    - star-forged aegis greatsword
    - aegis greatsword
    base_damage: 17
    damage_dice: '17'
    ability: FORGE
    damage_type: solar-slashing
    type: melee
    reach_ft: 12
    max_dist_px: 175.0
    optimal_min_px: 45.0
    optimal_max_px: 155.0
    is_melee: true
    category: Melee
    lore: 'Stamped inside the fuller with three overlapping guild signatures—forged as a barricade timber before it became a blade.'
  - name_keywords:
    - dravok's thunder-glaive
    - thunder-glaive
    - glaive
    base_damage: 15
    damage_dice: '15'
    ability: FORGE
    damage_type: volt-slashing
    type: melee
    reach_ft: 12
    max_dist_px: 165.0
    optimal_min_px: 50.0
    optimal_max_px: 150.0
    is_melee: true
    category: Melee
    lore: 'Quartermaster notches along the haft track citadel rations weighed out through two endless winters.'
  - name_keywords:
    - malakor's prism conduit staff
    - prism conduit staff
    base_damage: 14
    damage_dice: '14'
    ability: AETHER
    damage_type: astral-resonance
    type: ranged
    reach_ft: 50
    max_dist_px: 680.0
    optimal_min_px: 130.0
    optimal_max_px: 620.0
    is_melee: false
    category: Ranged
    lore: 'Etched around the prism ferrule: Solhaven Grid Petition #409 — Denied; shunt rebuilt by hand.'
  - name_keywords:
    - varakh's gravity maul
    - gravity maul
    - maul
    base_damage: 14
    damage_dice: '14'
    ability: FORGE
    damage_type: seismic-kinetic
    type: melee
    reach_ft: 10
    max_dist_px: 145.0
    optimal_min_px: 40.0
    optimal_max_px: 130.0
    is_melee: true
    category: Melee
    lore: 'Foundry Stamp #14: thick oiled leather wrapped high around freezing iron so miners'' numb hands held fast.'
  - name_keywords:
    - sun-forged longblade
    - longblade
    - sabre
    - sword
    base_damage: 11
    damage_dice: '11'
    ability: FORGE
    damage_type: solar-slashing
    type: melee
    reach_ft: 10
    max_dist_px: 135.0
    optimal_min_px: 35.0
    optimal_max_px: 120.0
    is_melee: true
    category: Melee
    lore: 'Balanced by Solhaven smiths after Cedarhollow burned: tempered to hold a steady arc without flaring hot.'
  - name_keywords:
    - meridian pulse-bow
    - pulse-bow
    - shortbow
    - bow
    base_damage: 10
    damage_dice: '10'
    ability: FLOW
    damage_type: kinetic-piercing
    type: ranged
    reach_ft: 55
    max_dist_px: 720.0
    optimal_min_px: 140.0
    optimal_max_px: 650.0
    is_melee: false
    category: Ranged
    lore: 'Laminated with Whisperwood silver-ash; outriders notch wind-drift marks along the riser for convoy escorts.'
  - name_keywords:
    - resonance gavel
    - gavel
    - hammer
    - mace
    base_damage: 10
    damage_dice: '10'
    ability: FORGE
    damage_type: harmonic-blunt
    type: melee
    reach_ft: 10
    max_dist_px: 125.0
    optimal_min_px: 35.0
    optimal_max_px: 110.0
    is_melee: true
    category: Melee
    lore: 'Cast from cracked Sunspire chime-bronze; rings a quiet C-sharp when struck against frost-locked sluice gates.'
  - name_keywords:
    - twin phase-daggers
    - phase-daggers
    - dagger
    base_damage: 10
    damage_dice: '10'
    ability: FLOW
    damage_type: phase-piercing
    type: melee
    reach_ft: 8
    max_dist_px: 115.0
    optimal_min_px: 25.0
    optimal_max_px: 95.0
    is_melee: true
    category: Melee
    lore: 'Paired Sylphic courier blades—etched with two half-compasses that only align when both hands strike true.'
  - name_keywords:
    - chrono-prism staff
    - staff
    - wand
    base_damage: 11
    damage_dice: '11'
    ability: AETHER
    damage_type: astral-beam
    type: ranged
    reach_ft: 50
    max_dist_px: 680.0
    optimal_min_px: 130.0
    optimal_max_px: 600.0
    is_melee: false
    category: Ranged
    lore: 'Crowned with an unpolished First Meridian prism—built to split heat evenly rather than hoard it at one point.'
  tactical_archetypes:
    skirmisher_keywords:
    - lookout
    - scout
    - skirmisher
    - bow
    - marksman
    - gunner
    - bombardier
    caster_keywords:
    - malakor
    - vespera
    - weaver
    - savant
    - archon
    - resonator
    - chronos
    - gazer
    pack_hunter_keywords:
    - hound
    - syndicate
    - enforcer
    - swarm
    - excavator
    - guard
    ambusher_keywords:
    - arachnid
    - stalker
    - panther
    - lurker
    - infiltrator
    - mirage
    - vex
    brute_keywords:
    - titan
    - goliath
    - behemoth
    - golem
    - ironbound
    - brute
    - varakh
    - dravok
    - automatons
  minion_breakdowns:
    ashen syndicate ambush:
      count: 4
      sub_names:
      - 'Syndicate Pulse-Archer #1'
      - 'Syndicate Pulse-Archer #2'
      - 'Syndicate Vanguard #3'
      - 'Syndicate Vanguard #4'
    gilded enforcer squad:
      count: 3
      sub_names:
      - Gilded Enforcer Captain
      - Gilded Enforcer Crossbowman
      - Gilded Enforcer Duelist
    hollow automaton wardens:
      count: 3
      sub_names:
      - Automaton Warden Alpha
      - Automaton Warden Beta
      - Automaton Warden Gamma
    volt-skitter swarm:
      count: 3
      sub_names:
      - Volt-Skitter Alpha
      - Volt-Skitter Beta
      - Volt-Skitter Gamma
    high commander dravok and his war-beast:
      count: 2
      sub_names:
      - High Commander Dravok
      - Armored Crag-Drakeling
  discovery_rules:
    hazards:
      keywords:
      - conceal
      - hidden snare
      required_visited_rooms:
      - thornmire_ravine
      required_flags:
      - hazard_detected
    secret_passages:
      keywords:
      - phase-conduit
      - hidden conduit
      required_flags:
      - citadel_path_revealed
    monsters:
      ambush:
        keywords:
        - ashen syndicate ambush
        required_events:
        - wrecked_convoy_investigation
  start_room_reset:
    discard_events:
    - wrecked_convoy_investigation
    discard_defeated_monsters:
    - Ashen Syndicate Ambush
  intent_criteria:
    attack: attack kill fight strike hit slay foes monsters weapon slash shoot cleave weave blast calibrate
    take: take get grab loot collect retrieve salvage item key cipher signet core cell pack pickup seal schematic locket whistle charm
    drop: drop discard leave place down
    move: go move walk climb north south east west up down stairs enter run forward n s e w u d
    look: look survey inspect describe room area surroundings scan explore l
    inventory: inventory items bag carrying equipment gear sheet stats character i inv
    rest: rest sleep short rest long rest heal recover camp calibrate field sanctuary convergence
    use: use unlock drink quaff cell key open chest activate lock door expand continuum
    save_load: save load delete rename list saves saved games
    dialogue: talk to speak with converse with ask query chat with tell talk
    salutation: hello hi hail greetings salutations good morning day evening well met sol-vael khar-solen
    question: what where who whom which how why is are was were can could would should does do did tell me search check inspect examine find
  ai_roles:
    wizard: ["wizard weaver prism mage chrono arcane", 42.0, 340.0, [155.0, 265.0], "kite", "chrono_weave", "Staff", 7, [-105.0, 0.0], "astral_study"]
    archer: ["archer strider marksman ranger pulse-bow", 48.0, 340.0, [130.0, 245.0], "kite", "pulse_shot", "Bow", 6, [-65.0, -60.0], "overwatch_patrol"]
    rogue: ["rogue stalker phase veilblade daggers flank", 54.0, 105.0, [0.0, 0.0], "flank", "phase_backstab", "Daggers", 7, [65.0, -60.0], "scout_flank"]
    cleric: ["cleric arbiter cantor harmonic chorus gavel", 42.0, 340.0, [0.0, 0.0], "mid", "harmonic_strike", "Gavel", 6, [-65.0, 60.0], "guardian_escort"]
    fighter: ["fighter vanguard bastion knight sentinel blade", 48.0, 105.0, [56.0, 50.0], "melee", "bastion_strike", "Blade", 6, [65.0, 60.0], "vanguard_march"]
  companion_tactics:
    vanguard:
      role: Frontline Bastion
      preferred_range: 85
      technique: Kinetic Shield-Bash
    strider:
      role: Long-Range Precision
      preferred_range: 340
      technique: Ricochet Pulse-Shot
    arbiter:
      role: Harmonic Support
      preferred_range: 140
      technique: Solaris Resonance Pulse
    stalker:
      role: Vector Flanker
      preferred_range: 65
      technique: Phase-Step Backstab
    weaver:
      role: Astral Artillery
      preferred_range: 380
      technique: Chrono-Prism Cascade
  companion_dialogue:
    fighter:
      goblins: They're fighting for fuel cells too—hold Sweet-Spot range and disarm clean if they yield.
      boss: Heavy iron coming—bracket the flanks so none of us takes that maul head-on!
      dungeon: Bootprints and chalk ticks along the walls... someone hauled winter rations down here first.
      loot: Insulated canisters still hold charge; stashing spares helps the outpost survive next frost.
      victory: Line held cleanly—catch a breath when we hit a safe hearth.
    archer:
      goblins: Spots along the rim! Pinning their firing lanes—check whether any flag a truce.
      boss: Holding high angle! Wait for the telegraph slam before loosing the volley!
      dungeon: Wet mortar and grease—watch your foothold near those oil drums!
      loot: Pry those supply seals gently; half these bolts carry foundry numbers from the outer wards.
      victory: Clean arcs—every teammate kept clear of crossfire.
    cleric:
      goblins: Hold our ward rhythm—we aren't here to slaughter starving rail-watch if they stand down.
      boss: Listen to their resonance! That shield breaks cleanly on our harmonized combo beat!
      dungeon: Paired shoes by the threshold... miners sheltered right beneath our boots once.
      loot: Every recovered shard takes pressure off Solhaven's southern conduits.
      victory: Breaths steady, shields whole—onward together.
    rogue:
      goblins: Sloppy flanks, cold trigger-fingers—nobody here got their winter pay.
      boss: Keep their eyes on your cape—one slip behind lets our combo chain land!
      dungeon: Sawdraft along the masonry... weak mortar waiting for a tunnel or breach.
      loot: Contraband stamped 'Outer Ward Relief'—Solhaven politics stink all the way out here.
      victory: Nobody bled out—even counted our footsteps right.
    wizard:
      goblins: Desperate folk with pulse-bows—freeze the ground puddles instead of chasing across rocks!
      boss: Stasis resonance building! Chain frost and solar sparks before the core locks down!
      dungeon: Old acoustic brickwork—every whisper carries if our squad spreads too thin.
      loot: High-purity lattice! Enough stabilization charge to spare an entire tenement row!
      victory: Balanced outcome—neither frozen silent nor burned to cinder.
  environment_conditions:
    periods:
      dawn: Solaris Dawn
      morning: Ascending Meridian
      afternoon: Zenith Radiance
      dusk: Amber Horizon
      evening: Astral Twilight
      night: Starforge Eclipse
    weather:
      clear: Clear Harmonic Skies
      cloudy: Drifting Aether-Clouds
      overcast: Ionized Overcast
      misty: Luminous Windglass Mist
  narrative_flavors:
    combat:
    - aligns optimal weapon spacing and strikes with deterministic precision
    - channels harmonic momentum into a razor-sharp vector strike
    - locks telemetry onto the target's weak point and unleashes a kinetic blow
    movement:
    - advances in disciplined tactical formation
    - glides across the meridian flagstones with poised balance
    - repositions along an optimal flanking vector
    monster:
    - shifts its guard stance and locks onto your formation
    - charges its weapon capacitors for an incoming strike
    npc:
    - consults the harmonic telemetry projections thoughtfully
    - inclines their head in Concordat salute
    background:
    - Crystalline windglass spires hum with ambient harmonic resonance.
    - Distant astrolabe gears click in rhythmic synchronization across the sector.
  immovable_fixtures:
  - keywords:
    - rig
    - convoy
    - wreckage
    narration: '[{actor}]: inspects the armored chassis of the {target}.'
    override_message: The {target} weighs several tons and cannot be carried, though you can salvage components from it.
  - keywords:
    - fountain
    - astrolabe
    - loom
    - crucible
    - monolith
    - pillar
    - throne
    narration: '[{actor}]: studies the ancient Starforge architecture of the {target}.'
    override_message: The {target} is a permanent architectural fixture of the sector.
  scenery_classification:
  - keywords:
    - tree
    - canopy
    - grove
    - pine
    - thicket
    kind: tree
    label: Luminous Silver Flora
    height: 135
  - keywords:
    - crystal
    - monolith
    - prism
    - spire
    - rift
    - fissure
    kind: crystal
    label: Harmonic Crystal Formation
    height: 120
  - keywords:
    - rig
    - convoy
    - wagon
    - crate
    - barricade
    kind: prop
    label: Tactical Cover / Rig
    height: 65
  - keywords:
    - fountain
    - astrolabe
    - crucible
    - loom
    - throne
    - altar
    kind: shrine
    label: Starforge Harmonic Mechanism
    height: 95
  - keywords:
    - pillar
    - column
    kind: pillar
    label: Reinforced Meridian Pillar
    height: 140
  - keywords: []
    kind: wall
    label: Solid Bastion Masonry
    height: 125
  environment_themes:
    steppe:
      match:
      - causeway
      - ravine
      - quarry
      base:
      - 44
      - 52
      - 64
      alt:
      - 36
      - 42
      - 54
      accent:
      - 96
      - 165
      - 250
      grid:
      - 28
      - 34
      - 44
      - 150
      light:
      - 186
      - 230
      - 253
    plaza:
      match:
      - plaza
      - conservatory
      - watchtower
      base:
      - 58
      - 52
      - 44
      alt:
      - 46
      - 40
      - 34
      accent:
      - 245
      - 158
      - 11
      grid:
      - 36
      - 32
      - 26
      - 150
      light:
      - 254
      - 243
      - 199
    vault:
      match:
      - reliquary
      - catacombs
      - loom
      - aqueduct
      base:
      - 28
      - 32
      - 42
      alt:
      - 20
      - 24
      - 32
      accent:
      - 168
      - 85
      - 247
      grid:
      - 16
      - 18
      - 26
      - 160
      light:
      - 216
      - 180
      - 254
    forest:
      match:
      - whisperwood
      - glade
      base:
      - 28
      - 48
      - 42
      alt:
      - 22
      - 38
      - 34
      accent:
      - 52
      - 211
      - 153
      grid:
      - 18
      - 30
      - 26
      - 150
      light:
      - 167
      - 243
      - 208
    citadel:
      match:
      - citadel
      - war_hall
      - dreadnought
      base:
      - 48
      - 36
      - 42
      alt:
      - 38
      - 28
      - 34
      accent:
      - 244
      - 63
      - 94
      grid:
      - 30
      - 22
      - 26
      - 160
      light:
      - 254
      - 205
      - 211
    glacier:
      match:
      - frostspire
      - tidal
      base:
      - 34
      - 54
      - 68
      alt:
      - 26
      - 44
      - 56
      accent:
      - 56
      - 189
      - 248
      grid:
      - 20
      - 34
      - 44
      - 150
      light:
      - 224
      - 242
      - 254
    starforge:
      match:
      - starforge
      - rift
      - sector
      base:
      - 24
      - 26
      - 44
      alt:
      - 18
      - 20
      - 36
      accent:
      - 250
      - 204
      - 21
      grid:
      - 14
      - 16
      - 28
      - 165
      light:
      - 254
      - 240
      - 138
    cave:
      match: []
      base:
      - 32
      - 36
      - 42
      alt:
      - 24
      - 28
      - 34
      accent:
      - 96
      - 165
      - 250
      grid:
      - 18
      - 20
      - 25
      - 150
      light:
      - 186
      - 230
      - 253
  species_languages:
    solarborn: [Common]
    kharzadic: [Common, Kharzadic]
    vaelorin: [Common, Vaelorin, Astral-Cant]
    sylphic: [Common, Sylphic]
    syndicate: [Common, Shadow-Cipher]
  archetype_languages:
    vanguard: [Common, Kharzadic]
    strider: [Common, Vaelorin]
    arbiter: [Common, Kharzadic, Astral-Cant]
    stalker: [Common, Sylphic, Shadow-Cipher]
    rogue: [Common, Sylphic, Shadow-Cipher]
    wizard: [Common, Vaelorin, Astral-Cant]
    weaver: [Common, Vaelorin, Astral-Cant]
  continuum_expansion:
    initial_anchor: sector_12_throne_of_eternity
    hub_room: astral_rift_conduit
    hub_name: The Astral Rift Conduit
    guard_prefix: Continuum Sentinel Mk-
    weapon_prefix: Astral Sovereign Blade Mk-
    bonus_item: Harmonic Aether Cell
    sector_themes:
    - [Meridian Crucible, Solar-Forge Sanctuary, starforge, Solaris Archon, Crucible Resonance Core]
    - [Obsidian Sky-Vault, Suspended Astral Keep, citadel, Void-Admiral Kaelos, Sky-Vault Chrono Signet]
    - [Prism-Glass Catacombs, Refractive Crystal Labyrinth, vault, Refraction Weaver, Prismatic Lens Relic]
    - [Cryo-Zenith Observatory, Sub-Zero Starlight Dome, glacier, Permafrost Sovereign, Zenith Frost-Astrolabe]
    - [Verdant Aether-Canopy, Bioluminescent Sky-Grove, forest, Sylphic Prime Warden, Living Aether Seed]
    wall_obstacles:
    - {name: North Meridian Wall, rect: [0, 0, 440, 24]}
    - {name: North-East Meridian Wall, rect: [584, 0, 440, 24]}
    - {name: South Meridian Wall, rect: [0, 744, 440, 24]}
    - {name: South-East Meridian Wall, rect: [584, 744, 440, 24]}
    - {name: West Bastion Wall, rect: [0, 24, 24, 290]}
    - {name: South-West Bastion Wall, rect: [0, 454, 24, 290]}
    - {name: East Bastion Wall, rect: [1000, 24, 24, 290]}
    - {name: South-East Bastion Wall, rect: [1000, 454, 24, 290]}
  visual_classification:
    character_archetypes:
      wizard: wizard weaver mage archivist savant korin prism arcane spellcaster
      rogue: rogue stalker veilblade wayfarer nyx thief assassin stealth dagger
      archer: archer strider marksman ranger pulse-bow bow ranged
      cleric: cleric arbiter cantor curator consul paladin harmonic chorus healer
      fighter: fighter vanguard knight bastion sentinel warrior blade shield
    monsters:
      spider: spider arachnid skitter web crawler
      wolf: wolf hound beast panther drakeling stalker
      juggernaut: juggernaut varakh goliath behemoth golem ignis dravok boss heavy titan
      raider: raider goblin syndicate skirmisher grunt sentry
  default_language: Concordat Common
  default_hero:
    name: Aegis Vanguard
    species: Solarborn
    class: Vanguard (Bastion)
    hit_dice: 3 Aether Cells
  npc_defaults:
    title: Concordat Citizen
    species: Solarborn
    class: Citizen
    languages: [Concordat Common]
    greeting: Greetings, Vanguard.
  language_keywords:
    Vaelorin: sol-vael vaelorin aeonward meridian
    Kharzadic: khar-solen kharzadic starforge
    Sylphic: sylphic phase
  threat_criteria:
    boss: sovereign boss archon titan commander juggernaut varakh dravok malakor vespera
    goblins: raider grunt skirmisher sentinel beast stalker hound
  sector_adjacency:
    sunken_reliquary: {south: thornmire_ravine, east: sunspire_watchtower}
    sunspire_watchtower: {south: solhaven_plaza, east: verdigris_aqueduct, west: sunken_reliquary}
    verdigris_aqueduct: {south: brass_lantern_conservatory, east: obsidian_dreadnought_berth, west: sunspire_watchtower}
    obsidian_dreadnought_berth: {south: ashfall_quarry, east: sovereign_war_hall, west: verdigris_aqueduct}
    sovereign_war_hall: {south: citadel_bastion_courtyard, east: frostspire_pass, west: obsidian_dreadnought_berth}
    frostspire_pass: {south: tidal_resonance_caverns, west: sovereign_war_hall}
    thornmire_ravine: {north: sunken_reliquary, south: windglass_causeway, east: solhaven_plaza}
    solhaven_plaza: {north: sunspire_watchtower, south: observatory_bluff, east: brass_lantern_conservatory, west: thornmire_ravine}
    brass_lantern_conservatory: {north: verdigris_aqueduct, south: sub_vault_catacombs, east: ashfall_quarry, west: solhaven_plaza}
    ashfall_quarry: {north: obsidian_dreadnought_berth, south: alchemical_loom, east: citadel_bastion_courtyard, west: brass_lantern_conservatory}
    citadel_bastion_courtyard: {north: sovereign_war_hall, south: whisperwood_canopy, east: tidal_resonance_caverns, west: ashfall_quarry}
    tidal_resonance_caverns: {north: frostspire_pass, south: chrono_monolith_glade, west: citadel_bastion_courtyard}
    windglass_causeway: {north: thornmire_ravine, south: sector_12_throne_of_eternity, east: observatory_bluff}
    observatory_bluff: {north: solhaven_plaza, south: sector_11_void_observatory, east: sub_vault_catacombs, west: windglass_causeway}
    sub_vault_catacombs: {north: brass_lantern_conservatory, south: sector_10_aether_foundry, east: alchemical_loom, west: observatory_bluff}
    alchemical_loom: {north: ashfall_quarry, south: sector_9_chrono_spire, east: whisperwood_canopy, west: sub_vault_catacombs}
    whisperwood_canopy: {north: citadel_bastion_courtyard, south: astral_rift_conduit, east: chrono_monolith_glade, west: alchemical_loom}
    chrono_monolith_glade: {north: tidal_resonance_caverns, south: heart_of_the_starforge, west: whisperwood_canopy}
    sector_12_throne_of_eternity: {north: windglass_causeway, east: sector_11_void_observatory}
    sector_11_void_observatory: {north: observatory_bluff, east: sector_10_aether_foundry, west: sector_12_throne_of_eternity}
    sector_10_aether_foundry: {north: sub_vault_catacombs, east: sector_9_chrono_spire, west: sector_11_void_observatory}
    sector_9_chrono_spire: {north: alchemical_loom, east: astral_rift_conduit, west: sector_10_aether_foundry}
    astral_rift_conduit: {north: whisperwood_canopy, east: heart_of_the_starforge, west: sector_9_chrono_spire}
    heart_of_the_starforge: {north: chrono_monolith_glade, west: astral_rift_conduit}
  terminology:
    world_name: Continuum
    hp_label: Vitality
    cell_label: Aether Cell
    gp_label: Sovereign Marks
    gp_key: sovereign_marks
    sp_label: Aether Shards
    sp_key: aether_shards
    short_rest_name: Field Calibration
    long_rest_name: Sanctuary Convergence
    sheet_role: OPERATIVE
    ability_keys: [FORGE, FLOW, AEGIS, AETHER, INSIGHT, CHORUS]
  scene_mapping:
    windglass_causeway: /assets/scenes/windglass_causeway.png
    solhaven_plaza: /assets/scenes/solhaven_plaza.png
    heart_of_the_starforge: /assets/scenes/heart_of_the_starforge.png
  sprite_mapping: {}
  default_sprites: {}
  client:
    offline_help: "Commands: look, inventory, stats/sheet, examine <obj>, talk to <npc>, ask any lore '?' question, attack, take <item>, travel <sector>."
    readonly_intents: [look, inventory, question, salutation]
    biome_rules:
      snow: "frost glacier spire bluff mountain snow ice sub-zero"
      dense_forest: "whisper glade ravine forest woods canopy thicket"
      clear: "plaza town citadel conservatory hall loft"
    atlas_sectors:
      - {id: windglass_causeway, name: Windglass Causeway, x: 80, y: 190, icon: "\u26A1", danger: "Level 1 • Introductory", region: The Western Marches}
      - {id: thornmire_ravine, name: Thornmire Ravine, x: 80, y: 110, icon: "\U0001F33F", danger: "Level 1-2 • Skirmish", region: The Western Marches}
      - {id: sunken_reliquary, name: Sunken Reliquary, x: 80, y: 40, icon: "\U0001F3DB\uFE0F", danger: "Level 2 • Dungeon Boss", region: The Western Marches}
      - {id: solhaven_plaza, name: Solhaven Sovereign Plaza, x: 175, y: 190, icon: "\u2600\uFE0F", danger: "Sanctuary & Citadel Hub", region: The Solhaven Heartlands}
      - {id: sunspire_watchtower, name: Sunspire Signal Watchtower, x: 175, y: 110, icon: "\U0001F5FC", danger: "Level 2 • High Ground", region: The Solhaven Heartlands}
      - {id: observatory_bluff, name: Observatory Bluff Ruins, x: 175, y: 270, icon: "\U0001F52D", danger: "Level 2 • Ancient Ruins", region: The Solhaven Heartlands}
      - {id: brass_lantern_conservatory, name: Brass Lantern Conservatory, x: 265, y: 190, icon: "\U0001F3EE", danger: "Level 1 • Scholarly Hall", region: The Solhaven Heartlands}
      - {id: verdigris_aqueduct, name: Verdigris Aqueduct, x: 265, y: 110, icon: "\U0001F30A", danger: "Level 2 • Flooded Conduits", region: The Solhaven Heartlands}
      - {id: sub_vault_catacombs, name: Sub-Vault Catacombs, x: 175, y: 350, icon: "\U0001F480", danger: "Level 3 • Deep Dungeon", region: The Deep Vaults}
      - {id: alchemical_loom, name: The Alchemical Loom, x: 265, y: 350, icon: "\U0001F9EA", danger: "Level 3 • Arcane Sanctum", region: The Deep Vaults}
      - {id: whisperwood_canopy, name: Whisperwood Silver Canopy, x: 355, y: 270, icon: "\U0001F332", danger: "Level 2-3 • Silver Forest", region: The Whisperwood}
      - {id: chrono_monolith_glade, name: Chrono-Monolith Glade, x: 445, y: 270, icon: "\u23F3", danger: "Level 3 • Temporal Anomaly", region: The Whisperwood}
      - {id: ashfall_quarry, name: Ashfall Meteorite Quarry, x: 355, y: 350, icon: "\u2604\uFE0F", danger: "Level 3 • Smoldering Crater", region: The High Peaks}
      - {id: obsidian_dreadnought_berth, name: Obsidian Dreadnought Berth, x: 355, y: 420, icon: "\U0001F6A2", danger: "Level 4 • Fortress Berth", region: The High Peaks}
      - {id: citadel_bastion_courtyard, name: Bastion Courtyard, x: 355, y: 190, icon: "\U0001F3F0", danger: "Level 3-4 • Fortified Ramparts", region: Vaelen Reach}
      - {id: sovereign_war_hall, name: Sovereign War-Hall, x: 355, y: 110, icon: "\u2694\uFE0F", danger: "Level 4 • Fortress Command", region: Vaelen Reach}
      - {id: frostspire_pass, name: Frostspire Glacial Pass, x: 445, y: 110, icon: "\u2744\uFE0F", danger: "Level 4 • Sub-Zero Chasm", region: The High Peaks}
      - {id: tidal_resonance_caverns, name: Tidal Resonance Caverns, x: 445, y: 190, icon: "\U0001F52E", danger: "Level 4 • Echoing Grotto", region: The Starforge}
      - {id: heart_of_the_starforge, name: Heart of the Starforge, x: 445, y: 350, icon: "\U0001F525", danger: "Level 5 • Celestial Core Boss", region: The Starforge}
      - {id: astral_rift_conduit, name: The Astral Rift Conduit, x: 485, y: 40, icon: "\U0001F300", danger: "Nexus • Endless Multiverse", region: Astral Continuum}
      - {id: sector_9_chrono_spire, name: "Sector IX: Chrono-Spire", x: 400, y: 40, icon: "\u231B", danger: "Level 5 • Gravity Well", region: Astral Continuum}
      - {id: sector_10_aether_foundry, name: "Sector X: Aether-Foundry", x: 310, y: 40, icon: "\u2699\uFE0F", danger: "Level 5 • Stellar Forge", region: Astral Continuum}
      - {id: sector_11_void_observatory, name: "Sector XI: Void-Observatory", x: 220, y: 40, icon: "\U0001F30C", danger: "Level 6 • Singularity Peak", region: Astral Continuum}
      - {id: sector_12_throne_of_eternity, name: "Sector XII: Eternal Throne", x: 130, y: 40, icon: "\U0001F451", danger: "Level 7 • Sovereign Endgame", region: Astral Continuum}
    atlas_connections:
      - [windglass_causeway, thornmire_ravine]
      - [thornmire_ravine, sunken_reliquary]
      - [windglass_causeway, solhaven_plaza]
      - [solhaven_plaza, sunspire_watchtower]
      - [sunspire_watchtower, verdigris_aqueduct]
      - [verdigris_aqueduct, brass_lantern_conservatory]
      - [solhaven_plaza, brass_lantern_conservatory]
      - [solhaven_plaza, observatory_bluff]
      - [observatory_bluff, sub_vault_catacombs]
      - [sub_vault_catacombs, alchemical_loom]
      - [alchemical_loom, whisperwood_canopy]
      - [whisperwood_canopy, chrono_monolith_glade]
      - [chrono_monolith_glade, astral_rift_conduit]
      - [whisperwood_canopy, citadel_bastion_courtyard]
      - [citadel_bastion_courtyard, sovereign_war_hall]
      - [sovereign_war_hall, frostspire_pass]
      - [frostspire_pass, tidal_resonance_caverns]
      - [tidal_resonance_caverns, heart_of_the_starforge]
      - [whisperwood_canopy, ashfall_quarry]
      - [ashfall_quarry, obsidian_dreadnought_berth]
      - [obsidian_dreadnought_berth, citadel_bastion_courtyard]
      - [astral_rift_conduit, sector_9_chrono_spire]
      - [sector_9_chrono_spire, sector_10_aether_foundry]
      - [sector_10_aether_foundry, sector_11_void_observatory]
      - [sector_11_void_observatory, sector_12_throne_of_eternity]
      - [sector_12_throne_of_eternity, astral_rift_conduit]
    music_tracks:
      combat: {bpm: 132, roots: [164.81, 174.61, 196.00, 146.83], lead_ratios: [2, 2.12, 2.378, 2.67, 2.996, 3.17, 3.56], bass_mod: 2, chord_mod: 4, lead_mod: 3, third: 1.189}
      victory: {bpm: 116, roots: [261.63, 293.66, 329.63, 392.00], lead_ratios: [2, 2.245, 2.52, 2.996, 3.36], bass_mod: 4, chord_mod: 2, lead_mod: 1, third: 1.2599}
      exploration: {bpm: 92, roots: [220.00, 196.00, 174.61, 164.81], lead_ratios: [1, 1.122, 1.189, 1.334, 1.498, 1.681, 1.781, 2.0], bass_steps: [0, 8], chord_mod: 4, plucks: [0, 3, 6, 8, 10, 13], third: 1.189}
    env_rules:
      cave: "cave cavern mine hideout tunnel grotto subterranean catacomb"
      indoor_roof: "dungeon crypt manor tavern forge study ruins cellar hall"
      mountain: "mountain crag tor peak ridge cliff"
      wild: "wild forest glade road plains causeway"
    world_landmarks:
      towers: [[-1750, -1650], [1950, -1850], [-2100, 1450]]
      stone_circle: {x: 1050, z: -980, radius: 115, count: 6, rune_color: 5690623}
      arch_offset: 220
      ribcage_arch: {x: 1850, z: -1450, scale: 1.35}
      glowing_shrine: {x: 1150, z: 1650, color: 5809919}
      mushroom_grotto: {x: -1950, z: 1350, color: 11141375}
      sunken_citadel: {x: 2450, z: 950, color: 16766720}
---


# The Aeonward Continuum: Chronicles of the Eclipsed Starforge

## Overview
**The Aeonward Continuum** is a skill-based co-op tactical adventure built around **Optimal Weapon Spacing (Harmonic Balance)**, **Vector Flanking Geometry**, **Non-Lethal / Combat Agency**, and **Environmental Worldbuilding**. Players step into the **Concordat Expedition Vanguard** as the **Second Eclipse** settles over Aeonward—an encroaching dark winter triggered by the long-ago fracturing of the **First Meridian Astrolabe**.

## The Cedarhollow Wound & The Four Fractures
Decades before the campaign opens, an uncalibrated surge during the First Ignition incinerated **Cedarhollow**, scattering its survivors and shattering trust between Solhaven's Council and the frontier guilds. Each adversary along the Vanguard's march embodies a desperate, flawed answer to the returning dark:
- **Warden Varakh the Ironbound** (*Hoarding by Force*): Siphons relief rigs to heat trapped Reliquary miners' shelters by force.
- **Arch-Artificer Malakor** (*Reckless Bypass*): Rigs unauthorized Loom shunts after Solhaven stalls grid-safety petitions—guided in blue ink by Vespera herself.
- **High Commander Dravok** (*Citadel Isolation*): Locks storm cells inside Vaelen's Sky-Citadel and writes lowland settlements off his evacuation slate.
- **Vespera the Eclipse Architect** (*Eternal Stasis*): Survivor of Cedarhollow who locks the Prime Solaris Core in frost stasis so flame can never consume Aeonward again.
- **Sovereign Chronos-Prime** (*The Twelve-Crest Covenant*): Keeper of Sector XII's limestone Round-Table, waiting beyond the Astral Rift to judge whether mortal guilds can share fire without crowning a tyrant.

## Core Acts & Expanding Continuum
1. **Act I — Cedarhollow's Trail (`windglass_causeway` -> `sunken_reliquary`)**: Speak with Scout Merrin beside the hijacked Cedarhollow relief rig, track siphoned Aether cells through Thornmire Ravine, uncover Varakh's shelter ration ledger, and settle or break his Ironbound blockade for the `Meridian Brass Cipher`.
2. **Act II — Shunts in Blue Ink (`solhaven_plaza` -> `alchemical_loom`)**: Reconcile Solhaven's plazas and Brass Lantern hearths, resolve the unpaid Harbor Watch standoff in the Sub-Vault Catacombs, and uncover Vespera's blue-ink notes inside Malakor's Loom for the `Loom Resonance Signet`.
3. **Act III — The Sky-Citadel Accord (`whisperwood_canopy` -> `sovereign_war_hall`)**: Meet Ranger Sylva beneath Whisperwood's joint Kharzadic–Vaelorin survey stakes and breach or debate High Commander Dravok's sky-ramparts for the `Astral Compass Key`.
4. **Act IV — Fire Without Ashes (`frostspire_pass` -> `heart_of_the_starforge`)**: Descend beneath Glacial Pass and Tidal Resonance Caverns, trace Vespera's charred Cedarhollow house-keys at the crucible, and return the balanced `Prime Solaris Core` home to Solhaven.
5. **Acts V–VIII & The Living Continuum (`sunspire_watchtower`, `obsidian_dreadnought_berth`, `astral_rift_conduit`, `sector_9`–`sector_12`+)**: Relink Sunspire's heliograph across Verdigris Aqueduct, convert Dravok's Sky-Dreadnought into a winter grain-ark, restart the Chrono-Spire and Forgemaster Ignis's orbital anvil, and stand before Chronos-Prime's twelve-crest Round-Table before charting endless horizons via `expand continuum`.
