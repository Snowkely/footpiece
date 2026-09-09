/* eslint-disable @typescript-eslint/no-explicit-any */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import AutomaticSearchModeControls from './AutomaticSearchModeControls';

jest.mock('./NearbyMultiSupportSearchControls', () => ({
    __esModule: true,
    default: () => {
        const ReactModule = jest.requireActual('react');
        return ReactModule.createElement('div', { 'data-testid': 'nearby-search-controls' });
    },
}));

jest.mock('./BroadMultiSupportSearchControls', () => ({
    __esModule: true,
    default: () => {
        const ReactModule = jest.requireActual('react');
        return ReactModule.createElement('div', { 'data-testid': 'broad-search-controls' });
    },
}));

function props(overrides: Record<string, any> = {}) {
    return {
        mode: 'nearby',
        manualSeed: { alpha: 0.5, thetaDeg: 10, lambdaCm: 1 },
        inputsAvailable: true,
        nearbyController: {},
        broadController: {},
        suggestedCandidates: {},
        onModeChange: jest.fn(),
        onApplyCandidate: jest.fn(),
        ...overrides,
    };
}

describe('AutomaticSearchModeControls', () => {
    afterEach(cleanup);

    it('keeps Nearby Search as the default mode and exposes Broad Search independently', () => {
        const onModeChange = jest.fn();
        const view = render(createElement(AutomaticSearchModeControls, props({ onModeChange })));

        expect(screen.getByText('Automatic Search Mode')).toBeTruthy();
        expect(screen.getByTestId('nearby-search-controls')).toBeTruthy();
        expect(screen.queryByTestId('broad-search-controls')).toBeNull();

        fireEvent.click(screen.getByText('Broad Search'));
        expect(onModeChange).toHaveBeenCalledWith('broad');

        view.rerender(createElement(AutomaticSearchModeControls, props({ mode: 'broad' })));
        expect(screen.getByTestId('broad-search-controls')).toBeTruthy();
        expect(screen.queryByTestId('nearby-search-controls')).toBeNull();
    });
});
