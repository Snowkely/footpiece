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

export interface AlignedFootPieceGeometry {
    alignmentAssumption: 'rs-midpoint-to-mprime';
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
    /** alpha: distributes the additional UT length between UP and QT. */
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
