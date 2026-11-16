---
name: 3d-graphics-and-realism
title: 3D Graphics & Realism Architecture
type: reference/3d-graphics-architecture
description: Comprehensive 5-tier 3D graphics and visual realism blueprint (camera/post-processing, lighting/atmosphere, PBR surfaces/wear, modeling/world building, motion/character life) plus the Three Golden Rules. Use when building or upgrading 3D visuals, shaders, lighting, procedural GLTF/GLB assets, and animations using existing engine primitives, CC-ELM, and declarative SKILL.md definitions.
status: stable
tags:
- game-builder
- 3d-graphics
- realism
- lighting
- pbr-materials
- atmosphere
- post-processing
- modeling
- animation
- cc-elm
---

# 3D Graphics & Realism Architecture

## Architectural & Implementation Constraints
- Implement visual upgrades without breaking existing gameplay, deterministic walkthroughs, CLI mode, or 3D client performance.
- Use **only the libraries and pipelines already present** in the engine and builder (Python `numpy`/`PIL` GLB synthesis in `game_builder/game_builder.py`, Three.js `WebGPURenderer` / `WebGLRenderer` in `game_engine/web/`).
- Drive lighting, atmosphere, material presets, and visual classifications primarily through **declarative `SKILL.md` definitions and CC-ELM** (`classifyWithClientCCELM` / `ccElmEvaluateDecision`) so visual rules stay data-driven across campaigns.

---

## Tier 1: Instant Visual & Camera Adjustments
*Effort: Minutes to hours | Impact: Immediate cohesion and photographic feel*

1. **Natural Highlight Roll-Off & Contrast**
   - *What to do*: Soften bright areas so intense lights and reflections fade smoothly toward white instead of clipping into harsh, flat, or overly saturated neon patches.
   - *Why it helps*: Real eyes and camera film compress bright highlights gently; harsh digital clipping instantly gives away an artificial image.
2. **Darkening Contact Points & Corners**
   - *What to do*: Add subtle shadow darkness inside tight corners, crevices, and right where objects rest against floors or walls.
   - *Why it helps*: Without soft contact darkening, objects look detached and floaty, as if they were pasted onto the background.
3. **Atmospheric Haze & Distance Fog**
   - *What to do*: Gradually fade distant buildings, hills, and trees into a soft mist or sky tint.
   - *Why it helps*: Real air scatters light over distance. Haze creates an immediate sense of scale, separates foreground subjects from noisy backgrounds, and adds depth.
4. **Unified Color Grading**
   - *What to do*: Adjust overall brightness curves, saturation, and shadow/highlight tinting across a scene (for example, keeping shadows slightly cool and highlights slightly warm).
   - *Why it helps*: Assets created separately often clash; unified color grading pulls everything into the same believable world and keeps colors from looking artificially oversaturated.
5. **Soft Light Bleed & Brightness Adaptation**
   - *What to do*: Let intense light sources spill gently over adjacent edges, and allow overall brightness to adjust gradually when moving between dark interiors and bright outdoors.
   - *Why it helps*: Mimics how real eyes and lenses react to extremes in brightness. (Keep the light bleed subtle—heavy glow looks smeared and artificial.)
6. **Minimal Lens Imperfections**
   - *What to do*: Add very faint darkening at the screen edges, natural focus blur on out-of-range backgrounds, and a tiny touch of visual grain in dark areas.
   - *Why it helps*: Breaks up sterile, overly crisp digital perfection and smooths out flat bands of darkness. Avoid heavy lens dirt, exaggerated blur, or strong color fringing, which feel gimmicky.

---

## Tier 2: Lighting & Atmosphere
*Effort: Hours to days | Impact: Turns flat spaces into moody, believable places*

1. **Motivated Lighting & Color Temperature Contrast**
   - *What to do*: Remove flat, shadowless "fill light" and make sure every light has a clear physical source (a window, lamp, candle, or screen). Contrast warm indoor lights against cool outdoor twilight or sky light.
   - *Why it helps*: Light-and-shadow contrast carves out three-dimensional form, while warm-vs.-cool interplay adds immediate visual richness.
2. **Colored Bounce Light**
   - *What to do*: Ensure surfaces pick up subtle reflected color from nearby sunlit walls, colored floors, or grass (for instance, warm reddish light bouncing off a brick wall onto an adjacent white column).
   - *Why it helps*: In real life, light bounces everywhere; dark shadows that remain completely neutral black or grey look dead and artificial.
