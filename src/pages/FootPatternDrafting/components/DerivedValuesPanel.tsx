import { Card, Typography } from 'antd';
import type { DraftingParameters } from '../types';

const { Text } = Typography;

interface DerivedValuesPanelProps {
    parameters?: DraftingParameters;
    geometry: {
        x?: number;
        z?: number;
        y?: number;
    };
}

function formatCentimeters(value?: number): string {
    return value === undefined || !Number.isFinite(value) ? '—' : `${value.toFixed(3)} cm`;
}

const ValueRow: React.FC<{ label: string; value?: number; note?: string }> = ({
    label,
    value,
    note,
}) => (
    <div className="foot-drafting-value-row">
        <span>
            <Text code>{label}</Text>
            {note && <Text type="secondary"> {note}</Text>}
        </span>
        <Text>{formatCentimeters(value)}</Text>
    </div>
);

const DerivedValuesPanel: React.FC<DerivedValuesPanelProps> = ({ parameters, geometry }) => {
    return (
        <>
            <Card
                size="small"
                title="Active drafting parameters"
                className="foot-drafting-debug-card"
            >
                <ValueRow label="a" value={parameters?.a} />
                <ValueRow label="b" value={parameters?.b} />
                <ValueRow label="c" value={parameters?.c} />
                <ValueRow label="d" value={parameters?.d} />
                <ValueRow label="e" value={parameters?.e} />
                <ValueRow label="f" value={parameters?.f} />
                <ValueRow label="g" value={parameters?.g} />
                <ValueRow label="r" value={parameters?.r} note="(temporary)" />
            </Card>

            <Card size="small" title="Derived geometry" className="foot-drafting-debug-card">
                <ValueRow label="x" value={geometry.x} />
                <ValueRow label="z" value={geometry.z} />
                <ValueRow label="y" value={geometry.y} />
            </Card>
        </>
    );
};

export default DerivedValuesPanel;
