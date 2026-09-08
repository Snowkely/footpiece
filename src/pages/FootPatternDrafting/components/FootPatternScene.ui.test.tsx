/* eslint-disable @typescript-eslint/no-explicit-any */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import FootPatternScene from './FootPatternScene';

const mockCameraReset = jest.fn();
const mockCameraFitToBox = jest.fn();
const mockTargetMultiSupportOuterCurveLayer = jest.fn();
const mockSearchPreviewAnchorsLayer = jest.fn();

jest.mock('@react-three/fiber', () => {
    const ReactModule = jest.requireActual('react');

    return {
        Canvas: ({ children }: any) =>
            ReactModule.createElement('div', { 'data-testid': 'viewer-canvas' }, children),
        useThree: () => ({ camera: {}, gl: { domElement: {} } }),
    };
});

jest.mock('@react-three/drei', () => {
    const ReactModule = jest.requireActual('react');

    return {
        CameraControls: ReactModule.forwardRef((_props: any, ref: any) => {
            ReactModule.useImperativeHandle(ref, () => ({
                reset: mockCameraReset,
                fitToBox: mockCameraFitToBox,
            }));
            return ReactModule.createElement('div', { 'data-testid': 'camera-controls' });
        }),
        Grid: () => null,
        Html: ({ children }: any) =>
            ReactModule.createElement(ReactModule.Fragment, null, children),
        Line: () => null,
        Sphere: ({ children }: any) =>
            ReactModule.createElement(ReactModule.Fragment, null, children),
    };
});

jest.mock('./TargetMultiSupportOuterCurveLayer', () => ({
    __esModule: true,
    default: (props: any) => {
        mockTargetMultiSupportOuterCurveLayer(props);
        return null;
    },
}));

jest.mock('./SearchPreviewAnchorsLayer', () => ({
    __esModule: true,
    default: (props: any) => {
        mockSearchPreviewAnchorsLayer(props);
        return null;
    },
}));

const multiSupportCandidate: any = {
    alpha: 0.5,
    thetaDeg: 10,
    outwardOffsetCm: 1,
    valid: false,
    polylinePoints: [{ id: 'candidate-point', x: 0, y: 0 }],
};

const frontPiece: any = {
    points: {
        O: { id: 'O', x: 0, y: 5 },
        MPrime: { id: "M'", x: 0, y: 0 },
    },
    lines: [],
};

function sceneProps(overrides: Record<string, any> = {}) {
    return {
        targetMultiSupportOuterCurve: multiSupportCandidate,
        fSelectionMode: false,
        onHoverFSelectionChange: jest.fn(),
        onSelectF: jest.fn(),
        ...overrides,
    };
}

function renderScene(overrides: Record<string, any> = {}) {
    return render(createElement(FootPatternScene, sceneProps(overrides)));
}

function getShrinkedOutlineSwitch(): HTMLElement {
    const label = screen.getByText('Show shrinked outline').closest('label');
    const control = label?.querySelector('[role="switch"]');

    if (!(control instanceof HTMLElement)) {
        throw new Error('Shrinked-outline switch was not rendered.');
    }

    return control;
}

function getButtonByText(text: string): HTMLButtonElement {
    const button = screen.getByText(text).closest('button');

    if (!(button instanceof HTMLButtonElement)) {
        throw new Error(`${text} button was not rendered.`);
    }

    return button;
}

