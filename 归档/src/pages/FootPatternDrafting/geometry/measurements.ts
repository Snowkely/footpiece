import type {
    AgeGroup,
    DraftingParameterInput,
    DraftingParameterInputKey,
    DraftingParameters,
    NumericFootMeasurementKey,
    RawFootMeasurementInput,
    RawFootMeasurements,
} from '../types';

export const COMPRESSION_FACTOR = 0.9;

export const AGE_ADJUSTMENTS_CM: Record<AgeGroup, number> = {
    adult: 1,
    child: 0.5,
    baby: 0,
};

export const NUMERIC_FOOT_MEASUREMENT_KEYS: NumericFootMeasurementKey[] = [
    'metatarsalCircumference',
    'ankleFrontCircumference',
    'calf5cmCircumference',
    'narrowestCircumference',
    'frontMalleolusCircumference',
    'backMalleolusCircumference',
    'narrowestToMalleolus',
];

export const DRAFTING_PARAMETER_INPUT_KEYS: DraftingParameterInputKey[] = [
    'a',
    'b',
    'c',
    'd',
    'e',
    'f',
    'g',
];

export function toRawFootMeasurements(
    input: RawFootMeasurementInput,
    ageGroup: AgeGroup,
): RawFootMeasurements | undefined {
    const hasAllMeasurements = NUMERIC_FOOT_MEASUREMENT_KEYS.every((key) => {
        const value = input[key];
        return typeof value === 'number' && Number.isFinite(value) && value >= 0;
    });

    if (!hasAllMeasurements) {
        return undefined;
    }

    return { ...input, ageGroup } as RawFootMeasurements;
}

export function deriveDraftingParameters(measurements: RawFootMeasurements): DraftingParameters {
    return {
        a: measurements.metatarsalCircumference * COMPRESSION_FACTOR,
        b: measurements.ankleFrontCircumference * COMPRESSION_FACTOR,
        c: measurements.calf5cmCircumference * COMPRESSION_FACTOR,
        d: measurements.narrowestCircumference * COMPRESSION_FACTOR,
        e: measurements.frontMalleolusCircumference * COMPRESSION_FACTOR,
        f: measurements.backMalleolusCircumference * COMPRESSION_FACTOR,
        g: measurements.narrowestToMalleolus,
    };
}

export function toDraftingParameters(
    input: DraftingParameterInput,
): Omit<DraftingParameters, 'r'> | undefined {
    const hasAllParameters = DRAFTING_PARAMETER_INPUT_KEYS.every((key) => {
        const value = input[key];
        return typeof value === 'number' && Number.isFinite(value) && value >= 0;
    });

    if (!hasAllParameters) {
        return undefined;
    }

    return input as Omit<DraftingParameters, 'r'>;
}
