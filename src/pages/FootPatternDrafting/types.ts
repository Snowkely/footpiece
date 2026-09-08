export type AgeGroup = 'adult' | 'child' | 'baby';
export type FootMeasurementInputMode = 'raw' | 'drafting';

export interface RawFootMeasurements {
    metatarsalCircumference: number;
    ankleFrontCircumference: number;
    calf5cmCircumference: number;
    narrowestCircumference: number;
    frontMalleolusCircumference: number;
    backMalleolusCircumference: number;
    narrowestToMalleolus: number;
    ageGroup: AgeGroup;
}

export type NumericFootMeasurementKey = Exclude<keyof RawFootMeasurements, 'ageGroup'>;

export type RawFootMeasurementInput = Partial<Omit<RawFootMeasurements, 'ageGroup'>>;

export interface DraftingParameterInput {
    a?: number;
    b?: number;
    c?: number;
    d?: number;
    e?: number;
    f?: number;
    g?: number;
}

export type DraftingParameterInputKey = keyof DraftingParameterInput;

export interface DraftingParameters {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
    g: number;
    r?: number;
}

export interface DraftPoint {
    id: string;
    x: number;
    y: number;
}

export interface DraftVector2 {
    x: number;
    y: number;
}

export interface DraftLine {
    id: string;
    start: DraftPoint;
    end: DraftPoint;
    dashed?: boolean;
    kind?: 'construction' | 'boundary' | 'centerline';
}

export interface GeometryValidationError {
    code: string;
    message: string;
}

export interface GeometryCheck {
    id: string;
    label: string;
    actual?: number;
    expected?: number;
    tolerance: number;
    pass: boolean;
}

export interface GeometryBuildResult<T> {
    geometry?: T;
    derived?: {
        x?: number;
        y?: number;
        z?: number;
    };
    errors: GeometryValidationError[];
}

export type BackPieceBasePointId = 'M' | 'N' | 'O' | 'B' | 'C' | 'D' | 'E';
export type BackPieceCompletionPointId = 'A' | 'F';
export type BackPiecePointId = BackPieceBasePointId | BackPieceCompletionPointId;

export interface BackPieceGeometry {
    points: Record<BackPieceBasePointId, DraftPoint> &
        Partial<Record<BackPieceCompletionPointId, DraftPoint>>;
    lines: DraftLine[];
    x: number;
    z: number;
    checks: GeometryCheck[];
}

export type FrontPiecePointId =
    | 'MPrime'
    | 'N'
    | 'O'
    | 'B'
    | 'C'
    | 'H'
    | 'G'
    | 'K'
    | 'HPrime'
    | 'GPrime'
    | 'L'
    | 'BPrime'
    | 'CPrime'
    | 'KPrime'
    | 'HLeft'
    | 'HPrimeLeft'
    | 'GLeft';

export interface FrontPieceGeometry {
    points: Record<FrontPiecePointId, DraftPoint>;
    lines: DraftLine[];
    ageAdjustment: number;
    y: number;
    checks: GeometryCheck[];
}

export type FootPieceLandmarkId = 'P' | 'Q' | 'R' | 'S';

export type FootPieceLandmarks = Record<FootPieceLandmarkId, DraftPoint>;

export interface FootPieceGeometry {
    originalOutline?: DraftPoint[];
    shrinkedOutline: DraftPoint[];
    landmarks: FootPieceLandmarks;
}

export interface FootPieceSampleSource {
    fileName: string;
    sha256: string;
    dxfVersion: string;
    insunits: number;
    samplingSegments: number;
    layers: string[];
    entityCounts: Record<string, number>;
    layerEntityCounts: Record<string, Record<string, number>>;
    originalSpline: FootPieceSplineMetadata;
    shrinkedSpline: FootPieceSplineMetadata;
}

export interface FootPieceSplineMetadata {
    handle: string;
    layer: string;
    closed: boolean;
    degree: number;
    fitPointCount: number;
    controlPointCount: number;
    sampledPointCount: number;
    absoluteSampledAreaRaw: number;
}

