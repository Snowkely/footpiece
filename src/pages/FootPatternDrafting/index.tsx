import { ExperimentOutlined } from '@ant-design/icons';
import { Tag, Typography } from 'antd';
import React, { useMemo, useState } from 'react';
import FootPatternScene from './components/FootPatternScene';
import FootPiecePositioningControls from './components/FootPiecePositioningControls';
import GeometryDebugPanel from './components/GeometryDebugPanel';
import MeasurementForm from './components/MeasurementForm';
import NearbyMultiSupportSearchControls from './components/NearbyMultiSupportSearchControls';
import TargetMultiSupportOuterCurveControls from './components/TargetMultiSupportOuterCurveControls';
import TargetUtControls from './components/TargetUtControls';
import TargetWPrimeControls from './components/TargetWPrimeControls';
import ToeRadialOuterSupportsControls from './components/ToeRadialOuterSupportsControls';
import ToeRadialReferencesControls from './components/ToeRadialReferencesControls';
import footPieceSampleJson from './data/footPieceSample.json';
import { buildBackPiece, completeBackPieceWithFrontY } from './geometry/backPiece';
import { alignFootPieceLegacyToFrontPiece, alignFootPieceToFrontPiece } from './geometry/footPiece';
import { positionFootPieceWithSelectedF } from './geometry/footPiecePositioning';
import { buildFrontPiece } from './geometry/frontPiece';
import {
    deriveDraftingParameters,
    toDraftingParameters,
    toRawFootMeasurements,
} from './geometry/measurements';
import { deriveTargetAnkleIntersections } from './geometry/targetAnkle';
import { evaluateTargetMultiSupportOuterCurveCandidate } from './geometry/targetMultiSupportOuterCurve';
import type {
    NearbyMultiSupportSearchInputs,
    NearbyMultiSupportSearchSeed,
} from './geometry/targetMultiSupportOuterCurveSearch';
import { deriveTargetReferenceArc } from './geometry/targetReferenceArc';
import { DEFAULT_UT_DISTRIBUTION, deriveTargetUtConstruction } from './geometry/targetUt';
import { DEFAULT_WPRIME_OUTWARD_OFFSET_CM, deriveTargetWPrime } from './geometry/targetWPrime';
import { deriveToeRadialOuterSupports } from './geometry/toeRadialOuterSupports';
import {
    DEFAULT_TOE_RADIAL_ANGLE_DEG,
    deriveToeRadialReferences,
} from './geometry/toeRadialReferences';
import { useNearbyMultiSupportSearch } from './hooks/useNearbyMultiSupportSearch';
import { useSuggestedMultiSupportCandidates } from './hooks/useSuggestedMultiSupportCandidates';
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
    NumericFootMeasurementKey,
    RawFootMeasurementInput,
    TargetAnkleIntersectionGeometry,
    TargetMultiSupportOuterCurveCandidate,
    TargetReferenceArcGeometry,
    TargetUtGeometry,
    TargetWPrimeGeometry,
    ToeRadialOuterSupportGeometry,
    ToeRadialReferenceGeometry,
} from './types';

