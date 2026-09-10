import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import type { SuggestedMultiSupportCandidatesController } from '../hooks/useSuggestedMultiSupportCandidates';
import SuggestedMultiSupportCandidates from './SuggestedMultiSupportCandidates';

const rankingConfig = {
    resultCount: 5 as const,
    weights: {
        lEndpointMismatch: 0.25,
        gPrimeEndpointMismatch: 0.25,
        maxToeTurning: 0.25,
        toeTurningVariation: 0.25,
    },
    diversityThreshold: 0.15,
};

function suggestion(index: number, sourceCandidateId: number) {
    return {
        suggestionIndex: index,
        sourceCandidateId,
        alpha: 0.5 + index * 0.02,
        thetaDeg: 8 + index,
        lambdaCm: 2 + index * 0.1,
        softScore: index * 0.1,
        rawMetrics: {
            lEndpointMismatchDeg: 4 + index,
            gPrimeEndpointMismatchDeg: 5 + index,
            maxToeTurningDeg: 2 + index,
            toeTurningVariationDeg: 0.5 + index,
        },
        normalizedMetrics: {
            lEndpointMismatch: index / 2,
            gPrimeEndpointMismatch: index / 2,
            maxToeTurning: index / 2,
            toeTurningVariation: index / 2,
        },
        referenceLengthCm: 35,
        outerLengthCm: 36.5,
        extraLengthCm: 1.5,
        minimumDistanceToOtherSelected: 0.4,
    };
}

function controller(
    overrides: Partial<SuggestedMultiSupportCandidatesController> = {},
): SuggestedMultiSupportCandidatesController {
    return {
        rankingConfig,
        selection: {
            requestedCount: 5,
            actualCount: 2,
            validPoolSize: 2,
            suggestions: [suggestion(1, 11), suggestion(2, 18)],
            requestedDiversityThreshold: 0.15,
            usedDiversityThreshold: 0.15,
            rankingConfig,
            excludedBecauseDiagnosticsUnavailable: 0,
            warnings: [],
        },
        errors: [],
        previewIsCurrentSuggestion: false,
        setRankingConfig: jest.fn(),
        selectSuggestion: jest.fn(),
        selectPrevious: jest.fn(),
        selectNext: jest.fn(),
        clearSelection: jest.fn(),
        ...overrides,
    };
}

