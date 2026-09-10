import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import FootPatternDrafting from './index';

jest.mock('./components/FootPatternScene', () => ({
    __esModule: true,
    default: () => {
        const ReactModule = jest.requireActual('react');
        return ReactModule.createElement('div', { 'data-testid': 'foot-pattern-scene' });
    },
}));

describe('FootPatternDrafting active UI route', () => {
    beforeAll(() => {
        (globalThis as typeof globalThis & { React?: typeof import('react') }).React =
            jest.requireActual('react');
    });

    afterAll(() => {
        delete (globalThis as typeof globalThis & { React?: typeof import('react') }).React;
    });

    afterEach(cleanup);

    it("retires legacy single-W' UI while keeping the multi-support workflow visible", () => {
        render(createElement(FootPatternDrafting));

        expect(screen.queryByText(/Old Step 6 · single-W'/i)).toBeNull();
        expect(screen.queryByText("Legacy Single-W' Outer Curve")).toBeNull();
        expect(screen.queryByText(/MANUAL α \/ W' EVALUATION/i)).toBeNull();
        expect(screen.getAllByText('Multi-Support Outer Curve').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Nearby Multi-Support Search').length).toBeGreaterThan(0);
        expect(screen.getByTestId('foot-pattern-scene')).not.toBeNull();
    });
});
