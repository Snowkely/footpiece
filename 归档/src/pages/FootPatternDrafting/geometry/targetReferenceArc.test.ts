import footPieceSampleJson from '../data/footPieceSample.json';
import type {
    DraftingParameters,
    DraftPoint,
    FootPieceSample,
    TargetAnkleIntersectionGeometry,
} from '../types';
import { buildBackPiece } from './backPiece';
import { alignFootPieceToFrontPiece, polylineLength } from './footPiece';
import { buildFrontPiece } from './frontPiece';
import { distance } from './geometryUtils';
import { deriveTargetAnkleIntersections, pointAtClosedPolylineIdentity } from './targetAnkle';
import {
    deriveTargetReferenceArc,
    selectTargetReferenceArcCandidate,
    validateTargetReferenceArcOrder,
} from './targetReferenceArc';

const sample = footPieceSampleJson as FootPieceSample;
const parameters: DraftingParameters = {
    a: 21.6,
    b: 19.8,
    c: 22.5,
    d: 18.9,
    e: 21.6,
    f: 23.4,
    g: 7,
    r: 16.8,
};

function createGeometry() {
    const backPiece = buildBackPiece(parameters).geometry!;
    const frontPiece = buildFrontPiece(parameters, 'adult', backPiece.x, backPiece.z).geometry!;
    const aligned = alignFootPieceToFrontPiece(sample, frontPiece, parameters.r!).geometry!;
    const targetAnkle = deriveTargetAnkleIntersections(aligned, frontPiece).geometry!;
    const targetReference = deriveTargetReferenceArc(aligned, targetAnkle, sample).geometry!;
    return { aligned, targetAnkle, targetReference };
}

function candidate(valid: boolean, direction: 'forward' | 'reverse') {
    return {
        direction,
        valid,
        points: [
            { id: 'R*', x: 0, y: 0 },
            { id: 'Q', x: 1, y: 0 },
            { id: 'W', x: 2, y: 0 },
            { id: 'P', x: 3, y: 0 },
            { id: 'S*', x: 4, y: 0 },
        ],
        pointCount: 5,
        lengthCm: 4,
        qDistance: 1,
        wDistance: 2,
        pDistance: 3,
        endDistance: 4,
    };
}

