const {
    calculateRoundUp,
    calculateCompoundInterest,
    calculateTimeWeightedGrowth,
    calculateSavingsProjections,
    processTransactionRoundUps,
    validateAmount,
} = require('../utils/roundup');

// Fixed date used across all time-dependent tests so results never drift
const FIXED_DATE = new Date('2026-06-04');

// ─────────────────────────────────────────────
// calculateRoundUp
// ─────────────────────────────────────────────
describe('calculateRoundUp', () => {

    describe('standard amounts', () => {
        test('rounds £4.32 up to £5.00 → spare change £0.68', () => {
            expect(calculateRoundUp(4.32)).toBe('0.68');
        });
        test('rounds £4.99 up to £5.00 → spare change £0.01', () => {
            expect(calculateRoundUp(4.99)).toBe('0.01');
        });
        test('rounds £15.67 up to £16.00 → spare change £0.33', () => {
            expect(calculateRoundUp(15.67)).toBe('0.33');
        });
        test('rounds £23.01 up to £24.00 → spare change £0.99', () => {
            expect(calculateRoundUp(23.01)).toBe('0.99');
        });
    });

    describe('whole dollar amounts (original behaviour: rounds to next pound)', () => {
        test('£5.00 → spare change £1.00', () => {
            expect(calculateRoundUp(5.00)).toBe('1.00');
        });
        test('£10.00 → spare change £1.00', () => {
            expect(calculateRoundUp(10.00)).toBe('1.00');
        });
        test('£100.00 → spare change £1.00', () => {
            expect(calculateRoundUp(100.00)).toBe('1.00');
        });
    });

    describe('edge cases', () => {
        test('£0.01 → maximum spare change £0.99', () => {
            expect(calculateRoundUp(0.01)).toBe('0.99');
        });
        test('£0.99 → minimum spare change £0.01', () => {
            expect(calculateRoundUp(0.99)).toBe('0.01');
        });
        test('£1.01 → spare change £0.99', () => {
            expect(calculateRoundUp(1.01)).toBe('0.99');
        });
        test('£999.99 → spare change £0.01', () => {
            expect(calculateRoundUp(999.99)).toBe('0.01');
        });
    });

    describe('input types', () => {
        test('accepts a string amount', () => {
            expect(calculateRoundUp('4.32')).toBe('0.68');
        });
        test('throws on invalid input', () => {
            expect(() => calculateRoundUp('abc')).toThrow();
        });
    });

});

// ─────────────────────────────────────────────
// validateAmount
// ─────────────────────────────────────────────
describe('validateAmount', () => {

    test('returns a 2dp string for a numeric input', () => {
        expect(validateAmount(4.5)).toBe('4.50');
    });
    test('accepts a string number', () => {
        expect(validateAmount('4.5')).toBe('4.50');
    });
    test('accepts zero', () => {
        expect(validateAmount(0)).toBe('0.00');
    });
    test('throws on negative amount', () => {
        expect(() => validateAmount(-1)).toThrow();
    });
    test('throws on non-numeric string', () => {
        expect(() => validateAmount('abc')).toThrow();
    });

});

// ─────────────────────────────────────────────
// calculateCompoundInterest
// ─────────────────────────────────────────────
describe('calculateCompoundInterest', () => {

    describe('three risk profiles on £100 principal over 1 year', () => {
        test('conservative (5%) → £105.12', () => {
            expect(calculateCompoundInterest(100, 0.05, 12, 1)).toBe('105.12');
        });
        test('balanced (8%) → £108.30', () => {
            expect(calculateCompoundInterest(100, 0.08, 12, 1)).toBe('108.30');
        });
        test('aggressive (12%) → £112.68', () => {
            expect(calculateCompoundInterest(100, 0.12, 12, 1)).toBe('112.68');
        });
    });

    describe('longer time horizons at 8%', () => {
        test('£100 at 8% over 5 years → £148.98', () => {
            expect(calculateCompoundInterest(100, 0.08, 12, 5)).toBe('148.98');
        });
        test('£100 at 8% over 10 years → £221.96', () => {
            expect(calculateCompoundInterest(100, 0.08, 12, 10)).toBe('221.96');
        });
    });

    describe('edge cases', () => {
        test('zero principal always returns £0.00', () => {
            expect(calculateCompoundInterest(0, 0.08, 12, 1)).toBe('0.00');
        });
    });

});

