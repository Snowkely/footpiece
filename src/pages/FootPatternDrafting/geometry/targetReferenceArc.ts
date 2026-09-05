import type {
    AlignedFootPieceGeometry,
    DraftPoint,
    FootPieceSample,
    GeometryBuildResult,
    PolylineSourceIdentity,
    TargetAnkleIntersectionGeometry,
    TargetReferenceArcCandidateDiagnostic,
    TargetReferenceArcCandidateDirection,
    TargetReferenceArcGeometry,
} from '../types';
import { extractRQPSArc, polylineLength } from './footPiece';
import { distance, GEOMETRY_EPSILON_CM, VALIDATION_TOLERANCE_CM } from './geometryUtils';
import { pointAtClosedPolylineIdentity } from './targetAnkle';

interface TargetReferenceArcCandidate extends TargetReferenceArcCandidateDiagnostic {
    points: DraftPoint[];
    qDistance: number;
    wDistance: number;
    pDistance: number;
    endDistance: number;
}

interface TargetReferenceLandmarkIdentities {
    Q: PolylineSourceIdentity;
    W: PolylineSourceIdentity;
    P: PolylineSourceIdentity;
}

function positiveModulo(value: number, divisor: number): number {
    return ((value % divisor) + divisor) % divisor;
}

function clonePoints(points: DraftPoint[]): DraftPoint[] {
    return points.map((point) => ({ ...point }));
}

function identityPosition(identity: PolylineSourceIdentity): number {
    return identity.segmentIndex + identity.segmentT;
}

function cyclicDistance(
    startPosition: number,
    targetPosition: number,
    pointCount: number,
    direction: TargetReferenceArcCandidateDirection,
): number {
    return direction === 'forward'
        ? positiveModulo(targetPosition - startPosition, pointCount)
        : positiveModulo(startPosition - targetPosition, pointCount);
}

function semanticBoundaryPoint(
    outline: DraftPoint[],
    outlineIndex: number,
    identities: TargetReferenceLandmarkIdentities,
): DraftPoint {
    const point = outline[outlineIndex];
    if (outlineIndex === identities.Q.segmentIndex && identities.Q.segmentT === 0) {
        return { ...point, id: 'Q' };
    }
    if (outlineIndex === identities.P.segmentIndex && identities.P.segmentT === 0) {
        return { ...point, id: 'P' };
    }
    return { ...point };
}

function buildCandidate(
    outline: DraftPoint[],
    targetAnkle: TargetAnkleIntersectionGeometry,
    identities: TargetReferenceLandmarkIdentities,
    alignedW: DraftPoint,
    direction: TargetReferenceArcCandidateDirection,
): TargetReferenceArcCandidate | undefined {
    const pointCount = outline.length;
    if (pointCount < 3) {
        return undefined;
    }

    const startIdentity = {
        segmentIndex: targetAnkle.rStarOutlineSegmentIndex,
        segmentT: targetAnkle.rStarOutlineSegmentT,
    };
    const endIdentity = {
        segmentIndex: targetAnkle.sStarOutlineSegmentIndex,
        segmentT: targetAnkle.sStarOutlineSegmentT,
    };
    const startPosition = identityPosition(startIdentity);
    const endPosition = identityPosition(endIdentity);
    const endDistance = cyclicDistance(startPosition, endPosition, pointCount, direction);
    if (!Number.isFinite(endDistance) || endDistance <= GEOMETRY_EPSILON_CM) {
        return undefined;
    }

    const qDistance = cyclicDistance(
        startPosition,
        identityPosition(identities.Q),
        pointCount,
        direction,
    );
    const wDistance = cyclicDistance(
        startPosition,
        identityPosition(identities.W),
        pointCount,
        direction,
    );
    const pDistance = cyclicDistance(
        startPosition,
        identityPosition(identities.P),
        pointCount,
        direction,
    );
    const valid =
        qDistance > GEOMETRY_EPSILON_CM &&
        qDistance < wDistance - GEOMETRY_EPSILON_CM &&
        wDistance < pDistance - GEOMETRY_EPSILON_CM &&
        pDistance < endDistance - GEOMETRY_EPSILON_CM;

    const events: Array<{ distance: number; point: DraftPoint }> = [
        { distance: 0, point: { ...targetAnkle.RStar } },
    ];
    if (direction === 'forward') {
        const unwrappedEnd = startPosition + endDistance;
        for (
            let boundary = Math.floor(startPosition) + 1;
            boundary < unwrappedEnd - GEOMETRY_EPSILON_CM;
            boundary += 1
        ) {
            const outlineIndex = positiveModulo(boundary, pointCount);
            events.push({
                distance: boundary - startPosition,
                point: semanticBoundaryPoint(outline, outlineIndex, identities),
            });
        }
    } else {
        const unwrappedEnd = startPosition - endDistance;
        for (
            let boundary = Math.ceil(startPosition) - 1;
            boundary > unwrappedEnd + GEOMETRY_EPSILON_CM;
            boundary -= 1
        ) {
            const outlineIndex = positiveModulo(boundary, pointCount);
            events.push({
                distance: startPosition - boundary,
                point: semanticBoundaryPoint(outline, outlineIndex, identities),
            });
        }
    }
    if (wDistance > GEOMETRY_EPSILON_CM && wDistance < endDistance - GEOMETRY_EPSILON_CM) {
        events.push({ distance: wDistance, point: { ...alignedW, id: 'W' } });
    }
    events.push({ distance: endDistance, point: { ...targetAnkle.SStar } });
    events.sort((first, second) => first.distance - second.distance);
    const points = events.map((event) => event.point);

    return {
        direction,
        valid,
        points,
        pointCount: points.length,
        lengthCm: polylineLength(points),
        qDistance,
        wDistance,
        pDistance,
        endDistance,
    };
}