3. **Natural Sky & Horizon Shifts**
   - *What to do*: Match the color of the sky, clouds, and horizon haze to the sun's height—warm amber and violet near sunrise/sunset, crisp pale blue at midday.
   - *Why it helps*: A static or mismatched sky immediately ruins the illusion of an outdoor world.
4. **Shaped & Broken Light Patterns**
   - *What to do*: Break up plain pools of light with shadows from window blinds, tree leaves, grates, or lampshades rather than letting lamps cast smooth, mathematically round cones.
   - *Why it helps*: Real light is constantly interrupted and shaped by objects around the bulb. Irregular light patterns add instant complexity for almost no extra work.
5. **Truthful Local Reflections**
   - *What to do*: Make sure glossy floors, glass, puddles, and metals reflect the actual room or sky surrounding them rather than a generic bright void.
   - *Why it helps*: Even subtle mismatches—like a dark basement floor reflecting a bright blue sky—instantly break immersion.
6. **Visible Air, Mist & Sunbeams**
   - *What to do*: Give air subtle thickness around strong lights so sunbeams through dusty windows or headlights in fog appear as soft shafts of light.
   - *Why it helps*: Makes empty space feel tangible and reinforces the direction and strength of light sources.
7. **Drifting Dust, Steam & Subtle Air Motion**
   - *What to do*: Place slow-drifting dust motes in sunbeams, rising steam near vents, heat shimmer over hot surfaces, or drifting embers near fire.
   - *Why it helps*: Completely still air makes even richly detailed environments feel like frozen museum dioramas.

---

## Tier 3: Surfaces, Materials & Wear
*Effort: Days to weeks | Impact: Eliminates the "plastic toy" look*

