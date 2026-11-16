---
name: arc-symmetry-inpaint
title: arc-symmetry-inpaint
type: concept/arc-reasoning
description: Mathematical formalization and operational instructions for dihedral D4 symmetry, 2D translational lattice periodicity, and self-similar patch completion.
status: stable
generated:
  by: agent:google-antigravity
  at: '2026-11-09T08:45:00Z'
tags:
- arc-agi
- spatial-reasoning
- discrete-grid
---
# Symmetry & Inpainting Skill (`arc-symmetry-inpaint`)

Provides mathematical instructions for exact pattern reconstruction on discrete 2D lattices using group actions, period vectors, and local isomorphism matching.

---

## 1. 2D Translational Lattice Periodicity

Let \(M = \{(r, c) \mid G[r, c] = c_{\text{mask}}\}\) be the set of occluded cells.

### Period Vector Induction:
1. **Vertical Period (\(p_r\))**:
   - For candidate shift \(p_r \in \{1, \dots, \min(12, H-1)\}\):
   - Define valid overlap domain:
     \[
     \Omega(p_r) = \big\{ (r, c) \;\big|\; G[r, c] \ne c_{\text{mask}} \text{ and } G[r + p_r, c] \ne c_{\text{mask}} \big\}
     \]
   - Verify invariant equality:
     \[
     |\Omega(p_r)| \ge 10 \quad \text{and} \quad G[r, c] = G[r + p_r, c] \quad \forall \; (r, c) \in \Omega(p_r)
     \]
   - Infill occluded cells using cyclic translation:
     \[
     G'[r, c] \leftarrow G'[r \pm p_r, c] \quad \text{where source cell is unmasked.}
     \]
2. **Horizontal Period (\(p_c\))**:
   - Analogously evaluate column shift \(p_c \in \{1, \dots, \min(12, W-1)\}\) and infill along row vectors.

---

## 2. Dihedral Group \(D_4\) Reflection & Rotation Inpainting

Consider group actions \(g \in D_4 = \{\text{id}, \text{rot}_{90}, \text{rot}_{180}, \text{rot}_{270}, \text{flip}_h, \text{flip}_v, \text{transpose}, \text{anti-transpose}\}\).

### Operational Instructions:
1. For each group action \(g \in D_4\):
   - Compute candidate transformed grid \(T_g = g(G)\).
   - Evaluate agreement on valid unmasked intersections:
     \[
     \text{Score}(g) = \frac{\sum_{(r, c) \notin M} \mathbb{I}\big(G[r, c] = T_g[r, c]\big)}{\sum_{(r, c) \notin M} \mathbb{I}\big(T_g[r, c] \ne c_{\text{mask}}\big)}
     \]
2. If \(\text{Score}(g) \ge 0.98\):
   - Complete masked coordinates: For all \((r, c) \in M\) where \(T_g[r, c] \ne c_{\text{mask}}\), set:
     \[
     G'[r, c] \leftarrow T_g[r, c]
     \]

---

## 3. Scale-Invariant Self-Similar Patch Completion

For irregular cavities where global periodicity is broken by boundaries:
1. Identify unmasked anchor boundary surrounding occluded coordinate \((r_0, c_0)\).
2. Extract surrounding local window \(W_k(r_0, c_0)\) of radius \(k \in \{4, 3, 2\}\).
3. Search entire grid (and its \(D_4\) dihedral transforms) for a disjoint donor window \(W_{\text{donor}}\) satisfying:
   \[
   W_{\text{donor}}[u, v] = W_k[u, v] \quad \forall \; (u, v) \notin M
   \]
4. Impute missing center values directly from corresponding donor coordinates:
   \[
   G'[r_0, c_0] \leftarrow W_{\text{donor}}[r_{\text{rel}}, c_{\text{rel}}]
   \]

---

## 4. Bipartite Halves Logic (`halves_xor`, `halves_and`, `halves_nor`, `halves_or`)

Partitions grid into two equal sub-blocks \(H_1, H_2\) along midline divider:
1. Midline separation:
   - If odd dimension with uniform separator line at \(k = W // 2\), \(H_1 = G[:, :k]\), \(H_2 = G[:, k+1:]\).
   - If even dimension, bisect at \(W / 2\).
2. Apply point-wise boolean logic:
   - **XOR**: \(G'[r, c] = \mathbb{I}\big((H_1[r, c] \ne 0) \oplus (H_2[r, c] \ne 0)\big)\).
   - **AND**: \(G'[r, c] = \mathbb{I}\big((H_1[r, c] \ne 0) \land (H_2[r, c] \ne 0)\big)\).
   - **NOR**: \(G'[r, c] = \mathbb{I}\big(H_1[r, c] = 0 \land H_2[r, c] = 0\big)\).
   - **OR**: \(G'[r, c] = H_1[r, c]\) if \(H_1[r, c] \ne 0\) else \(H_2[r, c]\).
