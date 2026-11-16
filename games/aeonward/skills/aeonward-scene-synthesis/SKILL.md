---
name: aeonward-scene-synthesis
title: aeonward-scene-synthesis
type: visual-synthesis
description: Deterministic high-resolution tactical battlemap synthesis, environmental coordinate grounding, multi-layer parallax composition, and sprite scaling pipeline for all locations, sectors, encounters, and objects in The Aeonward Continuum campaign.
status: stable
generated:
  by: agent:google-antigravity
  at: '2026-11-14T22:50:00Z'
tags:
- battlemap-synthesis
- tactical-grid
- aeonward
- scene-rendering
---
# Aeonward Scene Synthesis & Tactical Battlemap Pipeline (`aeonward-scene-synthesis`)

This skill formalizes the deterministic 2D/3D tactical battlemap synthesis, environmental coordinate grounding, obstacle geometry projection, and multi-layer lighting pipeline for **The Aeonward Continuum: Chronicles of the Eclipsed Starforge**.

## 1. Coordinate Grounding & Tactical Grid Space
- **Canvas Dimensions**: $1024 \times 768$ discrete world units centered at $(512, 384)$.
- **Grid Cell Resolution**: $48 \times 48$ tactical units per standard vanguard stride.
- **Optimal Spacing Bands**:
  - **Close Blade / Heavy Impact Band**: $0 \le d \le 95$ units (Sweet-spot: $42 \le d \le 82$ units).
  - **Extended Polearm / Kinetic Glaive Band**: $45 \le d \le 145$ units (Sweet-spot: $75 \le d \le 130$ units).
  - **Harmonic Conduit / Prism Weave Band**: $90 \le d \le 560$ units (Sweet-spot: $150 \le d \le 360$ units).
  - **Magnetic Rail-Bow / Horizon Strider Band**: $110 \le d \le 700$ units (Sweet-spot: $180 \le d \le 480$ units).

## 2. Multi-Biome Atmospheric Themes
1. **Meridian Wilds & Windglass Causeway (`wilds`)**: Crystalline wind-sculpted monoliths, fractured aether-convoy tracks, and emerald valley foliage.
2. **Sunken Reliquary & Echo Caverns (`cave`)**: Bioluminescent quartz stalactites, subterranean aether streams, and resonant stone bridges.
3. **Solhaven Clockwork Hub (`town` / `tavern`)**: Brass-and-limestone plazas, solar-prism streetlamps, and warm conservatory hearths.
4. **Sub-Vault Catacombs & Alchemical Loom (`crypt` / `arcane`)**: Obsidian vaults, harmonic containment conduits, and violet singularity lenses.
5. **Whisperwood & Sky-Citadel of Vaelen's Reach (`forest` / `fortress`)**: Silver-barked canopy bridges, wind-turbine bastions, and high-altitude stone ramparts.
6. **Frostspire Pass & Glacial Rift (`mountain`)**: Serrated permafrost ridges, howling zenith winds, and frozen aether geysers.
7. **The Eclipsed Starforge (`forge`)**: Prime Solaris crucibles, floating obsidian rings, and incandescent golden-cyan plasma conduits.
