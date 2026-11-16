---
name: arc-bounding-morphology
title: arc-bounding-morphology
type: concept/arc-reasoning
description: Mathematical formalization and operational instructions for bounding box extraction, connected-component cropping, subgrid isolation, and morphological operations on 2D discrete grids.
status: stable
generated:
  by: agent:google-antigravity
  at: '2026-11-09T08:45:00Z'
tags:
- arc-agi
- spatial-reasoning
- discrete-grid
---
# Bounding Morphology Skill (`arc-bounding-morphology`)

Provides formal mathematical definitions and operational instructions for bounding-box extraction, component cropping, topology filtering, and subgrid decimation on discrete 2D lattices \(G \in \mathbb{Z}_{\ge 0}^{H \times W}\).

---

## 1. Non-Zero Support Bounding Box (`crop_nonzero_bbox`)

Isolates the minimal axis-aligned bounding box enclosing all foreground particles.

### Mathematical Definition
1. Define the foreground support set:
   \[
   \mathcal{S} = \big\{ (r, c) \in \{0, \dots, H-1\} \times \{0, \dots, W-1\} \;\big|\; G[r, c] \ne 0 \big\}
   \]
2. If \(\mathcal{S} = \emptyset\), return \(G\).
3. Compute the bounding limits:
   \[
   r_{\min} = \min_{(r, c) \in \mathcal{S}} r, \quad r_{\max} = \max_{(r, c) \in \mathcal{S}} r
   \]
   \[
   c_{\min} = \min_{(r, c) \in \mathcal{S}} c, \quad c_{\max} = \max_{(r, c) \in \mathcal{S}} c
   \]
4. Output the restricted sub-lattice:
   \[
   G_{\text{out}} = G\big[r_{\min} : r_{\max} + 1, \; c_{\min} : c_{\max} + 1\big]
   \]

---

## 2. Minority Color Bounding Box (`crop_minority_bbox`)

Crops the bounding box around the rarest non-background color in the input.

### Mathematical Definition
1. Compute the multiset histogram of non-zero particles:
   \[
   \text{cnt}(c) = \sum_{(r, u)} \mathbb{I}\big(G[r, u] = c \text{ and } c \ne 0\big)
   \]
2. Select the minimal frequency non-zero color:
   \[
   c^* = \arg\min_{c \in \text{supp}(G) \setminus \{0\}} \text{cnt}(c)
   \]
3. Define the minority coordinate set \(\mathcal{S}_{c^*} = \{(r, c) \mid G[r, c] = c^*\}\).
4. Extract the minimal bounding subgrid:
   \[
   G_{\text{out}} = G\big[\min(r) : \max(r) + 1, \; \min(c) : \max(c) + 1\big]_{(r, c) \in \mathcal{S}_{c^*}}
   \]

---

## 3. Maximal Connected Component Crop (`crop_largest_obj`)

Identifies and extracts the largest 4-connected foreground component.

### Mathematical Definition
1. Decompose foreground \(\{(r, c) \mid G[r, c] \ne 0\}\) into disjoint 4-connected components \(\mathcal{C} = \{C_1, C_2, \dots, C_m\}\).
2. Select component with maximal area (cardinality):
   \[
   C^* = \arg\max_{C \in \mathcal{C}} |C|
   \]
3. Crop lattice around the bounding box of \(C^*\):
   \[
   G_{\text{out}} = G\big[\min_{(r, c) \in C^*} r : \max_{(r, c) \in C^*} r + 1, \; \min_{(r, c) \in C^*} c : \max_{(r, c) \in C^*} c + 1\big]
   \]

---

## 4. Chromatic-Entropy Maximizing Component (`crop_most_colorful_8c`)

Selects the 8-connected component maximizing internal color diversity and area.

### Mathematical Definition
1. Let \(c_{\text{bg}}\) be the global mode color: \(c_{\text{bg}} = \arg\max_c |\{(r, c) \mid G[r, c] = c\}|\).
2. Segment non-background foreground \(\{(r, c) \mid G[r, c] \ne c_{\text{bg}}\}\) into 8-connected components \(\{K_1, \dots, K_n\}\).
3. For each component \(K_i\), let its bounding slice be \(B(K_i)\).
4. Compute the chromatic-area objective key:
   \[
   \Phi(K_i) = \Big( \big| \text{unique}\big(B(K_i) \setminus \{c_{\text{bg}}\}\big) \big|, \;\; |K_i| \Big)
   \]
5. Select \(K^* = \arg\max_{K_i} \Phi(K_i)\) under lexicographical order and return \(B(K^*)\).

---

## 5. Topological Hole Infilling (`fill_holes`)

Fills internal cavities enclosed by non-zero boundary shells.

### Mathematical Definition
1. Let background mask be \(M_0 = \{(r, c) \mid G[r, c] = 0\}\).
2. Define enclosed cavity mask \(H = \text{FillHoles}(G \ne 0) \setminus (G \ne 0)\).
3. If \(H \ne \emptyset\), assign all cells in \(H\) to the statistical mode color of the surrounding foreground:
   \[
   G_{\text{out}}[r, c] = \begin{cases} \text{mode}(G[G \ne 0]) & \text{if } (r, c) \in H \\ G[r, c] & \text{otherwise} \end{cases}
   \]

---

## 6. Gridline Sieve & Decimation (`strip_gridlines`, `downsample_block`)

### Gridline Sieve (`strip_gridlines`)
1. Remove all rows \(r\) where \(G[r, :]\) is monochromatic: \(R_{\text{keep}} = \{r \mid |\text{unique}(G[r, :])| > 1\}\).
2. Remove all columns \(c\) where \(G[:, c]\) is monochromatic: \(C_{\text{keep}} = \{c \mid |\text{unique}(G[:, c])| > 1\}\).
3. If \(R_{\text{keep}} \ne \emptyset\) and \(C_{\text{keep}} \ne \emptyset\), return \(G[R_{\text{keep}}, C_{\text{keep}}]\).

### Block Decimation (`downsample_block`)
Decimates the grid by block factor \(k \in \{2, 3\}\) where \(H \equiv 0 \pmod k\) and \(W \equiv 0 \pmod k\):
\[
G_{\text{out}}[r, c] = G[k \cdot r, \; k \cdot c]
\]