describe('deriveTargetReferenceArc', () => {
    it('constructs two candidates and uniquely selects the Q-W-P ordered path', () => {
        const { targetReference } = createGeometry();

        expect(targetReference.candidateA.direction).toBe('forward');
        expect(targetReference.candidateA.pointCount).toBeGreaterThan(2);
        expect(targetReference.candidateB.direction).toBe('reverse');
        expect(targetReference.candidateB.pointCount).toBeGreaterThan(2);
        expect(targetReference.candidateA.valid).toBe(false);
        expect(targetReference.candidateB.valid).toBe(true);
        expect(targetReference.selectedCandidate).toBe('reverse');
    });

    it('does not choose the shorter heel-side path', () => {
        const { targetReference } = createGeometry();

        expect(targetReference.candidateA.lengthCm).toBeLessThan(
            targetReference.candidateB.lengthCm,
        );
        expect(targetReference.selectedCandidate).not.toBe(targetReference.candidateA.direction);
    });

    it('starts at R*, ends at S*, and contains strict Q-W-P order', () => {
        const { targetAnkle, targetReference } = createGeometry();
        const points = targetReference.targetReferenceArc;

        expect(points[0]).toEqual(targetAnkle.RStar);
        expect(points.at(-1)).toEqual(targetAnkle.SStar);
        expect(points[targetReference.qIndexOnArc].id).toBe('Q');
        expect(points[targetReference.wIndexOnArc].id).toBe('W');
        expect(points[targetReference.pIndexOnArc].id).toBe('P');
        expect(targetReference.qIndexOnArc).toBeLessThan(targetReference.wIndexOnArc);
        expect(targetReference.wIndexOnArc).toBeLessThan(targetReference.pIndexOnArc);
        expect(targetReference.orderValid).toBe(true);
    });

    it('keeps the target arc on the sampled outline instead of replacing it with straight joins', () => {
        const { aligned, targetReference } = createGeometry();
        const target = targetReference.targetReferenceArc;
        const outlineIds = new Set(aligned.alignedShrinkedOutline.map((point) => point.id));
        const ordinaryInteriorPoints = target
            .slice(1, -1)
            .filter((point) => point.id !== 'Q' && point.id !== 'W' && point.id !== 'P');
        const reconstructedW = pointAtClosedPolylineIdentity(
            aligned.alignedShrinkedOutline,
            targetReference.wOutlineSegmentIndex,
            targetReference.wOutlineSegmentT,
        )!;

        expect(target.length).toBeGreaterThan(5);
        expect(ordinaryInteriorPoints.length).toBeGreaterThan(200);
        expect(ordinaryInteriorPoints.every((point) => outlineIds.has(point.id))).toBe(true);
        expect(distance(reconstructedW, target[targetReference.wIndexOnArc])).toBeLessThan(1e-8);
        expect(
            distance(
                aligned.alignedShrinkedOutline[sample.landmarkIndices.Q],
                target[targetReference.qIndexOnArc],
            ),
        ).toBeLessThan(1e-8);
        expect(
            distance(
                aligned.alignedShrinkedOutline[sample.landmarkIndices.P],
                target[targetReference.pIndexOnArc],
            ),
        ).toBeLessThan(1e-8);
    });

    it('computes source/target lengths independently without overwriting either arc', () => {
        const { aligned, targetReference } = createGeometry();

        expect(targetReference.sourceReferenceArc).not.toBe(targetReference.targetReferenceArc);
        expect(targetReference.sourceReferenceArc[0].id).toBe('R');
        expect(targetReference.sourceReferenceArc.at(-1)?.id).toBe('S');
        const sourceQ = targetReference.sourceReferenceArc.findIndex((point) => point.id === 'Q');
        const sourceW = targetReference.sourceReferenceArc.findIndex((point) => point.id === 'W');
        const sourceP = targetReference.sourceReferenceArc.findIndex((point) => point.id === 'P');
        expect(sourceQ).toBeLessThan(sourceW);
        expect(sourceW).toBeLessThan(sourceP);
        expect(targetReference.targetReferenceArc[0].id).toBe('R*');
        expect(targetReference.targetReferenceArc.at(-1)?.id).toBe('S*');
        expect(targetReference.sourceReferenceArcLengthCm).toBeCloseTo(
            polylineLength(targetReference.sourceReferenceArc),
            12,
        );
        expect(targetReference.targetReferenceArcLengthCm).toBeCloseTo(
            polylineLength(targetReference.targetReferenceArc),
            12,
        );
        expect(targetReference.deltaLengthCm).toBeCloseTo(
            targetReference.targetReferenceArcLengthCm - targetReference.sourceReferenceArcLengthCm,
            12,
        );
        expect(aligned.alignedRQPS.some((point) => point.id === 'W')).toBe(false);
    });

    it('does not mutate Step 1, Step 2, or the fixture', () => {
        const { aligned, targetAnkle } = createGeometry();
        const beforeAligned = JSON.stringify(aligned);
        const beforeTargetAnkle = JSON.stringify(targetAnkle);
        const beforeSample = JSON.stringify(sample);

        deriveTargetReferenceArc(aligned, targetAnkle, sample);

        expect(JSON.stringify(aligned)).toBe(beforeAligned);
        expect(JSON.stringify(targetAnkle)).toBe(beforeTargetAnkle);
        expect(JSON.stringify(sample)).toBe(beforeSample);
    });

    it('fails closed when a landmark cannot be mapped to the outline', () => {
        const { aligned, targetAnkle } = createGeometry();
        const invalidSample: FootPieceSample = {
            ...sample,
            landmarkIndices: { ...sample.landmarkIndices, Q: -1 },
        };
        const result = deriveTargetReferenceArc(aligned, targetAnkle, invalidSample);

        expect(result.geometry).toBeUndefined();
        expect(result.errors[0].code).toBe('TARGET_REFERENCE_ARC_LANDMARK_MAPPING_FAILED');
    });

    it('fails closed when landmark order validation is invalid', () => {
        const invalidOrder: DraftPoint[] = [
            { id: 'R*', x: 0, y: 0 },
            { id: 'P', x: 1, y: 0 },
            { id: 'W', x: 2, y: 0 },
            { id: 'Q', x: 3, y: 0 },
            { id: 'S*', x: 4, y: 0 },
        ];
        const result = validateTargetReferenceArcOrder(invalidOrder);

        expect(result.geometry).toBeUndefined();
        expect(result.errors[0].code).toBe('TARGET_REFERENCE_ARC_ORDER_INVALID');
    });

    it('fails closed when both candidates are valid or neither is valid', () => {
        const ambiguous = selectTargetReferenceArcCandidate([
            candidate(true, 'forward'),
            candidate(true, 'reverse'),
        ]);
        const missing = selectTargetReferenceArcCandidate([
            candidate(false, 'forward'),
            candidate(false, 'reverse'),
        ]);

        expect(ambiguous.geometry).toBeUndefined();
        expect(ambiguous.errors[0].code).toBe('TARGET_REFERENCE_ARC_AMBIGUOUS');
        expect(missing.geometry).toBeUndefined();
        expect(missing.errors[0].code).toBe('TARGET_REFERENCE_ARC_NOT_FOUND');
    });

    it('fails closed when R* and S* cannot define two non-degenerate paths', () => {
        const { aligned, targetAnkle } = createGeometry();
        const degenerate: TargetAnkleIntersectionGeometry = {
            ...targetAnkle,
            SStar: { ...targetAnkle.RStar, id: 'S*' },
            sStarOutlineSegmentIndex: targetAnkle.rStarOutlineSegmentIndex,
            sStarOutlineSegmentT: targetAnkle.rStarOutlineSegmentT,
        };
        const result = deriveTargetReferenceArc(aligned, degenerate, sample);

        expect(result.geometry).toBeUndefined();
        expect(result.errors[0].code).toBe('TARGET_REFERENCE_ARC_DEGENERATE');
    });
});