export interface FootPieceSample extends FootPieceGeometry {
    source: FootPieceSampleSource;
    landmarkIndices: Record<FootPieceLandmarkId, number>;
    snapDistancesRaw: Record<FootPieceLandmarkId, number>;
    snapToleranceRaw: number;
    rawRS: number;
}

export interface PolylineSourceIdentity {
    segmentIndex: number;
    segmentT: number;
}

export interface MidHeelCandidateDiagnostic {
    sampledIndex: number;
    longitudinalProjection: number;
    projectionDelta: number;
    tangentOrthogonalityError: number;
    score: number;
}

export interface MidHeelDetection {
    point: DraftPoint;
    heelArcSegmentIndex: number;
    heelArcSegmentT: number;
    coarseSampledIndex: number;
    footDirection: DraftVector2;
    tangent: DraftVector2;
    normalTowardToe: DraftVector2;
    extremumProjection: number;
    longitudinalProjection: number;
    projectionError: number;
    projectionTolerance: number;
    orthogonalityError: number;
    confidence: 'HIGH' | 'REVIEW';
    candidates: MidHeelCandidateDiagnostic[];
}

export interface SecondToeDetection {
    point: DraftPoint;
    toeArcSegmentIndex: number;
    toeArcSegmentT: number;
    rayDistance: number;
    intersectionCandidateCount: number;
}

export interface SourceFootAxisGeometry {
    heelArc: DraftPoint[];
    rqps: DraftPoint[];
    toeArcQP: DraftPoint[];
    ankleCenter: DraftPoint;
    forefootCenter: DraftPoint;
    sourceMidHeel: MidHeelDetection;
    sourceSecondToe: SecondToeDetection;
    sourceMs: DraftPoint;
    rsMidpoint: DraftPoint;
    hwDistanceRaw: number;
    longitudinalTransverseAngleRadians: number;
    sourceMsVsRsMidpointDistanceRaw: number;
}

export interface AutomaticFootPiecePositioning {
    status: 'VALID';
    alignmentMode: 'automatic-midheel-secondtoe-axis';
    source: SourceFootAxisGeometry;
    targetDirection: DraftVector2;
    translationVectorCm: DraftVector2;
    alignedHeelArc: DraftPoint[];
    alignedQPArc: DraftPoint[];
    alignedSourceMidHeel: DraftPoint;
    alignedSourceSecondToe: DraftPoint;
    alignedSourceMs: DraftPoint;
    checks: {
        sourceMsToMPrime: {
            distanceCm: number;
            toleranceCm: number;
            pass: boolean;
        };
        axisToOMPrime: {
            angleErrorRadians: number;
            directionDot: number;
            hLineDistanceCm: number;
            wLineDistanceCm: number;
            toleranceRadians: number;
            toleranceCm: number;
            pass: boolean;
        };
        heelToeSides: {
            heelProjectionCm: number;
            toeProjectionCm: number;
            pass: boolean;
        };
        uniformTransform: {
            maximumDistanceErrorCm: number;
            toleranceCm: number;
            pass: boolean;
        };
        secondToeIdentityPreserved: {
            distanceCm: number;
            toleranceCm: number;
            pass: boolean;
        };
    };
    diagnostics: {
        alignedRsVsMPrimeGAngleRadians: number;
        alignedRDistanceToMPrimeG: number;
        alignedSDistanceToMPrimeG: number;
    };
}

export interface RayOutlineIntersection {
    point: DraftPoint;
    rayT: number;
    outlineSegmentIndex: number;
    outlineSegmentT: number;
}

export interface TargetAnkleIntersectionGeometry {
    RStar: DraftPoint;
    SStar: DraftPoint;
    rStarRayT: number;
    sStarRayT: number;
    rStarOutlineSegmentIndex: number;
    rStarOutlineSegmentT: number;
    sStarOutlineSegmentIndex: number;
    sStarOutlineSegmentT: number;
    targetDirection: DraftVector2;
    originalRProjection: number;
    originalSProjection: number;
    positiveRayIntersectionCount: number;
    negativeRayIntersectionCount: number;
    mPrimeToRStar: number;
    mPrimeToSStar: number;
    ankleSpan: number;
    asymmetry: number;
    rToRStarDistance: number;
    sToSStarDistance: number;
    rStarLineDistanceCm: number;
    sStarLineDistanceCm: number;
    spanDecompositionErrorCm: number;
    rStarOutlineIdentityErrorCm: number;
    sStarOutlineIdentityErrorCm: number;
}

