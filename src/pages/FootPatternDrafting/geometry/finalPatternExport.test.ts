import sampleJson from '../data/footPieceSample.json';
import type { DraftingParameters, DraftPoint, FootPieceSample } from '../types';
import { buildBackPiece, completeBackPieceWithFrontY } from './backPiece';
import { polylineLength } from './curveUtils';
import {
    buildFinalBackCutContour,
    buildFinalFrontCutContour,
    buildFinalPatternExportGeometry,
    CENTIMETERS_TO_MILLIMETERS,
    convertPointsCmToMm,
    MASTER_MARGIN_MM,
    MASTER_PIECE_GAP_MM,
    translatePatternPoints,
    validateFinalCutContour,
} from './finalPatternExport';
import { alignFootPieceToFrontPiece } from './footPiece';
import { buildFrontPiece } from './frontPiece';
import { distance } from './geometryUtils';
import { deriveTargetAnkleIntersections } from './targetAnkle';
import { evaluateTargetMultiSupportOuterCurveCandidate } from './targetMultiSupportOuterCurve';
import { deriveTargetReferenceArc } from './targetReferenceArc';
import { deriveTargetUtConstruction } from './targetUt';
import { deriveTargetWPrime } from './targetWPrime';
import { deriveToeRadialOuterSupports } from './toeRadialOuterSupports';
import { deriveToeRadialReferences } from './toeRadialReferences';

const footPieceSample = sampleJson as FootPieceSample;
const parameters: DraftingParameters = {
    a: 14.6,
    b: 18,
    c: 18.8,
    d: 16,
    e: 11.2,
    f: 11.2,
    g: 5,
    r: 16.8,
};
const validManualParameters = { alpha: 0.5, thetaDeg: 9, lambdaCm: 2.6 };

function buildFixture() {
    const baseBackPiece = buildBackPiece(parameters).geometry!;
    const frontPiece = buildFrontPiece(parameters, 'adult', baseBackPiece.x, baseBackPiece.z)
        .geometry!;
    const completedBackPiece = completeBackPieceWithFrontY(baseBackPiece, frontPiece.y).geometry!;
    const footPiece = alignFootPieceToFrontPiece(footPieceSample, frontPiece, parameters.r!)
        .geometry!;
    const targetAnkle = deriveTargetAnkleIntersections(footPiece, frontPiece).geometry!;
    const targetReferenceArc = deriveTargetReferenceArc(footPiece, targetAnkle, footPieceSample)
        .geometry!;
    const targetUt = deriveTargetUtConstruction(
        footPiece.alignedLandmarks.P,
        footPiece.alignedLandmarks.Q,
        parameters.a,
        validManualParameters.alpha,
    ).geometry!;
    const automatic = footPiece.automaticPositioning!;
    const targetWPrime = deriveTargetWPrime(
        automatic.alignedSourceSecondToe,
        frontPiece.points.MPrime,
        frontPiece.points.O,
        validManualParameters.lambdaCm,
    ).geometry!;
    const toeRadialReferences = deriveToeRadialReferences({
        Ms: automatic.alignedSourceMs,
        W: automatic.alignedSourceSecondToe,
        targetReferenceArc,
        thetaDeg: validManualParameters.thetaDeg,
    }).geometry!;
    const toeRadialOuterSupports = deriveToeRadialOuterSupports({
        Ms: automatic.alignedSourceMs,
        toeRadialReferences,
        existingWPrime: targetWPrime.WPrime,
        outwardOffsetCm: validManualParameters.lambdaCm,
    }).geometry!;
    const manualCandidate = evaluateTargetMultiSupportOuterCurveCandidate({
        frontPiece,
        targetReferenceArc,
        targetUt,
        toeRadialOuterSupports,
    }).geometry!;

    return { baseBackPiece, completedBackPiece, frontPiece, manualCandidate };
}

