---
name: arc-level-transfer-guidance
title: arc-level-transfer-guidance
type: concept/arc-reasoning
description: Bayesian hypothesis preservation, cross-level mechanic transfer, board-delta detection, and goal re-assessment protocols for multi-stage ARC games.
status: stable
generated:
  by: agent:google-antigravity
  at: '2026-11-09T08:45:00Z'
tags:
- arc-agi
- spatial-reasoning
- discrete-grid
---
# Level Transfer Guidance Skill (`arc-level-transfer-guidance`)

Operational cognitive protocol and hypothesis-transfer framework for transitioning between consecutive levels in interactive ARC games without catastrophic forgetting or naive trial re-discovery.

---

## 1. Cross-Level Transfer Principles

Multi-stage ARC games follow structured pedagogical progressions:
1. **Mechanic Invariance**: Fundamental movement physics, key-door bindings, and interaction laws discovered in Level 1 almost always carry forward into subsequent levels.
2. **Cumulative Complexity**: Higher levels introduce novel obstacles, secondary entity types, or inverse rules while preserving the underlying mechanics.
3. **Goal Mutation**: The primary win condition may remain identical (e.g. reach green portal) or mutate into multi-stage tasks (e.g. unlock key, then reach portal).

---

## 2. Bayesian Hypothesis Carry-Forward

Let the model's verified mechanic knowledge base at level completion $L$ be:
$$
\mathcal{K}_L = \{ \text{rule}_1, \text{rule}_2, \dots, \text{rule}_k \}
$$
Upon advancing to level $L+1$:
- **Prior Probability**: Initialize prior confidence $P(\text{rule}_i \in \mathcal{K}_{L+1}) = 0.95$.
- **Do Not Re-Discover**: Never spend actions or tokens testing known baseline behaviors (e.g. checking whether `UP` moves up) unless directly contradicted.
- **Novel Element Isolation**: Identify elements present in $G_{L+1}^{\text{init}}$ that did not exist in $G_L^{\text{final}}$.

---

## 3. Board-Delta Detection Protocol

Upon level initialization, compute spatial and topological deltas between the new board $G_{L+1}$ and previous board $G_L$:

### Delta Operator
$$
\Delta_{\text{palette}} = \text{UniqueColors}(G_{L+1}) \setminus \text{UniqueColors}(G_L)
$$
$$
\Delta_{\text{geometry}} = \text{ExtractComponents}(G_{L+1}) \setminus \text{ExtractComponents}(G_L)
$$

### Action Protocol for Novel Entities
1. If $\Delta_{\text{palette}} \ne \emptyset$:
   - Formulate focused exploratory probe targeting the unfamiliar color/entity.
   - Design shortest non-lethal sequence to observe entity response under directional movement or `SPACE`.
2. Update world model with novel interaction rules before synthesizing full path plan.

---

## 4. Goal-Commitment Hysteresis & Unreachable-Goal Falsification

To prevent goal-thrashing during hypothetical world-model rollouts and 1-step A* dead-end oscillation behind unmapped walls:
1. **Strict Real-Transition Goal Falsification**:
   Candidate goal bins $b_{\text{goal}} = (\lfloor r_g / 4 \rfloor, \lfloor c_g / 4 \rfloor)$ may only be marked falsified in $\mathcal{F}_{\text{goals}}$ when the **observed real avatar centroid** $(r_a, c_a)$ reaches $b_{\text{goal}}$ without completing the level, never during simulated MCTS or 6-stage subframe lookahead queries.
2. **Stagnation Falsification Horizon**:
   Track the minimum achieved Manhattan distance $d_{\min}(b_{\text{goal}})$ and stagnation step count $K_{\text{stag}}(b_{\text{goal}})$ on real transitions:
   $$
   K_{\text{stag}}(b_{\text{goal}}) \leftarrow \begin{cases} 0 & \text{if } \| (r_a, c_a) - (r_g, c_g) \|_1 < d_{\min}(b_{\text{goal}}) - 0.5 \\ K_{\text{stag}}(b_{\text{goal}}) + 1 & \text{otherwise} \end{cases}
   $$
   When $K_{\text{stag}}(b_{\text{goal}}) \ge 12$, add $b_{\text{goal}}$ to $\mathcal{F}_{\text{goals}}$ and flush the planned queue so the policy immediately rotates to the next salient object (e.g., an intermediate key or switch).
3. **Minimum Viable A* Plan Commitment**:
   Reject degenerate 1-step greedy A* partial paths (`len(best_path) < 2`) unless the terminal distance satisfies $d \le 2.5$, preventing repetitive 1-step wall-lunge oscillation.

---

## 6. Multi-Phase Cooperative Latch Transfer (`g50t` Archetype)

When a puzzle archetype demonstrates multi-phase cooperative mechanics (such as ghost cloning or interactive pressure-plate holding in Level 0):
1. **Mechanic Invariance of Clones**:
   The number of required switches/plates increases with level index $L$, but the core rule—*moving to plate $\to$ executing `SPACE` to clone $\to$ moving to next unlocked chamber*—is 100% invariant across all levels.
2. **Sequential Phase Decomposition**:
   - **Phase 1**: Solve path from level spawn to Plate 1, then execute `SPACE` (`ACTION5`).
   - **Phase 2**: Ghost 1 replays Phase 1 and holds Door 1 open. The avatar moves from spawn through Door 1 to Plate 2, then executes `SPACE` (`ACTION5`).
   - **Phase 3 / Final Phase**: Ghosts 1 and 2 hold Doors 1 and 2 open simultaneously. The primary avatar traverses the opened corridors directly to the goal sprite.
3. **Ghost Collision Immunity Invariant**:
   The active avatar and replaying ghost clones do not physically obstruct each other; multiple entities can occupy adjacent or identical paths during playback without barrier deadlock.
4. **Zero Re-Discovery Requirement**:
   Higher levels must never treat `SPACE` as an untested probe action. The empirical prior $P(\text{CloneMechanism} \mid \text{Level } 0) \approx 1.0$ dictates that whenever progress is blocked by a closed door, the agent must route to the nearest unpressed plate and trigger `SPACE`.

Avoid the common failure mode of executing the previous level's action sequence into the new board layout.

### Standard Operating Protocol on Level Transition:
```text
1. GROUND: Confirm new starting frame (current_frame) and dimensions.
2. RETAIN: Carry forward established physics and key bindings.
3. INSPECT: Identify new obstacles, portals, or interactable objects.
4. REASSESS: Does the target objective require intermediate tasks (e.g., collecting tokens)?
5. PLAN: Formulate fresh sequence tailored to the new geometry.
```
