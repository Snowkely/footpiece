import { ExperimentOutlined } from '@ant-design/icons';
import { Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import FootPatternScene from './components/FootPatternScene';
import FootPiecePositioningControls from './components/FootPiecePositioningControls';
import GeometryDebugPanel from './components/GeometryDebugPanel';
import LufCurveControls from './components/LufCurveControls';
import MeasurementForm from './components/MeasurementForm';
import footPieceSampleJson from './data/footPieceSample.json';
import { buildBackPiece, completeBackPieceWithFrontY } from './geometry/backPiece';
import { alignFootPieceToFrontPiece } from './geometry/footPiece';
import { positionFootPieceWithSelectedF } from './geometry/footPiecePositioning';
import { buildFrontPiece } from './geometry/frontPiece';
import { buildLufCurve } from './geometry/lufCurve';
import {
    deriveDraftingParameters,
    toDraftingParameters,
    toRawFootMeasurements,
} from './geometry/measurements';
import './index.less';
import type {
    AgeGroup,
    AlignedFootPieceGeometry,
    BackPieceGeometry,
    DraftingParameterInput,
    DraftingParameterInputKey,
    DraftingParameters,
    FootMeasurementInputMode,
    FootPieceFSelection,
    FootPiecePositioningGeometry,
    FootPieceSample,
    FrontPieceGeometry,
    GeometryBuildResult,
    LufCurveGeometry,
    LufCurveParameters,
    NumericFootMeasurementKey,
    RawFootMeasurementInput,
} from './types';

const { Paragraph, Title } = Typography;
const footPieceSample = footPieceSampleJson as FootPieceSample;
const DEFAULT_LUF_CURVE_PARAMETERS: LufCurveParameters = {
    upQtDistribution: 0.5,
    fPrimeOffsetCm: 1,
};

const FootPatternDrafting: React.FC = () => {
    const [inputMode, setInputMode] = useState<FootMeasurementInputMode>('raw');
    const [rawMeasurementInput, setRawMeasurementInput] = useState<RawFootMeasurementInput>({});
    const [draftingParameterInput, setDraftingParameterInput] = useState<DraftingParameterInput>(
        {},
    );
    const [ageGroup, setAgeGroup] = useState<AgeGroup>('adult');
    // TODO(Phase 3): remove this manual state when r is derived from compressed foot-piece geometry.
    const [temporaryR, setTemporaryR] = useState<number>();
    const [lufCurveParameters, setLufCurveParameters] = useState<LufCurveParameters>(
        DEFAULT_LUF_CURVE_PARAMETERS,
    );
    const [selectingF, setSelectingF] = useState(false);
    const [pendingFSelection, setPendingFSelection] = useState<FootPieceFSelection>();
    const [confirmedFSelection, setConfirmedFSelection] = useState<FootPieceFSelection>();
    const [hoverFSelection, setHoverFSelection] = useState<FootPieceFSelection>();

    const activeParameters = useMemo<Omit<DraftingParameters, 'r'> | undefined>(() => {
        if (inputMode === 'drafting') {
            return toDraftingParameters(draftingParameterInput);
        }

        const rawMeasurements = toRawFootMeasurements(rawMeasurementInput, ageGroup);
        if (!rawMeasurements) {
            return undefined;
        }

        return deriveDraftingParameters(rawMeasurements);
    }, [ageGroup, draftingParameterInput, inputMode, rawMeasurementInput]);

    const parameters = useMemo<DraftingParameters | undefined>(
        () => (activeParameters ? { ...activeParameters, r: temporaryR } : undefined),
        [activeParameters, temporaryR],
    );

    const backPieceResult = useMemo<GeometryBuildResult<BackPieceGeometry>>(
        () => (parameters ? buildBackPiece(parameters) : { errors: [] }),
        [parameters],
    );

    const frontPieceResult = useMemo<GeometryBuildResult<FrontPieceGeometry>>(() => {
        if (!parameters || !backPieceResult.geometry) {
            return { errors: [] };
        }

        return buildFrontPiece(
            parameters,
            ageGroup,
            backPieceResult.geometry.x,
            backPieceResult.geometry.z,
        );
    }, [ageGroup, backPieceResult.geometry, parameters]);

    const completedBackPieceResult = useMemo<GeometryBuildResult<BackPieceGeometry>>(() => {
        if (!backPieceResult.geometry || !frontPieceResult.geometry) {
            return { geometry: backPieceResult.geometry, errors: [] };
        }

        return completeBackPieceWithFrontY(backPieceResult.geometry, frontPieceResult.geometry.y);
    }, [backPieceResult.geometry, frontPieceResult.geometry]);

    const alignedFootPieceResult = useMemo<GeometryBuildResult<AlignedFootPieceGeometry>>(() => {
        if (!frontPieceResult.geometry || parameters?.r === undefined) {
            return { errors: [] };
        }

        return alignFootPieceToFrontPiece(footPieceSample, frontPieceResult.geometry, parameters.r);
    }, [frontPieceResult.geometry, parameters?.r]);

    const positionedFootPieceResult = useMemo<
        GeometryBuildResult<FootPiecePositioningGeometry>
    >(() => {
        if (!alignedFootPieceResult.geometry || !frontPieceResult.geometry) {
            return { errors: [] };
        }

        const activeSelection = confirmedFSelection ?? pendingFSelection;
        return positionFootPieceWithSelectedF(
            footPieceSample,
            alignedFootPieceResult.geometry,
            frontPieceResult.geometry,
            activeSelection,
            Boolean(confirmedFSelection),
        );
    }, [
        alignedFootPieceResult.geometry,
        confirmedFSelection,
        frontPieceResult.geometry,
        pendingFSelection,
    ]);

    const lufCurveResult = useMemo<GeometryBuildResult<LufCurveGeometry>>(() => {
        if (
            !positionedFootPieceResult.geometry ||
            positionedFootPieceResult.geometry.positioning.status !== 'VALID' ||
            !frontPieceResult.geometry ||
            !parameters
        ) {
            return { errors: [] };
        }

        return buildLufCurve(
            positionedFootPieceResult.geometry,
            frontPieceResult.geometry,
            parameters.a,
            lufCurveParameters,
        );
    }, [
        positionedFootPieceResult.geometry,
        frontPieceResult.geometry,
        lufCurveParameters,
        parameters,
    ]);

    const validationErrors = [
        ...backPieceResult.errors,
        ...frontPieceResult.errors,
        ...completedBackPieceResult.errors,
        ...alignedFootPieceResult.errors,
        ...positionedFootPieceResult.errors,
        ...lufCurveResult.errors,
    ];

    const handleRawMeasurementChange = (key: NumericFootMeasurementKey, value?: number) => {
        setRawMeasurementInput((current) => ({ ...current, [key]: value }));
    };

    const handleDraftingParameterChange = (key: DraftingParameterInputKey, value?: number) => {
        setDraftingParameterInput((current) => ({ ...current, [key]: value }));
    };

    const handleStartFSelection = () => {
        setSelectingF(true);
        setHoverFSelection(undefined);
    };

    const handleSelectF = (selection: FootPieceFSelection) => {
        setPendingFSelection({ ...selection });
        setSelectingF(false);
        setHoverFSelection(undefined);
    };

    const handleConfirmF = () => {
        if (pendingFSelection) {
            setConfirmedFSelection({ ...pendingFSelection });
        }
    };

    const handleClearF = () => {
        setPendingFSelection(undefined);
        setConfirmedFSelection(undefined);
        setHoverFSelection(undefined);
        setSelectingF(false);
    };

    return (
        <main className="foot-drafting-page">
            <header className="foot-drafting-header">
                <div>
                    <div className="foot-drafting-title-row">
                        <ExperimentOutlined />
                        <Title level={3}>Pressure stocking foot pattern drafting</Title>
                        <Tag color="geekblue">Phase 1 / 2 prototype</Tag>
                    </div>
                    <Paragraph>
                        Independent centimeter-based construction workspace. Draft geometry remains
                        separate from viewer display offsets.
                    </Paragraph>
                </div>
            </header>

            <div className="foot-drafting-workspace">
                <aside className="foot-drafting-column foot-drafting-input-column">
                    <MeasurementForm
                        inputMode={inputMode}
                        rawValue={rawMeasurementInput}
                        draftingValue={draftingParameterInput}
                        ageGroup={ageGroup}
                        temporaryR={temporaryR}
                        onInputModeChange={setInputMode}
                        onRawMeasurementChange={handleRawMeasurementChange}
                        onDraftingParameterChange={handleDraftingParameterChange}
                        onAgeGroupChange={setAgeGroup}
                        onTemporaryRChange={setTemporaryR}
                    />
                    <FootPiecePositioningControls
                        footPiece={positionedFootPieceResult.geometry}
                        selecting={selectingF}
                        pendingSelection={pendingFSelection}
                        confirmedSelection={confirmedFSelection}
                        onStartSelection={handleStartFSelection}
                        onConfirmSelection={handleConfirmF}
                        onCancelSelection={() => {
                            setSelectingF(false);
                            setHoverFSelection(undefined);
                        }}
                        onClearSelection={handleClearF}
                    />
                    <LufCurveControls
                        value={lufCurveParameters}
                        geometry={lufCurveResult.geometry}
                        onChange={setLufCurveParameters}
                    />
                </aside>

                <section className="foot-drafting-viewer-panel">
                    <FootPatternScene
                        backPiece={completedBackPieceResult.geometry}
                        frontPiece={frontPieceResult.geometry}
                        footPiece={positionedFootPieceResult.geometry}
                        lufCurve={lufCurveResult.geometry}
                        fSelectionMode={selectingF}
                        pendingFSelection={pendingFSelection}
                        hoverFSelection={hoverFSelection}
                        onHoverFSelectionChange={setHoverFSelection}
                        onSelectF={handleSelectF}
                    />
                </section>

                <aside className="foot-drafting-column foot-drafting-debug-column">
                    <GeometryDebugPanel
                        inputMode={inputMode}
                        rawMeasurements={rawMeasurementInput}
                        draftingParameterInput={draftingParameterInput}
                        ageGroup={ageGroup}
                        parameters={parameters}
                        backPiece={completedBackPieceResult.geometry}
                        frontPiece={frontPieceResult.geometry}
                        footPieceSample={footPieceSample}
                        footPiece={positionedFootPieceResult.geometry}
                        lufCurveParameters={lufCurveParameters}
                        lufCurve={lufCurveResult.geometry}
                        derivedGeometry={{
                            x: backPieceResult.derived?.x,
                            z: backPieceResult.derived?.z,
                            y: frontPieceResult.derived?.y,
                        }}
                        errors={validationErrors}
                    />
                </aside>
            </div>
        </main>
    );
};

export default FootPatternDrafting;
