"""The effect graph: nodes as pure functions, a JSON description, one evaluator.

A graph is a dict::

    {"size": [64, 64], "frames": 8, "fps": 12, "seed": 1, "loop": true, "anchor": [32, 60],
     "levers": {"strength": 1.0, "speed": 1.0, "size": 1.0},
     "nodes": [{"id": "n", "op": "perlin", "cells": 4, "tcells": 1},
               {"id": "shape", "op": "circle", "radius": "0.4 * $size"},
               {"id": "f", "op": "mul", "a": "@n", "b": "@shape"},
               {"id": "img", "op": "paint", "field": "@f", "ramp": ["#2a1206", "#fff1b0"], "bands": 6}],
     "out": "@img"}

Every node is ``{"id", "op", **params}``. A param that is a string starting with ``@`` is another node's output (by
id), one containing ``$`` is an arithmetic expression over the levers (``"$strength * 0.5 + 0.2"``); every other
value is passed as it is. Nodes evaluate in list order (a reference must point back), each exactly once.

Values flowing between nodes are: a **field** (float32 (T, H, W), 0..1), a **vector field** ((T, H, W, 2), pixels),
an **image** (uint8 (T, H, W, 4) RGBA), a **ramp** (uint8 (N, 3) LUT) or a plain number / list. The registry
(:data:`NODES`) documents each op's inputs and parameters so a UI or an assistant can list them.
"""
from __future__ import annotations

import ast
import hashlib
import inspect
import math
from dataclasses import dataclass, field

import numpy as np

__all__ = ["Context", "NODES", "node", "evaluate", "node_table", "Field", "Image", "lever_value"]

Field = np.ndarray
Image = np.ndarray


@dataclass
class Context:
    """What every node knows about the picture it draws into."""
    w: int = 64
    h: int = 64
    frames: int = 8
    fps: float = 12.0
    seed: int = 1
    levers: dict = field(default_factory=dict)
    anchor: tuple = (32, 60)

    def rng(self, salt: str | int = 0) -> np.random.Generator:
        """A generator per node: the seed and the node's id hashed together, so one node's dice never move another's."""
        h = hashlib.blake2b(f"{self.seed}:{salt}".encode(), digest_size=8).digest()
        return np.random.default_rng(int.from_bytes(h, "little"))

    def node_seed(self, salt: str | int = 0) -> int:
        h = hashlib.blake2b(f"{self.seed}:{salt}".encode(), digest_size=4).digest()
        return int.from_bytes(h, "little")

    def zeros(self) -> Field:
        return np.zeros((self.frames, self.h, self.w), np.float32)

    def grid(self):
        """(X, Y) in pixels for one frame, pixel centres."""
        ys, xs = np.mgrid[0:self.h, 0:self.w]
        return xs.astype(np.float32) + 0.5, ys.astype(np.float32) + 0.5

    def phase(self) -> np.ndarray:
        """0..1 over the loop, one value per frame (frame T would be 1.0 = frame 0 again)."""
        return np.arange(self.frames, dtype=np.float32) / max(self.frames, 1)


NODES: dict[str, dict] = {}


def node(name: str, kind: str, doc: str = "", returns: str = "field"):
    """Register an op. The function takes ``ctx`` first, then its inputs and parameters as keywords."""
    def deco(fn):
        sig = inspect.signature(fn)
        params = {}
        for p in list(sig.parameters.values())[1:]:
            if p.kind in (p.VAR_KEYWORD, p.VAR_POSITIONAL):
                continue
            params[p.name] = None if p.default is inspect.Parameter.empty else p.default
        NODES[name] = {"fn": fn, "kind": kind, "doc": doc or (fn.__doc__ or "").strip(), "params": params, "returns": returns}
        return fn
    return deco


# ------------------------------------------------------------------ lever expressions
_ALLOWED = (ast.Expression, ast.BinOp, ast.UnaryOp, ast.Num, ast.Constant, ast.Name, ast.Load, ast.Add, ast.Sub, ast.Mult, ast.Div,
            ast.Pow, ast.USub, ast.UAdd, ast.Call, ast.Mod)
_FUNCS = {"min": min, "max": max, "abs": abs, "round": round, "int": int, "sqrt": math.sqrt, "clamp": lambda v, lo, hi: max(lo, min(hi, v))}


