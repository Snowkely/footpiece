#!/usr/bin/env python3
"""Development-only round-trip validator for FootPatternDrafting Master DXF files."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Any

import ezdxf


EXPECTED_LAYERS = ("CUT_FRONT", "CUT_BACK")
TOLERANCE_MM = 0.01


def bounds(points: list[tuple[float, float]]) -> dict[str, float]:
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    return {
        "minX": min_x,
        "minY": min_y,
        "maxX": max_x,
        "maxY": max_y,
        "width": max_x - min_x,
        "height": max_y - min_y,
    }


def close_enough(actual: float, expected: float, tolerance: float = TOLERANCE_MM) -> bool:
    return abs(actual - expected) <= tolerance


def assert_bounds_match(actual: dict[str, float], expected: dict[str, Any], label: str) -> None:
    for key in ("minX", "minY", "maxX", "maxY", "width", "height"):
        if not close_enough(actual[key], float(expected[key])):
            raise ValueError(
                f"{label} {key} mismatch: actual={actual[key]}, expected={expected[key]}"
            )


def polyline_length(points: list[tuple[float, float]]) -> float:
    return sum(
        math.hypot(points[index][0] - points[index - 1][0], points[index][1] - points[index - 1][1])
        for index in range(1, len(points))
    )


def validate(dxf_path: Path, manifest_path: Path) -> dict[str, Any]:
    document = ezdxf.readfile(dxf_path)
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if document.header.get("$INSUNITS") != 4:
        raise ValueError(f"$INSUNITS must be 4 (millimeters), got {document.header.get('$INSUNITS')}")
    if document.dxfversion != "AC1032":
        raise ValueError(f"DXF version must be AC1032, got {document.dxfversion}")
    if float(manifest["centimetersToMillimeters"]) != 10:
        raise ValueError("Manifest cm-to-mm conversion must be exactly 10")

    modelspace = document.modelspace()
    entities: dict[str, Any] = {}
    entity_points: dict[str, list[tuple[float, float]]] = {}
    entity_bounds: dict[str, dict[str, float]] = {}
    for layer in EXPECTED_LAYERS:
        if not document.layers.has_entry(layer):
            raise ValueError(f"Missing layer: {layer}")
        matches = list(modelspace.query(f'LWPOLYLINE[layer=="{layer}"]'))
        if len(matches) != 1:
            raise ValueError(f"{layer} must contain exactly one LWPOLYLINE; found {len(matches)}")
        entity = matches[0]
        if not entity.closed:
            raise ValueError(f"{layer} LWPOLYLINE is not closed")
        points = [(float(point[0]), float(point[1])) for point in entity.get_points("xy")]
        if len(points) < 3 or not all(math.isfinite(value) for point in points for value in point):
            raise ValueError(f"{layer} contains invalid coordinates")
        if points[0] == points[-1]:
            raise ValueError(f"{layer} duplicates its first vertex as the final vertex")
        entities[layer] = entity
        entity_points[layer] = points
        entity_bounds[layer] = bounds(points)

    front_bounds = entity_bounds["CUT_FRONT"]
    back_bounds = entity_bounds["CUT_BACK"]
    if back_bounds["minY"] - front_bounds["maxY"] < float(manifest["gapMm"]) - TOLERANCE_MM:
        raise ValueError("Front and Back bounds overlap or violate the vertical master gap")
    assert_bounds_match(front_bounds, manifest["front"]["masterBoundsMm"], "Front master bounds")
    assert_bounds_match(back_bounds, manifest["back"]["masterBoundsMm"], "Back master bounds")
    if not close_enough(front_bounds["width"], float(manifest["front"]["localBoundsMm"]["width"])):
        raise ValueError("Front physical width changed during master translation")
    if not close_enough(front_bounds["height"], float(manifest["front"]["localBoundsMm"]["height"])):
        raise ValueError("Front physical height changed during master translation")
    if not close_enough(back_bounds["width"], float(manifest["back"]["localBoundsMm"]["width"])):
        raise ValueError("Back physical width changed during master translation")
    if not close_enough(back_bounds["height"], float(manifest["back"]["localBoundsMm"]["height"])):
        raise ValueError("Back physical height changed during master translation")

    support_count = int(manifest["multiSupport"]["pointCount"])
    support_length_mm = polyline_length(entity_points["CUT_FRONT"][:support_count])
    expected_support_length_mm = float(manifest["multiSupport"]["expectedLengthMm"])
    if not close_enough(support_length_mm, expected_support_length_mm):
        raise ValueError(
            f"Multi-support length mismatch: actual={support_length_mm}, expected={expected_support_length_mm}"
        )

    return {
        "dxfVersion": document.dxfversion,
        "insunits": document.header.get("$INSUNITS"),
        "CUT_FRONT": {
            "entityType": entities["CUT_FRONT"].dxftype(),
            "count": 1,
            "closed": entities["CUT_FRONT"].closed,
            "vertexCount": len(entity_points["CUT_FRONT"]),
            "boundsMm": front_bounds,
        },
        "CUT_BACK": {
            "entityType": entities["CUT_BACK"].dxftype(),
            "count": 1,
            "closed": entities["CUT_BACK"].closed,
            "vertexCount": len(entity_points["CUT_BACK"]),
            "boundsMm": back_bounds,
        },
        "verticalGapMm": back_bounds["minY"] - front_bounds["maxY"],
        "multiSupportLengthMm": support_length_mm,
        "expectedMultiSupportLengthMm": expected_support_length_mm,
        "multiSupportLengthErrorMm": abs(support_length_mm - expected_support_length_mm),
        "status": "PASS",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dxf", type=Path)
    parser.add_argument("--manifest", required=True, type=Path)
    args = parser.parse_args()
    result = validate(args.dxf.resolve(), args.manifest.resolve())
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