export type TargetReferenceArcCandidateDirection = 'forward' | 'reverse';

export interface TargetReferenceArcCandidateDiagnostic {
    direction: TargetReferenceArcCandidateDirection;
    valid: boolean;
    pointCount: number;
    lengthCm: number;
}

export interface TargetReferenceArcGeometry {
    sourceReferenceArc: DraftPoint[];
    targetReferenceArc: DraftPoint[];
    startPoint: DraftPoint;
    endPoint: DraftPoint;
    sourceReferenceArcLengthCm: number;
    targetReferenceArcLengthCm: number;
    deltaLengthCm: number;
    pointCount: number;
    qIndexOnArc: number;
    wIndexOnArc: number;
    pIndexOnArc: number;
    rStarOutlineSegmentIndex: number;
    rStarOutlineSegmentT: number;
    sStarOutlineSegmentIndex: number;
    sStarOutlineSegmentT: number;
    wOutlineSegmentIndex: number;
    wOutlineSegmentT: number;
    orderValid: boolean;
    candidateA: TargetReferenceArcCandidateDiagnostic;
    candidateB: TargetReferenceArcCandidateDiagnostic;
    selectedCandidate: TargetReferenceArcCandidateDirection;
}

export type ToeRadialRayMultiplier = -2 | -1 | 1 | 2;
export type ToeRadialReferenceLandmarkId = 'W1' | 'W2' | 'W3' | 'W4';

export interface ToeRadialReferencePoint {
    point: DraftPoint;
    direction: DraftVector2;
    rayMultiplier: ToeRadialRayMultiplier;
    /** Signed angle in the semantic toe frame: negative toward Q, positive toward P. */
    angleRad: number;
    toeArcSegmentIndex: number;
    toeArcSegmentT: number;
    distanceFromMs: number;
}

export interface ToeRadialReferenceGeometry {
    thetaDeg: number;
    thetaRad: number;
    origin: DraftPoint;
    W: DraftPoint;
    centerDirection: DraftVector2;
    /** Converts semantic toe-frame angles to the source coordinate system rotation sign. */
    angularOrientationSign: -1 | 1;
    W1: ToeRadialReferencePoint;
    W2: ToeRadialReferencePoint;
    W3: ToeRadialReferencePoint;
    W4: ToeRadialReferencePoint;
    toeArcPoints: DraftPoint[];
    qIndexOnToeArc: number;
    wIndexOnToeArc: number;
    pIndexOnToeArc: number;
    order: ['Q', 'W1', 'W2', 'W', 'W3', 'W4', 'P'];
    checks: {
        equalAngles: {
            expectedRad: number;
            actualRad: [number, number, number, number];
            maximumErrorRad: number;
            toleranceRad: number;
            pass: boolean;
        };
        orderValid: {
            positions: [number, number, number, number, number, number, number];
            pass: boolean;
        };
        allOnToeArc: {
            maximumDistanceErrorCm: number;
            toleranceCm: number;
            pass: boolean;
        };
    };
}

export type ToeRadialOuterSupportRayMultiplier = ToeRadialRayMultiplier | 0;
export type ToeRadialOuterSupportReferenceId = 'W1' | 'W2' | 'W' | 'W3' | 'W4';

export interface ToeRadialOuterSupportPoint {
    referencePoint: DraftPoint;
    outerPoint: DraftPoint;
    direction: DraftVector2;
    rayMultiplier: ToeRadialOuterSupportRayMultiplier;
    referenceDistanceFromMs: number;
    outerDistanceFromMs: number;
    outwardDistance: number;
    outwardProjectionCm: number;
    collinearityErrorCm: number;
    offsetErrorCm: number;
    radialDistanceErrorCm: number;
    radialAngleErrorRad: number;
}

