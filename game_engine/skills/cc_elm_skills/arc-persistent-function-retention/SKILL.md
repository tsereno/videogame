---
name: arc-persistent-function-retention
title: arc-persistent-function-retention
type: concept/arc-reasoning
description: AST validation, static namespace isolation, dependency analysis, and source-only function persistence across stateless REPL sandbox calls.
status: stable
generated:
  by: agent:google-antigravity
  at: '2026-11-09T08:45:00Z'
tags:
- arc-agi
- spatial-reasoning
- discrete-grid
---
# Persistent Function Retention Skill (`arc-persistent-function-retention`)

Operational specification and AST validation mechanics for preserving reusable utility functions across stateless sandbox tool executions without persisting corruptible runtime global state.

---

## 1. Statutory Context & Principles

Standard LLM tool runners execute code snippets in fresh Python subprocesses or reset namespaces.
Repeatedly re-generating boilerplate parsing routines, BFS pathfinders, and color counters consumes excessive context window and prefill latency.

### The Source-Only Retention Invariant
- **Zero Object Pickling**: Only pure Python function source code strings are retained. No heap objects, file handles, or runtime variable values are saved.
- **Stateless Replay**: Retained functions are injected directly into the AST of subsequent tool invocations.
- **Deterministic Compilation**: Functions must compile identically in an isolated `python -I -S` environment.

---

## 2. AST Validation & Eligibility Rules

When a Python snippet executes, top-level AST nodes are inspected:
$$
\mathcal{N}_{\text{top}} = \text{ast.parse}(\text{code}).\text{body}
$$
A node $f \in \mathcal{N}_{\text{top}}$ is eligible for retention if and only if it satisfies all of the following predicates:

### Static Eligibility Predicates
1. **Node Type**: $f$ must be an `ast.FunctionDef` or `ast.AsyncFunctionDef`.
2. **No Decorators**: $f.\text{decorator\_list} = \emptyset$ (avoids hidden closure state).
3. **No Dynamic Annotations**: Avoids types requiring complex external imports.
4. **Literal Parameter Defaults**: Defaults must be AST literals (`ast.Constant`, `ast.List`, `ast.Tuple`).
5. **No Mutation of Global Scope**: No `global` or `nonlocal` declarations that attempt to mutate host state.

---

## 3. Dependency Closure & Import Harvesting

A function $f$ often depends on specific standard library imports or other retained helper functions:

### Import Extraction Operator
$$
\text{Imports}(f) = \{ \text{ast.unparse}(n) \mid n \in \text{ast.walk}(f) \text{ and } n \text{ is } (\text{Import}, \text{ImportFrom}) \}
$$
- Wildcard imports (`from module import *`) are **strictly prohibited** and trigger immediate rejection.
- Explicit imports are harvested and bundled into the retained function preamble.

### Dependency Graph Verification
Let dependency graph of functions be $\mathcal{G} = (\mathcal{V}, \mathcal{E})$.
A function $f$ is retained only if:
$$
\forall g \in \text{Dependencies}(f), \quad g \in \mathcal{V}_{\text{retained}} \cup \text{Builtins} \cup \text{HostGlobals}
$$
Where `HostGlobals` includes standard competition bindings (`current_frame`, `action`, `frame_diff`).

---

## 4. Lifecycle Scope & Rejection Feedback

Functions are retained according to the designated lifecycle mode:
- **`level` Mode**: Retained functions expire upon level completion (clearing level-specific heuristics).
- **`game` Mode**: Retained functions persist across all levels of the active game (preserving general algorithms like flood fill and pathfinding).

### Diagnostic Rejection Hints
If a function definition fails validation, the harness returns an informative diagnostic message rather than failing the execution:
```text
[RETAINED FUNCTION REJECTED] Function 'find_path' was not retained:
Reason: Uses wildcard import 'from math import *'.
Fix: Use explicit imports inside the function definition.
```
