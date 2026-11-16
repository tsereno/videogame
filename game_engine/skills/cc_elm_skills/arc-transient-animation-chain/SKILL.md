---
name: arc-transient-animation-chain
title: arc-transient-animation-chain
type: concept/arc-reasoning
description: Multi-frame animation sequence extraction, transient intermediate state detection, and collapsing monotonic interpolations for ARC-AGI games.
status: stable
generated:
  by: agent:google-antigravity
  at: '2026-11-09T08:45:00Z'
tags:
- arc-agi
- spatial-reasoning
- discrete-grid
---
# Transient Animation Chain Skill (`arc-transient-animation-chain`)

Mathematical formulation and operational procedures for processing multi-frame animation bursts from intermediate engine physics steps, separating genuine transient mechanics from redundant motion interpolation.

---

## 1. Frame Chain Sequence Model

An atomic engine action may trigger an internal physics simulation consisting of an ordered sequence of discrete frames:
$$
\mathcal{F} = \big( F_0, F_1, F_2, \dots, F_k \big)
$$
Where:
- $F_0 = G_{\text{before}}$ is the initial grid prior to action execution.
- $F_k = G_{\text{final}}$ is the resting grid observed by conventional step outputs.
- $F_1, \dots, F_{k-1}$ are transient intermediate physical frames.

---

## 2. Transient Cell Identification

Intermediate frames frequently contain critical transient information (e.g., laser pulses, flash switches, projectile collisions, temporary bounce barriers) where cells change color and then change back before resting.

### Mathematical Definition of Transient Cells
A coordinate $(r, c)$ is defined as **transient** if its value in an intermediate frame differs from both its initial and resting state:
$$
\mathcal{T}_{\text{transient}} = \Big\{ (r, c) \;\Big|\; \exists \, i \in \{1, \dots, k-1\} \text{ s.t. } F_i[r, c] \ne F_0[r, c] \;\land\; F_i[r, c] \ne F_k[r, c] \Big\}
$$
Or if the trajectory of values exhibits non-monotonic return:
$$
F_0[r, c] \ne F_i[r, c] \quad \text{and} \quad F_k[r, c] = F_0[r, c]
$$

---

## 3. Monotonic Interpolation Collapsing

When an entity translates smoothly from coordinate $A$ to coordinate $B$:
- Intermediate cells change exactly once along the path without reverting.
- Such intermediate frames represent trivial visual smoothing (motion tweening).
- Reporting every tween frame wastes prompt context tokens on redundant states.

### Compression Rule
If $\mathcal{T}_{\text{transient}} = \emptyset$ and for all $(r, c)$, the number of color transitions satisfies $|\text{Changes}(r, c)| \le 1$:
$$
\text{Compress}(\mathcal{F}) \to \{ F_0, F_k \}
$$
The intermediate sequence is collapsed to a concise motion vector note:
$$
\text{"Entity translated along trajectory } \big( (r_0, c_0) \to (r_k, c_k) \big) \text{ over } k \text{ animation frames."}
$$

---

## 4. Transient Visual Diagnostics & Timeline Prompting

When $\mathcal{T}_{\text{transient}} \ne \emptyset$:
1. **Bounding Box Isolation**:
   $$
   \text{BBox}(\mathcal{T}) = [\min r, \min c, \max r, \max c]
   $$
2. **Intermediate Peak Frame**:
   Extract frame $F^*$ exhibiting maximum divergence:
   $$
   F^* = \arg\max_{F_i} \|\Omega_\Delta(F_i, F_0)\|_0
   $$
3. **Structured Transient Report**:
   Surface transient cell coordinates, peak colors, and lifespan duration to the agent prompt so that ephemeral game mechanics (e.g., hidden collision triggers or temporary hazards) are fully observable.

---

## 5. Multi-Frame Interactive Door & Gate Transition Extraction

In grid puzzle and adventure environments (e.g. `g50t`, Sokoban, gate-key triggers), when an entity steps onto a pressure plate or triggers `ACTION5`:
1. **Sliding Barrier Animation Steps**:
   A single logical action invocation can cause an internal sequence of intermediate sub-pixel or multi-cell sliding frames ($F_0 \to F_1 \to \dots \to F_k$) where a barrier shifts progressively from open to closed (or vice versa).
2. **Intermediate vs. Terminal Obstacle Attribution**:
   During intermediate frames $F_1, \dots, F_{k-1}$, intermediate barrier positions must not be treated as newly appeared permanent walls. Verify against $F_k$: only cells that remain occupied in the resting frame $F_k$ are updated in the digital twin's `obstacle_grid`.
3. **Trigger Event Detection**:
   If a remote component $\mathcal{C}_{\text{remote}}$ changes state between $F_0$ and $F_k$ while the avatar moved to coordinate $(r_a, c_a)$, register $(r_a, c_a)$ as a **Functional Switch / Plate Anchor** with an established causal link $\text{Link}\big((r_a, c_a) \to \mathcal{C}_{\text{remote}}\big)$.