1. **Realistic Color & Brightness Limits**
   - *What to do*: Avoid pure pitch-black or blindingly pure-white surface colors (even coal reflects a small amount of light, and fresh snow isn't 100% white), and keep clear separation between dull non-metals and reflective bare metals.
   - *Why it helps*: Extreme blacks crush shadows into featureless blobs, while overly bright surfaces wash out highlights and make lighting look fake.
2. **Uneven Gloss & Surface Imperfections**
   - *What to do*: Vary how shiny or matte each surface is across its area—add greasy fingerprints on glass, polished wear on armrests and doorknobs, dull dust in corners, micro-scratches, and dried water spots.
   - *Why it helps*: Uniform shininess is the #1 giveaway of artificial 3D art. Real surfaces tell a story through where they are worn smooth or dulled by grime.
3. **Localized Stains, Dirt & Transition Grime**
   - *What to do*: Layer puddles, oil stains, rust streaks, moss, cracks, and built-up dirt along wall bases, road gutters, and corners.
   - *Why it helps*: Breaks up repetitive wall/floor patterns and hides clean, unnatural seams where two clean surfaces meet.
4. **Close-Up Surface Grain**
   - *What to do*: Include fine micro-detail—fabric weave, wood pores, leather grain, concrete pitting, and skin texture—that holds up when inspected closely.
   - *Why it helps*: Prevents large walls, floors, or clothing from turning into blurry smears the moment the camera gets near.
5. **Natural Material Transitions**
   - *What to do*: Blend materials organically based on crevices and height—let moss grow only inside brick mortar, mud collect in low tire tracks, and paint peel smoothly off exposed wood.
   - *Why it helps*: Eliminates artificial, straight-line transitions between different materials.
6. **Translucency in Skin, Foliage & Soft Materials**
   - *What to do*: Let strong light pass slightly through thin or semi-translucent materials like ears, nostrils, leaves, flower petals, marble, and wax.
   - *Why it helps*: Without soft internal light scatter, skin looks like painted clay and leaves look like opaque green cardboard.
7. **Specialized Surface Finishes**
   - *What to do*: Match real-world surface quirks—layered gloss over metallic car paint, stretched directional shine on brushed steel or hair, and soft rim fuzz on velvet, wool, moss, and dusty clothing.
   - *Why it helps*: The human eye subconsciously identifies materials by how light stretches or softens across their edges.
8. **Keeping Deep Crevices Unreflective**
   - *What to do*: Ensure tight folds, deep cracks, and pockets stay muted and shadowed rather than catching stray reflections from the sky.
   - *Why it helps*: Prevents "glowing creases" inside dark folds of clothing, rock cracks, or machine joints.

---

## Tier 4: Modeling, Scale & World Building
*Effort: Weeks to months | Impact: Grounded physical presence and scale*

1. **Softened & Beveled Edges**
   - *What to do*: Slightly round or chamfer sharp 90-degree corners on walls, tables, crates, and metal props.
   - *Why it helps*: Nothing in the real world has a razor-thin geometric edge. Subtle bevels catch thin rim highlights that clearly define an object's shape and weight.
2. **Real-World Proportions & Organic Asymmetry**
   - *What to do*: Work closely from real measurements and photo reference, introducing subtle dents, warps, crooked placements, and natural erosion rather than mathematically straight lines and identical copies.
   - *Why it helps*: Perfect symmetry and uniform spacing scream "computer-generated."
3. **Architectural Thickness & Grounding Details**
   - *What to do*: Give walls, doors, and window frames realistic physical thickness, and include mundane structural anchors: baseboards, moldings, electrical outlets, vents, hinges, drainpipes, and cables.
   - *Why it helps*: Environments look like thin movie sets whenever walls lack thickness or lack the functional hardware real buildings need.
4. **Three-Tier Clutter Layering**
   - *What to do*: Dress spaces in three distinct size layers: large structures/furniture, medium everyday props (boxes, chairs, tools), and tiny micro-clutter (pebbles, fallen leaves, cables, scraps of paper, bottle caps).
   - *Why it helps*: Most scenes stop at medium props, leaving floors looking too clean and swept. Micro-clutter anchors large objects into the space.
5. **Cohesive Foliage & Canopy Volume**
   - *What to do*: Group tree leaves so sunlight shades the overall crown from bright sunlit tops to deep shadowed undersides, rather than shading every small leaf cluster individually.
   - *Why it helps*: Keeps trees from looking like noisy, chaotic confetti and gives forests believable mass and depth.
6. **Real Dimensional Trim Over Flat Illusions**
   - *What to do*: Model physical depth into prominent details—roof tiles, cobblestones, window mullions, trim, and rocky cliffs—instead of relying purely on flat painted patterns, and smooth out visual changes as objects get closer.
   - *Why it helps*: Flat illusions fall apart immediately when viewed at sharp side angles or silhouettes against the sky.

---

## Tier 5: Motion, Interaction & Character Life
*Effort: Months | Impact: Solves stiffness and lifelessness in motion*

1. **Grounded Foot & Hand Placement**
   - *What to do*: Make sure characters' feet plant squarely on slopes, stairs, and uneven rocks without floating or sinking, and hands connect accurately with door handles, railings, and held objects.
   - *Why it helps*: Even the most lifelike character looks like an action figure the instant a boot clips through a stairstep.
2. **Secondary Motion (Cloth, Hair & Foliage)**
   - *What to do*: Let loose sleeves, coats, hair, straps, chains, and grass react naturally to momentum, wind, and sudden stops, and bend away when brushed past.
   - *Why it helps*: Secondary motion communicates gravity, fabric weight, and air movement.
3. **Reactive Surfaces & Dynamic Weathering**
   - *What to do*: Let footsteps dent soft snow or mud, splashes disturb calm water, and rain visibly darken porous stone while turning sidewalks into slick mirrors.
   - *Why it helps*: Characters and weather feel physically connected to the world instead of floating across an untouchable painting.
4. **Weight, Momentum & Fluid Transitions**
   - *What to do*: Convey realistic body weight—characters leaning into turns, shifting balance before sprinting, absorbing impact when landing, and transitioning smoothly without snapping between poses.
   - *Why it helps*: Humans instantly spot robotic timing and weightless acceleration, even from far away.
5. **Micro-Expressions, Skin Creases & Living Eyes**
   - *What to do*: Form realistic forehead, cheek, and eye creases as faces move, keep eyes glossy with subtle moisture along the lower eyelid, and let pupils narrow or widen with light.
   - *Why it helps*: People focus relentlessly on faces; smooth, rubbery expressions and dry, dead stares break realism faster than anything else.

---

## Three Golden Rules Before You Start
1. **Lighting > Surfaces > Detail Density**: A simple box with thoughtful lighting, varied gloss, and strong color harmony looks far more realistic than an intricately sculpted object under flat, dull light.
2. **Don't Hide Weak Art with Camera Effects**: If a scene looks muddy or unconvincing with lens effects turned off, adding heavy glow, blur, or grain will only make it look muddy and over-processed.
3. **Consistency Beats Isolated Detail**: Placing one hyper-detailed, weathered prop next to a clean, flatly shaded barrel shatters immersion immediately. Keep your level of detail, wear, and color discipline consistent across everything in view.
