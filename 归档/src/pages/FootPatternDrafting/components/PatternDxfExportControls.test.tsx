/* eslint-disable @typescript-eslint/no-explicit-any */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import PatternDxfExportControls from './PatternDxfExportControls';

const mockSerializeFinalPatternDxf = jest.fn(() => ({
    geometry: {
        fileName: 'pressure_stocking_pattern.dxf',
        dxfText: 'DXF',
        manifest: {},
    },
    errors: [],
}));

jest.mock('../export/dxfSerializer', () => ({
    PRESSURE_STOCKING_DXF_FILE_NAME: 'pressure_stocking_pattern.dxf',
    serializeFinalPatternDxf: (...args: any[]) => mockSerializeFinalPatternDxf(...args),
}));

const validManualCandidate: any = { valid: true };
const invalidManualCandidate: any = { valid: false };
const exportGeometry: any = { source: 'manual-candidate-only' };

function renderControls(overrides: Record<string, any> = {}) {
    return render(
        createElement(PatternDxfExportControls, {
            manualCandidate: validManualCandidate,
            frontContourReady: true,
            backContourReady: true,
            exportGeometry,
            errors: [],
            ...overrides,
        }),
    );
}

describe('PatternDxfExportControls eligibility', () => {
    beforeAll(() => {
        (globalThis as typeof globalThis & { React?: typeof import('react') }).React =
            jest.requireActual('react');
    });

    afterAll(() => {
        delete (globalThis as typeof globalThis & { React?: typeof import('react') }).React;
    });

    beforeEach(() => mockSerializeFinalPatternDxf.mockClear());
    afterEach(cleanup);

    it('enables export for a VALID applied manual candidate and downloads its geometry', () => {
        const onDownload = jest.fn();
        renderControls({ onDownload });
        const button = screen.getByRole('button', {
            name: /Export Master DXF/i,
        }) as HTMLButtonElement;

        expect(button.disabled).toBe(false);
        fireEvent.click(button);

        expect(mockSerializeFinalPatternDxf).toHaveBeenCalledWith(exportGeometry);
        expect(onDownload).toHaveBeenCalledWith(
            expect.objectContaining({ fileName: 'pressure_stocking_pattern.dxf' }),
        );
    });

    it('keeps export disabled when the manual candidate is INVALID', () => {
        renderControls({ manualCandidate: invalidManualCandidate });

        expect(
            (
                screen.getByRole('button', {
                    name: /Export Master DXF/i,
                }) as HTMLButtonElement
            ).disabled,
        ).toBe(true);
        expect(
            screen.getByText('A valid multi-support candidate must be applied before DXF export.'),
        ).not.toBeNull();
        expect(mockSerializeFinalPatternDxf).not.toHaveBeenCalled();
    });

    it('does not accept a VALID preview as a substitute for the INVALID manual source', () => {
        renderControls({
            manualCandidate: invalidManualCandidate,
            searchPreviewCandidate: { valid: true },
        });

        expect(
            (
                screen.getByRole('button', {
                    name: /Export Master DXF/i,
                }) as HTMLButtonElement
            ).disabled,
        ).toBe(true);
        expect(screen.getByText('INVALID')).not.toBeNull();
    });

    it('fails closed when either final cutting contour is unavailable', () => {
        const { rerender } = renderControls({ frontContourReady: false });
        expect(
            (
                screen.getByRole('button', {
                    name: /Export Master DXF/i,
                }) as HTMLButtonElement
            ).disabled,
        ).toBe(true);

        rerender(
            createElement(PatternDxfExportControls, {
                manualCandidate: validManualCandidate,
                frontContourReady: true,
                backContourReady: false,
                exportGeometry,
                errors: [],
            }),
        );
        expect(
            (
                screen.getByRole('button', {
                    name: /Export Master DXF/i,
                }) as HTMLButtonElement
            ).disabled,
        ).toBe(true);
    });
});
