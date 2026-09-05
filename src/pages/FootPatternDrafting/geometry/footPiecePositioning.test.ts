import footPieceSampleJson from '../data/footPieceSample.json';
import type { DraftingParameters, FootPieceFSelection, FootPieceSample } from '../types';
import { buildBackPiece } from './backPiece';
import { polylineLength } from './curveUtils';
import { alignFootPieceLegacyToFrontPiece } from './footPiece';
import {
    extractReferenceArcQP,
    extractSourceReferenceArcQP,
    nearestFootPieceFSelection,
    pointAtFootPieceFSelection,
    positionFootPieceWithSelectedF,
} from './footPiecePositioning';
import { buildFrontPiece } from './frontPiece';
import { distance } from './geometryUtils';
import { buildLufCurve } from './lufCurve';

const sample = footPieceSampleJson as FootPieceSample;
const parameters: DraftingParameters = {
    a: 21.6,
    b: 19.8,
    c: 22.5,
    d: 18.9,
    e: 21.6,
    f: 23.4,
    g: 7,
    r: 10,
};

function createGeometry() {
    const backPiece = buildBackPiece(parameters).geometry!;
    const frontPiece = buildFrontPiece(parameters, 'adult', backPiece.x, backPiece.z).geometry!;
    const provisional = alignFootPieceLegacyToFrontPiece(sample, frontPiece, parameters.r!)
        .geometry!;
    return { frontPiece, provisional };
}

function centreSelection(): FootPieceFSelection {
    const sourceQP = extractSourceReferenceArcQP(sample).geometry!.points;
    return {
        segmentIndex: Math.floor((sourceQP.length - 1) / 2),
        segmentT: 0.5,
    };
}

describe('Q-to-P selectable reference arc', () => {
    it('extracts the ordered sub-arc from exact Q to exact P', () => {
        const { provisional } = createGeometry();
        const qpArc = extractReferenceArcQP(provisional.alignedRQPS).geometry!.points;

        expect(qpArc[0]).toEqual(provisional.alignedLandmarks.Q);
        expect(qpArc.at(-1)).toEqual(provisional.alignedLandmarks.P);
        expect(qpArc.length).toBeGreaterThan(2);
    });

    it('rejects an F identity outside the Q-to-P segment range', () => {
        const { frontPiece, provisional } = createGeometry();
        const result = positionFootPieceWithSelectedF(
            sample,
            provisional,
            frontPiece,
            { segmentIndex: -1, segmentT: 0.5 },
            true,
        );

        expect(result.geometry).toBeUndefined();
        expect(result.errors[0].code).toBe('FOOT_PIECE_F_SELECTION_OUTSIDE_QP');
    });

    it('snaps an off-curve pointer candidate back onto a Q-P segment identity', () => {
        const qpArc = extractSourceReferenceArcQP(sample).geometry!.points;
        const candidate = nearestFootPieceFSelection({ id: 'pointer', x: 0, y: 0 }, qpArc)!;
        const resolvedPoint = pointAtFootPieceFSelection(qpArc, candidate.selection)!;

        expect(candidate.selection.segmentIndex).toBeGreaterThanOrEqual(0);
        expect(candidate.selection.segmentIndex).toBeLessThan(qpArc.length - 1);
        expect(candidate.selection.segmentT).toBeGreaterThanOrEqual(0);
        expect(candidate.selection.segmentT).toBeLessThanOrEqual(1);
        expect(distance(candidate.point, resolvedPoint)).toBeLessThan(1e-9);
    });
});

