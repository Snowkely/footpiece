/* eslint-disable react/no-unknown-property */
import { Html, Sphere } from '@react-three/drei';
import React from 'react';
import type {
    DraftPoint,
    TargetMultiSupportOuterCurveAnchorId,
    TargetMultiSupportOuterCurveCandidate,
} from '../types';

interface SearchPreviewAnchorsLayerProps {
    candidate: TargetMultiSupportOuterCurveCandidate;
}

interface PreviewAnchorDefinition {
    id: TargetMultiSupportOuterCurveAnchorId;
    label: string;
}

export const SEARCH_PREVIEW_ANCHOR_COLOR = '#06b6d4';

const SEARCH_PREVIEW_ANCHOR_RADIUS_CM = 0.14;
const SEARCH_PREVIEW_ANCHOR_Z_OFFSET = 1.12;
const SEARCH_PREVIEW_LABEL_OFFSET_CM = 0.24;

const PREVIEW_ANCHORS: PreviewAnchorDefinition[] = [
    { id: 'U', label: 'U' },
    { id: 'T', label: 'T' },
    { id: 'W1Prime', label: "W1'" },
    { id: 'W2Prime', label: "W2'" },
    { id: 'WPrime', label: "W'" },
    { id: 'W3Prime', label: "W3'" },
    { id: 'W4Prime', label: "W4'" },
];

const PreviewAnchor: React.FC<{ point: DraftPoint; label: string }> = ({ point, label }) => (
    <group>
        <Sphere
            name={`search-preview-anchor-${point.id}`}
            args={[SEARCH_PREVIEW_ANCHOR_RADIUS_CM, 18, 18]}
            position={[point.x, point.y, SEARCH_PREVIEW_ANCHOR_Z_OFFSET]}
        >
            <meshBasicMaterial color={SEARCH_PREVIEW_ANCHOR_COLOR} />
        </Sphere>
        <Html
            position={[
                point.x + SEARCH_PREVIEW_LABEL_OFFSET_CM,
                point.y + SEARCH_PREVIEW_LABEL_OFFSET_CM,
                SEARCH_PREVIEW_ANCHOR_Z_OFFSET + 0.03,
            ]}
            zIndexRange={[7, 0]}
        >
            <span className="foot-drafting-search-preview-anchor-label">{label}</span>
        </Html>
    </group>
);

/** Renders only the seven parameter-dependent anchors from the active preview candidate. */
const SearchPreviewAnchorsLayer: React.FC<SearchPreviewAnchorsLayerProps> = ({ candidate }) => (
    <group>
        {PREVIEW_ANCHORS.map(({ id, label }) => (
            <PreviewAnchor key={id} point={candidate.anchors[id]} label={label} />
        ))}
    </group>
);

export default SearchPreviewAnchorsLayer;
