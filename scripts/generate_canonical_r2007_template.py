#!/usr/bin/env python3
"""Extract a browser-safe canonical R2007 DXF shell from an ezdxf document.

The source drawing is used only as a drawing-database compatibility template.  All
modelspace entities are removed; the TypeScript serializer inserts the current
FootPatternDrafting geometry at runtime.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path


REQUIRED_SECTIONS = ("HEADER", "CLASSES", "TABLES", "BLOCKS", "ENTITIES", "OBJECTS")
REQUIRED_LAYERS = ("0", "CUT_FRONT", "CUT_BACK")
EXTENT_MARKERS = {
    ("$EXTMIN", 10): "__FOOT_PATTERN_EXTMIN_X__",
    ("$EXTMIN", 20): "__FOOT_PATTERN_EXTMIN_Y__",
    ("$EXTMIN", 30): "__FOOT_PATTERN_EXTMIN_Z__",
    ("$EXTMAX", 10): "__FOOT_PATTERN_EXTMAX_X__",
    ("$EXTMAX", 20): "__FOOT_PATTERN_EXTMAX_Y__",
    ("$EXTMAX", 30): "__FOOT_PATTERN_EXTMAX_Z__",
}


def read_pairs(path: Path) -> list[tuple[str, str]]:
    lines = path.read_text(encoding="utf-8-sig").splitlines()
    if len(lines) % 2:
        raise ValueError("DXF must contain complete group-code/value pairs")
    return [(lines[index], lines[index + 1]) for index in range(0, len(lines), 2)]


def normalized(pair: tuple[str, str]) -> tuple[int, str]:
    return int(pair[0].strip()), pair[1].strip()


def section_ranges(pairs: list[tuple[str, str]]) -> dict[str, tuple[int, int]]:
    ranges: dict[str, tuple[int, int]] = {}
    index = 0
    while index < len(pairs) - 1:
        if normalized(pairs[index]) != (0, "SECTION"):
            index += 1
            continue
        code, name = normalized(pairs[index + 1])
        if code != 2:
            raise ValueError("SECTION must be followed by a group-code 2 name")
        end = index + 2
        while end < len(pairs) and normalized(pairs[end]) != (0, "ENDSEC"):
            end += 1
        if end == len(pairs):
            raise ValueError(f"Section {name} has no ENDSEC")
        ranges[name] = (index, end)
        index = end + 1
    return ranges


def variable_value(pairs: list[tuple[str, str]], variable: str) -> str:
    for index, pair in enumerate(pairs[:-1]):
        if normalized(pair) == (9, variable):
            return normalized(pairs[index + 1])[1]
    raise ValueError(f"Missing header variable: {variable}")


def entity_records(pairs: list[tuple[str, str]]) -> list[list[tuple[str, str]]]:
    records: list[list[tuple[str, str]]] = []
    current: list[tuple[str, str]] = []
    for pair in pairs:
        if normalized(pair)[0] == 0:
            if current:
                records.append(current)
            current = [pair]
        elif current:
            current.append(pair)
    if current:
        records.append(current)
    return records


def record_value(record: list[tuple[str, str]], code: int) -> str | None:
    return next((normalized(pair)[1] for pair in record if normalized(pair)[0] == code), None)


def replace_header_extents(pairs: list[tuple[str, str]]) -> None:
    active_variable: str | None = None
    replaced: set[tuple[str, int]] = set()
    for index, pair in enumerate(pairs):
        code, value = normalized(pair)
        if code == 9:
            active_variable = value
            continue
        marker = EXTENT_MARKERS.get((active_variable or "", code))
        if marker:
            pairs[index] = (pair[0], marker)
            replaced.add((active_variable or "", code))
    if replaced != set(EXTENT_MARKERS):
        missing = sorted(set(EXTENT_MARKERS) - replaced)
        raise ValueError(f"Missing canonical header extent fields: {missing}")


def serialize_pairs(pairs: list[tuple[str, str]]) -> str:
    return "\r\n".join(value for pair in pairs for value in pair) + "\r\n"


def build_template(source: Path) -> dict[str, str]:
    pairs = read_pairs(source)
    ranges = section_ranges(pairs)
    missing_sections = [name for name in REQUIRED_SECTIONS if name not in ranges]
    if missing_sections:
        raise ValueError(f"Missing canonical sections: {missing_sections}")
    if variable_value(pairs, "$ACADVER") != "AC1021":
        raise ValueError("Canonical template source must be AutoCAD 2007 / AC1021")
    if variable_value(pairs, "$INSUNITS") != "4":
        raise ValueError("Canonical template source must use millimeters ($INSUNITS=4)")
    if not any(normalized(pair) == (2, "EZDXF") for pair in pairs):
        raise ValueError("Canonical template source must contain the EZDXF APPID record")

    layer_names = {
        record_value(record, 2)
        for record in entity_records(pairs[ranges["TABLES"][0] : ranges["TABLES"][1]])
        if normalized(record[0]) == (0, "LAYER")
    }
    missing_layers = [name for name in REQUIRED_LAYERS if name not in layer_names]
    if missing_layers:
        raise ValueError(f"Missing canonical layers: {missing_layers}")

    block_records = [
        record
        for record in entity_records(pairs[ranges["TABLES"][0] : ranges["TABLES"][1]])
        if normalized(record[0]) == (0, "BLOCK_RECORD")
    ]
    model_record = next(
        (record for record in block_records if record_value(record, 2) == "*Model_Space"), None
    )
    paper_record = next(
        (record for record in block_records if record_value(record, 2) == "*Paper_Space"), None
    )
    if not model_record or not paper_record:
        raise ValueError("Canonical template requires ModelSpace and PaperSpace BLOCK_RECORDs")
    modelspace_owner = record_value(model_record, 5)
    if not modelspace_owner:
        raise ValueError("ModelSpace BLOCK_RECORD has no handle")

    entity_start, entity_end = ranges["ENTITIES"]
    source_entities = entity_records(pairs[entity_start + 2 : entity_end])
    if len(source_entities) != 2:
        raise ValueError("Canonical source must contain exactly two modelspace entities")
    for expected_layer, record in zip(("CUT_FRONT", "CUT_BACK"), source_entities):
        if normalized(record[0]) != (0, "LWPOLYLINE"):
            raise ValueError(f"{expected_layer} canonical entity must be LWPOLYLINE")
        if record_value(record, 8) != expected_layer:
            raise ValueError(f"Expected canonical entity on layer {expected_layer}")
        if record_value(record, 330) != modelspace_owner:
            raise ValueError(f"{expected_layer} owner must be the ModelSpace BLOCK_RECORD")

    prefix_pairs = pairs[: entity_start + 2]
    replace_header_extents(prefix_pairs)
    suffix_pairs = pairs[entity_end:]
    return {
        "generatedFrom": "ezdxf R2007 canonical drawing shell; modelspace geometry stripped",
        "modelSpaceOwnerHandle": modelspace_owner,
        "prefix": serialize_pairs(prefix_pairs),
        "suffix": serialize_pairs(suffix_pairs),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="ezdxf-generated AC1021 compatibility reference")
    parser.add_argument("output", type=Path, help="JSON template path consumed by the browser build")
    args = parser.parse_args()
    template = build_template(args.source.resolve())
    args.output.resolve().write_text(
        json.dumps(template, ensure_ascii=True, indent=2) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