describe('SuggestedMultiSupportCandidates', () => {
    afterEach(cleanup);

    it('shows five as the default request and keeps Suggested Results expanded', () => {
        render(
            createElement(SuggestedMultiSupportCandidates, {
                status: 'COMPLETED',
                controller: controller(),
                onApplyCandidate: jest.fn(),
            }),
        );

        expect(screen.getByText('Suggested Results')).toBeTruthy();
        expect(
            screen.getByRole('listitem', { name: 'Preview suggested candidate #1' }),
        ).toBeTruthy();
        expect(screen.getByText(/Requested: 5/)).toBeTruthy();
        expect(screen.getByText(/relative to the current VALID candidate pool/)).toBeTruthy();
    });

    it('uses a full-width candidate label row above the two-button navigation row', () => {
        const view = render(
            createElement(SuggestedMultiSupportCandidates, {
                status: 'COMPLETED',
                controller: controller({
                    selectedCandidateId: 18,
                    selectedSuggestion: suggestion(2, 18),
                    previewIsCurrentSuggestion: true,
                }),
                onApplyCandidate: jest.fn(),
            }),
        );
        const navigation = view.container.querySelector('.foot-drafting-suggested-navigation');
        const label = view.container.querySelector('.foot-drafting-suggested-navigation-label');
        const actions = view.container.querySelector('.foot-drafting-suggested-navigation-actions');

        expect(navigation).toBeTruthy();
        expect(navigation?.classList.contains('foot-drafting-nearby-navigation')).toBe(false);
        expect(label?.parentElement).toBe(navigation);
        expect(label?.textContent).toBe('Suggested Candidate #2');
        expect(actions?.parentElement).toBe(navigation);
        expect(actions?.children).toHaveLength(2);
        expect(actions?.querySelector('button:first-child')?.textContent).toContain(
            'Previous Suggested',
        );
        expect(actions?.querySelector('button:last-child')?.textContent).toContain(
            'Next Suggested',
        );
    });

    it('previews on row click and applies only after the explicit apply action', () => {
        const onApply = jest.fn();
        const suggestedController = controller({
            selectedCandidateId: 11,
            selectedSuggestion: suggestion(1, 11),
            selectedSourceCandidate: {
                id: 11,
                alpha: 0.52,
                thetaDeg: 9,
                lambdaCm: 2.1,
                distanceFromSeed: 0,
                referenceLengthCm: 35,
                outerLengthCm: 36.5,
                extraLengthCm: 1.5,
                diagnostics: {
                    lEndpointTangentMismatchDeg: 5,
                    gPrimeEndpointTangentMismatchDeg: 6,
                    maxToeTurningDeg: 3,
                    meanToeTurningDeg: 2,
                    toeTurningVariationDeg: 1.5,
                    supportChordTurningAnglesDeg: {
                        W3Prime: 1,
                        WPrime: 1,
                        W2Prime: 1,
                    },
                },
            },
            previewIsCurrentSuggestion: true,
        });
        render(
            createElement(SuggestedMultiSupportCandidates, {
                status: 'COMPLETED',
                controller: suggestedController,
                onApplyCandidate: onApply,
            }),
        );

        fireEvent.click(screen.getByRole('listitem', { name: 'Preview suggested candidate #2' }));
        expect(suggestedController.selectSuggestion).toHaveBeenCalledWith(18);
        expect(onApply).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Apply Suggested Candidate' }));
        expect(onApply).toHaveBeenCalledTimes(1);
    });

    it('uses independent Previous/Next Suggested navigation', () => {
        const suggestedController = controller({
            selectedCandidateId: 11,
            selectedSuggestion: suggestion(1, 11),
            previewIsCurrentSuggestion: true,
        });
        render(
            createElement(SuggestedMultiSupportCandidates, {
                status: 'COMPLETED',
                controller: suggestedController,
                onApplyCandidate: jest.fn(),
            }),
        );

        fireEvent.click(screen.getByRole('button', { name: 'Next Suggested' }));
        expect(suggestedController.selectNext).toHaveBeenCalledTimes(1);
        expect(
            (screen.getByRole('button', { name: 'Previous Suggested' }) as HTMLButtonElement)
                .disabled,
        ).toBe(true);
    });

    it('labels running, completed, and cancelled pools without auto-selecting a new preview', () => {
        const suggestedController = controller();
        const view = render(
            createElement(SuggestedMultiSupportCandidates, {
                status: 'RUNNING',
                controller: suggestedController,
                onApplyCandidate: jest.fn(),
            }),
        );
        expect(screen.getByText('Suggested So Far')).toBeTruthy();
        expect(
            screen.getByText(/Suggestions update as new VALID candidates are found/),
        ).toBeTruthy();

        view.rerender(
            createElement(SuggestedMultiSupportCandidates, {
                status: 'COMPLETED',
                controller: {
                    ...suggestedController,
                    selection: {
                        ...suggestedController.selection!,
                        actualCount: 3,
                        validPoolSize: 3,
                        suggestions: [
                            ...suggestedController.selection!.suggestions,
                            suggestion(3, 24),
                        ],
                    },
                },
                onApplyCandidate: jest.fn(),
            }),
        );
        expect(screen.getByText('Suggested Results')).toBeTruthy();
        expect(
            screen.queryByText(/Suggestions update as new VALID candidates are found/),
        ).toBeNull();
        expect(suggestedController.selectSuggestion).not.toHaveBeenCalled();

        view.rerender(
            createElement(SuggestedMultiSupportCandidates, {
                status: 'CANCELLED',
                controller: suggestedController,
                onApplyCandidate: jest.fn(),
            }),
        );
        expect(screen.getByText('Suggested From Partial Results')).toBeTruthy();
        expect(screen.getByText('Suggestions are based on partial results.')).toBeTruthy();
    });
});
