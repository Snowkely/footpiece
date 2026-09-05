import { Alert, Card, Tag, Typography } from 'antd';
import type {
    GeometryValidationError,
    TargetOuterCurveCandidate,
    TargetOuterCurveRejectionReason,
} from '../types';

const { Text } = Typography;

interface TargetOuterCurveDebugPanelProps {
    candidate?: TargetOuterCurveCandidate;
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

const TargetOuterCurveDebugPanel: React.FC<TargetOuterCurveDebugPanelProps> = ({
    candidate,
    errors,
}) => (
    <Card size="small" title="Legacy Single-W' Outer Curve" className="foot-drafting-debug-card">
        <DebugRow label="Curve model" value={candidate?.curveModel ?? '—'} />
        <DebugRow label="Sample segments" value={candidate?.sampleSegments ?? '—'} />
        <DebugRow label="α" value={formatNumber(candidate?.alpha, 3)} />
        <DebugRow label="W' offset" value={`${formatNumber(candidate?.wPrimeOffsetCm)} cm`} />

        <DebugRow label="L" value={formatPoint(candidate?.anchors.L)} />
        <DebugRow label="U" value={formatPoint(candidate?.anchors.U)} />
        <DebugRow label="W'" value={formatPoint(candidate?.anchors.WPrime)} />
        <DebugRow label="T" value={formatPoint(candidate?.anchors.T)} />
        <DebugRow label="G'" value={formatPoint(candidate?.anchors.GPrime)} />

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
            label="Rejection reasons"
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
            label="No reference intersection"
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

export default TargetOuterCurveDebugPanel;
