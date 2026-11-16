---
name: arc-nca-manifold-features
title: arc-nca-manifold-features
type: concept/arc-reasoning
description: Mathematical formalization and operational instructions for extracting 160-dimensional local topological, neighborhood context, directional projections, and symmetry features per cell on 2D discrete grids.
status: stable
generated:
  by: agent:google-antigravity
  at: '2026-11-09T08:45:00Z'
tags:
- arc-agi
- spatial-reasoning
- discrete-grid
---
# Neural Cellular Automata (NCA) Manifold Features Skill (`arc-nca-manifold-features`)

Provides rigorous operational and mathematical specifications for extracting an invariant 160-dimensional continuous feature representation \(\phi(r, c) \in \mathbb{R}^{160}\) for every cell \((r, c)\) on discrete lattice \(G \in \{0, \dots, 9\}^{H \times W}\) without future or external leakage.

---

## 1. Feature Representation Space \(\phi(r, c) \in \mathbb{R}^{160}\)

For each coordinate \((r, c) \in \{0, \dots, H-1\} \times \{0, \dots, W-1\}\), the 160-dim feature vector is structured into five functional blocks:

### Block 1: Color Densities & Center One-Hot (\(d_0 \dots d_{59}\), 60 dims)
1. **Center Color One-Hot (\(0 \dots 9\))**:
   \[
   \phi_{0 \dots 9}(r, c) = \mathbf{e}_{G[r, c]} \in \{0, 1\}^{10}
   \]
2. **4-Connected Neighborhood Histogram (\(10 \dots 19\))**:
   Normalized color distribution over the 4 cardinal neighbors \(\{(r \pm 1, c), (r, c \pm 1)\}\):
   \[
   \phi_{10 + k}(r, c) = \frac{1}{4} \sum_{(u, v) \in \mathcal{N}_4(r, c)} \mathbb{I}(G[u, v] = k)
   \]
3. **8-Connected Peripheral Histogram (\(20 \dots 29\))**:
   Normalized color distribution over all 8 surrounding neighbors \(\mathcal{N}_8(r, c)\):
   \[
   \phi_{20 + k}(r, c) = \frac{1}{8} \sum_{(u, v) \in \mathcal{N}_8(r, c)} \mathbb{I}(G[u, v] = k)
   \]
4. **Marginal & Global Color Densities (\(30 \dots 59\))**:
   - Row slice mean: \(\phi_{30 + k}(r, c) = \frac{1}{W} \sum_{v=0}^{W-1} \mathbb{I}(G[r, v] = k)\).
   - Column slice mean: \(\phi_{40 + k}(r, c) = \frac{1}{H} \sum_{u=0}^{H-1} \mathbb{I}(G[u, c] = k)\).
   - Global lattice density: \(\phi_{50 + k}(r, c) = \frac{1}{HW} \sum_{u, v} \mathbb{I}(G[u, v] = k)\).

---

### Block 2: Directional Cardinal Neighbors (\(d_{60} \dots d_{99}\), 40 dims)
One-hot categorical color encodings for immediate cardinal steps (with boundary padding value \(-1\)):
- **Up (\(60 \dots 69\))**: \(\mathbf{e}_{G[r-1, c]}\) if \(r > 0\) else \(\mathbf{0}\).
- **Down (\(70 \dots 79\))**: \(\mathbf{e}_{G[r+1, c]}\) if \(r < H-1\) else \(\mathbf{0}\).
- **Left (\(80 \dots 89\))**: \(\mathbf{e}_{G[r, c-1]}\) if \(c > 0\) else \(\mathbf{0}\).
- **Right (\(90 \dots 99\))**: \(\mathbf{e}_{G[r, c+1]}\) if \(c < W-1\) else \(\mathbf{0}\).

---

### Block 3: Dihedral Invariant Reflections (\(d_{100} \dots d_{139}\), 40 dims)
Samples color under canonical dihedral transformations \(T \in D_4\):
- **Vertical flip**: \(\mathbf{e}_{G[H-1-r, c]}\) (\(100 \dots 109\)).
- **Horizontal flip**: \(\mathbf{e}_{G[r, W-1-c]}\) (\(110 \dots 119\)).
- **180° rotation**: \(\mathbf{e}_{G[H-1-r, W-1-c]}\) (\(120 \dots 129\)).
- **Diagonal transpose**: \(\mathbf{e}_{G[c, r]}\) if \(H = W\) else 180° rotation (\(130 \dots 139\)).

---

### Block 4: Spatial Coordinates & Topology (\(d_{140} \dots d_{154}\), 15 dims)
1. **Normalized Cartesian Coordinates**:
   - Normalized row: \(\hat{r} = \frac{r}{H-1}\) (dim 140), \((1 - \hat{r})\) (dim 142).
   - Normalized col: \(\hat{c} = \frac{c}{W-1}\) (dim 141), \((1 - \hat{c})\) (dim 143).
   - Radial diagonal offset: \(|\hat{r} - \hat{c}|\) (dim 144).
2. **Foreground Indicator**: \(\mathbb{I}(G[r, c] \ne 0)\) (dim 145).
3. **Connected Component Relative Size**:
   \[
   \phi_{146}(r, c) = \frac{|C(r, c)|}{HW}
   \]
   where \(C(r, c)\) is the 4-connected non-zero component containing \((r, c)\) (or \(0\) if background).
4. **Enclosed Cavity Hole Indicator**:
   \[
   \phi_{147}(r, c) = \mathbb{I}\Big((r, c) \in \big(\text{FillHoles}(G \ne 0) \setminus (G \ne 0)\big)\Big)
   \]
5. **Parity Checkers**:
   - Row parity: \(r \pmod 2\) (dim 148).
   - Col parity: \(c \pmod 2\) (dim 149).
   - Checkerboard parity: \((r + c) \pmod 2\) (dim 150).
6. **Boundary Flags**: \(\mathbb{I}(r = 0)\) (151), \(\mathbb{I}(r = H-1)\) (152), \(\mathbb{I}(c = 0)\) (153), \(\mathbb{I}(c = W-1)\) (154).

---

### Block 5: Ray Accumulation & Homogeneous Bias (\(d_{155} \dots d_{159}\), 5 dims)
Directional reachability indicators (whether any non-zero particle exists along ray):
- Ray from Top: \(\phi_{155}(r, c) = \bigvee_{u=0}^r \mathbb{I}(G[u, c] \ne 0)\).
- Ray from Bottom: \(\phi_{156}(r, c) = \bigvee_{u=r}^{H-1} \mathbb{I}(G[u, c] \ne 0)\).
- Ray from Left: \(\phi_{157}(r, c) = \bigvee_{v=0}^c \mathbb{I}(G[r, v] \ne 0)\).
- Ray from Right: \(\phi_{158}(r, c) = \bigvee_{v=c}^{W-1} \mathbb{I}(G[r, v] \ne 0)\).
- Constant affine bias: \(\phi_{159}(r, c) = 1.0\).
