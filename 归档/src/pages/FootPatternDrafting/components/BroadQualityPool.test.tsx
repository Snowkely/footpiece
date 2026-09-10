import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import type { BroadMultiSupportSearchCandidateSummary } from '../geometry/broadMultiSupportSearch';
import type { TargetMultiSupportOuterCurveCandidate } from '../types';
import BroadQualityPool from './BroadQualityPool';

function candidate(id: number): BroadMultiSupportSearchCandidateSummary {
    return {
        id,
        alpha: 0.5,
        thetaDeg: 10,
        lambdaCm: 1,
        referenceLengthCm: 35,
        outerLengthCm: 36.5,
        extraLengthCm: 1.5,
        diagnostics: {
            lEndpointTangentMismatchDeg: id,
            gPrimeEndpointTangentMismatchDeg: id,
            wPrimeTangentAngleToFootAxisDeg: 90,
            maxToeTurningDeg: id,
            meanToeTurningDeg: id,
            toeTurningVariationDeg: id,
            supportChordTurningAnglesDeg: { W3Prime: 1, WPrime: 1, W2Prime: 1 },
        },
    };
}

const representativeProps = {
    rebuildCandidate: jest.fn((candidateId: number) => ({
        geometry: {
            polylinePoints: [
                { id: 'L', x: 0, y: 0 },
                { id: 'middle', x: 1, y: candidateId / 100 },
                { id: 'GPrime', x: 2, y: 0 },
            ],
        } as TargetMultiSupportOuterCurveCandidate,
        errors: [],
    })),
    onPreviewCandidate: jest.fn(),
    onApplyCandidate: jest.fn(),
};

describe('BroadQualityPool', () => {
    afterEach(cleanup);

    it('shows the default 25% pool summary and keeps its lightweight list collapsed', () => {
        render(
            createElement(BroadQualityPool, {
                validCandidates: Array.from({ length: 40 }, (_, index) => candidate(index + 1)),
                status: 'COMPLETED',
                ...representativeProps,
            }),
        );

        expect(screen.getByText('Quality Pool')).toBeTruthy();
        expect(screen.getByText('Broad VALID: 40')).toBeTruthy();
        expect(screen.getAllByText('Quality Pool: 20')).toHaveLength(2);
        expect(screen.getByText('Quality fraction: 25%')).toBeTruthy();
        expect(
            screen
                .getByRole('button', { name: /Quality Pool \(20\)/ })
                .getAttribute('aria-expanded'),
        ).toBe('false');
    });

    it('labels streaming and cancelled partial Broad pools without changing a preview', () => {
        const { rerender } = render(
            createElement(BroadQualityPool, {
                validCandidates: [candidate(1)],
                status: 'RUNNING',
                ...representativeProps,
            }),
        );

        expect(screen.getByText('Quality Pool So Far')).toBeTruthy();
        expect(screen.getByText(/current streaming Broad VALID pool/)).toBeTruthy();

        rerender(
            createElement(BroadQualityPool, {
                validCandidates: [candidate(1)],
                status: 'CANCELLED',
                ...representativeProps,
            }),
        );
        expect(screen.getByText('Quality Pool From Partial Broad Results')).toBeTruthy();
        expect(screen.getByText(/Broad search was cancelled/)).toBeTruthy();
    });

    it('keeps Advanced Quality Pool Settings collapsed and reports unavailable diagnostics', () => {
        const unavailable = candidate(1);
        unavailable.diagnostics.lEndpointTangentMismatchDeg = undefined;
        unavailable.diagnostics.gPrimeEndpointTangentMismatchDeg = undefined;
        unavailable.diagnostics.maxToeTurningDeg = undefined;
        unavailable.diagnostics.toeTurningVariationDeg = undefined;

        render(
            createElement(BroadQualityPool, {
                validCandidates: [unavailable],
                status: 'COMPLETED',
                ...representativeProps,
            }),
        );

        expect(
            screen
                .getByRole('button', { name: /Advanced Quality Pool Settings/ })
                .getAttribute('aria-expanded'),
        ).toBe('false');
        expect(screen.getByText('Diagnostics unavailable: 1')).toBeTruthy();
        expect(screen.getByText('QUALITY_POOL_DIAGNOSTICS_UNAVAILABLE')).toBeTruthy();
    });
});
