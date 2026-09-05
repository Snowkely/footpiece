#!/usr/bin/env python3
"""Extract the checked FootPatternDrafting DXF fixture into browser-ready JSON.

This is a development-only extraction tool. The IM2M frontend never imports ezdxf
or parses DXF at runtime.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

import ezdxf


LANDMARK_IDS = ("P", "Q", "R", "S")
DEFAULT_SEGMENTS = 400
SHRINKED_SPLINE_LAYER = "Layer3"
COMPATIBILITY_SPLINE_LAYER = "Layer2"


def point_dict(point: Any, point_id: str) -> dict[str, float | str]:
    return {
        "id": point_id,
        "x": round(float(point.x), 12),
        "y": round(float(point.y), 12),
    }


def distance(point_a: Any, point_b: Any) -> float:
    return math.hypot(float(point_b.x) - float(point_a.x), float(point_b.y) - float(point_a.y))


def signed_area(points: list[Any]) -> float:
    return sum(
        points[index].x * points[(index + 1) % len(points)].y
        - points[(index + 1) % len(points)].x * points[index].y
        for index in range(len(points))
    ) / 2


def sample_closed_spline(spline: Any, segments: int) -> list[Any]:
    if not spline.closed:
        raise ValueError(f"SPLINE {spline.dxf.handle} is not closed")

    sampled = list(spline.construction_tool().approximate(segments=segments))
    if len(sampled) < 4:
        raise ValueError(f"SPLINE {spline.dxf.handle} produced too few sampled points")

    if distance(sampled[0], sampled[-1]) <= 1e-8:
        sampled.pop()

    return sampled


def nearest_sample(points: list[Any], landmark: Any) -> tuple[int, float]:
    return min(
        ((index, distance(point, landmark)) for index, point in enumerate(points)),
        key=lambda item: item[1],
    )


def extract(source_path: Path, segments: int) -> dict[str, Any]:
    document = ezdxf.readfile(source_path)
    modelspace = document.modelspace()

    landmark_points: dict[str, Any] = {}
    for landmark_id in LANDMARK_IDS:
        layer_name = f"LANDMARK_{landmark_id}"
        points = list(modelspace.query(f'POINT[layer=="{layer_name}"]'))
        if len(points) != 1:
            raise ValueError(
                f"{layer_name} must contain exactly one POINT; found {len(points)}"
            )
        landmark_points[landmark_id] = points[0].dxf.location

    splines = list(modelspace.query("SPLINE"))
    if len(splines) != 2:
        raise ValueError(f"Expected exactly two SPLINE entities; found {len(splines)}")

    candidates = []
    for spline in splines:
        sampled = sample_closed_spline(spline, segments)
        snaps = {
            landmark_id: nearest_sample(sampled, landmark)
            for landmark_id, landmark in landmark_points.items()
        }
        segment_lengths = [
            distance(sampled[index], sampled[(index + 1) % len(sampled)])
            for index in range(len(sampled))
        ]
        candidates.append(
            {
                "entity": spline,
                "points": sampled,
                "area": abs(signed_area(sampled)),
                "snaps": snaps,
                "snap_score": sum(snap_distance for _, snap_distance in snaps.values()),
                # Half of the longest sampled segment is a conservative nearest-sample bound.
                "snap_tolerance": max(segment_lengths) / 2,
            }
        )

    shrinked_layer_candidates = [
        candidate
        for candidate in candidates
        if candidate["entity"].dxf.layer == SHRINKED_SPLINE_LAYER
    ]
    compatibility_layer_candidates = [
        candidate
        for candidate in candidates
        if candidate["entity"].dxf.layer == COMPATIBILITY_SPLINE_LAYER
    ]

    if len(shrinked_layer_candidates) == 1 and len(compatibility_layer_candidates) == 1:
        # The checked real-photo fixture explicitly declares semantic layer identity.
        # Layer2 is only a compatibility outline; Layer3 is the drafting source.
        shrinked = shrinked_layer_candidates[0]
        original = compatibility_layer_candidates[0]
    elif not shrinked_layer_candidates and not compatibility_layer_candidates:
        # Legacy fixtures do not necessarily carry the canonical Layer2/Layer3 names.
        # Retain the checked area + landmark proximity heuristic only for that case.
        smallest_candidate = min(candidates, key=lambda candidate: candidate["area"])
        closest_candidate = min(candidates, key=lambda candidate: candidate["snap_score"])
        if smallest_candidate is not closest_candidate:
            raise ValueError(
                "The smaller SPLINE is not also the SPLINE closest to all P/Q/R/S landmarks; "
                "shrinked outline identity is ambiguous"
            )
        shrinked = smallest_candidate
        original = next(candidate for candidate in candidates if candidate is not shrinked)
    else:
        raise ValueError(
            f"Expected exactly one {SHRINKED_SPLINE_LAYER} shrinked SPLINE and one "
            f"{COMPATIBILITY_SPLINE_LAYER} compatibility SPLINE"
        )

    for landmark_id, (_, snap_distance) in shrinked["snaps"].items():
        if snap_distance > shrinked["snap_tolerance"]:
            raise ValueError(
                f"LANDMARK_{landmark_id} snap distance {snap_distance:.6f} exceeds "
                f"sampling tolerance {shrinked['snap_tolerance']:.6f}"
            )

    entity_counts = Counter(entity.dxftype() for entity in modelspace)
    layer_entity_counts: dict[str, Counter[str]] = defaultdict(Counter)
    for entity in modelspace:
        layer_entity_counts[entity.dxf.layer][entity.dxftype()] += 1

    raw_rs = distance(landmark_points["R"], landmark_points["S"])
    source_hash = hashlib.sha256(source_path.read_bytes()).hexdigest()

    def spline_metadata(candidate: dict[str, Any]) -> dict[str, Any]:
        entity = candidate["entity"]
        return {
            "handle": entity.dxf.handle,
            "layer": entity.dxf.layer,
            "closed": bool(entity.closed),
            "degree": int(entity.dxf.degree),
            "fitPointCount": len(entity.fit_points),
            "controlPointCount": len(entity.control_points),
            "sampledPointCount": len(candidate["points"]),
            "absoluteSampledAreaRaw": round(candidate["area"], 12),
        }

    return {
        "source": {
            "fileName": source_path.name,
            "sha256": source_hash,
            "dxfVersion": document.dxfversion,
            "insunits": int(document.units),
            "samplingSegments": segments,
            "layers": [layer.dxf.name for layer in document.layers],
            "entityCounts": dict(sorted(entity_counts.items())),
            "layerEntityCounts": {
                layer: dict(sorted(counts.items()))
                for layer, counts in sorted(layer_entity_counts.items())
            },
            "originalSpline": spline_metadata(original),
            "shrinkedSpline": spline_metadata(shrinked),
        },
        "originalOutline": [
            point_dict(point, f"original-{index:03d}")
            for index, point in enumerate(original["points"])
        ],
        "shrinkedOutline": [
            point_dict(point, f"shrinked-{index:03d}")
            for index, point in enumerate(shrinked["points"])
        ],
        "landmarks": {
            landmark_id: point_dict(landmark, landmark_id)
            for landmark_id, landmark in landmark_points.items()
        },
        "landmarkIndices": {
            landmark_id: index
            for landmark_id, (index, _) in shrinked["snaps"].items()
        },
        "snapDistancesRaw": {
            landmark_id: round(snap_distance, 12)
            for landmark_id, (_, snap_distance) in shrinked["snaps"].items()
        },
        "snapToleranceRaw": round(shrinked["snap_tolerance"], 12),
        "rawRS": round(raw_rs, 12),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--segments", type=int, default=DEFAULT_SEGMENTS)
    args = parser.parse_args()

    if args.segments < 300 or args.segments > 500:
        raise ValueError("--segments must be between 300 and 500")

    fixture = extract(args.source, args.segments)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(fixture, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
