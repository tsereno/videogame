---
name: arc-topological-mechanics
title: arc-topological-mechanics
type: concept/arc-reasoning
description: Mathematical formalization and operational instructions for discrete physical mechanics on 2D grids (gravity particle settling, fluid basin flow, ballistic ray reflections, and capacity absorption).
status: stable
generated:
  by: agent:google-antigravity
  at: '2026-11-09T08:45:00Z'
tags:
- arc-agi
- spatial-reasoning
- discrete-grid
---
# Topological Mechanics Skill (`arc-topological-mechanics`)

Provides exact operational, geometric, and topological mathematical instructions for a reasoning model to simulate physical behaviors on a discrete lattice \(G \in \mathbb{Z}_{\ge 0}^{H \times W}\) without imperative code.

---

## 1. Directional Particle Compaction (Gravity Settling)

Let lattice coordinates be \((r, c)\) with row index \(r \in \{0, \dots, H-1\}\) and column index \(c \in \{0, \dots, W-1\}\). Background is designated as \(0\).

### Mathematical Definition
For each 1D coordinate line \(L\) orthogonal to the force vector:
1. Extract the ordered multiset of non-zero particles:
   \[
   S(L) = \big( G[r, c] \;\big|\; (r, c) \in L \text{ and } G[r, c] \ne 0 \big)
   \]
   preserving their original relative sequence order.
2. Initialize target line \(L'\) as an all-zero vector of length \(|L|\).
3. **Downward Gravity (\(\downarrow\))**: Place \(S(L)\) at the maximum row indices:
   \[
   L'[|L| - |S(L)| + k] = S(L)[k] \quad \forall \; 0 \le k < |S(L)|
   \]
4. **Upward Gravity (\(\uparrow\))**: Place \(S(L)\) at the minimum row indices:
   \[
   L'[k] = S(L)[k] \quad \forall \; 0 \le k < |S(L)|
   \]
5. **Horizontal Gravity (\(\leftarrow, \rightarrow\))**: Analogously compact along row slices toward index \(0\) or index \(W-1\).

---

## 2. Viscous Fluid Infiltration & Basin Pooling (`gravity_water_flow`)

Simulates fluid particles \(P_{\text{fluid}} = \{(r, c) \mid G[r, c] = c_{\text{water}}\}\) falling under gravity and pooling in local topological depressions.

### Step-by-Step Mathematical Instructions:
1. **Extraction**: Identify all fluid source coordinates and clear them to background \(0\) on state grid \(G'\).
2. **Sequential Drop Propagation**: For each droplet unit:
   - Begin at origin \((r_0, c_0)\).
   - Compute reachable descent tree \(\mathcal{T}\) via discrete BFS:
     * **Vertical descent**: If cell \((r+1, c)\) is within bounds and \(G'[r+1, c] = 0\), add \((r+1, c)\) exclusively to queue.
     * **Lateral overflow**: If cell \((r+1, c)\) is obstructed (\(r+1 = H\) or \(G'[r+1, c] \ne 0\)), explore horizontal neighbors \((r, c-1)\) and \((r, c+1)\) if within bounds and empty. Mark all visited locations in \(\mathcal{T}\).
   - Identify the terminal basin coordinate \((r^*, c^*)\) defined by:
     \[
     (r^*, c^*) = \arg\max_{(r, c) \in \text{terminals}(\mathcal{T})} \Big( r \cdot W + c \Big)
     \]
     (i.e., maximal depth \(r\), breaking ties toward the rightmost column).
   - Infiltrate droplet: Assign \(G'[r^*, c^*] \leftarrow c_{\text{water}}\).

---

## 3. Ballistic Conduits & Ray Reflection Dynamics (`trace_ballistic_pipes`)

Traces linear ballistic rays emitted from nozzle boundary cells through pipe structures until obstacle collision.

### Operational Step-by-Step Instructions:
1. **Emitter Identification**:
   - Locate boundary nozzle column where entry conditions satisfy \(G[r, 0] = c_{\text{wall}}\) and \(G[r, 1] = c_{\text{channel}}\).
   - Emit horizontal ray vector \(\vec{d} = (0, 1)\) from position \((r_{\text{start}}, c_0)\).
2. **Ray Traversal**:
   - Step forward: \((r', c') = (r + d_r, c + d_c)\).
   - If next cell is free channel (\(c_{\text{channel}}\)), continue trajectory.
3. **Obstacle Collision & Reflection**:
   - If forward cell contains barrier color \(c_{\text{barrier}} \ne c_{\text{channel}}\):
     * Check orthogonal lateral clearances \((r \pm d_c, c \pm d_r)\).
     * If exactly one lateral direction provides open conduit flanked by continuous obstacle boundary, reflect ray direction \(\vec{d} \leftarrow \vec{d}_{\text{turn}}\).
     * Otherwise, terminal collision occurs: Mark point of impact as nozzle terminal \(c_{\text{wall}}\) and cease propagation.
4. Set source emitter cell \(G'[r_{\text{start}}, 0] \leftarrow c_{\text{channel}}\).

---

## 4. Geodesic Wavefront & Capacity Absorption (`bfs_box_capacity_absorb`)

Transfers discrete resource tokens from ambient space into target receptor boxes up to rigid capacity \(K\).

### Operational Instructions:
1. Locate receptor container mask \(M_{\text{box}} = \{(r, c) \mid G[r, c] \in \mathcal{C}_{\text{box}}\}\). Target capacity is \(K = |M_{\text{box}}|\).
2. Compute discrete Euclidean/Manhattan geodesic distance transform \(D(r, c)\) from \(M_{\text{box}}\) through non-obstacle cells:
   \[
   D(r, c) = \min_{(r_0, c_0) \in M_{\text{box}}} \text{dist}_{\text{free}}\big((r_0, c_0), (r, c)\big)
   \]
3. Collect all consumable resource coordinates \(\mathcal{R} = \{(r, c) \mid G[r, c] = c_{\text{token}}\}\).
4. Sort \(\mathcal{R}\) in strictly ascending order of geodesic distance: \(D(r_1, c_1) \le D(r_2, c_2) \le \dots\)
5. Select the top \(K\) closest tokens \(\mathcal{R}_{\text{absorb}} = \mathcal{R}[0:K]\).
6. Update output lattice:
   - For every absorbed token position \((r, c) \in \mathcal{R}_{\text{absorb}}\), replace with background \(c_{\text{bg}}\).
   - Populate container receptor cells \(M_{\text{box}}\) with token color \(c_{\text{token}}\).