describe('final Front cutting contour', () => {
    it("uses the exact applied L-to-G' multi-support polyline and explicit upper topology", () => {
        const { frontPiece, manualCandidate } = buildFixture();
        const sourceBefore = JSON.stringify(manualCandidate.polylinePoints);
        const result = buildFinalFrontCutContour(frontPiece, manualCandidate);
        const contour = result.geometry!;

        expect(manualCandidate.valid).toBe(true);
        expect(result.errors).toEqual([]);
        expect(contour.pointsCm[0]).toEqual(frontPiece.points.L);
        expect(contour.multiSupportPointCount).toBe(manualCandidate.polylinePoints.length);
        expect(contour.pointsCm.slice(0, contour.multiSupportPointCount)).toEqual(
            manualCandidate.polylinePoints,
        );
        expect(contour.pointsCm[contour.multiSupportPointCount - 1]).toEqual(
            frontPiece.points.GPrime,
        );
        expect(contour.pointsCm.slice(contour.multiSupportPointCount)).toEqual([
            frontPiece.points.HPrime,
            frontPiece.points.C,
            frontPiece.points.B,
            frontPiece.points.O,
            frontPiece.points.BPrime,
            frontPiece.points.CPrime,
            frontPiece.points.HPrimeLeft,
        ]);
        expect(contour.pointsCm).toHaveLength(manualCandidate.polylinePoints.length + 7);
        expect(contour.closed).toBe(true);
        expect(contour.pointsCm.at(-1)).not.toEqual(contour.pointsCm[0]);
        expect(contour.multiSupportIntegrity).toBe(true);
        expect(contour.multiSupportLengthCm).toBeCloseTo(manualCandidate.outerCurveLengthCm, 10);
        expect(contour.checks).toEqual({
            finite: true,
            closed: true,
            noDuplicateConsecutivePoints: true,
            nonDegenerate: true,
            noSelfIntersection: true,
        });
        expect(JSON.stringify(manualCandidate.polylinePoints)).toBe(sourceBefore);
    });

    it('fails closed for an INVALID manual candidate even if preview geometry could be valid', () => {
        const { frontPiece, manualCandidate } = buildFixture();
        const result = buildFinalFrontCutContour(frontPiece, {
            ...manualCandidate,
            valid: false,
        });

        expect(result.geometry).toBeUndefined();
        expect(result.errors[0].code).toBe('FINAL_FRONT_MANUAL_CANDIDATE_INVALID');
        expect(result.errors[0].message).toBe(
            'A valid multi-support candidate must be applied before DXF export.',
        );
    });

    it('rejects malformed, duplicate, degenerate, and self-intersecting contours', () => {
        const point = (id: string, x: number, y: number): DraftPoint => ({
            id,
            x,
            y,
        });

        expect(
            validateFinalCutContour(
                'front',
                [point('A', 0, 0), point('B', 1, 1), point('C', 0, 1), point('D', 1, 0)],
                'test',
            ).errors[0].code,
        ).toBe('FINAL_FRONT_CONTOUR_INVALID');
        expect(
            validateFinalCutContour(
                'front',
                [point('A', 0, 0), point('B', 0, 0), point('C', 1, 1)],
                'test',
            ).errors[0].code,
        ).toBe('FINAL_FRONT_CONTOUR_INVALID');
    });
});

describe('final Back cutting contour', () => {
    it('uses the completed Back Piece and explicit perimeter order without line-kind guessing', () => {
        const { completedBackPiece } = buildFixture();
        const linesBefore = JSON.stringify(completedBackPiece.lines);
        const result = buildFinalBackCutContour(completedBackPiece);

        expect(result.errors).toEqual([]);
        expect(result.geometry!.pointsCm.map((point) => point.id)).toEqual([
            'O',
            'B',
            'C',
            'D',
            'E',
            'F',
            'A',
            "F'",
            "E'",
            "D'",
            "C'",
            "B'",
        ]);
        expect(result.geometry!.pointsCm).toHaveLength(12);
        expect(result.geometry!.closed).toBe(true);
        expect(result.geometry!.checks.finite).toBe(true);
        expect(result.geometry!.checks.noSelfIntersection).toBe(true);
        expect(JSON.stringify(completedBackPiece.lines)).toBe(linesBefore);
    });

    it('fails closed when completion points are absent', () => {
        const { baseBackPiece } = buildFixture();
        const result = buildFinalBackCutContour(baseBackPiece);

        expect(result.geometry).toBeUndefined();
        expect(result.errors[0].code).toBe('FINAL_BACK_CONTOUR_INCOMPLETE');
    });
});