describe('final foot-piece positioning', () => {
    it('keeps legacy midpoint alignment as PROVISIONAL when F is absent', () => {
        const { frontPiece, provisional } = createGeometry();
        const positioned = positionFootPieceWithSelectedF(sample, provisional, frontPiece)
            .geometry!;

        expect(positioned.positioning.status).toBe('PROVISIONAL');
        expect(positioned.positioning.alignmentMode).toBe('legacy-rs-midpoint-to-mprime');
        expect(positioned.positioning.checks.fSelected.pass).toBe(false);
    });

    it('preserves heel-arc scale and the selected source segment+t identity', () => {
        const { frontPiece, provisional } = createGeometry();
        const selection = centreSelection();
        const sourceQP = extractSourceReferenceArcQP(sample).geometry!.points;
        const sourceFBefore = pointAtFootPieceFSelection(sourceQP, selection)!;
        const positioned = positionFootPieceWithSelectedF(
            sample,
            provisional,
            frontPiece,
            selection,
            true,
        ).geometry!;

        expect(positioned.scaleToCm).toBeCloseTo(parameters.r! / provisional.rawHeelArcLength, 12);
        expect(positioned.positioning.selection).toEqual(selection);
        expect(positioned.positioning.sourceF).toMatchObject({
            x: sourceFBefore.x,
            y: sourceFBefore.y,
        });
        expect(positioned.positioning.checks.sourceIdentityPreserved.pass).toBe(true);
    });

    it("places final R/S on the M'G line and makes M'F perpendicular to M'G", () => {
        const { frontPiece, provisional } = createGeometry();
        const positioned = positionFootPieceWithSelectedF(
            sample,
            provisional,
            frontPiece,
            centreSelection(),
            true,
        ).geometry!;
        const checks = positioned.positioning.checks;

        expect(checks.rsInlineWithMPrimeG.rLineDistanceCm).toBeLessThanOrEqual(
            checks.rsInlineWithMPrimeG.toleranceCm,
        );
        expect(checks.rsInlineWithMPrimeG.sLineDistanceCm).toBeLessThanOrEqual(
            checks.rsInlineWithMPrimeG.toleranceCm,
        );
        expect(checks.mPrimeFPerpendicular.pass).toBe(true);
        expect(checks.fOnCentreLine.pass).toBe(true);
    });

    it("translates only along M'G without changing RS collinearity or curve lengths", () => {
        const { frontPiece, provisional } = createGeometry();
        const positioned = positionFootPieceWithSelectedF(
            sample,
            provisional,
            frontPiece,
            centreSelection(),
            true,
        ).geometry!;
        const translation = positioned.positioning.translationVectorCm!;
        const gDirection = positioned.positioning.gDirection;
        const translationCrossG = translation.x * gDirection.y - translation.y * gDirection.x;

        expect(translationCrossG).toBeCloseTo(0, 12);
        expect(positioned.positioning.checks.rsInlineWithMPrimeG.pass).toBe(true);
        expect(positioned.rqpsArcLengthCm).toBeCloseTo(provisional.rqpsArcLengthCm, 12);
        expect(polylineLength(positioned.alignedShrinkedOutline)).toBeCloseTo(
            polylineLength(provisional.alignedShrinkedOutline),
            12,
        );
        expect(distance(positioned.alignedLandmarks.R, positioned.alignedLandmarks.S)).toBeCloseTo(
            distance(provisional.alignedLandmarks.R, provisional.alignedLandmarks.S),
            12,
        );
    });

    it('marks confirmed positioning VALID only when every final check passes', () => {
        const { frontPiece, provisional } = createGeometry();
        const positioned = positionFootPieceWithSelectedF(
            sample,
            provisional,
            frontPiece,
            centreSelection(),
            true,
        ).geometry!;

        expect(positioned.positioning.selectionState).toBe('confirmed');
        expect(positioned.positioning.status).toBe('VALID');
        expect(positioned.positioning.alignmentMode).toBe('f-centre-line-final');
        expect(Object.values(positioned.positioning.checks).every((check) => check.pass)).toBe(
            true,
        );
    });

    it("re-runs the existing LUF'TG' solver from the finally positioned foot piece", () => {
        const { frontPiece, provisional } = createGeometry();
        const positioned = positionFootPieceWithSelectedF(
            sample,
            provisional,
            frontPiece,
            centreSelection(),
            true,
        ).geometry!;
        const lufCurve = buildLufCurve(positioned, frontPiece, parameters.a, {
            upQtDistribution: 0.5,
            fPrimeOffsetCm: 1,
        }).geometry!;

        expect(lufCurve).toBeDefined();
        expect(distance(lufCurve.F, positioned.positioning.alignedF!)).toBeLessThanOrEqual(0.01);
    });
});
