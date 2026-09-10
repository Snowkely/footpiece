import { Alert, Card, Tag, Typography } from 'antd';
import type { GeometryValidationError, TargetReferenceArcGeometry } from '../types';

const { Text } = Typography;

interface TargetReferenceArcDebugPanelProps {
    geometry?: TargetReferenceArcGeometry;
    errors: GeometryValidationError[];
}

function formatNumber(value?: number, digits = 5): string {
    return value === undefined || !Number.isFinite(value) ? '—' : value.toFixed(digits);
}

const DebugRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="foot-drafting-value-row">
        <Text>{label}</Text>
        <Text className="foot-drafting-debug-value">{value}</Text>
    </div>
);

const CandidateRow: React.FC<{
    label: string;
    candidate?: TargetReferenceArcGeometry['candidateA'];
}> = ({ label, candidate }) => (
    <div className="foot-drafting-check-row">
        <div>
            <Text>{label}</Text>
            <div className="foot-drafting-check-values">
                {candidate
                    ? `${candidate.direction} · ${candidate.pointCount} points · ${formatNumber(
                          candidate.lengthCm,
                      )} cm`
                    : 'Waiting for geometry.'}
            </div>
        </div>
        <Tag color={candidate?.valid ? 'success' : candidate ? 'error' : 'default'}>
            {candidate ? (candidate.valid ? 'VALID' : 'INVALID') : 'WAIT'}
        </Tag>
    </div>
);

const TargetReferenceArcDebugPanel: React.FC<TargetReferenceArcDebugPanelProps> = ({
    geometry,
    errors,
}) => (
    <Card size="small" title="Target Reference Arc" className="foot-drafting-debug-card">
        <DebugRow
            label="Source reference arc length"
            value={`${formatNumber(geometry?.sourceReferenceArcLengthCm)} cm`}
        />
        <DebugRow
            label="Target reference arc length"
            value={`${formatNumber(geometry?.targetReferenceArcLengthCm)} cm`}
        />
        <DebugRow
            label="Target − source length"
            value={`${formatNumber(geometry?.deltaLengthCm)} cm`}
        />
        <DebugRow label="Target arc point count" value={geometry?.pointCount ?? '—'} />
        <DebugRow label="Q index on arc" value={geometry?.qIndexOnArc ?? '—'} />
        <DebugRow label="W index on arc" value={geometry?.wIndexOnArc ?? '—'} />
        <DebugRow label="P index on arc" value={geometry?.pIndexOnArc ?? '—'} />
        <div className="foot-drafting-check-row">
            <div>
                <Text>R* → Q → W → P → S*</Text>
                <div className="foot-drafting-check-values">Strict landmark order validation</div>
            </div>
            <Tag color={geometry?.orderValid ? 'success' : 'default'}>
                {geometry ? (geometry.orderValid ? 'PASS' : 'FAIL') : 'WAIT'}
            </Tag>
        </div>
        <CandidateRow label="Candidate A" candidate={geometry?.candidateA} />
        <CandidateRow label="Candidate B" candidate={geometry?.candidateB} />
        <DebugRow label="Selected candidate" value={geometry?.selectedCandidate ?? '—'} />
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

export default TargetReferenceArcDebugPanel;
