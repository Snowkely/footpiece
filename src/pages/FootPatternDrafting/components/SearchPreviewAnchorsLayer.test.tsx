/* eslint-disable @typescript-eslint/no-explicit-any */
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import SearchPreviewAnchorsLayer, {
    SEARCH_PREVIEW_ANCHOR_COLOR,
} from './SearchPreviewAnchorsLayer';

jest.mock('@react-three/drei', () => {
    const ReactModule = jest.requireActual('react');

    return {
        Html: ({ children }: any) =>
            ReactModule.createElement(ReactModule.Fragment, null, children),
        Sphere: ({ children, name, position }: any) => {
            const materialColor = ReactModule.isValidElement(children)
                ? children.props.color
                : undefined;
            return ReactModule.createElement('div', {
                'data-testid': 'preview-anchor-marker',
                'data-anchor-name': name,
                'data-color': materialColor,
                'data-position': JSON.stringify(position),
            });
        },
    };
});

const ANCHOR_IDS = [
    'L',
    'U',
    'W4Prime',
    'W3Prime',
    'WPrime',
    'W2Prime',
    'W1Prime',
    'T',
    'GPrime',
] as const;

function candidate(seed: number): any {
    const anchors = Object.fromEntries(
        ANCHOR_IDS.map((id, index) => [
            id,
            { id: `${seed}-${id}`, x: seed + index, y: seed - index },
        ]),
    );

    return {
        alpha: seed / 10,
        thetaDeg: seed,
        outwardOffsetCm: seed / 2,
        anchors,
        anchorOrder: [...ANCHOR_IDS],
    };
}

describe('SearchPreviewAnchorsLayer', () => {
    afterEach(cleanup);

    it('renders the seven parameter-dependent candidate anchors with unchanged labels and cyan styling', () => {
        const previewCandidate = candidate(10);
        const snapshot = JSON.stringify(previewCandidate);

        render(createElement(SearchPreviewAnchorsLayer, { candidate: previewCandidate }));

        expect(screen.getAllByTestId('preview-anchor-marker')).toHaveLength(7);
        ['U', 'T', "W1'", "W2'", "W'", "W3'", "W4'"].forEach((label) => {
            const element = screen.getByText(label);
            expect(element.classList.contains('foot-drafting-search-preview-anchor-label')).toBe(
                true,
            );
            expect(element.textContent).not.toMatch(/Search|Suggested/);
        });
        screen.getAllByTestId('preview-anchor-marker').forEach((marker) => {
            expect(marker.getAttribute('data-color')).toBe(SEARCH_PREVIEW_ANCHOR_COLOR);
        });
        expect(JSON.stringify(previewCandidate)).toBe(snapshot);
    });

    it('reads coordinates directly from the active candidate and updates when that candidate changes', () => {
        const first = candidate(10);
        const second = candidate(20);
        const view = render(createElement(SearchPreviewAnchorsLayer, { candidate: first }));
        const markerFor = (pointId: string) =>
            view.container.querySelector(`[data-anchor-name="search-preview-anchor-${pointId}"]`);

        expect(markerFor(first.anchors.U.id)?.getAttribute('data-position')).toBe(
            JSON.stringify([first.anchors.U.x, first.anchors.U.y, 1.12]),
        );

        view.rerender(createElement(SearchPreviewAnchorsLayer, { candidate: second }));

        expect(markerFor(first.anchors.U.id)).toBeNull();
        expect(markerFor(second.anchors.U.id)?.getAttribute('data-position')).toBe(
            JSON.stringify([second.anchors.U.x, second.anchors.U.y, 1.12]),
        );
    });
});
