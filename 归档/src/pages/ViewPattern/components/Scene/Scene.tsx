/* eslint-disable react/no-unknown-property */
import { CameraControls, Grid } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useModel } from '@umijs/max';
import { message } from 'antd';
import React from 'react';
import * as THREE from 'three';
import Block from './components/Block';

// 脚手架示例组件
const Scene: React.FC = () => {
    const { blocks } = useModel('ViewPattern.model', (model) => ({
        blocks: model.blocks,
    }));

    const cameraZoom = 5;
    const [messageApi, contextHolder] = message.useMessage();

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
                    <group>
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
        </>
    );
};

export default Scene;