export function selectTargetReferenceArcCandidate(
    candidates: TargetReferenceArcCandidate[],
): GeometryBuildResult<TargetReferenceArcCandidate> {
    const validCandidates = candidates.filter((candidate) => candidate.valid);
    if (validCandidates.length > 1) {
        return {
            errors: [
                {
                    code: 'TARGET_REFERENCE_ARC_AMBIGUOUS',
                    message: 'Both cyclic R*-to-S* paths satisfy the Q-W-P ordering.',
                },
            ],
        };
    }
    if (!validCandidates.length) {
        return {
            errors: [
                {
                    code: 'TARGET_REFERENCE_ARC_NOT_FOUND',
                    message: 'Neither cyclic R*-to-S* path satisfies the Q-W-P ordering.',
                },
            ],
        };
    }
    return { geometry: validCandidates[0], errors: [] };
}

export function validateTargetReferenceArcOrder(
    points: DraftPoint[],
): GeometryBuildResult<{ qIndex: number; wIndex: number; pIndex: number }> {
    const uniqueIndex = (id: 'Q' | 'W' | 'P') => {
        const indices = points.reduce<number[]>((matches, point, index) => {
            if (point.id === id) {
                matches.push(index);
            }
            return matches;
        }, []);
        return indices.length === 1 ? indices[0] : undefined;
    };
    const qIndex = uniqueIndex('Q');
    const wIndex = uniqueIndex('W');
    const pIndex = uniqueIndex('P');
    if (
        qIndex === undefined ||
        wIndex === undefined ||
        pIndex === undefined ||
        !(0 < qIndex && qIndex < wIndex && wIndex < pIndex && pIndex < points.length - 1)
    ) {
        return {
            errors: [
                {
                    code: 'TARGET_REFERENCE_ARC_ORDER_INVALID',
                    message: 'Target reference arc must contain the strict R*-Q-W-P-S* order.',
                },
            ],
        };
    }
    return { geometry: { qIndex, wIndex, pIndex }, errors: [] };
}