// ─────────────────────────────────────────────
// calculateTimeWeightedGrowth
// ─────────────────────────────────────────────
describe('calculateTimeWeightedGrowth', () => {

    test('empty roundups array returns all zeros', () => {
        const result = calculateTimeWeightedGrowth([], 0.08, FIXED_DATE);
        expect(result.totalPrincipal).toBe('0.00');
        expect(result.totalGrowth).toBe('0.00');
        expect(result.totalCurrentValue).toBe('0.00');
        expect(result.totalRoundups).toBe(0);
    });

    test('same-day roundup has zero growth', () => {
        const result = calculateTimeWeightedGrowth(
            [{ amount: '0.50', createdAt: '2026-06-04' }],
            0.08,
            FIXED_DATE
        );
        expect(result.totalGrowth).toBe('0.00');
        expect(result.totalCurrentValue).toBe('0.50');
    });

    test('£1.00 invested 365 days ago at 8% grows to £1.08', () => {
        const result = calculateTimeWeightedGrowth(
            [{ amount: '1.00', createdAt: '2025-06-04' }],
            0.08,
            FIXED_DATE
        );
        expect(result.totalPrincipal).toBe('1.00');
        expect(result.totalGrowth).toBe('0.08');
        expect(result.totalCurrentValue).toBe('1.08');
    });

    test('older roundup grows more than newer roundup', () => {
        const older = calculateTimeWeightedGrowth(
            [{ amount: '1.00', createdAt: '2025-06-04' }],
            0.08,
            FIXED_DATE
        );
        const newer = calculateTimeWeightedGrowth(
            [{ amount: '1.00', createdAt: '2026-01-01' }],
            0.08,
            FIXED_DATE
        );
        expect(parseFloat(older.totalGrowth)).toBeGreaterThan(parseFloat(newer.totalGrowth));
    });

    test('multiple roundups: principal and count are correct', () => {
        const result = calculateTimeWeightedGrowth([
            { amount: '0.50', createdAt: '2025-06-04' },
            { amount: '0.75', createdAt: '2025-12-04' },
        ], 0.08, FIXED_DATE);
        expect(result.totalPrincipal).toBe('1.25');
        expect(result.totalCurrentValue).toBe('1.32');
        expect(result.totalRoundups).toBe(2);
    });

    test('returns correct shape with all required fields', () => {
        const result = calculateTimeWeightedGrowth(
            [{ amount: '1.00', createdAt: '2025-06-04' }],
            0.08,
            FIXED_DATE
        );
        expect(result).toHaveProperty('totalPrincipal');
        expect(result).toHaveProperty('totalGrowth');
        expect(result).toHaveProperty('totalCurrentValue');
        expect(result).toHaveProperty('overallGrowthRate');
        expect(result).toHaveProperty('totalRoundups');
        expect(result).toHaveProperty('roundupDetails');
    });

});