describe('cm-to-mm conversion and deterministic master layout', () => {
    it('converts 1 cm to 10 mm while preserving local negative coordinates', () => {
        const converted = convertPointsCmToMm([{ id: 'metric', x: 1, y: -1 }]);

        expect(CENTIMETERS_TO_MILLIMETERS).toBe(10);
        expect(converted).toEqual([{ id: 'metric', x: 10, y: -10 }]);
    });

    it('uses translation only, preserves lengths, and stacks Back above Front with the gap', () => {
        const { completedBackPiece, frontPiece, manualCandidate } = buildFixture();
        const input = { frontPiece, completedBackPiece, manualCandidate };
        const before = JSON.stringify(input);
        const first = buildFinalPatternExportGeometry(input);
        const second = buildFinalPatternExportGeometry(input);
        const geometry = first.geometry!;

        expect(first.errors).toEqual([]);
        expect(second).toEqual(first);
        expect(geometry.checks.piecesDoNotOverlap).toBe(true);
        expect(geometry.checks.verticalGapMm).toBeCloseTo(MASTER_PIECE_GAP_MM, 10);
        expect(geometry.checks.gapAtLeastRequired).toBe(true);
        expect(geometry.checks.positiveMargin).toBe(true);
        expect(geometry.masterBoundsMm.minX).toBeCloseTo(MASTER_MARGIN_MM, 10);
        expect(geometry.masterBoundsMm.minY).toBeCloseTo(MASTER_MARGIN_MM, 10);
        expect(geometry.back.masterBoundsMm.minY).toBeGreaterThan(
            geometry.front.masterBoundsMm.maxY,
        );
        expect(geometry.checks.dimensionsPreserved).toBe(true);
        expect(geometry.checks.multiSupportLengthPreserved).toBe(true);
        expect(geometry.manifest.dxfVersion).toBe('AC1021');
        expect(geometry.manifest.multiSupport.lengthErrorMm).toBeLessThanOrEqual(0.01);
        expect(geometry.front.masterPointsMm).toHaveLength(408);
        expect(geometry.back.masterPointsMm).toHaveLength(12);
        expect(geometry.masterBoundsMm.minX).toBeCloseTo(10, 9);
        expect(geometry.masterBoundsMm.minY).toBeCloseTo(10, 9);
        expect(geometry.masterBoundsMm.maxX).toBeCloseTo(180.730873856, 9);
        expect(geometry.masterBoundsMm.maxY).toBeCloseTo(499.737976928, 9);
        expect(geometry.masterBoundsMm.width).toBeCloseTo(170.730873856, 9);
        expect(geometry.masterBoundsMm.height).toBeCloseTo(489.737976928, 9);

        [geometry.front, geometry.back].forEach((piece) => {
            piece.localPointsMm.forEach((point, index) => {
                const masterPoint = piece.masterPointsMm[index];
                expect(masterPoint.x - point.x).toBeCloseTo(piece.masterOffsetMm.x, 10);
                expect(masterPoint.y - point.y).toBeCloseTo(piece.masterOffsetMm.y, 10);
            });
            expect(polylineLength([...piece.masterPointsMm, piece.masterPointsMm[0]])).toBeCloseTo(
                polylineLength([...piece.localPointsMm, piece.localPointsMm[0]]),
                8,
            );
        });
        expect(JSON.stringify(input)).toBe(before);
    });

    it('keeps a generic translation length invariant', () => {
        const source = [
            { id: 'A', x: -10, y: 2 },
            { id: 'B', x: 0, y: 2 },
        ];
        const translated = translatePatternPoints(source, { x: 25, y: 40 });

        expect(distance(source[0], source[1])).toBe(10);
        expect(distance(translated[0], translated[1])).toBe(10);
    });
});