describe('FootPatternScene layer controls', () => {
    beforeAll(() => {
        (globalThis as typeof globalThis & { React?: typeof import('react') }).React =
            jest.requireActual('react');
    });

    afterAll(() => {
        delete (globalThis as typeof globalThis & { React?: typeof import('react') }).React;
    });

    beforeEach(() => {
        mockCameraReset.mockClear();
        mockCameraFitToBox.mockClear();
        mockTargetMultiSupportOuterCurveLayer.mockClear();
        mockSearchPreviewAnchorsLayer.mockClear();
    });

    afterEach(cleanup);

    it('is expanded by default and preserves layer-toggle state across hide/show', () => {
        renderScene();

        const hideButton = screen.getByRole('button', { name: 'Hide layer controls' });
        expect(hideButton.getAttribute('aria-expanded')).toBe('true');

        const shrinkedOutlineSwitch = getShrinkedOutlineSwitch();
        expect(shrinkedOutlineSwitch.getAttribute('aria-checked')).toBe('true');
        fireEvent.click(shrinkedOutlineSwitch);
        expect(shrinkedOutlineSwitch.getAttribute('aria-checked')).toBe('false');

        fireEvent.click(hideButton);
        expect(screen.queryByText('Show shrinked outline')).toBeNull();

        const showButton = screen.getByRole('button', { name: 'Show layer controls' });
        expect(showButton.getAttribute('aria-expanded')).toBe('false');
        fireEvent.click(showButton);

        expect(getShrinkedOutlineSwitch().getAttribute('aria-checked')).toBe('false');
    });

    it('keeps status, camera actions, canvas, and geometry inputs intact', () => {
        const candidateSnapshot = JSON.stringify({ multiSupportCandidate });
        renderScene({
            targetOuterCurve: {
                valid: true,
                polylinePoints: [{ id: 'retired-legacy-point', x: 0, y: 0 }],
            },
        });

        fireEvent.click(screen.getByRole('button', { name: 'Hide layer controls' }));

        expect(screen.getByText('Construction viewer')).not.toBeNull();
        expect(screen.getByText('Units: cm')).not.toBeNull();
        expect(screen.queryByText('LEGACY VALID')).toBeNull();
        expect(screen.queryByText("Show Legacy Single-W' Candidate")).toBeNull();
        expect(screen.getByText('MULTI-SUPPORT INVALID')).not.toBeNull();
        expect(getButtonByText('Reset view').disabled).toBe(false);
        expect(getButtonByText('Fit view').disabled).toBe(false);
        expect(screen.getByTestId('viewer-canvas')).not.toBeNull();
        expect(mockCameraReset).not.toHaveBeenCalled();
        expect(mockCameraFitToBox).not.toHaveBeenCalled();
        expect(JSON.stringify({ multiSupportCandidate })).toBe(candidateSnapshot);

        fireEvent.click(screen.getByRole('button', { name: 'Show layer controls' }));
        expect(mockCameraReset).not.toHaveBeenCalled();
        expect(mockCameraFitToBox).not.toHaveBeenCalled();

        fireEvent.click(getButtonByText('Reset view'));
        fireEvent.click(getButtonByText('Fit view'));
        expect(mockCameraReset).toHaveBeenCalledWith(true);
        expect(mockCameraFitToBox).toHaveBeenCalledTimes(1);
    });

    it('keeps the selected search preview separate from the manual multi-support layer', () => {
        renderScene({ searchPreviewMultiSupportOuterCurve: multiSupportCandidate });

        expect(screen.getByText('MULTI-SUPPORT INVALID')).not.toBeNull();
        expect(screen.getByText('SEARCH PREVIEW VALID')).not.toBeNull();
        expect(screen.getByText('Show Multi-Support Outer Curve')).not.toBeNull();
        expect(screen.getByText('Show Search Preview Candidate')).not.toBeNull();

        const searchPreviewLabel = screen
            .getByText('Show Search Preview Candidate')
            .closest('label');
        const searchPreviewSwitch = searchPreviewLabel?.querySelector('[role="switch"]');
        if (!(searchPreviewSwitch instanceof HTMLElement)) {
            throw new Error('Search-preview layer switch was not rendered.');
        }
        fireEvent.click(searchPreviewSwitch);

        expect(searchPreviewSwitch.getAttribute('aria-checked')).toBe('false');
        expect(screen.getByTestId('viewer-canvas')).not.toBeNull();
    });

    it('keeps preview anchors off by default and does not fall back to manual anchors', () => {
        renderScene();

        const previewAnchorsLabel = screen
            .getByText('Show Search Preview Anchors')
            .closest('label');
        const previewAnchorsSwitch = previewAnchorsLabel?.querySelector('[role="switch"]');
        if (!(previewAnchorsSwitch instanceof HTMLButtonElement)) {
            throw new Error('Search-preview anchor switch was not rendered.');
        }

        expect(previewAnchorsSwitch.getAttribute('aria-checked')).toBe('false');
        expect(previewAnchorsSwitch.disabled).toBe(true);
        expect(previewAnchorsLabel?.getAttribute('title')).toBe(
            'No search/suggested preview candidate selected.',
        );
        expect(mockSearchPreviewAnchorsLayer).not.toHaveBeenCalled();
    });

    it('renders the active cyan curve and anchors from the exact same preview candidate', () => {
        const firstPreview = { ...multiSupportCandidate, alpha: 0.42, thetaDeg: 8.5 };
        const secondPreview = { ...multiSupportCandidate, alpha: 0.64, thetaDeg: 12 };
        const view = renderScene({
            frontPiece,
            searchPreviewMultiSupportOuterCurve: firstPreview,
        });
        const previewAnchorsLabel = screen
            .getByText('Show Search Preview Anchors')
            .closest('label');
        const previewAnchorsSwitch = previewAnchorsLabel?.querySelector('[role="switch"]');
        if (!(previewAnchorsSwitch instanceof HTMLElement)) {
            throw new Error('Search-preview anchor switch was not rendered.');
        }

        const firstCurveProps = mockTargetMultiSupportOuterCurveLayer.mock.calls
            .map(([props]) => props)
            .find((props) => props.color === '#06b6d4');
        expect(firstCurveProps.candidate).toBe(firstPreview);
        expect(firstCurveProps.showAnchors).toBe(false);
        expect(mockSearchPreviewAnchorsLayer).not.toHaveBeenCalled();

        fireEvent.click(previewAnchorsSwitch);

        expect(previewAnchorsSwitch.getAttribute('aria-checked')).toBe('true');
        expect(mockSearchPreviewAnchorsLayer).toHaveBeenLastCalledWith(
            expect.objectContaining({ candidate: firstPreview }),
        );

        view.rerender(
            createElement(
                FootPatternScene,
                sceneProps({
                    frontPiece,
                    searchPreviewMultiSupportOuterCurve: secondPreview,
                }),
            ),
        );

        const latestCurveProps = mockTargetMultiSupportOuterCurveLayer.mock.calls
            .map(([props]) => props)
            .filter((props) => props.color === '#06b6d4')
            .at(-1);
        expect(latestCurveProps.candidate).toBe(secondPreview);
        expect(mockSearchPreviewAnchorsLayer).toHaveBeenLastCalledWith(
            expect.objectContaining({ candidate: secondPreview }),
        );
        expect(previewAnchorsSwitch.getAttribute('aria-checked')).toBe('true');
    });

    it('does not change the manual layer or preview candidate when its anchor toggle changes', () => {
        const preview = { ...multiSupportCandidate, alpha: 0.73, thetaDeg: 14 };
        const snapshot = JSON.stringify({ manual: multiSupportCandidate, preview });
        renderScene({ frontPiece, searchPreviewMultiSupportOuterCurve: preview });
        const previewAnchorsLabel = screen
            .getByText('Show Search Preview Anchors')
            .closest('label');
        const previewAnchorsSwitch = previewAnchorsLabel?.querySelector('[role="switch"]');
        if (!(previewAnchorsSwitch instanceof HTMLElement)) {
            throw new Error('Search-preview anchor switch was not rendered.');
        }

        fireEvent.click(previewAnchorsSwitch);

        const manualLayerProps = mockTargetMultiSupportOuterCurveLayer.mock.calls
            .map(([props]) => props)
            .find((props) => props.candidate === multiSupportCandidate);
        expect(manualLayerProps.color).toBeUndefined();
        expect(manualLayerProps.showAnchors).toBeUndefined();
        expect(JSON.stringify({ manual: multiSupportCandidate, preview })).toBe(snapshot);
    });
});
