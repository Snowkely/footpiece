/* eslint-disable react/no-unknown-property */
import { CompressOutlined, ReloadOutlined } from '@ant-design/icons';
import { CameraControls, Grid, Html, Line } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Button, Switch, Tag } from 'antd';
import CameraControlsImpl from 'camera-controls';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type {
    BackPieceGeometry,
    DraftLine,
    DraftPoint,
    FootPieceFSelection,
    FootPiecePositioningGeometry,
    FrontPieceGeometry,
    LufCurveGeometry,
} from '../types';
import AlignedFootPiece from './AlignedFootPiece';
import {
    FOOT_PATTERN_CAMERA_MOUSE_BUTTONS,
    FOOT_PATTERN_CAMERA_TOUCHES,
} from './cameraControlsConfig';
import CandidateLufCurve from './CandidateLufCurve';
import ConstructionPoint from './ConstructionPoint';
import FootPieceFSelector from './FootPieceFSelector';

interface FootPatternSceneProps {
    backPiece?: BackPieceGeometry;
    frontPiece?: FrontPieceGeometry;
    footPiece?: FootPiecePositioningGeometry;
    lufCurve?: LufCurveGeometry;
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
    footPiece: FootPiecePositioningGeometry | undefined,
    lufCurve: LufCurveGeometry | undefined,
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

    return bounds.isEmpty() ? undefined : bounds;
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
                displayOffsets.back,
                displayOffsets.front,
            ),
        [backPiece, displayOffsets, footPiece, frontPiece, lufCurve],
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
                <div className="foot-drafting-viewer-switches">
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
                        Show RQPS / RQFPS
                    </label>
                    <label>
                        <Switch
                            size="small"
                            checked={showReferencePoints}
                            onChange={setShowReferencePoints}
                        />
                        Show F/F&apos;
                    </label>
                    <label>
                        <Switch
                            size="small"
                            checked={showCandidateCurve}
                            onChange={setShowCandidateCurve}
                        />
                        Show candidate LUF&apos;TG&apos;
                    </label>
                    <label>
                        <Switch
                            size="small"
                            checked={showConstructionLines}
                            onChange={setShowConstructionLines}
                        />
                        Show construction lines
                    </label>
                </div>
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
                            {footPiece && (
                                <FootPieceFSelector
                                    footPiece={footPiece}
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