export interface ToeRadialOuterSupportGeometry {
    thetaDeg: number;
    outwardOffsetCm: number;
    origin: DraftPoint;
    W1Prime: ToeRadialOuterSupportPoint;
    W2Prime: ToeRadialOuterSupportPoint;
    WPrime: ToeRadialOuterSupportPoint;
    W3Prime: ToeRadialOuterSupportPoint;
    W4Prime: ToeRadialOuterSupportPoint;
    checks: {
        allRadiallyCollinear: {
            errorsCm: [number, number, number, number, number];
            maximumErrorCm: number;
            toleranceCm: number;
            pass: boolean;
        };
        allOutward: {
            projectionsCm: [number, number, number, number, number];
            pass: boolean;
        };
        allOffsetsEqual: {
            errorsCm: [number, number, number, number, number];
            maximumErrorCm: number;
            toleranceCm: number;
            pass: boolean;
        };
        allRadialDistanceIncrements: {
            errorsCm: [number, number, number, number, number];
            maximumErrorCm: number;
            toleranceCm: number;
            pass: boolean;
        };
        allAnglesPreserved: {
            errorsRad: [number, number, number, number, number];
            maximumErrorRad: number;
            toleranceRad: number;
            pass: boolean;
        };
        centerWPrimeMatchesStep5: {
            mismatchCm: number;
            toleranceCm: number;
            pass: boolean;
        };
    };
}

export interface TargetUtScalarCheck {
    actual: number;
    expected: number;
    errorCm: number;
    toleranceCm: number;
    pass: boolean;
}

export interface TargetUtGeometry {
    U: DraftPoint;
    T: DraftPoint;
    pqLengthCm: number;
    targetUtLengthCm: number;
    extraLengthCm: number;
    upLengthCm: number;
    qtLengthCm: number;
    distribution: number;
    pqDirection: DraftVector2;
    checks: {
        collinearity: {
            maximumLineDistanceCm: number;
            toleranceCm: number;
            pass: boolean;
        };
        directionOrder: {
            pForwardDistanceCm: number;
            qForwardDistanceCm: number;
            toleranceCm: number;
            pass: boolean;
        };
        utLength: TargetUtScalarCheck;
        upLength: TargetUtScalarCheck;
        qtLength: TargetUtScalarCheck;
        decomposition: TargetUtScalarCheck;
        pUnchanged: {
            distanceCm: number;
            toleranceCm: number;
            pass: boolean;
        };
        qUnchanged: {
            distanceCm: number;
            toleranceCm: number;
            pass: boolean;
        };
    };
}

export interface TargetWPrimeGeometry {
    MPrime: DraftPoint;
    O: DraftPoint;
    W: DraftPoint;
    WPrime: DraftPoint;
    toeOutwardDirection: DraftVector2;
    frontFootDirection: DraftVector2;
    directionDot: number;
    outwardOffsetCm: number;
    distanceFromW: number;
    distanceFromMPrimeToW: number;
    distanceFromMPrime: number;
    checks: {
        directionAlignment: {
            dot: number;
            minimumDot: number;
            pass: boolean;
        };
        collinearity: {
            maximumLineDistanceCm: number;
            toleranceCm: number;
            pass: boolean;
        };
        directionOrder: {
            mPrimeToWProjectionCm: number;
            wToWPrimeProjectionCm: number;
            pass: boolean;
        };
        offsetDistance: {
            actualCm: number;
            expectedCm: number;
            errorCm: number;
            toleranceCm: number;
            pass: boolean;
        };
        wUnchanged: {
            distanceCm: number;
            toleranceCm: number;
            pass: boolean;
        };
    };
}

export type TargetOuterCurveRejectionReason =
    | 'OUTER_CURVE_TOO_SHORT'
    | 'OUTER_CURVE_TOO_LONG'
    | 'OUTER_CURVE_INSIDE_REFERENCE'
    | 'OUTER_CURVE_REFERENCE_INTERSECTION'
    | 'OUTER_CURVE_SELF_INTERSECTION';

