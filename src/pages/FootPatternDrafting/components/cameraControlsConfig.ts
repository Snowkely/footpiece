import CameraControlsImpl from 'camera-controls';

export const FOOT_PATTERN_CAMERA_MOUSE_BUTTONS: CameraControlsImpl['mouseButtons'] = {
    left: CameraControlsImpl.ACTION.TRUCK,
    middle: CameraControlsImpl.ACTION.NONE,
    right: CameraControlsImpl.ACTION.TRUCK,
    wheel: CameraControlsImpl.ACTION.ZOOM,
};

export const FOOT_PATTERN_CAMERA_TOUCHES: CameraControlsImpl['touches'] = {
    one: CameraControlsImpl.ACTION.TOUCH_TRUCK,
    two: CameraControlsImpl.ACTION.TOUCH_ZOOM_TRUCK,
    three: CameraControlsImpl.ACTION.TOUCH_TRUCK,
};
