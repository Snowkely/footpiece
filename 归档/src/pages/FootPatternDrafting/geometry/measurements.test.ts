import type {
    DraftingParameterInput,
    DraftingParameterInputKey,
    RawFootMeasurements,
} from '../types';
import { COMPRESSION_FACTOR, deriveDraftingParameters, toDraftingParameters } from './measurements';

const validDraftingInput: DraftingParameterInput = {
    a: 21.6,
    b: 19.8,
    c: 22.5,
    d: 18.9,
    e: 21.6,
    f: 23.4,
    g: 7,
};

describe('deriveDraftingParameters', () => {
    it('applies 10% compression to a-f and leaves g uncompressed', () => {
        const rawMeasurements: RawFootMeasurements = {
            metatarsalCircumference: 24,
            ankleFrontCircumference: 22,
            calf5cmCircumference: 25,
            narrowestCircumference: 21,
            frontMalleolusCircumference: 24,
            backMalleolusCircumference: 26,
            narrowestToMalleolus: 7,
            ageGroup: 'adult',
        };

        const parameters = deriveDraftingParameters(rawMeasurements);

        expect(parameters.a).toBeCloseTo(21.6);
        expect(parameters).toEqual({
            a: 24 * COMPRESSION_FACTOR,
            b: 22 * COMPRESSION_FACTOR,
            c: 25 * COMPRESSION_FACTOR,
            d: 21 * COMPRESSION_FACTOR,
            e: 24 * COMPRESSION_FACTOR,
            f: 26 * COMPRESSION_FACTOR,
            g: 7,
        });
    });
});

describe('toDraftingParameters', () => {
    it('returns complete direct drafting input without applying compression again', () => {
        expect(toDraftingParameters(validDraftingInput)).toEqual({
            a: 21.6,
            b: 19.8,
            c: 22.5,
            d: 18.9,
            e: 21.6,
            f: 23.4,
            g: 7,
        });
    });

    it('returns undefined when any a-g value is missing', () => {
        const keys: DraftingParameterInputKey[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

        keys.forEach((key) => {
            const incompleteInput = { ...validDraftingInput };
            delete incompleteInput[key];

            expect(toDraftingParameters(incompleteInput)).toBeUndefined();
        });
    });

    it('returns undefined for negative, NaN, or Infinity values', () => {
        [-1, Number.NaN, Number.POSITIVE_INFINITY].forEach((invalidValue) => {
            expect(
                toDraftingParameters({ ...validDraftingInput, c: invalidValue }),
            ).toBeUndefined();
        });
    });
});
