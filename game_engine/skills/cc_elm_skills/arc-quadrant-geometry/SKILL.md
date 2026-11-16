---
name: arc-quadrant-geometry
title: arc-quadrant-geometry
type: concept/arc-reasoning
description: Mathematical formalization and operational instructions for spatial quadrant decomposition, 2x2 stamp relative localization, and invariant frequency ranking.
status: stable
generated:
  by: agent:google-antigravity
  at: '2026-11-09T08:45:00Z'
tags:
- arc-agi
- spatial-reasoning
- discrete-grid
---
# Quadrant Geometry Skill (`arc-quadrant-geometry`)

Provides mathematical formulations for spatial quadrant partitioning, relative coordinate transformations, and color-invariant frequency hierarchies.

---

## 1. Quadrant Parity XOR Decomposition (`solve_quadrant_parity`)

Maps \(5 \times 5\) input grids partitioned by row/column index \(2\) into compact \(2 \times 2\) boolean state representations.

### Mathematical Formulation
1. Decompose input \(G \in \{0, \dots, 9\}^{5 \times 5}\) into three constituent \(2 \times 2\) quadrant matrices:
   \[
   Q_{\text{TL}} = (G[0:2, 0:2] \ne 0) \in \{0, 1\}^{2 \times 2}
   \]
   \[
   Q_{\text{TR}} = (G[0:2, 3:5] \ne 0) \in \{0, 1\}^{2 \times 2}
   \]
   \[
   Q_{\text{BL}} = (G[3:5, 0:2] \ne 0) \in \{0, 1\}^{2 \times 2}
   \]
2. Compute the bitwise exclusive-OR matrix across quadrants:
   \[
   X = Q_{\text{TL}} \oplus Q_{\text{TR}} \oplus Q_{\text{BL}}
   \]
3. Compute total quadrant active bit population:
   \[
   N_{\text{active}} = \sum_{r=0}^1 \sum_{c=0}^1 \Big( Q_{\text{TL}}[r, c] + Q_{\text{TR}}[r, c] + Q_{\text{BL}}[r, c] \Big)
   \]
4. **Parity Phase Inversion**:
   - If \(N_{\text{active}} \equiv 1 \pmod 2\) (odd population):
     \[
     G_{\text{out}} = \mathbf{1}_{2 \times 2} - X
     \]
   - Else (even population):
     \[
     G_{\text{out}} = X
     \]

---

## 2. Relative Quadrant Stamp Layout (`solve_quadrant_stamps`)

Projects 2D spatial arrangements of disjoint \(2 \times 2\) stamp markers onto a canonical \(2 \times 2\) matrix.

### Operational Step-by-Step Instructions:
1. Locate dominant background color \(c_{\text{bg}}\) within non-zero particles.
2. Determine reference bounding box centroid of background region:
   \[
   \bar{r}_{\text{ref}} = \frac{r_{\min} + r_{\max}}{2}, \quad \bar{c}_{\text{ref}} = \frac{c_{\min} + c_{\max}}{2}
   \]
3. For each non-background connected component \(C_k\) with color \(c_k\):
   - Verify that \(C_k\) forms a rigid \(2 \times 2\) stamp (\(|C_k| = 4\) with bounding span \([2, 2]\)).
   - Compute component centroid \((\bar{r}_k, \bar{c}_k)\).
   - Project to quadrant indices:
     \[
     q_r = \begin{cases} 0 & \text{if } \bar{r}_k < \bar{r}_{\text{ref}} \\ 1 & \text{if } \bar{r}_k \ge \bar{r}_{\text{ref}} \end{cases}, \qquad
     q_c = \begin{cases} 0 & \text{if } \bar{c}_k < \bar{c}_{\text{ref}} \\ 1 & \text{if } \bar{c}_k \ge \bar{c}_{\text{ref}} \end{cases}
     \]
   - Assign output cell: \(G_{\text{out}}[q_r, q_c] \leftarrow c_k\).

---

## 3. Invariant Frequency Rank Hierarchy (`solve_frequency_rank`)

Resolves tasks where target color is determined by ranking prevalence across input demonstrations rather than static color values.

### Mathematical Formulation:
1. For input grid \(G\), compute the multiset color histogram over non-background elements:
   \[
   h(c) = \sum_{r, c} \mathbb{I}\big(G[r, c] = c \text{ and } c \ne 0\big)
   \]
2. Construct descending frequency-ranked sequence:
   \[
   \mathcal{S} = \big( c_{(1)}, c_{(2)}, c_{(3)}, \dots \big) \quad \text{such that} \quad h(c_{(1)}) \ge h(c_{(2)}) \ge \dots
   \]
3. Determine rank order \(k^*\) invariant across all demonstration pairs:
   \[
   c_{\text{target}} = \mathcal{S}[k^*]
   \]
4. Broadcast \(c_{\text{target}}\) across target shape dimensions.
