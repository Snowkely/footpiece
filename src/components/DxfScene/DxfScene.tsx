/* eslint-disable react/no-unknown-property */
import { CameraControls, Grid } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useModel } from '@umijs/max';
import { useMouse } from 'ahooks';
import { Typography, message } from 'antd';
import React, { useState } from 'react';
import * as THREE from 'three';
import Block from './components/Block';

const { Text } = Typography;

const DxfScene: React.FC = () => {
    const { startPick, selectedPointInfo } = useModel('selectPointsDrawerModel', (model) => ({
        startPick: model.startPick,
        selectedPointInfo: model.selectedPointInfo,
    }));

    const { generatedBlocks } = useModel('dxfSceneModel', (model) => ({
        generatedBlocks: model.generatedBlocks,
    }));

    const { blocks } = useModel('uploadModel', (model) => ({
        blocks: model.blocks,
    }));

    const cameraZoom = 5;
    const mouse = useMouse();
    const [messageApi, contextHolder] = message.useMessage();
    const [hovered, setHover] = useState(false);

    return (
        <>
            {contextHolder}
            <Canvas
                // style={{ cursor: startPick ? 'crosshair' : 'default' }}
                orthographic
                camera={{
                    zoom: cameraZoom,
                    position: [0, 0, 10],
                    // left={-width / 2}
                    // right={width / 2}
                    // top={height / 2}
                    // bottom={-height / 2}
                }}
                gl={{ alpha: true, antialias: true, stencil: true, depth: true }}
                // dpr={[1, 1.5]}
            >
                <color attach="background" args={['#ffffff']} />
                {/* {<Curve />} */}
                {blocks.blocks && (
                    <group
                        onPointerOver={() => {
                            setHover(true);
                        }}
                        onPointerOut={() => {
                            setHover(false);
                        }}
                    >
                        {blocks.blocks.map((block, index) => (
                            <Block
                                key={index}
                                block={block}
                                onWarning={(msg) => messageApi.warning(msg)}
                                materialColor="#ffffff"
                                lineColor="#000000"
                                pointColor="orange"
                                materialOpacity={1}
                                lineOpacity={0.5}
                                pointOpacity={1}
                                pointSize={0.7}
                                alwaysShowPoint={false}
                                canDrag={false}
                                needAddPoint={true}
                                hovered={hovered}
                            />
                        ))}
                    </group>
                )}
                {generatedBlocks && (
                    <group>
                        {generatedBlocks.map((block, index) => (
                            <Block
                                key={index}
                                block={block}
                                onWarning={(msg) => messageApi.warning(msg)}
                                materialColor="#ff0000"
                                lineColor="#ff0000"
                                pointColor="blue"
                                materialOpacity={0.1}
                                lineOpacity={1}
                                pointOpacity={1}
                                pointSize={0.7}
                                alwaysShowPoint={false}
                                canDrag={true}
                                needAddPoint={false}
                                hovered={false}
                            />
                        ))}
                    </group>
                )}
                <Grid
                    side={THREE.DoubleSide}
                    cellColor="#aa000000"
                    cellSize={10}
                    cellThickness={1}
                    rotation={[Math.PI / 2, 0, 0]}
                    sectionColor={'#dd000000'}
                    sectionSize={100}
                    sectionThickness={1.5}
                    followCamera={false}
                    infiniteGrid={true}
                    fadeDistance={10000}
                    fadeStrength={0}
                    position={[0, 1000, -10]}
                />
                {/* <OrbitControls
                    makeDefault
                    autoRotate={false}
                    autoRotateSpeed={10}
                    maxPolarAngle={Math.PI / 2.3}
                    minPolarAngle={Math.PI / 2.3}
                    minZoom={minZoom}
                    maxZoom={maxZoom}
                    enableZoom={true}
                    enablePan={true}
                    enableRotate={true}
                    enableDamping={false}
                /> */}
                <CameraControls
                    makeDefault
                    minZoom={cameraZoom * 0.2}
                    maxZoom={cameraZoom * 4}
                    draggingSmoothTime={0}
                    azimuthRotateSpeed={0}
                    polarRotateSpeed={0}
                    dollySpeed={0.1}
                />
            </Canvas>

            {startPick && selectedPointInfo?.picking && (
                <Text
                    style={{
                        position: 'absolute',
                        left: mouse.pageX + 20,
                        top: mouse.pageY - 30,
                        userSelect: 'none',
                        background: 'orange',
                        padding: '0 10px 0 10px',
                        borderRadius: 5,
                        color: 'white',
                    }}
                >
                    {selectedPointInfo.name}
                </Text>
            )}
        </>
    );
};

export default DxfScene;