function deriveLandmarkIdentities(
    alignedFootPiece: AlignedFootPieceGeometry,
    sample: FootPieceSample,
): GeometryBuildResult<TargetReferenceLandmarkIdentities> {
    const automatic = alignedFootPiece.automaticPositioning;
    const pointCount = alignedFootPiece.alignedShrinkedOutline.length;
    if (
        !automatic ||
        sample.shrinkedOutline.length !== pointCount ||
        !Number.isInteger(sample.landmarkIndices.Q) ||
        !Number.isInteger(sample.landmarkIndices.P) ||
        sample.landmarkIndices.Q < 0 ||
        sample.landmarkIndices.Q >= pointCount ||
        sample.landmarkIndices.P < 0 ||
        sample.landmarkIndices.P >= pointCount
    ) {
        return {
            errors: [
                {
                    code: 'TARGET_REFERENCE_ARC_LANDMARK_MAPPING_FAILED',
                    message:
                        'Q/P sampled identities or automatic W source identity are unavailable.',
                },
            ],
        };
    }

    const rqpsResult = extractRQPSArc(sample.shrinkedOutline, sample.landmarkIndices);
    if (!rqpsResult.geometry) {
        return {
            errors: [
                {
                    code: 'TARGET_REFERENCE_ARC_LANDMARK_MAPPING_FAILED',
                    message: 'The source RQPS cyclic indices could not be reconstructed.',
                },
            ],
        };
    }
    const qPosition = rqpsResult.geometry.outlineIndices.indexOf(sample.landmarkIndices.Q);
    const pPosition = rqpsResult.geometry.outlineIndices.indexOf(sample.landmarkIndices.P);
    if (qPosition < 0 || pPosition <= qPosition) {
        return {
            errors: [
                {
                    code: 'TARGET_REFERENCE_ARC_LANDMARK_MAPPING_FAILED',
                    message: 'Q and P do not define an ordered subpath inside source RQPS.',
                },
            ],
        };
    }
    const qpOutlineIndices = rqpsResult.geometry.outlineIndices.slice(qPosition, pPosition + 1);
    const W = automatic.source.sourceSecondToe;
    if (W.toeArcSegmentIndex < 0 || W.toeArcSegmentIndex >= qpOutlineIndices.length - 1) {
        return {
            errors: [
                {
                    code: 'TARGET_REFERENCE_ARC_LANDMARK_MAPPING_FAILED',
                    message:
                        'W Q-P segment identity is outside the reconstructed Q-P outline path.',
                },
            ],
        };
    }
    const wStartIndex = qpOutlineIndices[W.toeArcSegmentIndex];
    const wEndIndex = qpOutlineIndices[W.toeArcSegmentIndex + 1];
    let wIdentity: PolylineSourceIdentity | undefined;
    if ((wStartIndex + 1) % pointCount === wEndIndex) {
        wIdentity = { segmentIndex: wStartIndex, segmentT: W.toeArcSegmentT };
    } else if ((wEndIndex + 1) % pointCount === wStartIndex) {
        wIdentity = { segmentIndex: wEndIndex, segmentT: 1 - W.toeArcSegmentT };
    }
    const reconstructedW = wIdentity
        ? pointAtClosedPolylineIdentity(
              alignedFootPiece.alignedShrinkedOutline,
              wIdentity.segmentIndex,
              wIdentity.segmentT,
              'W reconstructed',
          )
        : undefined;
    if (
        !wIdentity ||
        !reconstructedW ||
        distance(reconstructedW, automatic.alignedSourceSecondToe) > VALIDATION_TOLERANCE_CM
    ) {
        return {
            errors: [
                {
                    code: 'TARGET_REFERENCE_ARC_LANDMARK_MAPPING_FAILED',
                    message: 'W could not be reproduced on the aligned closed-outline segment.',
                },
            ],
        };
    }

    return {
        geometry: {
            Q: { segmentIndex: sample.landmarkIndices.Q, segmentT: 0 },
            W: wIdentity,
            P: { segmentIndex: sample.landmarkIndices.P, segmentT: 0 },
        },
        errors: [],
    };
}

function buildSourceReferenceArc(
    alignedFootPiece: AlignedFootPieceGeometry,
): GeometryBuildResult<DraftPoint[]> {
    const automatic = alignedFootPiece.automaticPositioning;
    const points = clonePoints(alignedFootPiece.alignedRQPS);
    const qIndex = points.findIndex((point) => point.id === 'Q');
    const pIndex = points.findIndex((point) => point.id === 'P');
    const wSegmentIndex = automatic?.source.sourceSecondToe.toeArcSegmentIndex;
    if (
        !automatic ||
        wSegmentIndex === undefined ||
        qIndex < 0 ||
        pIndex <= qIndex ||
        qIndex + wSegmentIndex + 1 > pIndex
    ) {
        return {
            errors: [
                {
                    code: 'TARGET_REFERENCE_ARC_LANDMARK_MAPPING_FAILED',
                    message: 'Source RQPS cannot preserve the existing Q-P W segment identity.',
                },
            ],
        };
    }
    points.splice(qIndex + wSegmentIndex + 1, 0, {
        ...automatic.alignedSourceSecondToe,
        id: 'W',
    });
    return { geometry: points, errors: [] };
}

