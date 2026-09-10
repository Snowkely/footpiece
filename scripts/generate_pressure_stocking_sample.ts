import { createHash } from 'crypto';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import footPieceSampleJson from '../src/pages/FootPatternDrafting/data/footPieceSample.json';
import { serializeFinalPatternDxf } from '../src/pages/FootPatternDrafting/export/dxfSerializer';
import {
    buildBackPiece,
    completeBackPieceWithFrontY,
} from '../src/pages/FootPatternDrafting/geometry/backPiece';
import { buildFinalPatternExportGeometry } from '../src/pages/FootPatternDrafting/geometry/finalPatternExport';
import { alignFootPieceToFrontPiece } from '../src/pages/FootPatternDrafting/geometry/footPiece';
import { buildFrontPiece } from '../src/pages/FootPatternDrafting/geometry/frontPiece';
import { deriveTargetAnkleIntersections } from '../src/pages/FootPatternDrafting/geometry/targetAnkle';
import { evaluateTargetMultiSupportOuterCurveCandidate } from '../src/pages/FootPatternDrafting/geometry/targetMultiSupportOuterCurve';
import { deriveTargetReferenceArc } from '../src/pages/FootPatternDrafting/geometry/targetReferenceArc';
import {
    DEFAULT_UT_DISTRIBUTION,
    deriveTargetUtConstruction,
} from '../src/pages/FootPatternDrafting/geometry/targetUt';
import { deriveTargetWPrime } from '../src/pages/FootPatternDrafting/geometry/targetWPrime';
import { deriveToeRadialOuterSupports } from '../src/pages/FootPatternDrafting/geometry/toeRadialOuterSupports';
import { deriveToeRadialReferences } from '../src/pages/FootPatternDrafting/geometry/toeRadialReferences';
import type { DraftingParameters, FootPieceSample } from '../src/pages/FootPatternDrafting/types';

const parameters: DraftingParameters = {
    a: 14.6,
    b: 18,
    c: 18.8,
    d: 16,
    e: 11.2,
    f: 11.2,
    g: 5,
    r: 16.8,
};
const appliedManualParameters = {
    alpha: DEFAULT_UT_DISTRIBUTION,
    thetaDeg: 9,
    lambdaCm: 2.6,
};
const sample = footPieceSampleJson as FootPieceSample;

function requireGeometry<T>(
    label: string,
    result: { geometry?: T; errors: Array<{ code: string; message: string }> },
): T {
    if (!result.geometry) {
        throw new Error(`${label}: ${result.errors.map((error) => error.code).join(', ')}`);
    }
    return result.geometry;
}

const baseBackPiece = requireGeometry('Back Piece', buildBackPiece(parameters));
const frontPiece = requireGeometry(
    'Front Piece',
    buildFrontPiece(parameters, 'adult', baseBackPiece.x, baseBackPiece.z),
);
const completedBackPiece = requireGeometry(
    'Completed Back Piece',
    completeBackPieceWithFrontY(baseBackPiece, frontPiece.y),
);
const footPiece = requireGeometry(
    'Foot Piece alignment',
    alignFootPieceToFrontPiece(sample, frontPiece, parameters.r!),
);
const targetAnkle = requireGeometry(
    'Target ankle intersections',
    deriveTargetAnkleIntersections(footPiece, frontPiece),
);
const targetReferenceArc = requireGeometry(
    'Target reference arc',
    deriveTargetReferenceArc(footPiece, targetAnkle, sample),
);
const targetUt = requireGeometry(
    'Target U/T',
    deriveTargetUtConstruction(
        footPiece.alignedLandmarks.P,
        footPiece.alignedLandmarks.Q,
        parameters.a,
        appliedManualParameters.alpha,
    ),
);
const automatic = footPiece.automaticPositioning;
if (!automatic) throw new Error('Automatic Foot Piece positioning is required.');
const targetWPrime = requireGeometry(
    "Target W'",
    deriveTargetWPrime(
        automatic.alignedSourceSecondToe,
        frontPiece.points.MPrime,
        frontPiece.points.O,
        appliedManualParameters.lambdaCm,
    ),
);
const toeReferences = requireGeometry(
    'Toe radial references',
    deriveToeRadialReferences({
        Ms: automatic.alignedSourceMs,
        W: automatic.alignedSourceSecondToe,
        targetReferenceArc,
        thetaDeg: appliedManualParameters.thetaDeg,
    }),
);
const toeOuterSupports = requireGeometry(
    'Toe radial outer supports',
    deriveToeRadialOuterSupports({
        Ms: automatic.alignedSourceMs,
        toeRadialReferences: toeReferences,
        existingWPrime: targetWPrime.WPrime,
        outwardOffsetCm: appliedManualParameters.lambdaCm,
    }),
);
const manualCandidate = requireGeometry(
    'Manual multi-support candidate',
    evaluateTargetMultiSupportOuterCurveCandidate({
        frontPiece,
        targetReferenceArc,
        targetUt,
        toeRadialOuterSupports: toeOuterSupports,
    }),
);
if (!manualCandidate.valid) {
    throw new Error(
        `The sample parameters must produce a VALID candidate: ${manualCandidate.rejectionReasons.join(
            ', ',
        )}`,
    );
}

const exportGeometry = requireGeometry(
    'Final pattern export geometry',
    buildFinalPatternExportGeometry({
        frontPiece,
        completedBackPiece,
        manualCandidate,
    }),
);
const serialized = requireGeometry('DXF serialization', serializeFinalPatternDxf(exportGeometry));
const outputDirectory = resolve('src/pages/FootPatternDrafting/data');
const dxfPath = resolve(outputDirectory, 'pressure_stocking_pattern_sample.dxf');
const manifestPath = resolve(outputDirectory, 'pressure_stocking_pattern_sample.manifest.json');
writeFileSync(dxfPath, serialized.dxfText, 'utf8');
writeFileSync(manifestPath, `${JSON.stringify(serialized.manifest, null, 2)}\n`, 'utf8');

const sha256 = createHash('sha256').update(serialized.dxfText).digest('hex');
process.stdout.write(
    `${JSON.stringify(
        {
            dxfPath,
            manifestPath,
            sha256,
            frontVertexCount: exportGeometry.front.masterPointsMm.length,
            backVertexCount: exportGeometry.back.masterPointsMm.length,
            multiSupportPointCount: manualCandidate.polylinePoints.length,
            multiSupportLengthCm: manualCandidate.outerCurveLengthCm,
            frontMasterOffsetMm: exportGeometry.front.masterOffsetMm,
            backMasterOffsetMm: exportGeometry.back.masterOffsetMm,
            masterBoundsMm: exportGeometry.masterBoundsMm,
        },
        null,
        2,
    )}\n`,
);
