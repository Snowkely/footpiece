import { Alert, Card, Form, InputNumber, Segmented, Select, Typography } from 'antd';
import type {
    AgeGroup,
    DraftingParameterInput,
    DraftingParameterInputKey,
    FootMeasurementInputMode,
    NumericFootMeasurementKey,
    RawFootMeasurementInput,
} from '../types';

const { Text } = Typography;

interface MeasurementFormProps {
    inputMode: FootMeasurementInputMode;
    rawValue: RawFootMeasurementInput;
    draftingValue: DraftingParameterInput;
    ageGroup: AgeGroup;
    temporaryR?: number;
    onInputModeChange: (value: FootMeasurementInputMode) => void;
    onRawMeasurementChange: (key: NumericFootMeasurementKey, value?: number) => void;
    onDraftingParameterChange: (key: DraftingParameterInputKey, value?: number) => void;
    onAgeGroupChange: (value: AgeGroup) => void;
    onTemporaryRChange: (value?: number) => void;
}

const measurementFields: Array<{
    key: NumericFootMeasurementKey;
    label: string;
}> = [
    { key: 'metatarsalCircumference', label: 'Metatarsal circumference' },
    { key: 'ankleFrontCircumference', label: 'Ankle front circumference' },
    { key: 'calf5cmCircumference', label: 'Calf circumference (5 cm level)' },
    { key: 'narrowestCircumference', label: 'Narrowest circumference' },
    { key: 'frontMalleolusCircumference', label: 'Front malleolus circumference' },
    { key: 'backMalleolusCircumference', label: 'Back malleolus circumference' },
    { key: 'narrowestToMalleolus', label: 'Narrowest to malleolus' },
];

const draftingParameterFields: Array<{
    key: DraftingParameterInputKey;
    label: string;
}> = [
    { key: 'a', label: 'a — compressed metatarsal' },
    { key: 'b', label: 'b — compressed ankle front' },
    { key: 'c', label: 'c — compressed calf +5 cm' },
    { key: 'd', label: 'd — compressed narrowest' },
    { key: 'e', label: 'e — compressed front malleolus' },
    { key: 'f', label: 'f — compressed back malleolus' },
    { key: 'g', label: 'g — narrowest to malleolus (no compression)' },
];

const MeasurementForm: React.FC<MeasurementFormProps> = ({
    inputMode,
    rawValue,
    draftingValue,
    ageGroup,
    temporaryR,
    onInputModeChange,
    onRawMeasurementChange,
    onDraftingParameterChange,
    onAgeGroupChange,
    onTemporaryRChange,
}) => {
    return (
        <Card className="foot-drafting-panel" title="Input panel">
            <Form layout="vertical" requiredMark={false} className="foot-drafting-form">
                <Form.Item label="Input source" className="foot-drafting-input-source">
                    <Segmented
                        block
                        value={inputMode}
                        options={[
                            { label: 'Raw measurements', value: 'raw' },
                            { label: 'Drafting parameters', value: 'drafting' },
                        ]}
                        onChange={(value) => onInputModeChange(value as FootMeasurementInputMode)}
                    />
                </Form.Item>

                <Text type="secondary" className="foot-drafting-panel-intro">
                    {inputMode === 'raw'
                        ? 'Enter original body measurements. All values are in cm; compression is applied automatically.'
                        : 'Enter completed drafting parameters directly. Values a–f will not be compressed again.'}
                </Text>

                {inputMode === 'raw' &&
                    measurementFields.map((field) => (
                        <Form.Item key={field.key} label={field.label}>
                            <InputNumber
                                aria-label={field.label}
                                value={rawValue[field.key]}
                                min={0}
                                precision={2}
                                step={0.1}
                                placeholder="Enter measurement"
                                addonAfter="cm"
                                onChange={(nextValue) =>
                                    onRawMeasurementChange(field.key, nextValue ?? undefined)
                                }
                            />
                        </Form.Item>
                    ))}

                {inputMode === 'drafting' &&
                    draftingParameterFields.map((field) => (
                        <Form.Item key={field.key} label={field.label}>
                            <InputNumber
                                aria-label={field.label}
                                value={draftingValue[field.key]}
                                min={0}
                                precision={2}
                                step={0.1}
                                placeholder="Enter drafting parameter"
                                addonAfter="cm"
                                onChange={(nextValue) =>
                                    onDraftingParameterChange(field.key, nextValue ?? undefined)
                                }
                            />
                        </Form.Item>
                    ))}

                <Form.Item label="Age group">
                    <Select
                        aria-label="Age group"
                        value={ageGroup}
                        onChange={onAgeGroupChange}
                        options={[
                            { value: 'adult', label: 'Adult' },
                            { value: 'child', label: 'Child' },
                            { value: 'baby', label: 'Baby' },
                        ]}
                    />
                </Form.Item>

                <Alert
                    className="foot-drafting-debug-alert"
                    type="warning"
                    showIcon
                    message="Temporary debug input"
                    description="Temporary compressed-foot-piece RS length (r). This will be calculated automatically from compressed foot-piece geometry in a future phase and will not remain a manual user input."
                />

                <Form.Item label="Temporary compressed-foot-piece RS length (r)">
                    <InputNumber
                        aria-label="Temporary compressed-foot-piece RS length (r)"
                        value={temporaryR}
                        min={0}
                        precision={2}
                        step={0.1}
                        placeholder="Temporary value"
                        addonAfter="cm"
                        status={temporaryR === undefined ? 'warning' : undefined}
                        onChange={(nextValue) => onTemporaryRChange(nextValue ?? undefined)}
                    />
                </Form.Item>
            </Form>
        </Card>
    );
};

export default MeasurementForm;