export function deriveTargetReferenceArc(
    alignedFootPiece: AlignedFootPieceGeometry,
    targetAnkle: TargetAnkleIntersectionGeometry,
    sample: FootPieceSample,
): GeometryBuildResult<TargetReferenceArcGeometry> {
    const identitiesResult = deriveLandmarkIdentities(alignedFootPiece, sample);
    const sourceArcResult = buildSourceReferenceArc(alignedFootPiece);
    if (!identitiesResult.geometry || !sourceArcResult.geometry) {
        return { errors: [...identitiesResult.errors, ...sourceArcResult.errors] };
    }

    const automatic = alignedFootPiece.automaticPositioning!;
    const forward = buildCandidate(
        alignedFootPiece.alignedShrinkedOutline,
        targetAnkle,
        identitiesResult.geometry,
        automatic.alignedSourceSecondToe,
        'forward',
    );
    const reverse = buildCandidate(
        alignedFootPiece.alignedShrinkedOutline,
        targetAnkle,
        identitiesResult.geometry,
        automatic.alignedSourceSecondToe,
        'reverse',
    );
    if (!forward || !reverse) {
        return {
            errors: [
                {
                    code: 'TARGET_REFERENCE_ARC_DEGENERATE',
                    message: 'Two non-degenerate cyclic R*-to-S* paths could not be constructed.',
                },
            ],
        };
    }

    const selectedResult = selectTargetReferenceArcCandidate([forward, reverse]);
    if (!selectedResult.geometry) {
        return { errors: selectedResult.errors };
    }
    const selected = selectedResult.geometry;
    if (selected.points.length < 5 || selected.lengthCm <= GEOMETRY_EPSILON_CM) {
        return {
            errors: [
                {
                    code: 'TARGET_REFERENCE_ARC_DEGENERATE',
                    message: 'The selected target reference arc has too few points or zero length.',
                },
            ],
        };
    }

    const orderResult = validateTargetReferenceArcOrder(selected.points);
    if (!orderResult.geometry) {
        return { errors: orderResult.errors };
    }
    const sourceReferenceArc = clonePoints(sourceArcResult.geometry);
    const targetReferenceArc = clonePoints(selected.points);
    const sourceReferenceArcLengthCm = polylineLength(sourceReferenceArc);
    const targetReferenceArcLengthCm = polylineLength(targetReferenceArc);

    return {
        geometry: {
            sourceReferenceArc,
            targetReferenceArc,
            startPoint: { ...targetAnkle.RStar },
            endPoint: { ...targetAnkle.SStar },
            sourceReferenceArcLengthCm,
            targetReferenceArcLengthCm,
            deltaLengthCm: targetReferenceArcLengthCm - sourceReferenceArcLengthCm,
            pointCount: targetReferenceArc.length,
            qIndexOnArc: orderResult.geometry.qIndex,
            wIndexOnArc: orderResult.geometry.wIndex,
            pIndexOnArc: orderResult.geometry.pIndex,
            rStarOutlineSegmentIndex: targetAnkle.rStarOutlineSegmentIndex,
            rStarOutlineSegmentT: targetAnkle.rStarOutlineSegmentT,
            sStarOutlineSegmentIndex: targetAnkle.sStarOutlineSegmentIndex,
            sStarOutlineSegmentT: targetAnkle.sStarOutlineSegmentT,
            wOutlineSegmentIndex: identitiesResult.geometry.W.segmentIndex,
            wOutlineSegmentT: identitiesResult.geometry.W.segmentT,
            orderValid: true,
            candidateA: {
                direction: forward.direction,
                valid: forward.valid,
                pointCount: forward.pointCount,
                lengthCm: forward.lengthCm,
            },
            candidateB: {
                direction: reverse.direction,
                valid: reverse.valid,
                pointCount: reverse.pointCount,
                lengthCm: reverse.lengthCm,
            },
            selectedCandidate: selected.direction,
        },
        errors: [],
    };
}
