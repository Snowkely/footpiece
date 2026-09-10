import { formatUpQtRatio } from './targetUtDisplay';

describe('formatUpQtRatio', () => {
    it('shows an equal ratio for alpha 0.5', () => {
        expect(formatUpQtRatio(0.5)).toBe('1.00 : 1.00');
    });

    it('shows approximately 2:1 for alpha 0.667', () => {
        expect(formatUpQtRatio(0.667)).toBe('2.00 : 1.00');
    });

    it('shows the two endpoint allocations without dividing by zero', () => {
        expect(formatUpQtRatio(0)).toBe('0.00 : 1.00');
        expect(formatUpQtRatio(1)).toBe('1.00 : 0.00');
    });
});
