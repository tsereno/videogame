---
name: arc-context-drain-management
title: arc-context-drain-management
type: concept/arc-reasoning
description: Bounded KV cache pruning, floor-mode block eviction, rolling episodic summarization, and token quota preservation for long-horizon game reasoning.
status: stable
generated:
  by: agent:google-antigravity
  at: '2026-11-09T08:45:00Z'
tags:
- arc-agi
- spatial-reasoning
- discrete-grid
---
# Context Drain & Budget Management Skill (`arc-context-drain-management`)

Mathematical formulation, pruning policies, and token quota preservation mechanisms for managing context windows during deep, long-horizon interactive game play.

---

## 1. Context Window Dynamics & The Floor-Mode Dilemma

In long games (100+ turns), retaining raw message history causes KV cache exhaustion and high prefill latencies.
Trimming history by naive sliding windows or arbitrary cutoffs creates severe context oscillation:

### Floor-Mode vs Overshoot Trimming
Let maximum context budget be $B_{\text{max}}$ (e.g., 40,000 tokens) and target drain threshold be $B_{\text{target}}$ (e.g., 28,000 tokens).
- **Naive Drain**: Drops whole conversational turns until total tokens $< B_{\text{target}}$. Because reasoning turns often average 4,000 to 6,000 tokens, this frequently overshoots down to 14,000-20,000 tokens, discarding valuable recent trajectory evidence.
- **Floor-Mode Drain**: Drops mandatory historical blocks to get below $B_{\text{max}}$, but halts eviction before a subsequent drop would cross below $B_{\text{target}}$:
  $$
  \text{Retain}(H) \implies B_{\text{target}} \le \text{Tokens}(H) \le B_{\text{max}}
  $$
  This stabilizes the retained conversational memory band at the optimal information density.

---

## 2. Rolling Episodic Summarization Protocol

When cumulative context approaches $B_{\text{max}}$, synthesize an episodic milestone summary $\mathcal{S}$ before dropping raw turns:

### Autonomous Summary Requirements
A valid milestone summary must be completely self-contained and record:
1. **Established World Rules**: Proven movement mechanics, collision barriers, interactable switches.
2. **Ruled-Out Hypotheses**: Verified dead ends, lethal trap locations, non-functional actions.
3. **Current In-Progress Plan**: The active sub-goal and remaining execution steps.
4. **Active State Representation**: Current player coordinate, carried items, active switches.

### Replacement Operation
$$
\text{History} \leftarrow \big[ \text{SystemPrompt}, \; \text{Summary}(\mathcal{S}), \; \text{RecentTailTurns}(k) \big]
$$
All intervening raw turns are safely pruned from the active context.

---

## 3. Tool Calls Over Extended Thinking Invariant

In complex interactive games, models often spend thousands of reasoning tokens hypothesizing about grid states that could be verified in microseconds with execution code:

### Operational Principle
$$
\text{Latency}(\text{ToolCall}) \ll \text{Latency}(\text{ExtendedDecoding})
$$
- Generating 2,000 reasoning tokens takes 20-40 seconds of sequential decoding.
- Invoking a short Python script (`action(...)` or inspection) takes $< 100$ ms plus a cached prefill pass.
- **Rule**: When state confidence is uncertain, prioritize issuing an immediate discriminating tool probe over extensive conjectural reasoning.

---

## 4. Multi-Modal Vision Context Optimization

Grid visual representations can be supplied in dual modalities:
- **ASCII Matrix**: Exact numerical palette indices for fine programmatic inspection.
- **Rendered Grid PNG**: High-level topological overview.

### Downsampling & Resampling Policy
- **Nearest-Neighbor Resampling**: Preserves crisp single-cell boundaries for high-resolution vision encoders.
- **Interpolated Lanczos / Bilinear**: Softer edges that reduce high-frequency artifacts for natural-image vision encoders.
- **Frame Difference Windowing**: Strip intermediate unchanged visual frames from history, retaining only keyframes with positive $\Delta(G_t, G_{t+1})$.
