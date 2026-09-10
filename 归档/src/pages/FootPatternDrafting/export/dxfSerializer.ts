import type {
    FinalPatternExportGeometry,
    FinalPatternExportManifest,
    MasterPatternPieceGeometry,
} from '../geometry/finalPatternExport';
import { distance } from '../geometry/geometryUtils';
import type { DraftPoint, GeometryBuildResult } from '../types';

export const PRESSURE_STOCKING_DXF_FILE_NAME = 'pressure_stocking_pattern.dxf';
export const PRESSURE_STOCKING_DXF_VERSION = 'AC1032';
export const DXF_INSUNITS_MILLIMETERS = 4;
export const CUT_FRONT_LAYER = 'CUT_FRONT';
export const CUT_BACK_LAYER = 'CUT_BACK';

export interface SerializedPatternDxf {
    fileName: string;
    dxfText: string;
    manifest: FinalPatternExportManifest;
}

type DxfPair = readonly [number, string | number];

function formatDxfNumber(value: number): string {
    if (!Number.isFinite(value)) throw new Error('DXF coordinate must be finite.');
    const rounded = Number(value.toFixed(9));
    return Object.is(rounded, -0) ? '0' : String(rounded);
}

function appendPair(pairs: DxfPair[], code: number, value: string | number): void {
    pairs.push([code, value]);
}

function appendLayerTable(pairs: DxfPair[]): void {
    appendPair(pairs, 0, 'TABLE');
    appendPair(pairs, 2, 'LAYER');
    appendPair(pairs, 5, '2');
    appendPair(pairs, 100, 'AcDbSymbolTable');
    appendPair(pairs, 70, 3);

    [
        { handle: '10', name: '0', color: 7 },
        { handle: '11', name: CUT_FRONT_LAYER, color: 1 },
        { handle: '12', name: CUT_BACK_LAYER, color: 5 },
    ].forEach((layer) => {
        appendPair(pairs, 0, 'LAYER');
        appendPair(pairs, 5, layer.handle);
        appendPair(pairs, 330, '2');
        appendPair(pairs, 100, 'AcDbSymbolTableRecord');
        appendPair(pairs, 100, 'AcDbLayerTableRecord');
        appendPair(pairs, 2, layer.name);
        appendPair(pairs, 70, 0);
        appendPair(pairs, 62, layer.color);
        appendPair(pairs, 6, 'Continuous');
    });

    appendPair(pairs, 0, 'ENDTAB');
}

function appendClosedLwPolyline(
    pairs: DxfPair[],
    piece: MasterPatternPieceGeometry,
    layer: string,
    handle: string,
): void {
    appendPair(pairs, 0, 'LWPOLYLINE');
    appendPair(pairs, 5, handle);
    appendPair(pairs, 100, 'AcDbEntity');
    appendPair(pairs, 8, layer);
    appendPair(pairs, 100, 'AcDbPolyline');
    appendPair(pairs, 90, piece.masterPointsMm.length);
    appendPair(pairs, 70, 1);
    appendPair(pairs, 43, 0);
    piece.masterPointsMm.forEach((point) => {
        appendPair(pairs, 10, formatDxfNumber(point.x));
        appendPair(pairs, 20, formatDxfNumber(point.y));
    });
}

function validClosedPolylinePoints(points: DraftPoint[]): boolean {
    return (
        points.length >= 3 &&
        points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)) &&
        distance(points[0], points[points.length - 1]) > 1e-9
    );
}

export function serializeFinalPatternDxf(
    exportGeometry: FinalPatternExportGeometry,
): GeometryBuildResult<SerializedPatternDxf> {
    if (
        !validClosedPolylinePoints(exportGeometry.front.masterPointsMm) ||
        !validClosedPolylinePoints(exportGeometry.back.masterPointsMm) ||
        !exportGeometry.frontContour.closed ||
        !exportGeometry.backContour.closed
    ) {
        return {
            errors: [
                {
                    code: 'FINAL_PATTERN_DXF_INPUT_INVALID',
                    message:
                        'DXF serialization requires two finite closed contours without duplicated closing vertices.',
                },
            ],
        };
    }

    const pairs: DxfPair[] = [];
    appendPair(pairs, 0, 'SECTION');
    appendPair(pairs, 2, 'HEADER');
    appendPair(pairs, 9, '$ACADVER');
    appendPair(pairs, 1, PRESSURE_STOCKING_DXF_VERSION);
    appendPair(pairs, 9, '$INSUNITS');
    appendPair(pairs, 70, DXF_INSUNITS_MILLIMETERS);
    appendPair(pairs, 9, '$EXTMIN');
    appendPair(pairs, 10, formatDxfNumber(exportGeometry.masterBoundsMm.minX));
    appendPair(pairs, 20, formatDxfNumber(exportGeometry.masterBoundsMm.minY));
    appendPair(pairs, 30, 0);
    appendPair(pairs, 9, '$EXTMAX');
    appendPair(pairs, 10, formatDxfNumber(exportGeometry.masterBoundsMm.maxX));
    appendPair(pairs, 20, formatDxfNumber(exportGeometry.masterBoundsMm.maxY));
    appendPair(pairs, 30, 0);
    appendPair(pairs, 0, 'ENDSEC');

    appendPair(pairs, 0, 'SECTION');
    appendPair(pairs, 2, 'TABLES');
    appendLayerTable(pairs);
    appendPair(pairs, 0, 'ENDSEC');

    appendPair(pairs, 0, 'SECTION');
    appendPair(pairs, 2, 'ENTITIES');
    appendClosedLwPolyline(pairs, exportGeometry.front, CUT_FRONT_LAYER, '20');
    appendClosedLwPolyline(pairs, exportGeometry.back, CUT_BACK_LAYER, '21');
    appendPair(pairs, 0, 'ENDSEC');
    appendPair(pairs, 0, 'EOF');

    return {
        geometry: {
            fileName: PRESSURE_STOCKING_DXF_FILE_NAME,
            dxfText: `${pairs.map(([code, value]) => `${code}\r\n${value}`).join('\r\n')}\r\n`,
            manifest: exportGeometry.manifest,
        },
        errors: [],
    };
}
