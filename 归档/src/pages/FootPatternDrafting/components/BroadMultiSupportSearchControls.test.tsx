/* eslint-disable @typescript-eslint/no-explicit-any */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { DEFAULT_BROAD_MULTI_SUPPORT_SEARCH_CONFIG } from '../geometry/broadMultiSupportSearch';
import BroadMultiSupportSearchControls from './BroadMultiSupportSearchControls';

function controller(overrides: Record<string, any> = {}) {
    return {
        status: 'IDLE',
        result: undefined,
        selectedCandidateId: undefined,
        selectedCandidate: undefined,
        previewCandidate: undefined,
        elapsedMs: 0,
        errors: [],
        start: jest.fn(),
        cancel: jest.fn(),
        clear: jest.fn(),
        rebuildCandidate: jest.fn((candidateId: number) => ({
            geometry: {
                polylinePoints: [
                    { id: 'L', x: 0, y: 0 },
                    { id: 'middle', x: 1, y: candidateId / 10 },
                    { id: 'GPrime', x: 2, y: 0 },
                ],
            },
            errors: [],
        })),
        selectCandidate: jest.fn(),
        selectPrevious: jest.fn(),
        selectNext: jest.fn(),
        ...overrides,
    };
}

describe('BroadMultiSupportSearchControls', () => {
    afterEach(cleanup);

    it('shows full legal ranges, requested/effective coarse steps, and runs explicitly', () => {
        const broadController = controller();
        render(
            createElement(BroadMultiSupportSearchControls, {
                manualPreview: { alpha: 0.5, thetaDeg: 10, lambdaCm: 1 },
                inputsAvailable: true,
                controller: broadController,
                onApplyCandidate: jest.fn(),
            }),
        );

        expect(screen.getByText('α: 0 → 1')).toBeTruthy();
        expect(screen.getByText('θ: 2° → 30°')).toBeTruthy();
        expect(screen.getByText('λ: 0 → 8 cm')).toBeTruthy();
        expect(screen.getByText(/Requested steps: α 0.05/)).toBeTruthy();
        expect(screen.getByText(/Effective steps: α 0.0625/)).toBeTruthy();
        expect(screen.getByText(/Estimated candidates:/).textContent).toContain('13,464');
        expect(screen.getByText('Broad resolution adjusted automatically')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Run Broad Search' }));
        expect(broadController.start).toHaveBeenCalledWith(
            DEFAULT_BROAD_MULTI_SUPPORT_SEARCH_CONFIG,
        );
    });

    it('keeps cancel and Broad history separate from Nearby/Suggested results', () => {
        const broadController = controller({ status: 'RUNNING' });
        render(
            createElement(BroadMultiSupportSearchControls, {
                manualPreview: { alpha: 0.5, thetaDeg: 10, lambdaCm: 1 },
                inputsAvailable: true,
                controller: broadController,
                onApplyCandidate: jest.fn(),
            }),
        );

        fireEvent.click(screen.getByRole('button', { name: 'Cancel Broad Search' }));
        expect(broadController.cancel).toHaveBeenCalledTimes(1);
        expect(screen.getByText('Broad Valid Candidate History')).toBeTruthy();
        expect(
            screen
                .getByRole('button', { name: /Broad Valid Candidate History/ })
                .getAttribute('aria-expanded'),
        ).toBe('false');
        expect(screen.queryByText('Suggested Results')).toBeNull();
        expect(screen.queryByText('Nearby Valid Candidate History')).toBeNull();
    });

    it('uses the narrow-column Apply to Manual label without changing apply behavior', () => {
        const selectedCandidate = {
            id: 1,
            alpha: 0.6,
            thetaDeg: 12,
            lambdaCm: 1.5,
            referenceLengthCm: 35,
            outerLengthCm: 36.5,
            extraLengthCm: 1.5,
            diagnostics: {
                lEndpointTangentMismatchDeg: 1,
                gPrimeEndpointTangentMismatchDeg: 2,
                maxToeTurningDeg: 3,
                toeTurningVariationDeg: 4,
                supportChordTurningAnglesDeg: { W3Prime: 1, WPrime: 1, W2Prime: 1 },
            },
        };
        const result = {
            totalCandidateCount: 1,
            evaluatedCandidateCount: 1,
            validCandidateCount: 1,
            invalidCandidateCount: 0,
            validCandidates: [selectedCandidate],
            rejectionStats: {
                tooShort: 0,
                tooLong: 0,
                insideReference: 0,
                referenceIntersection: 0,
                selfIntersection: 0,
                utBuildError: 0,
                toeReferenceBuildError: 0,
                wPrimeBuildError: 0,
                toeOuterSupportBuildError: 0,
                outerCurveBuildError: 0,
            },
            cacheStats: {
                alpha: { builds: 1, hits: 0 },
                theta: { builds: 1, hits: 0 },
                lambda: { builds: 1, hits: 0 },
                thetaLambda: { builds: 1, hits: 0 },
            },
            invalidThetaSkippedCandidates: 0,
        };
        const onApplyCandidate = jest.fn();
        render(
            createElement(BroadMultiSupportSearchControls, {
                manualPreview: { alpha: 0.5, thetaDeg: 10, lambdaCm: 1 },
                inputsAvailable: true,
                controller: controller({
                    status: 'COMPLETED',
                    result,
                    selectedCandidateId: 1,
                    selectedCandidate,
                }),
                onApplyCandidate,
            }),
        );

        const applyButtons = screen.getAllByRole('button', { name: 'Apply to Manual' });
        const applyButton = applyButtons.at(-1)!;
        expect(applyButtons).toHaveLength(2);
        expect(applyButton.classList.contains('foot-drafting-broad-apply')).toBe(true);
        expect(
            screen.queryByRole('button', {
                name: 'Apply Selected Broad Candidate to Manual Controls',
            }),
        ).toBeNull();
        fireEvent.click(applyButton);
        expect(onApplyCandidate).toHaveBeenCalledWith(selectedCandidate);
    });
});