def lever_value(expr: str, levers: dict) -> float:
    """``"$strength * 0.5"`` -> a number; names after ``$`` are levers, bare names too; + - * / ** and min/max/abs/clamp."""
    text = expr.replace("$", "")
    tree = ast.parse(text, mode="eval")
    for n in ast.walk(tree):
        if not isinstance(n, _ALLOWED):
            raise ValueError(f"lever expression {expr!r}: {type(n).__name__} is not allowed")
        if isinstance(n, ast.Call) and not (isinstance(n.func, ast.Name) and n.func.id in _FUNCS):
            raise ValueError(f"lever expression {expr!r}: only {sorted(_FUNCS)} may be called")
    names = {**{k: float(v) for k, v in levers.items() if isinstance(v, (int, float))}, **_FUNCS}
    return float(eval(compile(tree, "<lever>", "eval"), {"__builtins__": {}}, names))


def _resolve(v, values: dict, levers: dict):
    if isinstance(v, str):
        if v.startswith("@"):
            key = v[1:]
            if key not in values:
                raise KeyError(f"node {key!r} is referenced before it is defined (or does not exist)")
            return values[key]
        if "$" in v:
            return lever_value(v, levers)
        try:
            return float(v) if any(ch.isdigit() for ch in v) and v.strip().lstrip("-+").replace(".", "", 1).isdigit() else v
        except ValueError:
            return v
    if isinstance(v, list):
        return [_resolve(x, values, levers) for x in v]
    if isinstance(v, dict):
        return {k: _resolve(x, values, levers) for k, x in v.items()}
    return v


def evaluate(graph: dict, levers: dict | None = None, *, ctx: Context | None = None) -> tuple[np.ndarray, Context, dict]:
    """Run a graph. Returns (the output value, the context, every node's value by id)."""
    lv = {**graph.get("levers", {}), **(levers or {})}
    lv = {k: (v["default"] if isinstance(v, dict) else v) for k, v in lv.items()}
    if ctx is None:
        w, h = graph.get("size", [64, 64])
        frames = int(round(lever_value(str(graph.get("frames", 8)), lv))) if isinstance(graph.get("frames", 8), str) else int(graph.get("frames", 8))
        fps = float(graph.get("fps", 12.0))
        anchor = tuple(graph.get("anchor", [w // 2, h - 4]))
        ctx = Context(int(w), int(h), max(1, frames), fps, int(graph.get("seed", 1)), lv, anchor)
    else:
        ctx.levers = {**ctx.levers, **lv}
    values: dict = {}
    for spec in graph.get("nodes", []):
        spec = dict(spec)
        nid = spec.pop("id")
        op = spec.pop("op")
        if op not in NODES:
            raise KeyError(f"unknown node op {op!r} (node {nid!r}); known: {', '.join(sorted(NODES))}")
        params = {k: _resolve(v, values, ctx.levers) for k, v in spec.items() if not k.startswith("_")}
        fn = NODES[op]["fn"]
        sig = NODES[op]["params"]
        unknown = [k for k in params if k not in sig and not NODES[op].get("varkw")]
        if unknown and not _takes_kwargs(fn):
            raise TypeError(f"node {nid!r} ({op}): unknown parameter(s) {unknown}; it takes {sorted(sig)}")
        values[nid] = fn(ctx, **params, **({"_id": nid} if _takes_id(fn) else {}))
    out = graph.get("out")
    if out is None:
        out = "@" + graph["nodes"][-1]["id"]
    return _resolve(out, values, ctx.levers), ctx, values


def _takes_kwargs(fn) -> bool:
    return any(p.kind == p.VAR_KEYWORD for p in inspect.signature(fn).parameters.values())


def _takes_id(fn) -> bool:
    return "_id" in inspect.signature(fn).parameters


def node_table() -> list[dict]:
    """Every op: name, kind, what it returns, its parameters with defaults and its one-line doc."""
    rows = []
    for name, info in sorted(NODES.items()):
        rows.append({"op": name, "kind": info["kind"], "returns": info["returns"], "params": {k: v for k, v in info["params"].items() if k != "_id"},
                     "doc": info["doc"].split("\n")[0]})
    return rows
