/* eslint-disable react/no-unknown-property */
import { CompressOutlined, ReloadOutlined } from '@ant-design/icons';
import { CameraControls, Grid, Html, Line } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Button, Switch, Tag } from 'antd';
import CameraControlsImpl from 'camera-controls';
import React, { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type {
    AlignedFootPieceGeometry,
    BackPieceGeometry,
    DraftLine,
    DraftPoint,
    FootPieceFSelection,
    FootPiecePositioningGeometry,
    FrontPieceGeometry,
    LufCurveGeometry,
    TargetAnkleIntersectionGeometry,
    TargetMultiSupportOuterCurveCandidate,
    TargetReferenceArcGeometry,
    TargetUtGeometry,
    TargetWPrimeGeometry,
    ToeRadialOuterSupportGeometry,
    ToeRadialReferenceGeometry,
} from '../types';
import AlignedFootPiece from './AlignedFootPiece';
import AutomaticFootAxisLayer from './AutomaticFootAxisLayer';
import {
    FOOT_PATTERN_CAMERA_MOUSE_BUTTONS,
    FOOT_PATTERN_CAMERA_TOUCHES,
} from './cameraControlsConfig';
import CandidateLufCurve from './CandidateLufCurve';
import ConstructionPoint from './ConstructionPoint';
import FootPieceFSelector from './FootPieceFSelector';
import SearchPreviewAnchorsLayer from './SearchPreviewAnchorsLayer';
import TargetAnkleIntersectionsLayer from './TargetAnkleIntersectionsLayer';
import TargetMultiSupportOuterCurveLayer from './TargetMultiSupportOuterCurveLayer';
import TargetReferenceArcLayer from './TargetReferenceArcLayer';
import TargetUtLayer from './TargetUtLayer';
import TargetWPrimeLayer from './TargetWPrimeLayer';
import ToeRadialOuterSupportsLayer from './ToeRadialOuterSupportsLayer';
import ToeRadialReferencesLayer from './ToeRadialReferencesLayer';

interface FootPatternSceneProps {
    backPiece?: BackPieceGeometry;
    frontPiece?: FrontPieceGeometry;
    footPiece?: AlignedFootPieceGeometry;
    lufCurve?: LufCurveGeometry;
    targetAnkleIntersections?: TargetAnkleIntersectionGeometry;
    targetReferenceArc?: TargetReferenceArcGeometry;
    targetUt?: TargetUtGeometry;
    targetWPrime?: TargetWPrimeGeometry;
    targetMultiSupportOuterCurve?: TargetMultiSupportOuterCurveCandidate;
    searchPreviewMultiSupportOuterCurve?: TargetMultiSupportOuterCurveCandidate;
    toeRadialReferences?: ToeRadialReferenceGeometry;
    toeRadialOuterSupports?: ToeRadialOuterSupportGeometry;
    fSelectionMode: boolean;
    pendingFSelection?: FootPieceFSelection;
    hoverFSelection?: FootPieceFSelection;
    onHoverFSelectionChange: (selection?: FootPieceFSelection) => void;
    onSelectF: (selection: FootPieceFSelection) => void;
}

interface DraftPieceProps {
    title: string;
    points: DraftPoint[];
    lines: DraftLine[];
    color: string;
    showConstructionLines: boolean;
}

const PIECE_DISPLAY_GAP_CM = 6;
const CAMERA_ZOOM = 16;
const FIT_VIEW_PADDING_CM = 1.5;

type DisplayOffset = readonly [number, number, number];

function getYBounds(points: DraftPoint[]): { min: number; max: number } {
    const yValues = points.map((point) => point.y);
    return {
        min: Math.min(...yValues),
        max: Math.max(...yValues),
    };
}

function createDisplayBounds(
    backPiece: BackPieceGeometry | undefined,
    frontPiece: FrontPieceGeometry | undefined,
    footPiece: AlignedFootPieceGeometry | undefined,
    lufCurve: LufCurveGeometry | undefined,
    targetUt: TargetUtGeometry | undefined,
    targetWPrime: TargetWPrimeGeometry | undefined,
    targetMultiSupportOuterCurve: TargetMultiSupportOuterCurveCandidate | undefined,
    searchPreviewMultiSupportOuterCurve: TargetMultiSupportOuterCurveCandidate | undefined,
    toeRadialOuterSupports: ToeRadialOuterSupportGeometry | undefined,
    backOffset: DisplayOffset,
    frontOffset: DisplayOffset,
): THREE.Box3 | undefined {
    const bounds = new THREE.Box3();

    const expandByPoints = (points: DraftPoint[], offset: DisplayOffset) => {
        points.forEach((point) => {
            bounds.expandByPoint(
                new THREE.Vector3(point.x + offset[0], point.y + offset[1], offset[2]),
            );
        });
    };

    if (backPiece) {
        expandByPoints(Object.values(backPiece.points), backOffset);
    }
    if (frontPiece) {
        expandByPoints(Object.values(frontPiece.points), frontOffset);
    }
    if (footPiece) {
        expandByPoints(footPiece.alignedShrinkedOutline, frontOffset);
    }
    if (lufCurve) {
        expandByPoints(lufCurve.sampledCurve, frontOffset);
    }
    if (targetUt) {
        expandByPoints([targetUt.U, targetUt.T], frontOffset);
    }
    if (targetWPrime) {
        expandByPoints([targetWPrime.WPrime], frontOffset);
    }
    if (targetMultiSupportOuterCurve) {
        expandByPoints(targetMultiSupportOuterCurve.polylinePoints, frontOffset);
    }
    if (searchPreviewMultiSupportOuterCurve) {
        expandByPoints(searchPreviewMultiSupportOuterCurve.polylinePoints, frontOffset);
    }
    if (toeRadialOuterSupports) {
        expandByPoints(
            [
                toeRadialOuterSupports.W1Prime.outerPoint,
                toeRadialOuterSupports.W2Prime.outerPoint,
                toeRadialOuterSupports.WPrime.outerPoint,
                toeRadialOuterSupports.W3Prime.outerPoint,
                toeRadialOuterSupports.W4Prime.outerPoint,
            ],
            frontOffset,
        );
    }
    return bounds.isEmpty() ? undefined : bounds;
}

function isManualPositioningGeometry(
    footPiece: AlignedFootPieceGeometry,
): footPiece is FootPiecePositioningGeometry {
    return 'positioning' in footPiece;
}

const DraftPiece: React.FC<DraftPieceProps> = ({
    title,
    points,
    lines,
    color,
    showConstructionLines,
}) => {
    const bounds = getYBounds(points);

    return (
        <group>
            <Html position={[-1, bounds.max + 1, 0]} zIndexRange={[1, 0]}>
                <span className="foot-drafting-piece-label">{title}</span>
            </Html>
            {lines
                .filter((draftLine) => showConstructionLines || draftLine.kind === 'boundary')
                .map((draftLine) => (
                    <Line
                        key={draftLine.id}
                        points={[
                            [draftLine.start.x, draftLine.start.y, 0],
                            [draftLine.end.x, draftLine.end.y, 0],
                        ]}
                        color={draftLine.kind === 'centerline' ? '#8492a6' : color}
                        lineWidth={
                            draftLine.kind === 'boundary'
                                ? 2.6
                                : draftLine.kind === 'centerline'
                                ? 1.2
                                : 1.5
                        }
                        dashed={Boolean(draftLine.dashed)}
                        dashSize={0.3}
                        gapSize={0.2}
                        transparent
                        opacity={draftLine.kind === 'construction' ? 0.68 : 1}
                    />
                ))}
            {points.map((point) => (
                <ConstructionPoint key={point.id} point={point} color={color} />
            ))}
        </group>
    );
};

const FootPatternScene: React.FC<FootPatternSceneProps> = ({
    backPiece,
    frontPiece,
    footPiece,
    lufCurve,
    targetAnkleIntersections,
    targetReferenceArc,
    targetUt,
    targetWPrime,
    targetMultiSupportOuterCurve,
    searchPreviewMultiSupportOuterCurve,
    toeRadialReferences,
    toeRadialOuterSupports,
    fSelectionMode,
    pendingFSelection,
    hoverFSelection,
    onHoverFSelectionChange,
    onSelectF,
}) => {
    const cameraControlsRef = useRef<CameraControlsImpl | null>(null);
    const [showShrinkedOutline, setShowShrinkedOutline] = useState(true);
    const [showReferenceCurve, setShowReferenceCurve] = useState(true);
    const [showReferencePoints, setShowReferencePoints] = useState(true);
    const [showCandidateCurve, setShowCandidateCurve] = useState(true);
    const [showConstructionLines, setShowConstructionLines] = useState(true);
    const [showMidHeel, setShowMidHeel] = useState(true);
    const [showMidHeelTangent, setShowMidHeelTangent] = useState(true);
    const [showToeNormal, setShowToeNormal] = useState(true);
    const [showToeArc, setShowToeArc] = useState(true);
    const [showSecondToe, setShowSecondToe] = useState(true);
    const [showLongitudinalAxis, setShowLongitudinalAxis] = useState(true);
    const [showSourceRS, setShowSourceRS] = useState(true);
    const [showSourceMs, setShowSourceMs] = useState(true);
    const [showTargetAxis, setShowTargetAxis] = useState(true);
    const [showTargetMPrimeG, setShowTargetMPrimeG] = useState(true);
    const [showTargetAnkleIntersections, setShowTargetAnkleIntersections] = useState(true);
    const [showTargetReferenceArc, setShowTargetReferenceArc] = useState(true);
    const [showTargetUt, setShowTargetUt] = useState(true);
    const [showTargetWPrime, setShowTargetWPrime] = useState(true);
    const [showTargetMultiSupportOuterCurve, setShowTargetMultiSupportOuterCurve] = useState(true);
    const [showSearchPreviewMultiSupportOuterCurve, setShowSearchPreviewMultiSupportOuterCurve] =
        useState(true);
    const [showSearchPreviewAnchors, setShowSearchPreviewAnchors] = useState(false);
    const [showToeRadialReferences, setShowToeRadialReferences] = useState(true);
    const [showToeOuterSupports, setShowToeOuterSupports] = useState(true);
    const [layerControlsExpanded, setLayerControlsExpanded] = useState(true);
    const manualFootPiece =
        footPiece && isManualPositioningGeometry(footPiece) ? footPiece : undefined;
    const displayOffsets = useMemo(() => {
        if (backPiece && frontPiece) {
            const backBounds = getYBounds(Object.values(backPiece.points));
            const frontBounds = getYBounds(Object.values(frontPiece.points));

            return {
                back: [0, PIECE_DISPLAY_GAP_CM / 2 - backBounds.min, 0] as const,
                front: [0, -PIECE_DISPLAY_GAP_CM / 2 - frontBounds.max, 0] as const,
            };
        }

        if (backPiece) {
            const bounds = getYBounds(Object.values(backPiece.points));
            return {
                back: [0, -(bounds.min + bounds.max) / 2, 0] as const,
                front: [0, 0, 0] as const,
            };
        }

        return {
            back: [0, 0, 0] as const,
            front: [0, 0, 0] as const,
        };
    }, [backPiece, frontPiece]);

    const displayBounds = useMemo(
        () =>
            createDisplayBounds(
                backPiece,
                frontPiece,
                footPiece,
                lufCurve,
                targetUt,
                targetWPrime,
                targetMultiSupportOuterCurve,
                searchPreviewMultiSupportOuterCurve,
                toeRadialOuterSupports,
                displayOffsets.back,
                displayOffsets.front,
            ),
        [
            backPiece,
            displayOffsets,
            footPiece,
            frontPiece,
            lufCurve,
            targetMultiSupportOuterCurve,
            searchPreviewMultiSupportOuterCurve,
            targetUt,
            targetWPrime,
            toeRadialOuterSupports,
        ],
    );

    const resetView = () => {
        void cameraControlsRef.current?.reset(true);
    };

    const fitView = () => {
        if (!cameraControlsRef.current || !displayBounds) {
            return;
        }

        void cameraControlsRef.current.fitToBox(displayBounds, true, {
            paddingTop: FIT_VIEW_PADDING_CM,
            paddingRight: FIT_VIEW_PADDING_CM,
            paddingBottom: FIT_VIEW_PADDING_CM,
            paddingLeft: FIT_VIEW_PADDING_CM,
        });
    };

    return (
        <>
            <div className="foot-drafting-viewer-toolbar">
                <div className="foot-drafting-viewer-copy">
                    <strong>Construction viewer</strong>
                    <span>
                        {fSelectionMode
                            ? 'Select the second-toe point on the highlighted Q-P arc'
                            : 'Left drag: Pan · Wheel: Zoom'}
                    </span>
                </div>
                <div className="foot-drafting-viewer-actions">
                    <Tag>Units: cm</Tag>
                    {targetMultiSupportOuterCurve && (
                        <Tag color={targetMultiSupportOuterCurve.valid ? 'success' : 'warning'}>
                            MULTI-SUPPORT {targetMultiSupportOuterCurve.valid ? 'VALID' : 'INVALID'}
                        </Tag>
                    )}
                    {searchPreviewMultiSupportOuterCurve && (
                        <Tag color="cyan">SEARCH PREVIEW VALID</Tag>
                    )}
                    <Button
                        size="small"
                        aria-controls="foot-pattern-layer-controls"
                        aria-expanded={layerControlsExpanded}
                        onClick={() => setLayerControlsExpanded((expanded) => !expanded)}
                    >
                        {layerControlsExpanded ? 'Hide layer controls' : 'Show layer controls'}
                    </Button>
                    <Button size="small" icon={<ReloadOutlined />} onClick={resetView}>
                        Reset view
                    </Button>
                    <Button
                        size="small"
                        icon={<CompressOutlined />}
                        disabled={!displayBounds}
                        onClick={fitView}
                    >
                        Fit view
                    </Button>
                </div>
                {layerControlsExpanded && (
                    <div id="foot-pattern-layer-controls" className="foot-drafting-viewer-switches">
                        <label>
                            <Switch
                                size="small"
                                checked={showShrinkedOutline}
                                onChange={setShowShrinkedOutline}
                            />
                            Show shrinked outline
                        </label>
                        <label>
                            <Switch
                                size="small"
                                checked={showReferenceCurve}
                                onChange={setShowReferenceCurve}
                            />
                            Show RQPS
                        </label>
                        <label>
                            <Switch
                                size="small"
                                checked={showReferencePoints}
                                onChange={setShowReferencePoints}
                            />
                            Show reference points
                        </label>
                        {lufCurve && (
                            <label>
                                <Switch
                                    size="small"
                                    checked={showCandidateCurve}
                                    onChange={setShowCandidateCurve}
                                />
                                Show legacy candidate LUF&apos;TG&apos;
                            </label>
                        )}
                        <label>
                            <Switch
                                size="small"
                                checked={showConstructionLines}
                                onChange={setShowConstructionLines}
                            />
                            Show construction lines
                        </label>
                        {footPiece?.automaticPositioning && (
                            <>
                                <label>
                                    <Switch
                                        size="small"
                                        checked={showMidHeel}
                                        onChange={setShowMidHeel}
                                    />
                                    Show H* Candidate
                                </label>
                                <label>
                                    <Switch
                                        size="small"
                                        checked={showMidHeelTangent}
                                        onChange={setShowMidHeelTangent}
                                    />
                                    Show H* Tangent
                                </label>
                                <label>
                                    <Switch
                                        size="small"
                                        checked={showToeNormal}
                                        onChange={setShowToeNormal}
                                    />
                                    Show H* Toe Normal
                                </label>
                                <label>
                                    <Switch
                                        size="small"
                                        checked={showToeArc}
                                        onChange={setShowToeArc}
                                    />
                                    Show Q-P Toe Arc
                                </label>
                                <label>
                                    <Switch
                                        size="small"
                                        checked={showSecondToe}
                                        onChange={setShowSecondToe}
                                    />
                                    Show W / Second Toe
                                </label>
                                <label>
                                    <Switch
                                        size="small"
                                        checked={showLongitudinalAxis}
                                        onChange={setShowLongitudinalAxis}
                                    />
                                    Show H*-W Axis
                                </label>
                                <label>
                                    <Switch
                                        size="small"
                                        checked={showSourceRS}
                                        onChange={setShowSourceRS}
                                    />
                                    Show Source R-S
                                </label>
                                <label>
                                    <Switch
                                        size="small"
                                        checked={showSourceMs}
                                        onChange={setShowSourceMs}
                                    />
                                    Show Source Ms
                                </label>
                                <label>
                                    <Switch
                                        size="small"
                                        checked={showTargetAxis}
                                        onChange={setShowTargetAxis}
                                    />
                                    Show Target O-M&apos; Axis
                                </label>
                                <label>
                                    <Switch
                                        size="small"
                                        checked={showTargetMPrimeG}
                                        onChange={setShowTargetMPrimeG}
                                    />
                                    Show Target M&apos;G Line
                                </label>
                            </>
                        )}
                        {targetAnkleIntersections && (
                            <label>
                                <Switch
                                    size="small"
                                    checked={showTargetAnkleIntersections}
                                    onChange={setShowTargetAnkleIntersections}
                                />
                                Show Target R*/S*
                            </label>
                        )}
                        {targetReferenceArc && (
                            <label>
                                <Switch
                                    size="small"
                                    checked={showTargetReferenceArc}
                                    onChange={setShowTargetReferenceArc}
                                />
                                Show Target Reference Arc
                            </label>
                        )}
                        {toeRadialReferences && (
                            <label>
                                <Switch
                                    size="small"
                                    checked={showToeRadialReferences}
                                    onChange={setShowToeRadialReferences}
                                />
                                Show Toe Radial References
                            </label>
                        )}
                        {toeRadialOuterSupports && (
                            <label>
                                <Switch
                                    size="small"
                                    checked={showToeOuterSupports}
                                    onChange={setShowToeOuterSupports}
                                />
                                Show Toe Outer Supports
                            </label>
                        )}
                        {targetUt && (
                            <label>
                                <Switch
                                    size="small"
                                    checked={showTargetUt}
                                    onChange={setShowTargetUt}
                                />
                                Show U/T Construction
                            </label>
                        )}
                        {targetWPrime && (
                            <label>
                                <Switch
                                    size="small"
                                    checked={showTargetWPrime}
                                    onChange={setShowTargetWPrime}
                                />
                                Show W&apos; Construction
                            </label>
                        )}
                        {targetMultiSupportOuterCurve && (
                            <label>
                                <Switch
                                    size="small"
                                    checked={showTargetMultiSupportOuterCurve}
                                    onChange={setShowTargetMultiSupportOuterCurve}
                                />
                                Show Multi-Support Outer Curve
                            </label>
                        )}
                        {searchPreviewMultiSupportOuterCurve && (
                            <label>
                                <Switch
                                    size="small"
                                    checked={showSearchPreviewMultiSupportOuterCurve}
                                    onChange={setShowSearchPreviewMultiSupportOuterCurve}
                                />
                                Show Search Preview Candidate
                            </label>
                        )}
                        <label
                            title={
                                searchPreviewMultiSupportOuterCurve
                                    ? undefined
                                    : 'No search/suggested preview candidate selected.'
                            }
                        >
                            <Switch
                                size="small"
                                disabled={!searchPreviewMultiSupportOuterCurve}
                                checked={showSearchPreviewAnchors}
                                onChange={setShowSearchPreviewAnchors}
                            />
                            Show Search Preview Anchors
                        </label>
                    </div>
                )}
            </div>

            <div
                className={`foot-drafting-scene${
                    fSelectionMode ? ' foot-drafting-scene-selecting-f' : ''
                }`}
            >
                <Canvas
                    orthographic
                    camera={{ zoom: CAMERA_ZOOM, position: [0, 0, 50] }}
                    gl={{ alpha: true, antialias: true, stencil: true, depth: true }}
                >
                    <color attach="background" args={['#f7f9fc']} />
                    <Grid
                        side={THREE.DoubleSide}
                        cellColor="#d9e1ec"
                        cellSize={1}
                        cellThickness={0.6}
                        rotation={[Math.PI / 2, 0, 0]}
                        sectionColor="#aebbc9"
                        sectionSize={5}
                        sectionThickness={1}
                        followCamera={false}
                        infiniteGrid
                        fadeDistance={80}
                        fadeStrength={1}
                        position={[0, 0, -1]}
                    />

                    {backPiece && (
                        <group position={displayOffsets.back}>
                            <DraftPiece
                                title="Back piece · local coordinates"
                                points={Object.values(backPiece.points)}
                                lines={backPiece.lines}
                                color="#1769aa"
                                showConstructionLines={showConstructionLines}
                            />
                        </group>
                    )}

                    {frontPiece && (
                        <group position={displayOffsets.front}>
                            <DraftPiece
                                title="Front piece · local coordinates"
                                points={Object.values(frontPiece.points)}
                                lines={frontPiece.lines}
                                color="#c44536"
                                showConstructionLines={showConstructionLines}
                            />
                            {footPiece && (
                                <AlignedFootPiece
                                    footPiece={footPiece}
                                    showShrinkedOutline={showShrinkedOutline}
                                    showReferenceCurve={showReferenceCurve}
                                    referenceCurveOpacity={fSelectionMode ? 0.22 : 1}
                                />
                            )}
                            {footPiece?.automaticPositioning && (
                                <AutomaticFootAxisLayer
                                    positioning={footPiece.automaticPositioning}
                                    frontPiece={frontPiece}
                                    visibility={{
                                        midHeel: showMidHeel,
                                        tangent: showMidHeelTangent,
                                        toeNormal: showToeNormal,
                                        toeArc: showToeArc,
                                        secondToe: showSecondToe,
                                        longitudinalAxis: showLongitudinalAxis,
                                        sourceRS: showSourceRS,
                                        sourceMs: showSourceMs,
                                        targetAxis: showTargetAxis,
                                        targetMPrimeG: showTargetMPrimeG,
                                    }}
                                />
                            )}
                            {targetAnkleIntersections && showTargetAnkleIntersections && (
                                <TargetAnkleIntersectionsLayer
                                    geometry={targetAnkleIntersections}
                                />
                            )}
                            {targetReferenceArc && showTargetReferenceArc && (
                                <TargetReferenceArcLayer geometry={targetReferenceArc} />
                            )}
                            {toeRadialReferences && showToeRadialReferences && (
                                <ToeRadialReferencesLayer geometry={toeRadialReferences} />
                            )}
                            {toeRadialOuterSupports && showToeOuterSupports && (
                                <ToeRadialOuterSupportsLayer geometry={toeRadialOuterSupports} />
                            )}
                            {targetUt && showTargetUt && <TargetUtLayer geometry={targetUt} />}
                            {targetWPrime && showTargetWPrime && (
                                <TargetWPrimeLayer geometry={targetWPrime} />
                            )}
                            {targetMultiSupportOuterCurve && showTargetMultiSupportOuterCurve && (
                                <TargetMultiSupportOuterCurveLayer
                                    candidate={targetMultiSupportOuterCurve}
                                />
                            )}
                            {searchPreviewMultiSupportOuterCurve &&
                                showSearchPreviewMultiSupportOuterCurve && (
                                    <TargetMultiSupportOuterCurveLayer
                                        candidate={searchPreviewMultiSupportOuterCurve}
                                        color="#06b6d4"
                                        lineWidth={3}
                                        zOffset={1.05}
                                        showAnchors={false}
                                    />
                                )}
                            {searchPreviewMultiSupportOuterCurve && showSearchPreviewAnchors && (
                                <SearchPreviewAnchorsLayer
                                    candidate={searchPreviewMultiSupportOuterCurve}
                                />
                            )}
                            {manualFootPiece && (
                                <FootPieceFSelector
                                    footPiece={manualFootPiece}
                                    frontPiece={frontPiece}
                                    selectionMode={fSelectionMode}
                                    pendingSelection={pendingFSelection}
                                    hoverSelection={hoverFSelection}
                                    showFMarkers={showReferencePoints}
                                    showGuides={showConstructionLines}
                                    onHoverSelectionChange={onHoverFSelectionChange}
                                    onSelect={onSelectF}
                                />
                            )}
                            {lufCurve && (
                                <CandidateLufCurve
                                    curve={lufCurve}
                                    showCurve={showCandidateCurve}
                                    showReferencePoints={showReferencePoints}
                                    showConstructionLines={showConstructionLines}
                                />
                            )}
                        </group>
                    )}

                    <CameraControls
                        ref={cameraControlsRef}
                        makeDefault
                        mouseButtons={FOOT_PATTERN_CAMERA_MOUSE_BUTTONS}
                        touches={FOOT_PATTERN_CAMERA_TOUCHES}
                        minZoom={CAMERA_ZOOM * 0.25}
                        maxZoom={CAMERA_ZOOM * 5}
                        draggingSmoothTime={0}
                        azimuthRotateSpeed={0}
                        polarRotateSpeed={0}
                        dollySpeed={0.15}
                        dollyToCursor
                    />
                </Canvas>

                {!backPiece && !frontPiece && (
                    <div className="foot-drafting-scene-empty">
                        <strong>Construction preview</strong>
                        <span>
                            Enter all raw measurements and temporary r to build the geometry.
                        </span>
                    </div>
                )}
            </div>
        </>
    );
};

export default FootPatternScene;
