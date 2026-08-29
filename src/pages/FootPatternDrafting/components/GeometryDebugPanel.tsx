import { Alert, Card, Tag, Typography } from 'antd';
import type {
    AgeGroup,
    BackPieceGeometry,
    DraftingParameterInput,
    DraftingParameterInputKey,
    DraftingParameters,
    FootMeasurementInputMode,
    FootPiecePositioningGeometry,
    FootPieceSample,
    FrontPieceGeometry,
    GeometryCheck,
    GeometryValidationError,
    LufCurveGeometry,
    LufCurveParameters,
    NumericFootMeasurementKey,
    RawFootMeasurementInput,
} from '../types';
import DerivedValuesPanel from './DerivedValuesPanel';
import FootPieceDebugPanel from './FootPieceDebugPanel';
import FootPiecePositioningDebugPanel from './FootPiecePositioningDebugPanel';
import LufCurveDebugPanel from './LufCurveDebugPanel';

const { Text } = Typography;

interface GeometryDebugPanelProps {
    inputMode: FootMeasurementInputMode;
    rawMeasurements: RawFootMeasurementInput;
    draftingParameterInput: DraftingParameterInput;
    ageGroup: AgeGroup;
    parameters?: DraftingParameters;
    backPiece?: BackPieceGeometry;
    frontPiece?: FrontPieceGeometry;
    footPieceSample?: FootPieceSample;
    footPiece?: FootPiecePositioningGeometry;
    lufCurveParameters: LufCurveParameters;
    lufCurve?: LufCurveGeometry;
    derivedGeometry: {
        x?: number;
        z?: number;
        y?: number;
    };
    errors: GeometryValidationError[];
}

const rawMeasurementFields: Array<{
    key: NumericFootMeasurementKey;
    label: string;
}> = [
    { key: 'metatarsalCircumference', label: 'Metatarsal' },
    { key: 'ankleFrontCircumference', label: 'Ankle front' },
    { key: 'calf5cmCircumference', label: 'Calf at +5 cm' },
    { key: 'narrowestCircumference', label: 'Narrowest' },
    { key: 'frontMalleolusCircumference', label: 'Front malleolus' },
    { key: 'backMalleolusCircumference', label: 'Back malleolus' },
    { key: 'narrowestToMalleolus', label: 'Narrowest → malleolus' },
];

const draftingParameterKeys: DraftingParameterInputKey[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

function formatCentimeters(value?: number): string {
    return value === undefined || !Number.isFinite(value) ? '—' : `${value.toFixed(3)} cm`;
}

const CheckList: React.FC<{ title: string; checks?: GeometryCheck[] }> = ({ title, checks }) => (
    <Card size="small" title={title} className="foot-drafting-debug-card">
        {!checks?.length && (
            <Text type="secondary">Complete a valid construction to run checks.</Text>
        )}
        {checks?.map((check) => (
            <div className="foot-drafting-check-row" key={check.id}>
                <div>
                    <Text>{check.label}</Text>
                    <div className="foot-drafting-check-values">
                        actual {formatCentimeters(check.actual)} · expected{' '}
                        {formatCentimeters(check.expected)} · tol ±{check.tolerance.toFixed(3)} cm
                    </div>
                </div>
                <Tag color={check.pass ? 'success' : 'error'}>{check.pass ? 'PASS' : 'FAIL'}</Tag>
            </div>
        ))}
    </Card>
);

const GeometryDebugPanel: React.FC<GeometryDebugPanelProps> = ({
    inputMode,
    rawMeasurements,
    draftingParameterInput,
    ageGroup,
    parameters,
    backPiece,
    frontPiece,
    footPieceSample,
    footPiece,
    lufCurveParameters,
    lufCurve,
    derivedGeometry,
    errors,
}) => {
    return (
        <div className="foot-drafting-debug-stack">
            <Card size="small" title="Input source" className="foot-drafting-debug-card">
                <div className="foot-drafting-value-row">
                    <Text>Mode</Text>
                    <Tag color={inputMode === 'raw' ? 'blue' : 'purple'}>
                        {inputMode === 'raw' ? 'Raw measurements' : 'Drafting parameters'}
                    </Tag>
                </div>
                <div className="foot-drafting-value-row">
                    <Text>Age group</Text>
                    <Text className="foot-drafting-capitalize">{ageGroup}</Text>
                </div>
            </Card>

            {inputMode === 'raw' ? (
                <Card size="small" title="Raw measurements" className="foot-drafting-debug-card">
                    {rawMeasurementFields.map((field) => (
                        <div className="foot-drafting-value-row" key={field.key}>
                            <Text>{field.label}</Text>
                            <Text>{formatCentimeters(rawMeasurements[field.key])}</Text>
                        </div>
                    ))}
                </Card>
            ) : (
                <Card
                    size="small"
                    title="Direct drafting input"
                    className="foot-drafting-debug-card"
                >
                    {draftingParameterKeys.map((key) => (
                        <div className="foot-drafting-value-row" key={key}>
                            <span>
                                <Text code>{key}</Text>
                                {key === 'g' && <Text type="secondary"> (no compression)</Text>}
                            </span>
                            <Text>{formatCentimeters(draftingParameterInput[key])}</Text>
                        </div>
                    ))}
                </Card>
            )}

            <DerivedValuesPanel parameters={parameters} geometry={derivedGeometry} />

            <FootPieceDebugPanel
                sampleLoaded={Boolean(footPieceSample)}
                targetR={parameters?.r}
                footPiece={footPiece}
            />

            <FootPiecePositioningDebugPanel footPiece={footPiece} />

            <LufCurveDebugPanel
                parameters={lufCurveParameters}
                a={parameters?.a}
                footPiece={footPiece}
                curve={lufCurve}
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

            <CheckList title="Back piece checks" checks={backPiece?.checks} />
            <CheckList title="Front piece checks" checks={frontPiece?.checks} />
        </div>
    );
};

export default GeometryDebugPanel;