const { Paragraph, Title } = Typography;
const footPieceSample = footPieceSampleJson as FootPieceSample;
const FootPatternDrafting: React.FC = () => {
    const [inputMode, setInputMode] = useState<FootMeasurementInputMode>('raw');
    const [rawMeasurementInput, setRawMeasurementInput] = useState<RawFootMeasurementInput>({});
    const [draftingParameterInput, setDraftingParameterInput] = useState<DraftingParameterInput>(
        {},
    );
    const [ageGroup, setAgeGroup] = useState<AgeGroup>('adult');
    // TODO(Phase 3): remove this manual state when r is derived from compressed foot-piece geometry.
    const [temporaryR, setTemporaryR] = useState<number>();
    const [manualOverride, setManualOverride] = useState(false);
    const [selectingF, setSelectingF] = useState(false);
    const [pendingFSelection, setPendingFSelection] = useState<FootPieceFSelection>();
    const [confirmedFSelection, setConfirmedFSelection] = useState<FootPieceFSelection>();
    const [hoverFSelection, setHoverFSelection] = useState<FootPieceFSelection>();
    const [utDistribution, setUtDistribution] = useState(DEFAULT_UT_DISTRIBUTION);
    const [wPrimeOutwardOffsetCm, setWPrimeOutwardOffsetCm] = useState(
        DEFAULT_WPRIME_OUTWARD_OFFSET_CM,
    );
    const [toeRadialAngleDeg, setToeRadialAngleDeg] = useState(DEFAULT_TOE_RADIAL_ANGLE_DEG);

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

    const automaticFootPieceResult = useMemo<GeometryBuildResult<AlignedFootPieceGeometry>>(() => {
        if (!frontPieceResult.geometry || parameters?.r === undefined) {
            return { errors: [] };
        }

        return alignFootPieceToFrontPiece(footPieceSample, frontPieceResult.geometry, parameters.r);
    }, [frontPieceResult.geometry, parameters?.r]);

    const legacyFootPieceResult = useMemo<GeometryBuildResult<AlignedFootPieceGeometry>>(() => {
        if (!manualOverride || !frontPieceResult.geometry || parameters?.r === undefined) {
            return { errors: [] };
        }

        return alignFootPieceLegacyToFrontPiece(
            footPieceSample,
            frontPieceResult.geometry,
            parameters.r,
        );
    }, [frontPieceResult.geometry, manualOverride, parameters?.r]);

    const positionedFootPieceResult = useMemo<
        GeometryBuildResult<FootPiecePositioningGeometry>
    >(() => {
        if (!manualOverride || !legacyFootPieceResult.geometry || !frontPieceResult.geometry) {
            return { errors: [] };
        }

        const activeSelection = confirmedFSelection ?? pendingFSelection;
        return positionFootPieceWithSelectedF(
            footPieceSample,
            legacyFootPieceResult.geometry,
            frontPieceResult.geometry,
            activeSelection,
            Boolean(confirmedFSelection),
        );
    }, [
        legacyFootPieceResult.geometry,
        confirmedFSelection,
        frontPieceResult.geometry,
        manualOverride,
        pendingFSelection,
    ]);

    const displayedFootPiece = manualOverride
        ? positionedFootPieceResult.geometry
        : automaticFootPieceResult.geometry;

    const targetAnkleResult = useMemo<GeometryBuildResult<TargetAnkleIntersectionGeometry>>(() => {
        if (!displayedFootPiece || !frontPieceResult.geometry) {
            return { errors: [] };
        }

        return deriveTargetAnkleIntersections(displayedFootPiece, frontPieceResult.geometry);
    }, [displayedFootPiece, frontPieceResult.geometry]);

    const targetReferenceArcResult = useMemo<
        GeometryBuildResult<TargetReferenceArcGeometry>
    >(() => {
        if (!displayedFootPiece || !targetAnkleResult.geometry) {
            return { errors: [] };
        }

        return deriveTargetReferenceArc(
            displayedFootPiece,
            targetAnkleResult.geometry,
            footPieceSample,
        );
    }, [displayedFootPiece, targetAnkleResult.geometry]);

    const toeRadialReferenceResult = useMemo<
        GeometryBuildResult<ToeRadialReferenceGeometry>
    >(() => {
        const automatic = displayedFootPiece?.automaticPositioning;
        if (!automatic || !targetReferenceArcResult.geometry) {
            return { errors: [] };
        }

        return deriveToeRadialReferences({
            Ms: automatic.alignedSourceMs,
            W: automatic.alignedSourceSecondToe,
            targetReferenceArc: targetReferenceArcResult.geometry,
            thetaDeg: toeRadialAngleDeg,
        });
    }, [displayedFootPiece, targetReferenceArcResult.geometry, toeRadialAngleDeg]);

    const targetUtResult = useMemo<GeometryBuildResult<TargetUtGeometry>>(() => {
        if (!displayedFootPiece || !targetReferenceArcResult.geometry || !parameters) {
            return { errors: [] };
        }

        return deriveTargetUtConstruction(
            displayedFootPiece.alignedLandmarks.P,
            displayedFootPiece.alignedLandmarks.Q,
            parameters.a,
            utDistribution,
        );
    }, [displayedFootPiece, parameters, targetReferenceArcResult.geometry, utDistribution]);

    const targetWPrimeResult = useMemo<GeometryBuildResult<TargetWPrimeGeometry>>(() => {
        const alignedW = displayedFootPiece?.automaticPositioning?.alignedSourceSecondToe;
        if (!alignedW || !frontPieceResult.geometry) {
            return { errors: [] };
        }

        return deriveTargetWPrime(
            alignedW,
            frontPieceResult.geometry.points.MPrime,
            frontPieceResult.geometry.points.O,
            wPrimeOutwardOffsetCm,
        );
    }, [displayedFootPiece, frontPieceResult.geometry, wPrimeOutwardOffsetCm]);

    const toeRadialOuterSupportResult = useMemo<
        GeometryBuildResult<ToeRadialOuterSupportGeometry>
    >(() => {
        const automatic = displayedFootPiece?.automaticPositioning;
        if (!automatic || !toeRadialReferenceResult.geometry || !targetWPrimeResult.geometry) {
            return { errors: [] };
        }

        return deriveToeRadialOuterSupports({
            Ms: automatic.alignedSourceMs,
            toeRadialReferences: toeRadialReferenceResult.geometry,
            existingWPrime: targetWPrimeResult.geometry.WPrime,
            outwardOffsetCm: wPrimeOutwardOffsetCm,
        });
    }, [
        displayedFootPiece,
        targetWPrimeResult.geometry,
        toeRadialReferenceResult.geometry,
        wPrimeOutwardOffsetCm,
    ]);

    const targetMultiSupportOuterCurveResult = useMemo<
        GeometryBuildResult<TargetMultiSupportOuterCurveCandidate>
    >(() => {
        if (
            !frontPieceResult.geometry ||
            !targetReferenceArcResult.geometry ||
            !targetUtResult.geometry ||
            !toeRadialOuterSupportResult.geometry
        ) {
            return { errors: [] };
        }

        return evaluateTargetMultiSupportOuterCurveCandidate({
            frontPiece: frontPieceResult.geometry,
            targetReferenceArc: targetReferenceArcResult.geometry,
            targetUt: targetUtResult.geometry,
            toeRadialOuterSupports: toeRadialOuterSupportResult.geometry,
        });
    }, [
        frontPieceResult.geometry,
        targetReferenceArcResult.geometry,
        targetUtResult.geometry,
        toeRadialOuterSupportResult.geometry,
    ]);

    const nearbySearchInputs = useMemo<NearbyMultiSupportSearchInputs | undefined>(() => {
        const automatic = displayedFootPiece?.automaticPositioning;
        if (
            !automatic ||
            !frontPieceResult.geometry ||
            !targetReferenceArcResult.geometry ||
            !parameters
        ) {
            return undefined;
        }

        return {
            frontPiece: frontPieceResult.geometry,
            targetReferenceArc: targetReferenceArcResult.geometry,
            P: displayedFootPiece.alignedLandmarks.P,
            Q: displayedFootPiece.alignedLandmarks.Q,
            draftingA: parameters.a,
            Ms: automatic.alignedSourceMs,
            W: automatic.alignedSourceSecondToe,
            MPrime: frontPieceResult.geometry.points.MPrime,
            O: frontPieceResult.geometry.points.O,
        };
    }, [
        displayedFootPiece,
        frontPieceResult.geometry,
        parameters,
        targetReferenceArcResult.geometry,
    ]);
    const nearbySearch = useNearbyMultiSupportSearch(nearbySearchInputs);
    const suggestedCandidates = useSuggestedMultiSupportCandidates(nearbySearch);
    const manualSearchSeed = useMemo<NearbyMultiSupportSearchSeed>(
        () => ({
            alpha: utDistribution,
            thetaDeg: toeRadialAngleDeg,
            lambdaCm: wPrimeOutwardOffsetCm,
        }),
        [toeRadialAngleDeg, utDistribution, wPrimeOutwardOffsetCm],
    );

    const validationErrors = [
        ...backPieceResult.errors,
        ...frontPieceResult.errors,
        ...completedBackPieceResult.errors,
        ...automaticFootPieceResult.errors,
        ...(manualOverride ? legacyFootPieceResult.errors : []),
        ...(manualOverride ? positionedFootPieceResult.errors : []),
        ...targetAnkleResult.errors,
        ...targetReferenceArcResult.errors,
        ...toeRadialReferenceResult.errors,
        ...targetUtResult.errors,
        ...targetWPrimeResult.errors,
        ...toeRadialOuterSupportResult.errors,
        ...targetMultiSupportOuterCurveResult.errors,
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
                        footPiece={displayedFootPiece}
                        automaticErrors={automaticFootPieceResult.errors}
                        manualOverride={manualOverride}
                        selecting={selectingF}
                        pendingSelection={pendingFSelection}
                        confirmedSelection={confirmedFSelection}
                        onUseManualOverride={() => setManualOverride(true)}
                        onUseAutomatic={() => {
                            setManualOverride(false);
                            handleClearF();
                        }}
                        onStartSelection={handleStartFSelection}
                        onConfirmSelection={handleConfirmF}
                        onCancelSelection={() => {
                            setSelectingF(false);
                            setHoverFSelection(undefined);
                        }}
                        onClearSelection={handleClearF}
                    />
                    <TargetUtControls
                        a={parameters?.a}
                        distribution={utDistribution}
                        geometry={targetUtResult.geometry}
                        errors={targetUtResult.errors}
                        onDistributionChange={setUtDistribution}
                    />
                    <TargetWPrimeControls
                        outwardOffsetCm={wPrimeOutwardOffsetCm}
                        geometry={targetWPrimeResult.geometry}
                        errors={targetWPrimeResult.errors}
                        onOutwardOffsetChange={setWPrimeOutwardOffsetCm}
                    />
                    <ToeRadialReferencesControls
                        thetaDeg={toeRadialAngleDeg}
                        geometry={toeRadialReferenceResult.geometry}
                        errors={toeRadialReferenceResult.errors}
                        onThetaChange={setToeRadialAngleDeg}
                    />
                    <ToeRadialOuterSupportsControls
                        thetaDeg={toeRadialAngleDeg}
                        outwardOffsetCm={wPrimeOutwardOffsetCm}
                        geometry={toeRadialOuterSupportResult.geometry}
                        errors={toeRadialOuterSupportResult.errors}
                    />
                    <TargetMultiSupportOuterCurveControls
                        alpha={utDistribution}
                        thetaDeg={toeRadialAngleDeg}
                        outwardOffsetCm={wPrimeOutwardOffsetCm}
                        candidate={targetMultiSupportOuterCurveResult.geometry}
                        errors={targetMultiSupportOuterCurveResult.errors}
                    />
                    <NearbyMultiSupportSearchControls
                        manualSeed={manualSearchSeed}
                        inputsAvailable={Boolean(nearbySearchInputs)}
                        controller={nearbySearch}
                        suggestedCandidates={suggestedCandidates}
                        onApplyCandidate={(candidate) => {
                            setUtDistribution(candidate.alpha);
                            setToeRadialAngleDeg(candidate.thetaDeg);
                            setWPrimeOutwardOffsetCm(candidate.lambdaCm);
                        }}
                    />
                </aside>

                <section className="foot-drafting-viewer-panel">
                    <FootPatternScene
                        backPiece={completedBackPieceResult.geometry}
                        frontPiece={frontPieceResult.geometry}
                        footPiece={displayedFootPiece}
                        targetAnkleIntersections={targetAnkleResult.geometry}
                        targetReferenceArc={targetReferenceArcResult.geometry}
                        targetUt={targetUtResult.geometry}
                        targetWPrime={targetWPrimeResult.geometry}
                        targetMultiSupportOuterCurve={targetMultiSupportOuterCurveResult.geometry}
                        searchPreviewMultiSupportOuterCurve={nearbySearch.previewCandidate}
                        toeRadialReferences={toeRadialReferenceResult.geometry}
                        toeRadialOuterSupports={toeRadialOuterSupportResult.geometry}
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
                        footPiece={displayedFootPiece}
                        targetAnkleIntersections={targetAnkleResult.geometry}
                        targetReferenceArc={targetReferenceArcResult.geometry}
                        targetReferenceArcErrors={targetReferenceArcResult.errors}
                        targetUt={targetUtResult.geometry}
                        targetUtErrors={targetUtResult.errors}
                        targetUtDistribution={utDistribution}
                        targetWPrime={targetWPrimeResult.geometry}
                        targetWPrimeErrors={targetWPrimeResult.errors}
                        targetWPrimeOutwardOffsetCm={wPrimeOutwardOffsetCm}
                        targetMultiSupportOuterCurve={targetMultiSupportOuterCurveResult.geometry}
                        targetMultiSupportOuterCurveErrors={
                            targetMultiSupportOuterCurveResult.errors
                        }
                        toeRadialAngleDeg={toeRadialAngleDeg}
                        toeRadialReferences={toeRadialReferenceResult.geometry}
                        toeRadialReferenceErrors={toeRadialReferenceResult.errors}
                        toeRadialOuterSupports={toeRadialOuterSupportResult.geometry}
                        toeRadialOuterSupportErrors={toeRadialOuterSupportResult.errors}
                        nearbySearch={nearbySearch}
                        suggestedCandidates={suggestedCandidates}
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
