const RATIO_DISPLAY_EPSILON = 1e-12;

export function formatUpQtRatio(distribution: number): string {
    if (!Number.isFinite(distribution) || distribution < 0 || distribution > 1) {
        return '—';
    }

    const upShare = distribution;
    const qtShare = 1 - distribution;
    if (upShare <= RATIO_DISPLAY_EPSILON) {
        return '0.00 : 1.00';
    }
    if (qtShare <= RATIO_DISPLAY_EPSILON) {
        return '1.00 : 0.00';
    }

    return upShare >= qtShare
        ? `${(upShare / qtShare).toFixed(2)} : 1.00`
        : `1.00 : ${(qtShare / upShare).toFixed(2)}`;
}
