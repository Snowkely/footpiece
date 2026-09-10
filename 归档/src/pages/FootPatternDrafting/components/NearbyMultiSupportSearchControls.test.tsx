import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import type {
    NearbyMultiSupportSearchCandidateSummary,
    NearbyMultiSupportSearchResult,
    NearbyMultiSupportSearchSeed,
} from '../geometry/targetMultiSupportOuterCurveSearch';
import type { NearbyMultiSupportSearchController } from '../hooks/useNearbyMultiSupportSearch';
import type { SuggestedMultiSupportCandidatesController } from '../hooks/useSuggestedMultiSupportCandidates';
import NearbyMultiSupportSearchControls from './NearbyMultiSupportSearchControls';

const seed: NearbyMultiSupportSearchSeed = {
    alpha: 0.5,
    thetaDeg: 8.5,
    lambdaCm: 2.2,
};

function candidate(id: number, alpha = 0.5): NearbyMultiSupportSearchCandidateSummary {
    return {
        id,
        alpha,
        thetaDeg: 8.5,
        lambdaCm: 2.2,
        distanceFromSeed: id - 1,
        referenceLengthCm: 35.7,
        outerLengthCm: 37,
        extraLengthCm: 1.3,
        diagnostics: {
            lEndpointTangentMismatchDeg: 4,
            gPrimeEndpointTangentMismatchDeg: 5,
            wPrimeTangentAngleToFootAxisDeg: 6,
            maxToeTurningDeg: 7,
            meanToeTurningDeg: 3,
            supportChordTurningAnglesDeg: {
                W3Prime: 2,
                WPrime: 1,
                W2Prime: 2,
            },
        },
    };
}

const firstCandidate = candidate(1);
const secondCandidate = candidate(2, 0.52);

function searchResult(): NearbyMultiSupportSearchResult {
    return {
        seed: { ...seed },
        config: {
            alphaRadius: 0.15,
            alphaStep: 0.02,
            thetaRadiusDeg: 3,
            thetaStepDeg: 0.5,
            lambdaRadiusCm: 1,
            lambdaStepCm: 0.1,
        },
        totalCandidateCount: 4_641,
        evaluatedCandidateCount: 20,
        validCandidateCount: 2,
        invalidCandidateCount: 18,
        validCandidates: [firstCandidate, secondCandidate],
        rejectionStats: {
            tooShort: 18,
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
            alpha: { builds: 2, hits: 18 },
            theta: { builds: 2, hits: 18 },
            lambda: { builds: 2, hits: 18 },
            thetaLambda: { builds: 4, hits: 16 },
        },
        invalidThetaSkippedCandidates: 0,
    };
}

function controller(
    overrides: Partial<NearbyMultiSupportSearchController> = {},
): NearbyMultiSupportSearchController {
    return {
        status: 'IDLE',
        elapsedMs: 0,
        errors: [],
        start: jest.fn(),
        cancel: jest.fn(),
        expand: jest.fn(),
        clear: jest.fn(),
        selectCandidate: jest.fn(),
        selectPrevious: jest.fn(),
        selectNext: jest.fn(),
        ...overrides,
    };
}

