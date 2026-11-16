---
name: arc-geometric-infill
title: arc-geometric-infill
type: concept/arc-reasoning
description: Mathematical formalization and operational instructions for container corner projection, expanding anchor bounding envelopes, barrier particle condensation, and multi-scale template substitution.
status: stable
generated:
  by: agent:google-antigravity
  at: '2026-11-09T08:45:00Z'
tags:
- arc-agi
- spatial-reasoning
- discrete-grid
---
# Geometric Infill Skill (`arc-geometric-infill`)

Provides formal mathematical formulations and discrete geometric operators for container corner indirection, obstacle-bounded box expansion, barrier particle settling, and invariant template substitution on discrete 2D lattices \(G \in \mathbb{Z}_{\ge 0}^{H \times W}\).

---

## 1. Container Corner Quad-Projection (`solve_container_corner_quad`)

Maps outer peripheral anchor dots through a container frame into a 4-quadrant symmetric interior block fill.

### Mathematical Formulation
1. **Container Detection**:
   Locate continuous rectangular bounding perimeter of uniform frame color \(c_{\text{frame}}\) with hollow interior:
   \[
   B_{\text{inner}} = [r_0 + 1 : r_1 - 1, \; c_0 + 1 : c_1 - 1]
   \]
   where \((r_1 - r_0) \ge 4\), \((c_1 - c_0) \ge 4\), and \((G[B_{\text{inner}}] = 0)\).
2. **Centroid Reference**:
   \[
   \bar{r} = \frac{r_0 + r_1 - 1}{2}, \qquad \bar{c} = \frac{c_0 + c_1 - 1}{2}
   \]
3. **Corner Dot Induction**:
   For each non-frame particle \((r_d, c_d)\) with color \(c_d \notin \{0, c_{\text{frame}}\}\):
   Assign to quadrant index:
   \[
   q_r = \mathbb{I}(r_d \ge \bar{r}), \qquad q_c = \mathbb{I}(c_d \ge \bar{c})
   \]
   Setting \(K(q_r, q_c) = c_d\).
4. **Dihedral Diagonal Parity Completion**:
   Enforce antipodal symmetry:
   \[
   K(1 - q_r, 1 - q_c) = K(q_r, q_c) \quad \text{for any unassigned corner.}
   \]
5. **Interior Block Infilling**:
   Partition \(B_{\text{inner}}\) into four equal sub-blocks \((\Delta_r, \Delta_c) = \big(\frac{h_{\text{inner}}}{2}, \frac{w_{\text{inner}}}{2}\big)\):
   \[
   G_{\text{out}}[r_0 + 1 + u \cdot \Delta_r : r_0 + 1 + (u+1) \cdot \Delta_r, \;\; c_0 + 1 + v \cdot \Delta_c : c_0 + 1 + (v+1) \cdot \Delta_c] = K(u, v)
   \]

---

## 2. Obstacle-Bounded Box Extension (`solve_expanding_anchor_box`)

Expands a segmented wireframe box of color \(c_{\text{box}}\) until its external boundary reaches tangential contact with obstacle anchor particles \(c_{\text{anchor}}\).

### Mathematical Formulation
1. Let the seed wireframe support be \(M_{\text{seed}} = \{(r, c) \mid G[r, c] = c_{\text{box}}\}\) with bounding span \([r_0, c_0] \times [r_1, c_1]\).
2. Anchor set: \(\mathcal{A} = \{(r, c) \mid G[r, c] = c_{\text{anchor}}\}\).
3. Search for the maximal envelope \([R_0, C_0] \times [R_1, C_1]\) containing \(M_{\text{seed}}\) satisfying:
   - **Exclusion**: \(\big([R_0, R_1] \times [C_0, C_1]\big) \cap \mathcal{A} = \emptyset\).
   - **Tangential Contact**: Each expanded face must be in tangential contact (\(L_1\) distance \(= 1\)) with at least one anchor in \(\mathcal{A}\).
   - **Maximal Volume**: \(\arg\max (R_1 - R_0 + 1)(C_1 - C_0 + 1)\).
4. Reconstruct external perimeter with \(c_{\text{box}}\), clear hollow interior, and preserve internal horizontal/vertical dividing lines extended across the expanded domain.

---

## 3. Directional Barrier Particle Settling (`solve_gravity_barrier_settle`)

Condenses dispersed particles toward a linear divider barrier line under directed compaction.

### Mathematical Formulation
1. **Barrier Line Detection**:
   Locate dominant linear divider barrier \(c_{\text{barrier}}\) with coordinates \(\mathcal{B}\).
2. **Dominant Orientation**:
   - If \(\Delta c(\mathcal{B}) \ge \Delta r(\mathcal{B})\): Barrier is horizontal along median row \(r^* = \text{median}(r)\).
     For each column \(c\) where \(G[r^*, c] = c_{\text{barrier}}\):
     * Particles above condense to top boundary: \(G_{\text{out}}[r^* - 1, c] \leftarrow \text{last non-zero in } G[:r^*, c]\).
     * Particles below condense to bottom boundary: \(G_{\text{out}}[r^* + 1, c] \leftarrow \text{first non-zero in } G[r^* + 1:, c]\).
   - If \(\Delta r(\mathcal{B}) > \Delta c(\mathcal{B})\): Barrier is vertical along median column \(c^* = \text{median}(c)\).
     Particles left and right condense analogously onto \(c^* \pm 1\).

---

## 4. Invariant Template Substitution (`solve_template_substitution`)

Identifies a rare marker shape template and detects all rotated/reflected occurrences within target color regions to substitute with marker color.

### Mathematical Formulation
1. Identify rare template component \(\mathcal{T} = \{(r, c) \mid G[r, c] = c_{\text{marker}}\}\).
2. Form canonical \(D_4\) orbit of normalized coordinate offsets:
   \[
   \mathcal{O}(\mathcal{T}) = \big\{ g(\mathcal{T}) - \min g(\mathcal{T}) \;\big|\; g \in D_4 \big\}
   \]
3. For target color \(c_{\text{target}}\), locate all translations \((r_0, c_0) + \tau\) that are monochromatic \(c_{\text{target}}\):
   \[
   \mathcal{M} = \big\{ (r_0, c_0) + \tau \;\big|\; \tau \in \mathcal{O}(\mathcal{T}) \text{ and } G[(r_0, c_0) + \tau] \equiv c_{\text{target}} \big\}
   \]
4. Select maximum non-overlapping independent set of matches and assign \(G_{\text{out}}[\mathcal{M}^*] \leftarrow c_{\text{marker}}\).
