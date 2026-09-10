import { DownloadOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Tag, Typography } from 'antd';
import React, { useState } from 'react';
import type { SerializedPatternDxf } from '../export/dxfSerializer';
import { serializeFinalPatternDxf } from '../export/dxfSerializer';
import type { FinalPatternExportGeometry } from '../geometry/finalPatternExport';
import type { GeometryValidationError, TargetMultiSupportOuterCurveCandidate } from '../types';

const { Text } = Typography;

interface PatternDxfExportControlsProps {
    manualCandidate?: TargetMultiSupportOuterCurveCandidate;
    frontContourReady: boolean;
    backContourReady: boolean;
    exportGeometry?: FinalPatternExportGeometry;
    errors: GeometryValidationError[];
    onDownload?: (serialized: SerializedPatternDxf) => void;
}

export function downloadSerializedPatternDxf(serialized: SerializedPatternDxf): void {
    const blob = new Blob([serialized.dxfText], { type: 'application/dxf;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = serialized.fileName;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
}

const PatternDxfExportControls: React.FC<PatternDxfExportControlsProps> = ({
    manualCandidate,
    frontContourReady,
    backContourReady,
    exportGeometry,
    errors,
    onDownload,
}) => {
    const [downloadError, setDownloadError] = useState<GeometryValidationError>();
    const manualCandidateValid = manualCandidate?.valid === true;
    const exportReady = Boolean(
        manualCandidateValid && frontContourReady && backContourReady && exportGeometry,
    );

    const handleDownload = () => {
        if (!exportGeometry || !exportReady) return;
        const serialized = serializeFinalPatternDxf(exportGeometry);
        if (!serialized.geometry) {
            setDownloadError(serialized.errors[0]);
            return;
        }

        setDownloadError(undefined);
        (onDownload ?? downloadSerializedPatternDxf)(serialized.geometry);
    };

    return (
        <Card className="foot-drafting-panel" title="Master DXF Export">
            <Text type="secondary" className="foot-drafting-panel-intro">
                Production cutting contours are exported from the current applied manual
                multi-support candidate. Search and Suggested previews are never export sources.
            </Text>

            <div className="foot-drafting-export-status">
                <span>
                    Front contour
                    <Tag color={frontContourReady ? 'success' : 'error'}>
                        {frontContourReady ? 'READY' : 'ERROR'}
                    </Tag>
                </span>
                <span>
                    Back contour
                    <Tag color={backContourReady ? 'success' : 'error'}>
                        {backContourReady ? 'READY' : 'ERROR'}
                    </Tag>
                </span>
                <span>
                    Manual multi-support candidate
                    <Tag color={manualCandidateValid ? 'success' : 'warning'}>
                        {manualCandidateValid ? 'VALID' : 'INVALID'}
                    </Tag>
                </span>
                <span>
                    Units <Tag>mm</Tag>
                </span>
                <span>
                    Master layout <Tag>Back above Front</Tag>
                </span>
                <span>
                    Export
                    <Tag color={exportReady ? 'success' : 'default'}>
                        {exportReady ? 'READY' : 'WAITING'}
                    </Tag>
                </span>
            </div>

            {!manualCandidateValid && (
                <Alert
                    type="info"
                    showIcon
                    message="A valid multi-support candidate must be applied before DXF export."
                />
            )}

            {manualCandidateValid &&
                errors.map((error) => (
                    <Alert
                        key={error.code}
                        type="error"
                        showIcon
                        message={error.code}
                        description={error.message}
                    />
                ))}

            {downloadError && (
                <Alert
                    type="error"
                    showIcon
                    message={downloadError.code}
                    description={downloadError.message}
                />
            )}

            <Button
                block
                type="primary"
                icon={<DownloadOutlined />}
                disabled={!exportReady}
                onClick={handleDownload}
            >
                Export Master DXF
            </Button>
        </Card>
    );
};

export default PatternDxfExportControls;
