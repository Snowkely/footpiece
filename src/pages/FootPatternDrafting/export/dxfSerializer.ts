import type {
    FinalPatternExportGeometry,
    FinalPatternExportManifest,
    MasterPatternPieceGeometry,
} from '../geometry/finalPatternExport';
import { distance } from '../geometry/geometryUtils';
import type { DraftPoint, GeometryBuildResult } from '../types';
import canonicalR2007Template from './canonicalR2007Template.json';

export const PRESSURE_STOCKING_DXF_FILE_NAME = 'pressure_stocking_pattern.dxf';
export const PRESSURE_STOCKING_DXF_VERSION = 'AC1021';
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

function appendClosedLwPolyline(
    pairs: DxfPair[],
    piece: MasterPatternPieceGeometry,
    layer: string,
    handle: string,
): void {
    appendPair(pairs, 0, 'LWPOLYLINE');
    appendPair(pairs, 5, handle);
    appendPair(pairs, 330, canonicalR2007Template.modelSpaceOwnerHandle);
    appendPair(pairs, 100, 'AcDbEntity');
    appendPair(pairs, 8, layer);
    appendPair(pairs, 100, 'AcDbPolyline');
    appendPair(pairs, 90, piece.masterPointsMm.length);
    appendPair(pairs, 70, 1);
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

function serializePairs(pairs: DxfPair[]): string {
    return `${pairs.map(([code, value]) => `${code}\r\n${value}`).join('\r\n')}\r\n`;
}

function renderCanonicalPrefix(exportGeometry: FinalPatternExportGeometry): string {
    const replacements: Record<string, string> = {
        __FOOT_PATTERN_EXTMIN_X__: formatDxfNumber(exportGeometry.masterBoundsMm.minX),
        __FOOT_PATTERN_EXTMIN_Y__: formatDxfNumber(exportGeometry.masterBoundsMm.minY),
        __FOOT_PATTERN_EXTMIN_Z__: '0',
        __FOOT_PATTERN_EXTMAX_X__: formatDxfNumber(exportGeometry.masterBoundsMm.maxX),
        __FOOT_PATTERN_EXTMAX_Y__: formatDxfNumber(exportGeometry.masterBoundsMm.maxY),
        __FOOT_PATTERN_EXTMAX_Z__: '0',
    };

    return Object.entries(replacements).reduce(
        (text, [marker, value]) => text.replace(marker, value),
        canonicalR2007Template.prefix,
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
    appendClosedLwPolyline(pairs, exportGeometry.front, CUT_FRONT_LAYER, '20');
    appendClosedLwPolyline(pairs, exportGeometry.back, CUT_BACK_LAYER, '21');
    const dxfText = `${renderCanonicalPrefix(exportGeometry)}${serializePairs(pairs)}${
        canonicalR2007Template.suffix
    }`;

    return {
        geometry: {
            fileName: PRESSURE_STOCKING_DXF_FILE_NAME,
            dxfText,
            manifest: exportGeometry.manifest,
        },
        errors: [],
    };
}