// ─────────────────────────────────────────────
// calculateSavingsProjections
// ─────────────────────────────────────────────
describe('calculateSavingsProjections', () => {

    describe('zero starting balance, £10/month', () => {
        test('conservative (5%) projections are correct', () => {
            const result = calculateSavingsProjections(0, 10, 0.05);
            expect(result.year1).toBe('122.79');
            expect(result.year3).toBe('387.53');
            expect(result.year5).toBe('680.06');
            expect(result.year10).toBe('1552.82');
        });
        test('balanced (8%) projections are correct', () => {
            const result = calculateSavingsProjections(0, 10, 0.08);
            expect(result.year1).toBe('124.50');
            expect(result.year3).toBe('405.36');
            expect(result.year5).toBe('734.77');
            expect(result.year10).toBe('1829.46');
        });
        test('aggressive (12%) projections are correct', () => {
            const result = calculateSavingsProjections(0, 10, 0.12);
            expect(result.year1).toBe('126.83');
            expect(result.year3).toBe('430.77');
            expect(result.year5).toBe('816.70');
            expect(result.year10).toBe('2300.39');
        });
    });

    test('existing balance compounds alongside monthly contributions', () => {
        const result = calculateSavingsProjections(100, 10, 0.08);
        expect(result.year1).toBe('232.80');
        expect(result.year10).toBe('2051.42');
    });

    test('higher return rate always produces higher projected value', () => {
        const conservative = calculateSavingsProjections(0, 10, 0.05);
        const balanced     = calculateSavingsProjections(0, 10, 0.08);
        const aggressive   = calculateSavingsProjections(0, 10, 0.12);
        expect(parseFloat(aggressive.year10)).toBeGreaterThan(parseFloat(balanced.year10));
        expect(parseFloat(balanced.year10)).toBeGreaterThan(parseFloat(conservative.year10));
    });

    test('longer time horizon always produces higher projected value', () => {
        const result = calculateSavingsProjections(0, 10, 0.08);
        expect(parseFloat(result.year10)).toBeGreaterThan(parseFloat(result.year5));
        expect(parseFloat(result.year5)).toBeGreaterThan(parseFloat(result.year3));
        expect(parseFloat(result.year3)).toBeGreaterThan(parseFloat(result.year1));
    });

    test('returns all four time periods', () => {
        const result = calculateSavingsProjections(0, 10, 0.08);
        expect(result).toHaveProperty('year1');
        expect(result).toHaveProperty('year3');
        expect(result).toHaveProperty('year5');
        expect(result).toHaveProperty('year10');
    });

});

// ─────────────────────────────────────────────
// processTransactionRoundUps
// ─────────────────────────────────────────────
describe('processTransactionRoundUps', () => {

    test('returns correct processedCount', () => {
        const transactions = [
            { id: 1, amount: 4.32 },
            { id: 2, amount: 15.67 },
            { id: 3, amount: 8.00 },
        ];
        const result = processTransactionRoundUps(transactions);
        expect(result.processedCount).toBe(3);
    });

    test('calculates correct totalRoundUps', () => {
        // 4.32 → 0.68, 15.67 → 0.33, 8.00 → 1.00  =  2.01
        const transactions = [
            { id: 1, amount: 4.32 },
            { id: 2, amount: 15.67 },
            { id: 3, amount: 8.00 },
        ];
        const result = processTransactionRoundUps(transactions);
        expect(result.totalRoundUps).toBe('2.01');
    });

    test('each processed transaction has roundUpAmount, originalAmount, roundedAmount', () => {
        const result = processTransactionRoundUps([{ id: 1, amount: 4.32 }]);
        const t = result.processedTransactions[0];
        expect(t.roundUpAmount).toBe('0.68');
        expect(t.originalAmount).toBe('4.32');
        expect(t.roundedAmount).toBe('5.00');
    });

    test('roundUpAmount is always between 0.01 and 1.00', () => {
        const transactions = [
            { id: 1, amount: 3.47 },
            { id: 2, amount: 8.99 },
            { id: 3, amount: 5.00 },
            { id: 4, amount: 0.01 },
        ];
        const result = processTransactionRoundUps(transactions);
        result.processedTransactions.forEach(t => {
            const roundup = parseFloat(t.roundUpAmount);
            expect(roundup).toBeGreaterThanOrEqual(0.01);
            expect(roundup).toBeLessThanOrEqual(1.00);
        });
    });

    test('handles empty array without throwing', () => {
        const result = processTransactionRoundUps([]);
        expect(result.processedCount).toBe(0);
        expect(result.totalRoundUps).toBe('0.00');
    });

    test('skips invalid transactions and processes the rest', () => {
        const transactions = [
            { id: 1, amount: 4.32 },
            { id: 2, amount: 'invalid' },
            { id: 3, amount: 8.00 },
        ];
        const result = processTransactionRoundUps(transactions);
        expect(result.processedCount).toBe(2);
    });

});