export interface TargetOuterCurveCandidate {
    alpha: number;
    wPrimeOffsetCm: number;
    curveModel: 'centripetal-catmull-rom';
    sampleSegments: number;
    anchors: {
        L: DraftPoint;
        U: DraftPoint;
        WPrime: DraftPoint;
        T: DraftPoint;
        GPrime: DraftPoint;
    };
    polylinePoints: DraftPoint[];
    referencePolygon: DraftPoint[];
    referenceLengthCm: number;
    outerCurveLengthCm: number;
    extraLengthCm: number;
    checks: {
        anchorInterpolation: {
            maximumErrorCm: number;
            toleranceCm: number;
            pass: boolean;
        };
        lengthRange: {
            extraLengthCm: number;
            minimumCm: number;
            maximumCm: number;
            toleranceCm: number;
            pass: boolean;
        };
        outsideReference: {
            outsidePointCount: number;
            insidePointCount: number;
            boundaryPointCount: number;
            totalPointCount: number;
            pass: boolean;
        };
        noReferenceIntersection: {
            intersectionCount: number;
            pass: boolean;
        };
        noSelfIntersection: {
            intersectionCount: number;
            pass: boolean;
        };
    };
    diagnostics: {
        lEndpointTangentMismatchDeg?: number;
        gPrimeEndpointTangentMismatchDeg?: number;
        wPrimeTangentAngleToFootAxisDeg?: number;
    };
    valid: boolean;
    rejectionReasons: TargetOuterCurveRejectionReason[];
}

export type TargetMultiSupportOuterCurveAnchorId =
    | 'L'
    | 'U'
    | 'W4Prime'
    | 'W3Prime'
    | 'WPrime'
    | 'W2Prime'
    | 'W1Prime'
    | 'T'
    | 'GPrime';

export interface TargetMultiSupportOuterCurveCandidate {
    alpha: number;
    thetaDeg: number;
    outwardOffsetCm: number;
    curveModel: 'centripetal-catmull-rom';
    sampleSegments: number;
    anchors: {
        L: DraftPoint;
        U: DraftPoint;
        W4Prime: DraftPoint;
        W3Prime: DraftPoint;
        WPrime: DraftPoint;
        W2Prime: DraftPoint;
        W1Prime: DraftPoint;
        T: DraftPoint;
        GPrime: DraftPoint;
    };
    anchorOrder: ['L', 'U', 'W4Prime', 'W3Prime', 'WPrime', 'W2Prime', 'W1Prime', 'T', 'GPrime'];
    polylinePoints: DraftPoint[];
    referencePolygon: DraftPoint[];
    referenceLengthCm: number;
    outerCurveLengthCm: number;
    extraLengthCm: number;
    checks: {
        anchorInterpolation: {
            errorsCm: Record<TargetMultiSupportOuterCurveAnchorId, number>;
            maximumErrorCm: number;
            toleranceCm: number;
            pass: boolean;
        };
        lengthRange: TargetOuterCurveCandidate['checks']['lengthRange'];
        outsideReference: TargetOuterCurveCandidate['checks']['outsideReference'];
        noReferenceIntersection: TargetOuterCurveCandidate['checks']['noReferenceIntersection'];
        noSelfIntersection: TargetOuterCurveCandidate['checks']['noSelfIntersection'];
    };
    diagnostics: TargetOuterCurveCandidate['diagnostics'] & {
        maxToeTurningDeg?: number;
        meanToeTurningDeg?: number;
        toeTurningVariationDeg?: number;
        supportChordTurningAnglesDeg: {
            W3Prime: number;
            WPrime: number;
            W2Prime: number;
        };
    };
    valid: boolean;
    rejectionReasons: TargetOuterCurveRejectionReason[];
}

export type FootPieceAlignmentMode = 'rs-midpoint-to-mprime' | 'automatic-midheel-secondtoe-axis';

