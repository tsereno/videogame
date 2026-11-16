---
name: aeonward-dialogue
title: Aeonward Dialogue & Conversation Paths Codex
type: reference/game-domain
description: Branching NPC conversations, creature parleys, keyword triggers, quest initiations, and command verbs.
dialogue:
  npc_paths:
    scout_merrin:
    - id: merrin_convoy
      keywords:
      - rig
      - convoy
      - siphon
      - ambush
      - syndicate
      - cedarhollow
      text: Merrin points to the clean wrench marks along the cryo-manifold. "They didn't blow the valves—someone with foundry training uncoupled every Cedarhollow relief cell and dragged the sleds north toward Thornmire."
      effects:
        flag: merrin_briefed
        xp: 30
    - id: merrin_blade
      keywords:
      - blade
      - wooden
      - sword
      - buckler
      - child
      - apprentice
      text: '"Our young courier carved that pine practice blade at Cedarhollow''s winter shelter. Take her spare signal whistle—if you meet Varakh''s miners in the Reliquary, let them hear it before steel flies."'
      effects:
        give_item: Courier Signal Whistle
        xp: 45
        quest:
          id: follow_siphoned_cells
          title: Trace the Cedarhollow Relief Cells
          desc: Follow the siphoned Aether Cell sled tracks north through Thornmire Ravine to the Sunken Reliquary.
    ranger_sylva:
    - id: sylva_stakes
      keywords:
      - stake
      - stakes
      - kharzadic
      - vaelorin
      - aqueduct
      - cedarhollow
      - trust
      text: Sylva brushes moss from a bronze survey pin. "Dwarven smiths and Vaelorin weavers built these canopy pipes hand in hand. Only Cedarhollow's fire taught everyone to lock gates instead of sharing valves."
      effects:
        flag: sylva_aqueduct_lore
        xp: 40
    - id: sylva_citadel
      keywords:
      - citadel
      - dravok
      - vaelen
      - key
      - continuum
      - nyx
      text: '"Dravok thinks high stone keeps his garrison safe, yet his evacuation slate stops at the cloudline. Carry this Canopy Trail Charm—and when you cross east, tell Nyx the silver chimes still ring true."'
      effects:
        give_item: Canopy Trail Charm
        quest:
          id: reconcile_sky_citadel
          title: Answer the Sky-Citadel Lockdown
          desc: Ascend Vaelen's Reach Sky-Citadel to break or debate High Commander Dravok's lowland embargo.
        xp: 55
    curator_toren:
    - id: toren_tonic
      keywords:
      - tea
      - tonic
      - drink
      - food
      - rest
      - hearth
      - recalibrate
      text: Curator Toren sets out mismatched tin mugs of solar-leaf tea by the embers. "No bells or dispatches here—warm your gloves before another run."
      effects:
        hp: 8
        give_item: Solar-Leaf Restorative Infusion
    - id: toren_enforcers
      keywords:
      - enforcer
      - gilded
      - bluff
      - observatory
      - catacombs
      text: '"Former harbor watch, most of them—working Malakor''s lower vaults just to buy heating cells for their families'' tenements."'
      effects:
        flag: sub_vault_rumor
        xp: 35
    - id: toren_cedarhollow
      keywords:
      - cedarhollow
      - vespera
      - malakor
      - table
      - before
      requires: dlg:toren_enforcers
      text: Toren taps a scarred cup ring on his oak counter. "Vespera and Malakor sat right here drawing safety bypasses the winter before Cedarhollow burned. Neither of them wanted power—they just stopped believing the Council would listen."
      effects:
        flag: conservatory_history_known
        xp: 50
    commander_kaelen:
    - id: kaelen_drill
      keywords:
      - train
      - teach
      - advice
      - learn
      - lesson
      - blade
      - combat
      - spacing
      - sweet-spot
      text: Kaelen steps aside from the practice sandbags. "Watch your footing—your weapon finds its true bite at Sweet-Spot spacing on the third beat."
      effects:
        xp: 60
    - id: kaelen_sunspire
      keywords:
      - sunspire
      - watchtower
      - aqueduct
      - scout
      - beacon
      text: '"Half the Sunspire relay mirrors drifted out of alignment. Whoever frees the tower puts warm water back into the eastern tenement pipes."'
      effects:
        quest:
          id: sunspire_reclamation
          title: Reclaim Sunspire Watchtower
          desc: Restore the Sunspire signal mirrors and Verdigris water pressure for Solhaven.
    - id: kaelen_vespera
      keywords:
      - vespera
      - architect
      - eclipse
      - oath
      - first ignition
      requires: dlg:kaelen_sunspire
      text: Kaelen lowers his voice beside the map board. "I hauled three squads through Cedarhollow''s ashes after the First Ignition. Vespera stayed inside the crucible three days pulling children clear—don''t go down there swinging blind."
      effects:
        flag: kaelen_cedarhollow_oath
        xp: 65
    envoy_soren:
    - id: soren_korin
      keywords:
      - korin
      - artificer
      - starforge
      - dravok
      - citadel
      - vaelen
      text: '"High Commander Dravok locked down the Sky-Citadel to hoard storm-cells for the cliff nobles. Our guild teams are probing the lower bridge—will your squad join the push?" (say ''I will help'')'
      effects:
        flag: soren_asked_help
    - id: soren_accept
      keywords:
      - i will help
      - i'll help
      - accept
      - agree
      - 'yes'
      - count me in
      - i will
      requires: dlg:soren_korin
      text: Soren pins a Concordat Wayfarer ribbon to your coat. "Good—another compass in the mist makes the crossing safer for everyone."
      effects:
        quest:
          id: storm_vaelens_reach
          title: Storm Vaelen's Reach Sky-Citadel
          desc: Reach Vaelen's Reach Sky-Citadel and reclaim or negotiate the Astral Compass Key.
        give_item: Solar Concordat Crest
        xp: 75
    quartermaster_havelock:
    - id: havelock_supplies
      keywords:
      - supplies
      - provisions
      - buy
      - shop
      - cell
      - aether
      - armory
      - havelock
      text: '"Saw your boots on the causeway snow—glad another team made it in. Take a charged cell; Varakh''s riders hit three wagons before dawn."'
      effects:
        give_item: Harmonic Aether Cell
        xp: 40
    - id: havelock_debt
      keywords:
      - cedarhollow
      - brother
      - foundry
      - varakh
      - miners
      requires: dlg:havelock_supplies
      text: Havelock sets down his caliper quietly. "Varakh worked the same foundry line as my brother before Cedarhollow collapsed. Tell him Solhaven''s lower ward amnesty stands if he opens the Reliquary valves."
      effects:
        flag: havelock_varakh_message
        xp: 45
    archivist_lyra_vael:
    - id: lyra_attunement
      keywords:
      - bless
      - attune
      - starlight
      - heal
      - resonance
      - lyra
      text: Lyra chalks a brief harmonic sigil on your gauntlet without interrupting your stance. "Every shard your squads piece together pulls the Eclipse slower."
      effects:
        hp: 12
        flag: harmonic_attunement
    - id: lyra_continuum
      keywords:
      - rift
      - continuum
      - conduit
      - monolith
      - glade
      text: '"Nyx''s scouts mapped fresh trails past Whisperwood into the Rift Conduit. Carry this Tuning Fork—any survey crew heading east can use it."'
      effects:
        quest:
          id: chart_the_continuum
          title: Chart the Astral Rift Conduit
          desc: Explore Chrono-Monolith Glade and link survey notes with Wayfarer Nyx.
        give_item: Harmonic Tuning Fork
    - id: lyra_eclipse
      keywords:
      - eclipse
      - first ignition
      - astrolabe
      - twelve
      - cedarhollow
      requires: dlg:lyra_attunement
      text: '"The Second Eclipse isn''t dark magic—it''s the fractured First Meridian Astrolabe pulling heat unevenly across twelve sectors. Only restoring the Prime Solaris Core—and reconciling Sector XII''s twelve crests—steadies the sky."'
      effects:
        flag: eclipse_truth_decoded
        xp: 60
    consul_vennick:
    - id: vennick_bounty
      keywords:
      - bounty
      - reward
      - consul
      - help
      - job
      - malakor
      - syndicate
      text: '"Every outpost rebuilt and every cartel embargo lifted keeps the plaza ovens lit through winter. Our Council logs every guild deed equally."'
      effects:
        quest:
          id: dismantle_the_loom
          title: Stabilize the Alchemical Loom
          desc: Resolve Arch-Artificer Malakor's runaway overcharge beneath Observatory Bluff.
    - id: vennick_amnesty
      keywords:
      - petition
      - petitions
      - spare
      - mercy
      - watch
      - harbor
      requires: dlg:vennick_bounty
      text: Vennick signs a brass amnesty seal without hesitation. "Show this to Harbor Watch or Malakor if they stand down—the Council failed their winter meters first, and Solhaven needs every engineer alive."
      effects:
        give_item: Solhaven Council Amnesty Seal
        flag: council_amnesty_issued
        xp: 55
    wayfarer_nyx:
    - id: nyx_horizon
      keywords:
      - rift
      - sector
      - expand
      - continuum
      - chrono
      - spire
      text: '"Another expedition team! Every crew charting or typing ''expand continuum'' locks new ruined ridges onto our guild map table."'
      effects:
        give_item: Phase-Step Capacitor
        xp: 80
    - id: nyx_chronos
      keywords:
      - chronos
      - table
      - twelve
      - sovereign
      - meridian
      requires: dlg:nyx_horizon
      text: '"Sovereign Chronos-Prime guards a limestone table built for twelve guild traditions, not one ruler. Bring the Prime Solaris Core''s lesson up to Sector XII, and the whole Continuum answers."'
      effects:
        quest:
          id: convene_eternal_meridian
          title: Convene the Twelve-Crest Round-Table
          desc: Traverse Sectors IX–XII beyond the Astral Rift Conduit and face Sovereign Chronos-Prime.
        xp: 85
    master_artificer_korin:
    - id: korin_calibration
      keywords:
      - starforge
      - upgrade
      - forge
      - weapon
      - calibrate
      - core
      text: Korin spins your weapon balance pin with an oily thumb. "Vespera lived through the last Starforge flare-burn—remember that when you face her at the crucible."
      effects:
        hp: 10
        xp: 75
        give_item: Overcharged Aether Cell
    - id: korin_vespera
      keywords:
      - vespera
      - cedarhollow
      - locket
      - apprentice
      - balance
      requires: dlg:korin_calibration
      text: Korin holds up a scarred copper gauge. "Tell Vespera I rebuilt every safety shunt she sketched after Cedarhollow. We don't need eternal ice to keep our children warm—just hands willing to watch the dials together."
      effects:
        flag: korin_gauge_message
        xp: 70
  monster_talk:
    syndicate:
      languages:
      - Concordat Common
      - Shadow-Cipher
      fallback: A shivering Syndicate skirmisher keeps one gloved finger off the pulse trigger. "Our ward ovens went dark three nights ago, Vanguard. Take your grievance up with Varakh's ledger, not freezing rail-hands."
      paths:
      - id: syndicate_parley
        keywords:
        - whistle
        - shelter
        - cedarhollow
        - truce
        - spare
        - winter
        - parley
        text: '"You carry Merrin''s whistle? Look—we were ordered to stall Solhaven patrols, not slaughter couriers. Use ''spare'' if blades lock and half our line will throw down bolts."'
        effects:
          flag: syndicate_parley_heard
          xp: 30
      - id: syndicate_fight
        keywords:
        - fight
        - attack
        - surrender
        - thief
        text: '"Then earn the fuel crate through our line!"'
        effects:
          combat: true
    rift-gazer:
      languages:
      - Concordat Common
      - Astral-Cant
      fallback: The Rift-Gazer's glass oculus hums like wind over ice. "No lone savior stands here—only shifting footprints in amber glass."
      paths:
      - id: gazer_resonance
        keywords:
        - secret
        - timeline
        - void
        - future
        - starforge
        text: You glimpse two futures side by side—frozen silence under Vespera's stasis, or warm sparks scattered across living cities.
        effects:
          xp: 35
      - id: gazer_bargain
        keywords:
        - bargain
        - trade
        - deal
        - parley
        - shard
        - accord
        text: '"An echo for a prism," the entity hums, ejecting a crystallized Void-Prism Shard onto the flagstones.'
        effects:
          give_item: Void-Prism Shard
          xp: 50
      - id: gazer_fight
        keywords:
        - fight
        - attack
        - shatter
        - destroy
        - challenge
        text: 'Its oculus constricts into violet lightning: "Then test your balance against fracture!"'
        effects:
          combat: true
    enforcer:
      languages:
      - Concordat Common
      fallback: A scarred Enforcer taps her boots on the wet grate. "Harbor watch cut our winter rations twice, Vanguard. We guard Malakor's meters so our street stays warm."
      paths:
      - id: enforcer_parley
        keywords:
        - surrender
        - peace
        - parley
        - talk
        - negotiate
        - winter
        - family
        text: '"Promise Conservatory fuel shares open to Lower Dock? Use ''spare'' if blades cross and we will lay down steel."'
        effects:
          flag: enforcer_parley
          xp: 35
      - id: enforcer_boss
        keywords:
        - malakor
        - boss
        - leader
        - loom
        text: '"Malakor has been awake four nights rigging shunts so the Conservatory doesn''t blackout when Observatory Bluff trips."'
        effects:
          quest:
            id: confront_malakor
            title: Stabilize the Alchemical Loom
            desc: Confront or reason with Arch-Artificer Malakor inside the Alchemical Loom.
      - id: enforcer_fight
        keywords:
        - fight
        - insult
        - coward
        - syndicate
        - attack
        text: 'The Enforcer snaps her sabre guard tight: "Contract holds—hold the passage!"'
        effects:
          combat: true
    malakor:
      languages:
      - Concordat Common
      - Astral-Cant
      fallback: Malakor wipes soot from cracked brass goggles. "The Council shelved three grid-safety petitions while winter rolled in! Somebody had to force the Loom's shunt open."
      paths:
      - id: malakor_plan
        keywords:
        - starforge
        - vespera
        - loom
        - signet
        - why
        - petition
        - stabilize
        text: '"Vespera showed me how to bleed off Starforge surges safely—if the Council refuses to dim their palace spires, the Loom will bypass them!"'
        effects:
          flag: malakor_confessed
          xp: 60
      - id: malakor_reconcile
        keywords:
        - amnesty
        - seal
        - cedarhollow
        - vennick
        - spare
        - share
        requires: dlg:malakor_plan
        text: Malakor stares at the amnesty seal—or your steady hand—before tossing a spare regulator key onto the workbench. "Vespera went north after giving me these formulas. Don't let her freeze what's left of the valley."
        effects:
          give_item: Loom Grid Telemetry Key
          flag: malakor_reconciled
          xp: 75
      - id: malakor_fight
        keywords:
        - fight
        - surrender
        - arrest
        - attack
        - stop
        text: 'Malakor slams his Prism Conduit Staff against the grating: "Stand clear or get thrown clear!"'
        effects:
          combat: true
    dravok:
      languages:
      - Concordat Common
      - Kharzadic
      fallback: High Commander Dravok stands beside iron braziers with an open supply ledger. "Only high ramparts survive unbent when the Eclipse peaks."
      paths:
      - id: dravok_accord
        keywords:
        - order
        - sky
        - citadel
        - winter
        - accord
        - shelter
        text: '"Supply frontier outposts below and prove the lowlands hold—and Vaelen''s Compass opens to all guild crews, not nobles alone."'
        effects:
          flag: dravok_debated
          xp: 55
      - id: dravok_evacuation
        keywords:
        - slate
        - evacuation
        - dreadnought
        - lowlands
        - windglass
        - cedarhollow
        requires: dlg:dravok_accord
        text: Dravok traces the crossed-out towns on his slate with a scarred knuckle. "I lost half a regiment watching Cedarhollow burn. Prove the lowlands can hold the grid, and the Sky-Dreadnought hauls grain instead of ordnance."
        effects:
          flag: dravok_burden_revealed
          xp: 70
      - id: dravok_fight
        keywords:
        - fight
        - attack
        - challenge
        - key
        text: '"Then earn passage across these ramparts the hard way!"'
        effects:
          combat: true
    vespera:
      languages:
      - Concordat Common
      - Vaelorin
      - Astral-Cant
      fallback: Vespera traces scorch scars along the Starforge rim. "Smell charred cedar in these vents? That was a valley town when the Starforge last ran unchecked."
      paths:
      - id: vespera_starforge
        keywords:
        - starforge
        - core
        - solaris
        - eclipse
        - meridian
        - flare
        - ash
        - balance
        text: '"I am locking the Solaris Core into eternal frost stasis so flame never consumes Aeonward again. Leave the shards if you want quiet peace!"'
        effects:
          quest:
            id: reclaim_solaris_core
            title: Reconcile the Prime Solaris Core
            desc: Break or bypass Vespera's stasis lock and return balanced warmth to the Prime Solaris Core.
      - id: vespera_cedarhollow
        keywords:
        - cedarhollow
        - korin
        - locket
        - keys
        - gauge
        - children
        - share
        requires: dlg:vespera_starforge
        text: Vespera's fingers tighten around a ring of fused brass house-keys before faltering. "Korin rebuilt the shunts? Then prove with your own hands at the crucible that your guild can carry fire without burning anyone left behind."
        effects:
          flag: vespera_heart_reached
          xp: 100
      - id: vespera_fight
        keywords:
        - fight
        - never
        - refuse
        - attack
        - stop
        text: '"A cold peace beats burned ashes—if your vanguard insists on sparks, prove you can survive the furnace!"'
        effects:
          combat: true
    varakh:
      languages:
      - Concordat Common
      - Kharzadic
      fallback: Warden Varakh rests one gloved hand on a battered Ironbound Foundry tag. "Three outer wards froze dark last month while Solhaven kept its fountains heated."
      paths:
      - id: varakh_cipher
        keywords:
        - cipher
        - convoy
        - rig
        - soren
        - korin
        - winter
        - miners
        - ration
        text: '"We took the fuel cipher—not one mark of gold—to heat the Reliquary shelters. Share the grid equally, or test your shield against my maul."'
        effects:
          flag: varakh_revealed_citadel
          xp: 45
      - id: varakh_truce
        keywords:
        - havelock
        - whistle
        - amnesty
        - cedarhollow
        - shelter
        - spare
        requires: dlg:varakh_cipher
        text: Varakh inclines his battered helm toward the cistern benches. "If Havelock's word still holds in Solhaven, stand your ground honorably—use 'spare' when my guard breaks and these miners will lay down steel."
        effects:
          flag: varakh_truce_offered
          xp: 60
      - id: varakh_fight
        keywords:
        - fight
        - challenge
        - attack
        - maul
        text: '"Wait till your boots shake like mine—raise your shield!"'
        effects:
          combat: true
    echo-wraith:
      languages:
      - Concordat Common
      - Vaelorin
      fallback: Static crackles inside the Echo-Wraith's prism chest like an old heliograph shutter. "...Relay three... Verdigris sluice freezing... anybody reading..."
      paths:
      - id: echo_signal
        keywords:
        - mirror
        - signal
        - aqueduct
        - heliograph
        - solhaven
        - code
        text: The specter aligns two fractured lenses, projecting the forgotten Verdigris mirror angle onto the watchtower flagstones before fading back into stormlight.
        effects:
          flag: echo_mirror_code
          xp: 65
      - id: echo_fight
        keywords:
        - fight
        - attack
        - shatter
        text: 'Harmonic feedback shrieks across the brass gimbals: "Unauthenticated transmission—clear the tower!"'
        effects:
          combat: true
    rust-shell:
      languages:
      - Concordat Common
      - Kharzadic
      fallback: Brass gears grind inside the Rust-Shell Automaton's chestplate. "SLUICE GATE FOUR... VERDIGRIS PRESSURE CRITICAL... AUTHORIZATION REQUIRED."
      paths:
      - id: rust_shell_directive
        keywords:
        - sluice
        - aqueduct
        - freeze
        - valve
        - kharzadic
        - repair
        text: '"CANAL BRIDGE COMPROMISED. APPLY FROST-MIST OR CLEAR VERDIGRIS INTAKE TO RESTORE SOLHAVEN TENEMENT FLOW."'
        effects:
          flag: aqueduct_maintenance_log
          xp: 50
      - id: rust_shell_fight
        keywords:
        - fight
        - smash
        - attack
        text: 'Hydraulic clamps snap shut with a shriek of corroded steel: "TRESPASSERS DETECTED ON SLUICE WALKWAY!"'
        effects:
          combat: true
    gunner captain:
      languages:
      - Concordat Common
      - Kharzadic
      fallback: The Dreadnought Gunner Captain leans over an unbolted cannon breech, staring down at the shipyard chalk lines. "Dravok wants siege shells loaded by dawn. My berth crew wants flour sacks."
      paths:
      - id: gunner_grain
        keywords:
        - grain
        - relief
        - hull
        - chalk
        - dravok
        - crew
        - spare
        text: '"Between us, Vanguard—if this berth changes hands clean, half my riggers already unpinned the bomb latches so we can fly grain south before the next gale."'
        effects:
          flag: dreadnought_crew_sympathy
          xp: 75
      - id: gunner_fight
        keywords:
        - fight
        - attack
        - surrender
        text: '"Hands to stations—clear the gangway!"'
        effects:
          combat: true
    archon:
      languages:
      - Concordat Common
      - Vaelorin
      - Astral-Cant
      fallback: Pendulums swing backward around the Archon of the Broken Hour. "Every mortal who stops the clock out of grief—as Vespera tried—traps winter inside the hour."
      paths:
      - id: archon_hour
        keywords:
        - time
        - pendulum
        - vespera
        - cedarhollow
        - continuum
        - hour
        text: '"You chose heat with risk over frozen certainty. Strike true or step past the pendulum—the broken hour remembers your balance."'
        effects:
          flag: broken_hour_witnessed
          xp: 90
      - id: archon_fight
        keywords:
        - fight
        - attack
        - challenge
        text: 'The Archon raises its halberd as suspended sand freezes mid-air: "Then weigh your seconds against mine!"'
        effects:
          combat: true
    ignis:
      languages:
      - Concordat Common
      - Kharzadic
      - Astral-Cant
      fallback: Foundry Forgemaster Ignis rests a molten star-hammer across an unlit anvil. "I cast the First Meridian girders to span chasms—not to armor war-citadels."
      paths:
      - id: ignis_anvil
        keywords:
        - anvil
        - forge
        - girder
        - bridge
        - star-iron
        - cedarhollow
        text: '"When Solhaven''s smiths stopped sharing foundry stamps, the sky fractured. Reignite this crucible for builders, and Star-Iron answers your guild again."'
        effects:
          flag: ignis_forge_pact
          xp: 95
      - id: ignis_fight
        keywords:
        - fight
        - attack
        - test
        text: 'White-hot sparks erupt across the orbital anvil: "Show me steel worthy of the First Foundry!"'
        effects:
          combat: true
    nebula weaver:
      languages:
      - Concordat Common
      - Vaelorin
      - Astral-Cant
      fallback: The Nebula Weaver traces cracked parabolic glass with starlight chalk. "Twelve telescopes pointed outward; eleven dimmed when the Concordat turned inward."
      paths:
      - id: nebula_alignment
        keywords:
        - lens
        - mirror
        - twelve
        - eclipse
        - stars
        - chronos
        text: '"Realign the twelfth mirror toward Sector XII''s round-table, and the Eclipse clears across every fractured branch."'
        effects:
          flag: void_observatory_charted
          xp: 90
      - id: nebula_fight
        keywords:
        - fight
        - attack
        - shatter
        text: 'Gravity wells ripple around the glass catwalk: "Measure your vector against the void!"'
        effects:
          combat: true
    chronos-prime:
      languages:
      - Concordat Common
      - Vaelorin
      - Kharzadic
      - Astral-Cant
      fallback: Sovereign Chronos-Prime stands beside the twelve-crest limestone Round-Table—not upon a dais. "You carried Cedarhollow's lesson and the Starforge's warmth to the end of the broken sky. Speak why twelve hands should hold the Meridian."
      paths:
      - id: chronos_meridian
        keywords:
        - table
        - twelve
        - crest
        - share
        - guild
        - cedarhollow
        - balance
        text: '"One keeper hoards; two factions deadlock; twelve guilds watch each other''s dials through the darkest eclipse. Place your vanguard crest upon the stone."'
        effects:
          flag: chronos_table_answered
          xp: 120
      - id: chronos_test
        keywords:
        - crest
        - oath
        - ready
        - prove
        - meridian
        - steward
        requires: dlg:chronos_meridian
        text: 'Chronos-Prime presses an ancient brass imprint into your gauntlet: "Keep the First Meridian Seal—now let our final clash prove the guild stands unbroken when the dawn bell rings!"'
        effects:
          give_item: First Meridian Seal
          flag: meridian_covenant_sealed
          xp: 150
      - id: chronos_fight
        keywords:
        - fight
        - attack
        - challenge
        - duel
        text: 'Starlight arcs along the Blade of the First Meridian: "Then test your oath against eternity, stewards of Aeonward!"'
        effects:
          combat: true
  command_verbs: go|move|walk|run|climb|north|south|east|west|up|down|n|s|e|w|u|d|stairs|enter|attack|kill|fight|slay|hit|strike|shoot|cleave|weave|calibrate|focus|lock|take|get|grab|pick|loot|salvage|drop|discard|leave|look|survey|inventory|inv|stats|sheet|rest|sleep|use|unlock|drink|quaff|open|save|load|delete|rename|level|levelup|ascend|list|equip|cast|examine|inspect|search|check|investigate|expand|ping|emote|sit|warm|play|highfive|fistbump|hug|gift|revive|rescue|craft|forge|brew|stash|deposit|dump|compare|swap|reinvent|respec|dye|transmog|glide|grapple|dodge|roll|parry|block|mount|ride|dismount|bounty|bazaar|tame|feed|labyrinth|delve|build|blueprint|crew|helm|sails|cannon|outpost|breach|dig|mine|harvest|fish|dice|riddle|decode|note|ghost|share|pin|say|shout|event|ignite|freeze|shock|push|travel|warp|teleport|goto
---
# Aeonward Dialogue Codex

Branching conversation paths and creature dialogue triggers for The Aeonward Continuum.
