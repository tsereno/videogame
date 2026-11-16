---
name: arc-2d-atomic-taxonomy
title: arc-2d-atomic-taxonomy
type: concept/arc-reasoning
description: Exhaustive mathematical formalization and 6-stage sub-frame execution pipeline for the 6 foundational atomic primitives and 8 macro task domains (A-H) of 2D discrete and continuous games.
status: stable
generated:
  by: agent:google-antigravity
  at: '2026-11-09T08:45:00Z'
tags:
- arc-agi
- spatial-reasoning
- discrete-grid
---
# 2D Game Task Taxonomy & 6-Stage Sub-Frame Execution Engine

Every task in a 2D game—whether a continuous physics platformer, a top-down tactical RPG, or a discrete grid-based puzzle—reduces to sequences of **six foundational atomic primitives** operating on a 2D coordinate space $(x, y)$ or discrete matrix $[r, c]$ across time steps $t \to t+1$, resolved through a deterministic **6-Stage Sub-Frame Execution Pipeline**.

---

## 1. The 6 Foundational Atomic Primitives

Before grouping tasks by gameplay mechanics, every action in a 2D environment decomposes into these irreducible state mutations:

| Atomic Primitive | Mathematical / State Operation | Smallest Possible Unit |
| :--- | :--- | :--- |
| **1. Spatial Translation** | $P_{t+1} = P_t + \Delta P$ | Shifting an entity's coordinate by 1 grid cell or 1 sub-pixel delta $(dx, dy)$. |
| **2. Spatial Orientation** | $\theta_{t+1} = (\theta_t + \Delta \theta) \bmod 360^\circ$ or Matrix Transpose/Flip ($D_4$) | Rotating an entity by a discrete step ($90^\circ$) or flipping its local axis sign $(-x, y)$. |
| **3. State / Attribute Mutation** | $S(e)_{t+1} = f(S(e)_t, \text{input})$ | Changing a single scalar or enum property on an entity or cell (e.g., color ID $0 \to 1$, $\text{HP} - 1$, $\text{solid} = \text{false}$). |
| **4. Topological Lifecycle** | $E_{t+1} = E_t \cup \{e_{\text{new}}\}$ or $E_t \setminus \{e_{\text{old}}\}$ | Instantiating (spawning) a new entity/tile, destroying (despawning) an existing one, or binding two entities into a parent-child group. |
| **5. Spatial Query / Overlap** | $\text{Intersect}(A, B) \to \{\text{true}, \text{false}\}$ | Checking whether two coordinates, Axis-Aligned Bounding Boxes (AABBs), or ray segments share space. |
| **6. Information / Rule Evaluation** | $\text{If } \phi(\text{State}_t) \text{ then Action}$ | Evaluating a boolean predicate over local neighborhood cells or global state counters. |

---

## 2. Exhaustive Taxonomy of 2D Game Tasks (Macro to Atomic: Domains A–H)

### A. Locomotion & Spatial Navigation Tasks
Moving an agent from an origin state to a target coordinate under spatial and temporal constraints.

