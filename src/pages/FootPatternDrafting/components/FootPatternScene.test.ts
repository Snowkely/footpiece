import CameraControlsImpl from 'camera-controls';
import {
    FOOT_PATTERN_CAMERA_MOUSE_BUTTONS,
    FOOT_PATTERN_CAMERA_TOUCHES,
} from './cameraControlsConfig';

describe('FootPatternScene camera interaction config', () => {
    it('maps left and right mouse drag to truck and wheel to zoom', () => {
        expect(FOOT_PATTERN_CAMERA_MOUSE_BUTTONS.left).toBe(CameraControlsImpl.ACTION.TRUCK);
        expect(FOOT_PATTERN_CAMERA_MOUSE_BUTTONS.right).toBe(CameraControlsImpl.ACTION.TRUCK);
        expect(FOOT_PATTERN_CAMERA_MOUSE_BUTTONS.wheel).toBe(CameraControlsImpl.ACTION.ZOOM);
        expect(Object.values(FOOT_PATTERN_CAMERA_MOUSE_BUTTONS)).not.toContain(
            CameraControlsImpl.ACTION.ROTATE,
        );
    });

    it('maps one-finger touch to pan and two-finger touch to zoom plus pan', () => {
        expect(FOOT_PATTERN_CAMERA_TOUCHES.one).toBe(CameraControlsImpl.ACTION.TOUCH_TRUCK);
        expect(FOOT_PATTERN_CAMERA_TOUCHES.two).toBe(CameraControlsImpl.ACTION.TOUCH_ZOOM_TRUCK);
        expect(Object.values(FOOT_PATTERN_CAMERA_TOUCHES)).not.toContain(
            CameraControlsImpl.ACTION.TOUCH_ROTATE,
        );
    });
});
