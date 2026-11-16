---
name: arc-pointer-dereference
title: arc-pointer-dereference
type: concept/arc-reasoning
description: Mathematical formalization and operational instructions for relational graph dereferencing, marker anchors, and legend color indirection on 2D discrete grids.
status: stable
generated:
  by: agent:google-antigravity
  at: '2026-11-09T08:45:00Z'
tags:
- arc-agi
- spatial-reasoning
- discrete-grid
---
# Pointer Dereference Skill (`arc-pointer-dereference`)

Provides rigorous operational rules for resolving indirect memory pointers, index lookups, and relational symbols embedded in 2D grids without imperatively coded programs.

---

## 1. Flower-Stem Pointer Dereferencing (`dereference_flower_vines`)

Models composite nodes and directed pointer paths across the lattice.

### Node & Path Definitions
1. **Node Tuple**: A flower node \(F_i\) centered at \((r_i, c_i)\) consists of:
   - Center value \(V(F_i) = G[r_i, c_i]\).
   - Peripheral ring color \(R(F_i) = G[r_i \pm 1, c_i] = G[r_i, c_i \pm 1]\).
   - Coordinate footprint \(\Omega(F_i)\) spanning the \(\{3\times 3\}\) cross or box.
2. **Directed Vine Stem**: Connected component of conduit cells \(C_{\text{vine}} = \{(r, c) \mid G[r, c] = c_{\text{stem}}\}\).
3. **Endpoints**: Cells in \(C_{\text{vine}}\) with 8-neighborhood degree \(\le 1\).

### Step-by-Step Mathematical Instructions:
1. Detect all valid node tuples \(\mathcal{F} = \{F_1, F_2, \dots\}\) across the grid.
2. Construct inverted lookup dictionary \(\text{Map}: \text{Ring Color} \to \text{Center Value}\), defined by \(\text{Map}(R(F_i)) = V(F_i)\).
3. For each candidate node \(F_i\):
   - Check if node \(\Omega(F_i)\) is connected to a stem conduit or touches a vine endpoint within distance \(d \le 2\).
   - If connected (valid dereference target):
     * The internal value is looked up via indirection:
       \[
       V_{\text{new}}(F_i) = \text{Map}\big(V(F_i)\big)
       \]
     * Set center pixel \(G'[r_i, c_i] \leftarrow V_{\text{new}}(F_i)\).
   - If unconnected (floating node without valid stem anchor):
     * Prune entire footprint: Assign \(G'[\Omega(F_i)] \leftarrow 0\).

---

## 2. Detached Legend Index Resolution (`legend_guided_hole_fill`)

Maps internal cavity colors using detached 2D translation-invariant lookup palettes.

### Step-by-Step Instructions:
1. **Legend Detection**:
   - Locate isolated 8-connected component \(L\) with dimensions \(2 \times K\) or \(K \times 2\) containing distinct paired colors:
     \[
     \text{Pairs} = \big\{ (a_k, b_k) \;\big|\; 1 \le k \le K \big\}
     \]
2. **Object Enclosure Detection**:
   - For all non-legend connected components \(O_m\):
     * Compute topological boundary fill: \(H_m = \text{FillHoles}(O_m) \setminus O_m\).
     * Identify boundary perimeter color \(c_{\text{outer}} = \text{Color}(O_m)\).
3. **Bijective Indirection Mapping**:
   - Count overlap between set of outer boundary colors \(\{c_{\text{outer}}\}\) and legend sides \(\{a_k\}\) vs \(\{b_k\}\).
   - If \(\sum \mathbb{I}(a_k \in \{c_{\text{outer}}\}) \ge \sum \mathbb{I}(b_k \in \{c_{\text{outer}}\})\):
     \[
     \Phi: a_k \mapsto b_k
     \]
   - Otherwise:
     \[
     \Phi: b_k \mapsto a_k
     \]
4. **Cavity Infilling**:
   - For each cavity mask \(H_m\), set \(G'[H_m] \leftarrow \Phi(c_{\text{outer}})\).

---

## 3. Anchor Marker Cross Dereference (`solve_cross4_pointer`)

Determines single-value outputs by identifying invariant cross markers.

### Step-by-Step Instructions:
1. Identify all marker coordinates \(P_{\text{anchor}} = \{(r, c) \mid G[r, c] = c_{\text{anchor}}\}\) (e.g. \(c_{\text{anchor}} = 4\)).
2. For each marker \((r, c) \in P_{\text{anchor}}\):
   - Sample cardinal neighbors \(\mathcal{N}_4(r, c) = \{G[r-1, c], G[r+1, c], G[r, c-1], G[r, c+1]\}\).
   - If \(\ge 3\) cardinal neighbors share a uniform non-marker color \(c_{\text{ring}}\), record \(c_{\text{ring}}\) as an active pointer.
3. Compute the statistical mode of recorded pointer colors:
   \[
   c^* = \text{mode}\big(\{c_{\text{ring}}\}\big)
   \]
4. Output scalar grid \(G_{\text{out}} = [[c^*]]\).