function suggestions(
    overrides: Partial<SuggestedMultiSupportCandidatesController> = {},
): SuggestedMultiSupportCandidatesController {
    return {
        rankingConfig: {
            resultCount: 5,
            weights: {
                lEndpointMismatch: 0.25,
                gPrimeEndpointMismatch: 0.25,
                maxToeTurning: 0.25,
                toeTurningVariation: 0.25,
            },
            diversityThreshold: 0.15,
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

describe('NearbyMultiSupportSearchControls', () => {
    afterEach(cleanup);

    it('shows Suggested Results first and keeps All Valid Results collapsed by default', () => {
        const searchController = controller({
            status: 'COMPLETED',
            result: searchResult(),
            selectedCandidateId: 1,
            selectedCandidate: firstCandidate,
        });
        render(
            createElement(NearbyMultiSupportSearchControls, {
                manualSeed: seed,
                inputsAvailable: true,
                controller: searchController,
                suggestedCandidates: suggestions(),
                onApplyCandidate: jest.fn(),
            }),
        );

        expect(screen.getByText('Suggested Results')).toBeTruthy();
        expect(screen.queryByRole('listitem', { name: 'Preview candidate #1' })).toBeNull();
        fireEvent.click(screen.getByText('All Valid Results'));
        expect(screen.getByRole('listitem', { name: 'Preview candidate #1' })).toBeTruthy();
    });

    it('starts explicitly from the current manual tuple and shows a frozen seed', () => {
        const searchController = controller({ seed: { ...seed } });
        const view = render(
            createElement(NearbyMultiSupportSearchControls, {
                manualSeed: seed,
                inputsAvailable: true,
                controller: searchController,
                suggestedCandidates: suggestions(),
                onApplyCandidate: jest.fn(),
            }),
        );

        fireEvent.click(screen.getByRole('button', { name: 'Start Nearby Search' }));
        expect(searchController.start).toHaveBeenCalledWith(seed, {
            alphaRadius: 0.15,
            alphaStep: 0.02,
            thetaRadiusDeg: 3,
            thetaStepDeg: 0.5,
            lambdaRadiusCm: 1,
            lambdaStepCm: 0.1,
        });

        view.rerender(
            createElement(NearbyMultiSupportSearchControls, {
                manualSeed: { alpha: 0.7, thetaDeg: 12, lambdaCm: 3 },
                inputsAvailable: true,
                controller: searchController,
                suggestedCandidates: suggestions(),
                onApplyCandidate: jest.fn(),
            }),
        );
        expect(screen.getByTestId('frozen-search-seed').textContent).toContain('α 0.500');
        expect(screen.getByTestId('frozen-search-seed').textContent).toContain('θ 8.5°');
        expect(screen.getByTestId('frozen-search-seed').textContent).toContain('λ 2.20 cm');
    });

    it('previews a history row without applying, and applies only by explicit button', () => {
        const onApply = jest.fn();
        const searchController = controller({
            status: 'RUNNING',
            seed: { ...seed },
            result: searchResult(),
            selectedCandidateId: 1,
            selectedCandidate: firstCandidate,
        });
        render(
            createElement(NearbyMultiSupportSearchControls, {
                manualSeed: seed,
                inputsAvailable: true,
                controller: searchController,
                suggestedCandidates: suggestions(),
                onApplyCandidate: onApply,
            }),
        );

        fireEvent.click(screen.getByText('All Valid Results'));
        fireEvent.click(screen.getByRole('listitem', { name: 'Preview candidate #2' }));
        expect(searchController.selectCandidate).toHaveBeenCalledWith(2);
        expect(onApply).not.toHaveBeenCalled();

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Apply Selected Valid Candidate to Manual Controls',
            }),
        );
        expect(onApply).toHaveBeenCalledWith(firstCandidate);
    });

    it('uses explicit previous/next navigation and exposes cancellation', () => {
        const searchController = controller({
            status: 'RUNNING',
            seed: { ...seed },
            result: searchResult(),
            selectedCandidateId: 1,
            selectedCandidate: firstCandidate,
        });
        render(
            createElement(NearbyMultiSupportSearchControls, {
                manualSeed: seed,
                inputsAvailable: true,
                controller: searchController,
                suggestedCandidates: suggestions(),
                onApplyCandidate: jest.fn(),
            }),
        );

        fireEvent.click(screen.getByText('All Valid Results'));
        fireEvent.click(screen.getByRole('button', { name: 'Next' }));
        fireEvent.click(screen.getByRole('button', { name: 'Stop Nearby Search' }));
        expect(searchController.selectNext).toHaveBeenCalledTimes(1);
        expect(searchController.cancel).toHaveBeenCalledTimes(1);
        expect(
            (screen.getByRole('button', { name: 'Previous' }) as HTMLButtonElement).disabled,
        ).toBe(true);
    });

    it('reports automatic expansion resolution changes and exposes the effective steps', async () => {
        const requestedConfig = {
            alphaRadius: 0.35,
            alphaStep: 0.02,
            thetaRadiusDeg: 7,
            thetaStepDeg: 0.5,
            lambdaRadiusCm: 3,
            lambdaStepCm: 0.1,
        };
        const effectiveConfig = {
            ...requestedConfig,
            alphaStep: 0.04,
            thetaStepDeg: 1,
            lambdaStepCm: 0.2,
        };
        const expand = jest.fn(() => ({
            requestedConfig,
            config: effectiveConfig,
            requestedEstimatedCount: 43_993,
            estimatedCount: 6_825,
            adjusted: true,
            stepMultiplier: 2,
            adjustmentRounds: 3,
        }));
        const searchController = controller({
            status: 'COMPLETED',
            seed: { ...seed },
            result: searchResult(),
            expand,
        });
        render(
            createElement(NearbyMultiSupportSearchControls, {
                manualSeed: seed,
                inputsAvailable: true,
                controller: searchController,
                suggestedCandidates: suggestions(),
                onApplyCandidate: jest.fn(),
            }),
        );

        fireEvent.click(screen.getByRole('button', { name: 'Expand Search Area' }));

        expect(expand).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('nearby-search-expansion-feedback').textContent).toContain(
            'resolution adjusted automatically',
        );
        expect(screen.getByTestId('nearby-search-expansion-feedback').textContent).toContain(
            '6,825',
        );

        fireEvent.click(screen.getByText('Advanced Nearby Search Config'));
        await waitFor(() => expect(screen.getAllByRole('spinbutton')).toHaveLength(6));
        const actualValues = screen
            .getAllByRole('spinbutton')
            .map((input) => Number((input as HTMLInputElement).value));
        expect(actualValues).toContain(0.04);
        expect(actualValues).toContain(1);
        expect(actualValues).toContain(0.2);
    });
});
