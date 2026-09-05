import { Alert, Card, Tag, Typography } from 'antd';
import type {
    GeometryValidationError,
    TargetMultiSupportOuterCurveCandidate,
    TargetOuterCurveRejectionReason,
} from '../types';

const { Text } = Typography;

interface TargetMultiSupportOuterCurveDebugPanelProps {
    candidate?: TargetMultiSupportOuterCurveCandidate;
    errors: GeometryValidationError[];
}

function formatNumber(value?: number, digits = 6): string {
    return value === undefined || !Number.isFinite(value) ? '—' : value.toFixed(digits);
}

function formatPoint(point?: { x: number; y: number }): string {
    return point ? `(${formatNumber(point.x)}, ${formatNumber(point.y)}) cm` : '—';
}

function formatDiagnostic(value?: number): string {
    return value === undefined || !Number.isFinite(value) ? 'unavailable' : `${value.toFixed(3)}°`;
}

function formatReason(reason: TargetOuterCurveRejectionReason): string {
    return reason.replace('OUTER_CURVE_', '');
}

const DebugRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="foot-drafting-value-row">
        <Text>{label}</Text>
        <Text className="foot-drafting-debug-value">{value}</Text>
    </div>
);

const CheckRow: React.FC<{ label: string; pass?: boolean; details: string }> = ({
    label,
    pass,
    details,
}) => (
    <div className="foot-drafting-check-row">
        <div>
            <Text>{label}</Text>
            <div className="foot-drafting-check-values">{details}</div>
        </div>
        <Tag color={pass === undefined ? 'default' : pass ? 'success' : 'error'}>
            {pass === undefined ? 'WAIT' : pass ? 'PASS' : 'FAIL'}
        </Tag>
    </div>
);

const TargetMultiSupportOuterCurveDebugPanel: React.FC<
    TargetMultiSupportOuterCurveDebugPanelProps
> = ({ candidate, errors }) => (
    <Card size="small" title="Multi-Support Outer Curve" className="foot-drafting-debug-card">
        <DebugRow label="α" value={formatNumber(candidate?.alpha, 3)} />
        <DebugRow label="θ" value={`${formatNumber(candidate?.thetaDeg, 3)}°`} />
        <DebugRow label="λ" value={`${formatNumber(candidate?.outwardOffsetCm)} cm`} />
        <DebugRow label="Model" value={candidate?.curveModel ?? '—'} />
        <DebugRow
            label="Segments / points"
            value={
                candidate ? `${candidate.sampleSegments} / ${candidate.polylinePoints.length}` : '—'
            }
        />
        <DebugRow
            label="Anchor order"
            value={
                candidate
                    ? candidate.anchorOrder.map((id) => candidate.anchors[id].id).join(' → ')
                    : "L → U → W4' → W3' → W' → W2' → W1' → T → G'"
            }
        />

        {candidate?.anchorOrder.map((id) => (
            <DebugRow
                key={id}
                label={candidate.anchors[id].id}
                value={formatPoint(candidate.anchors[id])}
            />
        ))}

        <DebugRow
            label="Reference length"
            value={`${formatNumber(candidate?.referenceLengthCm, 4)} cm`}
        />
        <DebugRow
            label="Outer length"
            value={`${formatNumber(candidate?.outerCurveLengthCm, 4)} cm`}
        />
        <DebugRow label="Extra length" value={`${formatNumber(candidate?.extraLengthCm, 4)} cm`} />
        <DebugRow label="Required extra" value="1.0–2.0 cm" />
        <DebugRow
            label="Candidate"
            value={
                candidate ? (
                    <Tag color={candidate.valid ? 'success' : 'error'}>
                        {candidate.valid ? 'VALID' : 'INVALID'}
                    </Tag>
                ) : (
                    '—'
                )
            }
        />
        <DebugRow
            label="Reasons"
            value={
                candidate?.rejectionReasons.length
                    ? candidate.rejectionReasons.map(formatReason).join(', ')
                    : candidate
                    ? '[]'
                    : '—'
            }
        />

        <CheckRow
            label="Anchor interpolation"
            pass={candidate?.checks.anchorInterpolation.pass}
            details={`max error ${formatNumber(
                candidate?.checks.anchorInterpolation.maximumErrorCm,
                9,
            )} cm`}
        />
        <CheckRow
            label="Length +1–2 cm"
            pass={candidate?.checks.lengthRange.pass}
            details={`extra ${formatNumber(candidate?.checks.lengthRange.extraLengthCm)} cm`}
        />
        <CheckRow
            label="Outside reference"
            pass={candidate?.checks.outsideReference.pass}
            details={`inside ${
                candidate?.checks.outsideReference.insidePointCount ?? '—'
            } · boundary ${candidate?.checks.outsideReference.boundaryPointCount ?? '—'}`}
        />
        <CheckRow
            label="No reference intersections"
            pass={candidate?.checks.noReferenceIntersection.pass}
            details={`intersections ${
                candidate?.checks.noReferenceIntersection.intersectionCount ?? '—'
            }`}
        />
        <CheckRow
            label="No self intersection"
            pass={candidate?.checks.noSelfIntersection.pass}
            details={`intersections ${
                candidate?.checks.noSelfIntersection.intersectionCount ?? '—'
            }`}
        />

        <DebugRow
            label="L tangent mismatch"
            value={formatDiagnostic(candidate?.diagnostics.lEndpointTangentMismatchDeg)}
        />
        <DebugRow
            label="G' tangent mismatch"
            value={formatDiagnostic(candidate?.diagnostics.gPrimeEndpointTangentMismatchDeg)}
        />
        <DebugRow
            label="W' tangent vs foot axis"
            value={formatDiagnostic(candidate?.diagnostics.wPrimeTangentAngleToFootAxisDeg)}
        />
        <DebugRow
            label="Max toe turning"
            value={formatDiagnostic(candidate?.diagnostics.maxToeTurningDeg)}
        />
        <DebugRow
            label="Mean toe turning"
            value={formatDiagnostic(candidate?.diagnostics.meanToeTurningDeg)}
        />
        <DebugRow
            label="Support chord turns"
            value={
                candidate
                    ? `W3' ${formatDiagnostic(
                          candidate.diagnostics.supportChordTurningAnglesDeg.W3Prime,
                      )} · W' ${formatDiagnostic(
                          candidate.diagnostics.supportChordTurningAnglesDeg.WPrime,
                      )} · W2' ${formatDiagnostic(
                          candidate.diagnostics.supportChordTurningAnglesDeg.W2Prime,
                      )}`
                    : '—'
            }
        />

        {errors.map((error) => (
            <Alert
                key={error.code}
                type="error"
                showIcon
                message={error.code}
                description={error.message}
            />
        ))}
    </Card>
);

export default TargetMultiSupportOuterCurveDebugPanel;
