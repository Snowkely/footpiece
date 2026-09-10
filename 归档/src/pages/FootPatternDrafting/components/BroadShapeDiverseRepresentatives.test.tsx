import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import type {
    MultiSupportQualityPoolResult,
    QualityPoolCandidateSummary,
} from '../geometry/multiSupportQualityPool';
import type { TargetMultiSupportOuterCurveCandidate } from '../types';
import BroadShapeDiverseRepresentatives from './BroadShapeDiverseRepresentatives';

function candidate(id: number, softScore = id / 10): QualityPoolCandidateSummary {
    return {
        sourceCandidateId: id,
        alpha: id / 10,
        thetaDeg: 10 + id,
        lambdaCm: 1 + id / 10,
        softScore,
        diagnostics: {
            lEndpointMismatchDeg: id,
            gPrimeEndpointMismatchDeg: id,
            maxToeTurningDeg: id,
            toeTurningVariationDeg: id,
        },
        referenceLengthCm: 35,
        outerLengthCm: 36.5,
        extraLengthCm: 1.5,
    };
}

function qualityPool(size: number): MultiSupportQualityPoolResult {
    const candidates = Array.from({ length: size }, (_, index) => candidate(index + 1));
    return {
        validPoolSize: size,
        requestedFraction: 0.25,
        minPoolSize: 20,
        targetPoolSize: size,
        actualPoolSize: size,
        candidates,
        excludedDiagnosticsUnavailable: 0,
        scoreMin: candidates[0]?.softScore,
        scoreMax: candidates.at(-1)?.softScore,
        warnings: [],
    };
}

function rebuildCandidate(candidateId: number) {
    return {
        geometry: {
            polylinePoints: [
                { id: 'L', x: 0, y: 0 },
                { id: 'middle', x: 1, y: candidateId / 5 },
                { id: 'GPrime', x: 2, y: 0 },
            ],
        } as TargetMultiSupportOuterCurveCandidate,
        errors: [],
    };
}

describe('BroadShapeDiverseRepresentatives', () => {
    afterEach(cleanup);

    it('shows five representatives by default and previews without applying manual controls', () => {
        const onPreviewCandidate = jest.fn();
        const onApplyCandidate = jest.fn();
        render(
            createElement(BroadShapeDiverseRepresentatives, {
                qualityPool: qualityPool(6),
                status: 'COMPLETED',
                rebuildCandidate,
                onPreviewCandidate,
                onApplyCandidate,
            }),
        );

        expect(screen.getByText('Representative Results: 5')).toBeTruthy();
        expect(screen.getAllByRole('listitem')).toHaveLength(5);
        fireEvent.click(screen.getByRole('listitem', { name: 'Preview Representative #2' }));
        expect(onPreviewCandidate).toHaveBeenCalledTimes(1);
        expect(onApplyCandidate).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Apply to Manual' }));
        expect(onApplyCandidate).toHaveBeenCalledWith(
            expect.objectContaining({ alpha: expect.any(Number), thetaDeg: expect.any(Number) }),
        );
    });

    it('returns only the available Quality Pool and navigates representatives', () => {
        const onPreviewCandidate = jest.fn();
        render(
            createElement(BroadShapeDiverseRepresentatives, {
                qualityPool: qualityPool(3),
                status: 'COMPLETED',
                rebuildCandidate,
                onPreviewCandidate,
                onApplyCandidate: jest.fn(),
            }),
        );

        expect(screen.getByText('Representative Results: 3')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Next Representative' }));
        expect(onPreviewCandidate).toHaveBeenCalledTimes(1);
        fireEvent.click(screen.getByRole('button', { name: 'Previous Representative' }));
        expect(onPreviewCandidate).toHaveBeenCalledTimes(2);
    });

    it('waits for completed Broad Search and does not rebuild streaming or cancelled pools', () => {
        const rebuild = jest.fn(rebuildCandidate);
        const { rerender } = render(
            createElement(BroadShapeDiverseRepresentatives, {
                qualityPool: qualityPool(5),
                status: 'RUNNING',
                rebuildCandidate: rebuild,
                onPreviewCandidate: jest.fn(),
                onApplyCandidate: jest.fn(),
            }),
        );

        expect(screen.getByText(/available after Broad Search completes/)).toBeTruthy();
        expect(rebuild).not.toHaveBeenCalled();
        rerender(
            createElement(BroadShapeDiverseRepresentatives, {
                qualityPool: qualityPool(5),
                status: 'CANCELLED',
                rebuildCandidate: rebuild,
                onPreviewCandidate: jest.fn(),
                onApplyCandidate: jest.fn(),
            }),
        );
        expect(rebuild).not.toHaveBeenCalled();
    });
});
