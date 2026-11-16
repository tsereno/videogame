---
name: multimodal-vision-synthesis
title: multimodal-vision-synthesis
type: reference/agentic-capability
description: Open-domain multi-modal discrete visual token ground truth and spatial synthesis representation for arbitrary entities, subjects, and concepts extracted from referenced high-resolution imagery and dynamic online visual context.
status: stable
generated:
  by: agent:google-antigravity
  at: '2026-11-09T08:45:00Z'
tags:
- vision
- multimodal
- image-generation
- synthesis
- visual-tokens
- open-domain
- canine
- feline
- avatar
- sprite
- 2d-games
- vision-synthesis
- token-grounding
---
# Universal Multi-Modal Vision Synthesis Skill

This skill provides an open-domain visual token synthesis manifold for CC-ELM, grounding arbitrary entity and concept generation directly into multi-modal image references:

## Reference Multi-Modal Visual Artifacts
Referenced local artifacts provide grounded discrete codebook distributions across diverse visual categories:

### Canine / Dog Ground Truth
- Golden Retriever: [dog_golden](dog_golden.jpg)
- Siberian Husky: [dog_husky](dog_husky.jpg)
- Labrador Retriever: [dog_labrador](dog_labrador.jpg)
- Shiba Inu: [dog_shiba](dog_shiba.jpg)
- Beagle Hound: [dog_beagle](dog_beagle.jpg)
- Wheaten Terrier: [dog_terrier](dog_terrier.jpg)
- Standard Canine: [dog](dog.jpg)

### Feline / Cat Ground Truth
- Tabby Cat: [cat_tabby](cat_tabby.jpg)
- Siamese Cat: [cat_siamese](cat_siamese.jpg)
- Ginger / Orange Cat: [cat_ginger](cat_ginger.jpg)
- Calico Cat: [cat_calico](cat_calico.jpg)
- Black Cat: [cat_black](cat_black.jpg)
- White Cat: [cat_white](cat_white.jpg)
- Standard Feline: [cat](cat.jpg)

### 2D Video Game Avatar & Sprite Synthesis Formalization
Low-resolution discrete sprite generation and topological decomposition for 2D retro and modern games:
1. **Semantic Part Partitions**:
   - `PART_BACKGROUND` (0): Environment canvas or transparency.
   - `PART_HAIR` (1): Hair, helmets, hoods, crowns, or headwear.
   - `PART_SKIN` (2): Facial features, skin tone, ears, neck.
   - `PART_EYES` (3): Sclera and pupil pixels.
   - `PART_TORSO` (4): Armor, shirts, tunics, robes, cloaks.
   - `PART_BELT` (5): Belts, waistbands, sashes.
   - `PART_LEGS` (6): Pants, skirts, grieves.
   - `PART_FEET` (7): Boots, shoes, greaves.
   - `PART_ARMS` (8): Forearms, hands, gloves.
   - `PART_HELD_RIGHT` (9): Primary hand equipment (`sword`, `staff`, `bow`, `axe`, `torch`, `wand`, `potion`, `dagger`).
   - `PART_HELD_LEFT` (10): Secondary offhand equipment (`shield`, `tome`, `orb`, `lantern`).

2. **Extensive Video Game Transformations**:
   - **Part Recoloring**: Arbitrary TrueColor palette remapping per partition ID (e.g., `blonde hair`, `red hair`, `purple robe`, `green tunic`, `golden armor`, `silver boots`).
   - **Equipment & Object Swapping**: Dynamically attaches distinct weapon/tool geometry in the character's primary or secondary hand slots.
   - **Dihedral Symmetry & Orientations**: Left/right facing mirroring ($\text{flip}_h$), upside down inverted physics ($\text{flip}_v$), and directional turns ($\text{rot}_\theta$).
   - **Animation Keyframing**: Walk cycle leg bisection, slashing arm forward thrusts, and idle postures.

## Open-Domain Grounding Architecture
When requested to synthesize, generate, draw, or render any subject (living entities, objects, architectural forms, landscapes, or abstract concepts):
1. **Multi-Modal Asset Resolution**: The synthesizer inspects referenced local visual context files matching the subject or relevant tags.
2. **Latent Manifold Blending & Synthesis**: When multiple reference exemplars exist for a concept (e.g. diverse dog and cat breeds), the model synthesizes a novel, unique visual instance by blending spatial features, facial morphology, and color palettes across the exemplar distribution.
3. **Discrete Codebook Quantization**: Spatial grids (16x16, 32x32, 64x64) are quantized into the discrete visual codebook `[512..768)` via continuous adaptive TrueColor palette centroid projections, preserving posture, silhouette, and facial structure while producing unique compositions.
