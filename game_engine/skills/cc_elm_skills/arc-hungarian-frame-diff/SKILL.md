---
name: arc-hungarian-frame-diff
title: arc-hungarian-frame-diff
type: concept/arc-reasoning
description: Discrete bipartite matching (Jonker-Volgenant Hungarian algorithm) and D4-invariant object tracking to compute structured frame differences (moved, rotated, appeared, disappeared).
status: stable
generated:
  by: agent:google-antigravity
  at: '2026-11-09T08:45:00Z'
tags:
- arc-agi
- spatial-reasoning
- discrete-grid
---
# Hungarian Object-Level Frame Diff Skill (`arc-hungarian-frame-diff`)

Mathematical formalization and operational instructions for computing semantic, object-level frame differences between discrete 2D grid states using optimal bipartite matching and dihedral canonicalization.

---

## 1. Object Extraction & Canonical Signatures

Let lattice grids before and after an action be $G_A, G_B \in \{0, \dots, 9\}^{H \times W}$.
Connected component labeling decomposes each grid into discrete object nodes:
$$
\mathcal{N}_A = \{ u_1, u_2, \dots, u_n \}, \quad \mathcal{N}_B = \{ v_1, v_2, \dots, v_m \}
$$
Each node $u$ comprises:
- Pixel coordinates: $\mathcal{P}(u) = \{ (r_i, c_i) \}$
- Palette color: $\text{color}(u)$
- Normalized cell set:
  $$
  \mathcal{C}_{\text{norm}}(u) = \{ (r - \min r, c - \min c) \mid (r, c) \in \mathcal{P}(u) \}
  $$

### Rotational Canonicalization & Symmetry Order
Apply 90-degree clockwise rotations $\mathcal{R}_0, \mathcal{R}_{90}, \mathcal{R}_{180}, \mathcal{R}_{270}$ to $\mathcal{C}_{\text{norm}}$.
- Canonical hash $H_{\text{canon}}(u) = \min_{\theta} \text{Hash}\big(\text{color}(u), \mathcal{R}_\theta(\mathcal{C}_{\text{norm}})\big)$
- Observed rotation $\theta(u) \in \{0^\circ, 90^\circ, 180^\circ, 270^\circ\}$ relative to canonical pose.
- Rotational symmetry order $S(u) \in \{1, 2, 4\}$.

---

## 2. Bipartite Cost Matrix & Dilated Spatial Filtering

Only objects within the spatial dilation radius of changed cells are matched:
$$
\Omega_{\Delta} = \{ (r, c) \mid G_A[r, c] \ne G_B[r, c] \}
$$
Filter active candidate sets $\tilde{\mathcal{N}}_A \subseteq \mathcal{N}_A$ and $\tilde{\mathcal{N}}_B \subseteq \mathcal{N}_B$ such that bounding boxes $\text{BBox}(u) \cap \text{Dilate}(\Omega_\Delta, 1) \ne \emptyset$.

### Cost Metric Formulation
For candidate pair $(u_i \in \tilde{\mathcal{N}}_A, v_j \in \tilde{\mathcal{N}}_B)$:
$$
C(i, j) = \begin{cases}
\|\text{Center}(u_i) - \text{Center}(v_j)\|_1 & \text{if } H_{\text{canon}}(u_i) = H_{\text{canon}}(v_j) \\
\infty & \text{otherwise (incompatible shape/color)}
\end{cases}
$$

---

## 3. Hungarian Matching Algorithm (Jonker-Volgenant Style)

Solve the linear sum assignment problem minimizing total displacement:
$$
\min_{\pi} \sum_{i=1}^n C(i, \pi(i))
$$
Using potential vectors $u \in \mathbb{R}^{n+1}$ and $v \in \mathbb{R}^{m+1}$:
- Maintains dual feasibility: $C(i, j) - u_i - v_j \ge 0$.
- Runs in $O(n^2 m)$ time.
- For identical object groups exceeding size threshold $K_{\text{group}}$, fallback to pooled count differences to prevent $O(n^3)$ combinatorial explosion.

---

## 4. Semantic Event Classification

Given optimal assignment $\pi^*$:
1. **Moved Object**:
   Matched $(u, v)$ where $\text{TopLeft}(u) \ne \text{TopLeft}(v)$ and $\theta(u) = \theta(v)$.
   Reports: `{"color": c, "from": [r0, c0], "to": [r1, c1], "displacement": [dr, dc]}`.
2. **Rotated Object**:
   Matched $(u, v)$ where $\theta(u) \ne \theta(v)$.
   Reports: `{"color": c, "rotated_by": (rot_b - rot_a) % mod, "in_place": bool}`.
3. **Appeared Object**:
   Unmatched target node $v \in \tilde{\mathcal{N}}_B$.
   Reports: `{"color": c, "at": [r, c], "pixels": |\mathcal{P}(v)|}`.
4. **Disappeared Object**:
   Unmatched source node $u \in \tilde{\mathcal{N}}_A$.
   Reports: `{"color": c, "from": [r, c], "pixels": |\mathcal{P}(u)|}`.
5. **Color/Resized Transformation**:
   High spatial overlap $\text{IoU}(u, v) > 0.8$ with differing palette or pixel count.

---

## 5. Multi-Entity Tracking & Clone Discrimination Protocol

When multiple visual instances of the avatar color or controllable entity appear simultaneously on the discrete grid (e.g. following `SPACE` clone instantiation in `g50t`):
1. **Kinematic Action-Vector Matching**:
   Never average all pixels of the avatar color into a single global centroid $(r_a, c_a)$, which corrupts spatial tracking to phantom coordinates between clones.
2. **Active Avatar Component Identification**:
   Identify the active player avatar by selecting the connected component whose displacement from $G_{t-1}$ to $G_t$ matches the command action vector $(\Delta r_a, \Delta c_a) \equiv \vec{v}(a_t)$.
3. **Ghost / Replay Entity Isolation**:
   Components whose displacements do not match the immediate user action $a_t$ are marked as **Autonomous Replay Entities (Ghosts)** and tracked independently in the entity ledger. Their positions are checked against contact plates to predict door opening schedules.