export interface AlignedFootPieceGeometry {
    alignmentAssumption: FootPieceAlignmentMode;
    rawRsChordLength: number;
    rawHeelArcLength: number;
    heelArcPointCount: number;
    targetR: number;
    scaleToCm: number;
    rotationRadians: number;
    alignedShrinkedOutline: DraftPoint[];
    alignedLandmarks: FootPieceLandmarks;
    alignedRQPS: DraftPoint[];
    alignedRsMidpoint: DraftPoint;
    targetMPrime: DraftPoint;
    rqpsArcLengthCm: number;
    rqpsPointCount: number;
    automaticPositioning?: AutomaticFootPiecePositioning;
    checks: {
        midpointToMPrime: {
            distanceCm: number;
            toleranceCm: number;
            pass: boolean;
        };
        orientation: {
            angleErrorRadians: number;
            toleranceRadians: number;
            pass: boolean;
        };
    };
}

export interface FootPieceFSelection {
    /** Segment index in the source Q-to-P reference sub-arc. */
    segmentIndex: number;
    /** Linear interpolation parameter on that segment. */
    segmentT: number;
}

export type FootPieceFSelectionState = 'none' | 'selected' | 'confirmed';
export type FootPiecePositioningStatus = 'PROVISIONAL' | 'VALID';
export type FootPiecePositioningMode = 'legacy-rs-midpoint-to-mprime' | 'f-centre-line-final';

export interface FootPiecePositioningGeometry extends AlignedFootPieceGeometry {
    alignedQPArc: DraftPoint[];
    alignedRQFPS?: DraftPoint[];
    positioning: {
        status: FootPiecePositioningStatus;
        alignmentMode: FootPiecePositioningMode;
        selectionState: FootPieceFSelectionState;
        selection?: FootPieceFSelection;
        sourceF?: DraftPoint;
        provisionalF?: DraftPoint;
        alignedF?: DraftPoint;
        translationVectorCm?: {
            x: number;
            y: number;
        };
        gDirection: {
            x: number;
            y: number;
        };
        centreDirection: {
            x: number;
            y: number;
        };
        checks: {
            fSelected: {
                pass: boolean;
            };
            rsInlineWithMPrimeG: {
                rLineDistanceCm: number;
                sLineDistanceCm: number;
                toleranceCm: number;
                pass: boolean;
            };
            mPrimeFPerpendicular: {
                absoluteNormalizedDot: number;
                tolerance: number;
                pass: boolean;
            };
            fOnCentreLine: {
                lineErrorCm: number;
                toleranceCm: number;
                pass: boolean;
            };
            sourceIdentityPreserved: {
                alignedDistanceCm: number;
                toleranceCm: number;
                pass: boolean;
            };
        };
    };
}

export interface LufCurveParameters {
    /** alpha = UP / (UP + QT): distributes the additional UT length. */
    upQtDistribution: number;
    /** lambda: distance from F to F' along the outward centre-line direction, in cm. */
    fPrimeOffsetCm: number;
}

export interface LufCurveRangeCheck {
    actual: number;
    minimum: number;
    maximum: number;
    tolerance: number;
    pass: boolean;
}

export interface LufCurveDirectionCheck {
    outwardDistanceDeltaCm: number;
    expectedOffsetCm: number;
    collinearityErrorCm: number;
    toleranceCm: number;
    pass: boolean;
}

export interface LufCurveOutsideCheck {
    outsidePointCount: number;
    insidePointCount: number;
    boundaryPointCount: number;
    totalPointCount: number;
    pass: boolean;
}

export interface LufCurveIntersectionCheck {
    intersectionCount: number;
    pass: boolean;
}

export interface LufCurveGeometry {
    F: DraftPoint;
    FPrime: DraftPoint;
    U: DraftPoint;
    T: DraftPoint;
    anchorPoints: DraftPoint[];
    sampledCurve: DraftPoint[];
    curveLengthCm: number;
    referenceLengthCm: number;
    targetLengthMinCm: number;
    targetLengthMaxCm: number;
    pqLengthCm: number;
    extraLengthCm: number;
    upLengthCm: number;
    qtLengthCm: number;
    ffPrimeDistanceCm: number;
    parameters: LufCurveParameters;
    checks: {
        utLength: GeometryCheck;
        fPrimeDirection: LufCurveDirectionCheck;
        curveLength: LufCurveRangeCheck;
        outsideReference: LufCurveOutsideCheck;
        noIntersection: LufCurveIntersectionCheck;
    };
}