1. **Discrete Grid Stepping**
   - **Cardinal step**: Increment/decrement row or column by 1 ($[r \pm 1, c]$ or $[r, c \pm 1]$) if target cell is passable.
   - **Ordinal (diagonal) step**: Simultaneous row and column increment ($[r \pm 1, c \pm 1]$), optionally checking corner-cutting collision.
   - **Non-local step (Knight's move / Jump)**: Offset by $[r \pm m, c \pm n]$ bypassing intermediate cell collision checks.
   - **Toroidal (Wrap-around) step**: Apply modulo arithmetic at boundary edges ($c_{t+1} = (c_t + 1) \bmod W$, $r_{t+1} = (r_t + 1) \bmod H$).
   - **Ballistic / Ice slide**: Repeat cardinal step $[r + dr, c + dc]$ in a loop until cell $[r + dr, c + dc]$ is solid or hazardous.
2. **Continuous Kinematics**
   - **Linear velocity integration**: Add velocity vector to position ($x_{t+1} = x_t + v_x \Delta t$).
   - **Acceleration & thrust**: Add force/acceleration vector to velocity ($v_{x, t+1} = v_{x, t} + a_x \Delta t$).
   - **Friction & damping**: Multiply velocity by decay scalar ($v_{x, t+1} = v_{x, t} \cdot \mu$).
   - **Gravity arc & jumping**: Apply constant downward acceleration $g$ every tick; apply instantaneous upward impulse $-v_{\text{jump}}$ when grounded flag is true.
   - **Wall-slide & wall-jump**: Clamp downward terminal velocity when horizontal AABB contacts a wall; apply diagonal impulse $(-n_x \cdot v_x, -v_y)$ on jump input.
   - **Dash / Blink**: Temporarily disable gravity, set velocity to a fixed high magnitude for $N$ frames, or instantly add $(dx, dy)$ while toggling collision immunity.
3. **Pathfinding & Obstacle Negotiation**
   - **Static obstacle avoidance**: Compute collision-free path across passable nodes (A* / BFS primitive).
   - **Dynamic hazard dodging**: Predict future bounding-box positions of moving hazards and select a safe coordinate at $t + k$.
   - **Moving platform synchronization**: Match agent velocity to platform velocity ($\Delta P_{\text{agent}} = \Delta P_{\text{platform}} + \Delta P_{\text{local}}$) while contact persists.
   - **One-way traversal**: Allow pass-through when velocity dot product with surface normal is negative ($\vec{v} \cdot \vec{n} \le 0$), block when positive.
   - **Portal / Teleporter transit**: On overlap with Entry $(x_1, y_1)$, overwrite agent coordinates with Exit $(x_2, y_2)$ while preserving or rotating momentum vector.

### B. Object Manipulation & Spatial Rearrangement Tasks
Altering the spatial configuration of non-agent entities in the environment.

1. **Push & Pull Mechanics**
   - **Single-block push (Sokoban primitive)**: If agent steps into cell $A$ containing a pushable object, and cell $B$ behind $A$ along movement vector is empty, translate both object $(A \to B)$ and agent $(\text{Origin} \to A)$.
   - **Multi-block chain push**: Recursively verify if a contiguous line of $k$ objects has an empty terminal cell at $k+1$ and total mass is within agent push strength; shift all $k$ objects by 1 unit.
   - **Pull / Tether**: When moving away from an adjacent object while holding a grab flag, translate object into the agent's vacated coordinate.
2. **Pickup, Carry & Placement**
   - **Bind (Pickup)**: Remove item from world collision grid and attach its transform to agent position plus carry offset.
   - **Unbind (Drop)**: Detach item from agent and place it at agent's current or adjacent facing coordinate.
   - **Throw / Launch**: Detach item and initialize it with an impulse velocity vector $(v_x, v_y)$.
3. **Geometric Alignment & Assembly**
   - **Socket / Receptor docking**: Translate an object until its coordinate matches a target receptor coordinate $[r_{\text{target}}, c_{\text{target}}]$.
   - **Polyomino / Tile packing**: Translate and rotate multi-cell shapes so their union covers a target region without overlap ($A \cap B = \emptyset$).
   - **Network / Pipe connectivity**: Rotate or swap tile segments until adjacent edge ports match across a continuous path from source node to sink node.

### C. Grid & Cellular Transformation Tasks (Abstract & Puzzle Primitives)
Direct manipulation of grid states, common in puzzle games, cellular automata, and abstract 2D reasoning environments.

1. **Flood Fill & Region Operations**
   - **Connected-component recoloring**: Select a seed cell $[r, c]$ and recursively mutate all orthogonally/diagonally connected cells sharing color $C_1$ to color $C_2$.
   - **Enclosure / Territory capture**: Detect a closed loop of agent trails or walls via boundary flood-fill and convert all interior cells to the captured state.
2. **Line, Ray & Projection Operations**
   - **Ray extrusion**: Starting at source $[r, c]$, mutate or query cells sequentially along direction $(dr, dc)$ until hitting an occluder.
   - **Reflection & refraction**: When a ray hits an angled reflector tile, transform direction vector $(dr, dc) \to (\pm dc, \pm dr)$; when hitting a splitter, spawn two orthogonal rays.
   - **Bridge / Trail drawing**: Mutate every cell vacated or entered by the agent from empty to solid/colored.
3. **Template, Symmetry & Morphological Operations**
   - **Sub-grid copy & stamp**: Extract a $w \times h$ sub-matrix of cell states and write those values at a target offset $[r_0, c_0]$, optionally masking out background cells (color $0$).
   - **Symmetry completion**: Mirror cell states across a horizontal, vertical, or diagonal axis ($M[r, W - 1 - c] = M[r, c]$).
   - **Scale / Kronecker expansion**: Replace each single cell of value $v$ with an $n \times n$ block of value $v$ (or a sub-pattern template).
   - **Gravity settling (Compaction)**: Shift all non-empty cells along a gravity vector until they rest against the grid boundary or another non-empty cell (e.g., match-3 / falling-sand collapse).
   - **Row / Column clearing & shifting**: Detect when a full row/column satisfies a uniformity predicate, delete it, and shift all upper rows downward by 1.

### D. Combat, Force & Projectile Tasks
Hostile or kinetic interactions involving hitboxes, hurtboxes, and health states.

1. **Contact & Melee Tasks**
   - **Hitbox-Hurtbox intersection**: Spawn a temporary active AABB for $N$ frames; if it overlaps an enemy hurtbox AABB, trigger damage mutation.
   - **Stomp / Directional superiority**: Compare relative vertical positions and velocities during overlap; if $y_{\text{agent}}$ is above $y_{\text{enemy}}$ and $v_{y, \text{agent}}$ is downward, damage enemy and bounce agent upward.
   - **Knockback impulse**: Apply instantaneous velocity vector away from the impact center to the struck entity.
2. **Ranged & Ballistic Tasks**
   - **Aiming alignment**: Compute angle $\theta = \text{atan2}(y_{\text{target}} - y_{\text{agent}}, x_{\text{target}} - x_{\text{agent}})$ or align along cardinal grid lines.
   - **Hitscan raycast**: Cast an instantaneous line segment; apply state mutation to the first intersecting entity.
   - **Projectile spawning & steering**: Instantiate a moving entity; update its position linearly, parabolically, or via homing steering towards a target coordinate.
   - **Area-of-Effect (AoE) detonation**: Query all entities within Euclidean distance $\sqrt{\Delta x^2 + \Delta y^2} \le R$ or Manhattan distance $|\Delta r| + |\Delta c| \le R$ and apply state mutations.
3. **Defensive & Evasive Tasks**
   - **Directional shielding**: Cancel incoming damage/projectiles if the impact vector falls within an active angular arc $[\theta_{\min}, \theta_{\max}]$.
   - **Parry / Counter window**: Activate a brief frame window $[t_0, t_0 + k]$; if struck during this window, negate damage and stun or reflect the attacker.
   - **Invulnerability frames (I-frames)**: Toggle hurtbox collision flag off for $N$ ticks during a dodge or post-damage recovery.

### E. Logic, Trigger & State-Machine Tasks
Causal mechanisms where environmental states govern access and rule enforcement.

1. **Switch & Gate Logic**
   - **Momentary pressure plate**: Set gate state to open while at least one entity overlaps plate coordinate; revert to closed when overlap count is 0.
   - **Latch / Toggle switch**: Invert boolean state ($S = \neg S$) upon agent interaction or projectile hit.
   - **Combinational logic gates**: Evaluate multiple switch states via AND (all active), OR (any active), XOR (odd number active), or exact sequence order $[s_1, s_2, s_3]$ to unlock a target barrier.
   - **Timed relay**: Set state to open for $N$ ticks, decrementing a counter each tick until resetting to closed.
2. **Access & Key-Lock Matching**
   - **Attribute matching**: Permit passage or interaction only if agent's carried key ID/color matches the lock's required ID/color.
   - **Consumable lock opening**: Upon contact between matching key and lock, decrement key count by 1 and delete the lock tile.
3. **Meta-Rule & Temporal Manipulation**
   - **Rule token rewriting**: Push or align text/symbol tiles on the grid to dynamically alter engine collision or win predicates (e.g., binding WALL to STOP vs. PASS).
   - **State rewind**: Pop historical world states from a stack buffer to restore coordinates and attributes to time $t - k$.
   - **Time-clone recording**: Record input sequence $[a_1, a_2, \dots, a_n]$ and replay it on a spawned ghost entity in parallel with the live agent.

### F. Resource, Economy & Inventory Tasks
Quantitative state tracking and transformation of discrete or continuous counters.

1. **Acquisition & Depletion**
   - **Collectible pickup**: On spatial overlap with item entity, increment agent scalar counter ($\text{score} + v$) and despawn item.
   - **Node harvesting**: Apply repeated interaction ticks to a resource tile, decrementing its internal capacity while incrementing agent inventory until exhausted.
   - **Upkeep / Decay**: Decrement a vital scalar (health, oxygen, fuel, timer) by $\Delta v$ every tick; trigger failure state if scalar reaches 0.
2. **Transformation & Allocation**
   - **Recipe / Crafting conversion**: Verify inventory contains required input tuple $(k_1 \ge n_1, k_2 \ge n_2)$; subtract inputs and add output item $k_{\text{out}}$.
   - **Spatial grid inventory packing**: Place and rotate item polygons inside a bounded $W \times H$ container matrix without overlapping existing items.
   - **Budgeted unit/tower placement**: Deduct cost $c$ from currency pool and instantiate a functional entity on a valid buildable tile.

### G. Perception, Stealth & Information Tasks
Tasks governed by partial observability, signal detection, and rule induction.

1. **Visibility & Stealth**
   - **Vision-cone avoidance**: Keep agent coordinates outside the polygon defined by an observer's position, facing angle, field-of-view $\alpha$, and raycast occlusion boundaries.
   - **Fog-of-War exploration**: Transition grid cells from unseen to explored whenever Euclidean/Manhattan distance to the agent is within vision radius $R$.
   - **Noise radius management**: Modulate movement speed so generated acoustic radius $R_{\text{noise}}$ does not intersect enemy listener coordinates.
2. **Deduction & Memory**
   - **State revelation & matching**: Temporarily flip hidden tile states visible (e.g., pair matching), store coordinates in memory, and select matching pairs within $k$ attempts.
   - **Constraint satisfaction deduction**: Infer hidden tile states (e.g., Minesweeper hazard locations or Nonogram fills) from numerical neighborhood clue counts.
   - **Latent rule induction**: Observe state transition pairs $(S_t \to S_{t+1})$ or input-output grids to infer the underlying transformation function $f$, then apply $f$ to a novel test state.

### H. Multi-Agent & Temporal Coordination Tasks
Synchronizing actions across multiple controlled or autonomous entities.

1. **Scheduling & Turn Execution**
   - **Alternating ply selection**: Execute 1 atomic action, then yield execution until opponent/environment completes 1 atomic action.
   - **Action-Point (AP) budgeting**: Select a sequence of micro-actions whose sum of AP costs does not exceed $\text{AP}_{\max}$ for the current turn.
   - **Simultaneous commitment**: Lock in action vector $A_{\text{agent}}$ before observing $A_{\text{opponent}}$, then resolve both simultaneously.
2. **Multi-Entity Control**
   - **Synchronized movement (Slime / Linked avatars)**: Apply the same directional input $(dx, dy)$ simultaneously to $N$ distinct entities, resolving individual collisions independently.
   - **Avatar switching**: Transfer active input focus from Entity $A$ to Entity $B$ while leaving $A$ stationary or executing an idle loop.
   - **Escort / Herding**: Position the agent or hazards to steer an autonomous entity's pathfinding toward a goal receptor while keeping its HP above 0.
3. **Temporal Clone & Recorded Path Playback (Ghost Replay Archetype)**
   - **Macro-Phase Decomposition**: When a puzzle features remote gates requiring persistent switch depression (e.g. `g50t`), decompose the global solution into $K$ sequential phases corresponding to available clone recording slots.
   - **Phase $k$ Action Sequence Recording**: Avatar moves from level origin to switch $k$. Executing the interaction trigger (`SPACE` / `ACTION5`) locks the recorded sequence $\tau_k = [(dx_1, dy_1), \dots, (dx_m, dy_m)]$ into ghost clone entity $\mathcal{G}_k$, rewinds the primary avatar to spawn, and arms $\mathcal{G}_k$ for playback.
   - **Synchronous Parallel Replay Execution**: On each subsequent step $t \ge 1$ of Phase $k+1$, the engine steps the primary avatar with user action $a_t$ while advancing each active ghost $\mathcal{G}_i$ by its recorded displacement $\tau_i[t]$, holding remote switches open.
   - **Ghost Non-Interference Invariant**: Ghost clones and primary avatars share the lattice without mutual spatial collision blocking, allowing the avatar to traverse corridors opened by simultaneous ghost switch holds directly to the terminal objective.

---

## 3. The Sub-Frame Execution Pipeline (How One Task Tick Resolves)

At the engine or simulator level, any task above is executed through a deterministic **6-stage atomic tick**:

```
[1. Action Decode] ──► [2. Pre-Condition] ──► [3. Intent Project]
                                                      │
[6. Terminal Eval] ◄── [5. Cellular Prop] ◄── [4. Collision Push]
```

1. **Stage 1: Action Polling / Decoding (`Action Decode`)**
   - Read discrete action ID $a \in \{0 \dots K\}$ or continuous control vector $(u_x, u_y)$.
   - *2D Grid State (Sokoban / Tile)*: `action_id = 2 (MOVE_RIGHT) -> dG = (+1, 0), theta = 0 deg`
   - *Continuous Physics (Platformer)*: `u_t = [ax: +4.5, jump: 1] -> F_ext = (45.0, +180.0)`
   - Translates discrete controller tokens or continuous policy vectors into canonical engine intent structures and orientation deltas (Primitive 2).
2. **Stage 2: Pre-Condition Validation (`Pre-Condition`)**
   - Check if action $a$ is legal in current state $S_t$ (bounds check, cooldown $= 0$, sufficient stamina/AP, not in `dead_action_types` or `death_ledger`).
3. **Stage 3: Intent Projection (`Intent Project`)**
   - Compute candidate next coordinates $(x', y')$ or target cell $[r', c']$ ($P^* = P_t + \Delta P$, toroidal modulo wrap, or ballistic slide ray).
4. **Stage 4: Spatial & Collision Resolution (`Collision Push`)**
   - Query spatial index (grid array or quadtree) at $[r', c']$. Resolve solid blocking, single-block & multi-block chain pushes, pull/tether, or physics impulses.
5. **Stage 5: State & Cellular Propagation (`Cellular Prop`)**
   - Execute triggered mutations (damage subtraction, connected-component flood fills, territory capture, gravity settling, row/column clearing, switch toggles, laser/mirror ray updates, symmetry completion) until a stable fixed point is reached.
6. **Stage 6: Goal & Terminal Evaluation (`Terminal Eval`)**
   - Evaluate win predicate $\mathcal{W}(S_{t+1})$ and loss predicate $\mathcal{L}(S_{t+1})$, emitting reward $\Delta R$ and terminal flag.
