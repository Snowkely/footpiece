import type {
    FinalCutContour,
    FinalFrontCutContour,
    FinalPatternExportGeometry,
    MasterPatternPieceGeometry,
    PatternBounds,
} from '../geometry/finalPatternExport';
import type { DraftPoint } from '../types';
import {
    CUT_BACK_LAYER,
    CUT_FRONT_LAYER,
    DXF_INSUNITS_MILLIMETERS,
    PRESSURE_STOCKING_DXF_VERSION,
    serializeFinalPatternDxf,
} from './dxfSerializer';

interface ParsedLwPolyline {
    layer: string;
    vertexCount: number;
    flags: number;
    points: Array<{ x: number; y: number }>;
}

function bounds(points: DraftPoint[]): PatternBounds {
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function contour(
    pieceId: 'front' | 'back',
    pointsCm: DraftPoint[],
): FinalCutContour | FinalFrontCutContour {
    const base: FinalCutContour = {
        pieceId,
        pointsCm,
        closed: true,
        source: 'test',
        boundsCm: bounds(pointsCm),
        perimeterLengthCm: 1,
        checks: {
            finite: true,
            closed: true,
            noDuplicateConsecutivePoints: true,
            nonDegenerate: true,
            noSelfIntersection: true,
        },
        selfIntersectionCount: 0,
    };
    return pieceId === 'front'
        ? {
              ...base,
              pieceId,
              multiSupportPointCount: 2,
              multiSupportLengthCm: 1,
              multiSupportIntegrity: true,
          }
        : base;
}

function piece(
    pieceId: 'front' | 'back',
    masterPointsMm: DraftPoint[],
): MasterPatternPieceGeometry {
    const pieceBounds = bounds(masterPointsMm);
    return {
        pieceId,
        localPointsMm: masterPointsMm.map((point) => ({ ...point })),
        masterPointsMm,
        localBoundsMm: pieceBounds,
        masterBoundsMm: pieceBounds,
        masterOffsetMm: { x: 0, y: 0 },
    };
}

function createGeometry(): FinalPatternExportGeometry {
    const frontPoints = [
        { id: 'L', x: 10, y: 10 },
        { id: "G'", x: 40, y: 10 },
        { id: 'O', x: 25, y: 30 },
    ];
    const backPoints = [
        { id: 'O', x: 10, y: 70 },
        { id: 'B', x: 40, y: 70 },
        { id: 'A', x: 40, y: 90 },
        { id: "B'", x: 10, y: 90 },
    ];
    const front = piece('front', frontPoints);
    const back = piece('back', backPoints);
    const masterBoundsMm = bounds([...frontPoints, ...backPoints]);

    return {
        frontContour: contour('front', frontPoints) as FinalFrontCutContour,
        backContour: contour('back', backPoints),
        front,
        back,
        masterBoundsMm,
        checks: {
            piecesDoNotOverlap: true,
            verticalGapMm: 40,
            gapAtLeastRequired: true,
            positiveMargin: true,
            dimensionsPreserved: true,
            multiSupportLengthPreserved: true,
        },
        manifest: {
            units: 'mm',
            dxfVersion: 'AC1032',
            centimetersToMillimeters: 10,
            layout: 'back-above-front',
            gapMm: 30,
            marginMm: 10,
            front: {
                vertexCount: frontPoints.length,
                localBoundsMm: front.localBoundsMm,
                masterBoundsMm: front.masterBoundsMm,
                masterOffsetMm: front.masterOffsetMm,
            },
            back: {
                vertexCount: backPoints.length,
                localBoundsMm: back.localBoundsMm,
                masterBoundsMm: back.masterBoundsMm,
                masterOffsetMm: back.masterOffsetMm,
            },
            masterBoundsMm,
            multiSupport: {
                pointCount: 2,
                expectedLengthCm: 3,
                expectedLengthMm: 30,
                masterLengthMm: 30,
                lengthErrorMm: 0,
            },
            sourceParameters: { alpha: 0.5, thetaDeg: 10, lambdaCm: 1 },
        },
    };
}

function parsePairs(dxfText: string): Array<[number, string]> {
    const lines = dxfText.trim().split(/\r?\n/);
    const pairs: Array<[number, string]> = [];
    for (let index = 0; index < lines.length; index += 2) {
        pairs.push([Number(lines[index]), lines[index + 1]]);
    }
    return pairs;
}

function parseLwPolylines(dxfText: string): ParsedLwPolyline[] {
    const pairs = parsePairs(dxfText);
    const entities: ParsedLwPolyline[] = [];

    for (let index = 0; index < pairs.length; index += 1) {
        if (pairs[index][0] !== 0 || pairs[index][1] !== 'LWPOLYLINE') continue;
        const entityPairs: Array<[number, string]> = [];
        for (let entityIndex = index + 1; entityIndex < pairs.length; entityIndex += 1) {
            if (pairs[entityIndex][0] === 0) break;
            entityPairs.push(pairs[entityIndex]);
        }
        const points: Array<{ x: number; y: number }> = [];
        entityPairs.forEach(([code, value], pairIndex) => {
            if (code === 10) {
                const yPair = entityPairs
                    .slice(pairIndex + 1)
                    .find(([nextCode]) => nextCode === 20);
                points.push({ x: Number(value), y: Number(yPair?.[1]) });
            }
        });
        entities.push({
            layer: entityPairs.find(([code]) => code === 8)?.[1] ?? '',
            vertexCount: Number(entityPairs.find(([code]) => code === 90)?.[1]),
            flags: Number(entityPairs.find(([code]) => code === 70)?.[1]),
            points,
        });
    }

    return entities;
}

describe('limited ASCII Master DXF serializer', () => {
    it('writes AC1032, millimeter units, cutting layers, and two closed LWPOLYLINE entities', () => {
        const geometry = createGeometry();
        const result = serializeFinalPatternDxf(geometry);
        const text = result.geometry!.dxfText;
        const pairs = parsePairs(text);
        const entities = parseLwPolylines(text);

        expect(result.errors).toEqual([]);
        expect(pairs).toContainEqual([1, PRESSURE_STOCKING_DXF_VERSION]);
        const unitsIndex = pairs.findIndex(([code, value]) => code === 9 && value === '$INSUNITS');
        expect(pairs[unitsIndex + 1]).toEqual([70, String(DXF_INSUNITS_MILLIMETERS)]);
        expect(
            pairs.filter(([code, value]) => code === 2 && value === CUT_FRONT_LAYER),
        ).toHaveLength(1);
        expect(
            pairs.filter(([code, value]) => code === 2 && value === CUT_BACK_LAYER),
        ).toHaveLength(1);
        expect(entities).toHaveLength(2);
        expect(entities.map((entity) => entity.layer)).toEqual([CUT_FRONT_LAYER, CUT_BACK_LAYER]);
        expect(entities.every((entity) => (entity.flags & 1) === 1)).toBe(true);
        expect(entities[0].vertexCount).toBe(geometry.front.masterPointsMm.length);
        expect(entities[1].vertexCount).toBe(geometry.back.masterPointsMm.length);
        expect(entities[0].points).toHaveLength(geometry.front.masterPointsMm.length);
        expect(entities[1].points).toHaveLength(geometry.back.masterPointsMm.length);
    });

    it('does not duplicate a closing vertex and is deterministic', () => {
        const geometry = createGeometry();
        const first = serializeFinalPatternDxf(geometry).geometry!;
        const second = serializeFinalPatternDxf(geometry).geometry!;
        const entities = parseLwPolylines(first.dxfText);

        expect(first).toEqual(second);
        entities.forEach((entity) => {
            expect(entity.points[0]).not.toEqual(entity.points.at(-1));
            expect(entity.points).toHaveLength(entity.vertexCount);
        });
    });

    it('fails closed when the serializer receives an explicitly duplicated closing vertex', () => {
        const geometry = createGeometry();
        geometry.front.masterPointsMm.push({ ...geometry.front.masterPointsMm[0] });
        const result = serializeFinalPatternDxf(geometry);

        expect(result.geometry).toBeUndefined();
        expect(result.errors[0].code).toBe('FINAL_PATTERN_DXF_INPUT_INVALID');
    });
});
