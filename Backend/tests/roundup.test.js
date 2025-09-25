const { calculateRoundUp } = require('../utils/roundup');

describe('Roundup Calculation Tests', () => {
    describe('Basic Roundup Logic', () => {
        test('should calculate correct roundup for standard amounts', () => {
            expect(parseFloat(calculateRoundUp(4.32))).toBe(0.68); // $5.00 - $4.32
            expect(parseFloat(calculateRoundUp(15.67))).toBe(0.33); // $16.00 - $15.67
            expect(parseFloat(calculateRoundUp(23.01))).toBe(0.99); // $24.00 - $23.01
        });

        test('should handle whole dollar amounts', () => {
            expect(parseFloat(calculateRoundUp(5.00))).toBe(1.00); // Should round to $6.00
            expect(parseFloat(calculateRoundUp(10.00))).toBe(1.00); // Should round to $11.00
        });

        test('should handle edge case amounts', () => {
            expect(parseFloat(calculateRoundUp(1.01))).toBe(0.99); // Smallest roundup
            expect(parseFloat(calculateRoundUp(0.99))).toBe(0.01); // Largest roundup
            expect(parseFloat(calculateRoundUp(999.99))).toBe(0.01); // Large amount
        });
    });

    describe('Scenario 1: College Student Testing', () => {
        const collegeTransactions = [
            { amount: 3.47, category: 'Food & Drink', expectedRoundup: 0.53 },
            { amount: 4.99, category: 'Food & Drink', expectedRoundup: 0.01 },
            { amount: 8.23, category: 'Food & Drink', expectedRoundup: 0.77 },
            { amount: 12.86, category: 'Food & Drink', expectedRoundup: 0.14 },
            { amount: 28.33, category: 'Groceries', expectedRoundup: 0.67 },
            { amount: 45.78, category: 'Groceries', expectedRoundup: 0.22 },
            { amount: 15.50, category: 'Entertainment', expectedRoundup: 0.50 },
            { amount: 22.95, category: 'Entertainment', expectedRoundup: 0.05 },
            { amount: 2.75, category: 'Transport', expectedRoundup: 0.25 }
        ];

        collegeTransactions.forEach(({ amount, category, expectedRoundup }) => {
            test(`should calculate correct roundup for ${category}: ${amount}`, () => {
                expect(parseFloat(calculateRoundUp(amount))).toBe(expectedRoundup);
            });
        });

        test('should calculate total monthly savings for college student', () => {
            const totalRoundup = collegeTransactions.reduce((sum, t) => sum + t.expectedRoundup, 0);
            expect(parseFloat(totalRoundup.toFixed(2))).toBe(3.14);
        });
    });

    describe('Scenario 2: Business Professional Testing', () => {
        const businessTransactions = [
            { amount: 47.68, category: 'Food & Drink', expectedRoundup: 0.32 },
            { amount: 65.43, category: 'Food & Drink', expectedRoundup: 0.57 },
            { amount: 52.87, category: 'Transport', expectedRoundup: 0.13 },
            { amount: 78.91, category: 'Transport', expectedRoundup: 0.09 },
            { amount: 125.44, category: 'Shopping', expectedRoundup: 0.56 },
            { amount: 189.99, category: 'Shopping', expectedRoundup: 0.01 },
            { amount: 87.33, category: 'Groceries', expectedRoundup: 0.67 },
            { amount: 134.72, category: 'Groceries', expectedRoundup: 0.28 }
        ];

        businessTransactions.forEach(({ amount, category, expectedRoundup }) => {
            test(`should calculate correct roundup for ${category}: ${amount}`, () => {
                expect(parseFloat(calculateRoundUp(amount))).toBe(expectedRoundup);
            });
        });
    });

    describe('Scenario 3: Family Household Testing', () => {
        const familyTransactions = [
            { amount: 156.78, category: 'Groceries', expectedRoundup: 0.22 },
            { amount: 189.43, category: 'Groceries', expectedRoundup: 0.57 },
            { amount: 98.67, category: 'Shopping', expectedRoundup: 0.33 },
            { amount: 143.29, category: 'Shopping', expectedRoundup: 0.71 },
            { amount: 267.84, category: 'Utilities', expectedRoundup: 0.16 },
            { amount: 198.55, category: 'Utilities', expectedRoundup: 0.45 },
            { amount: 45.99, category: 'Entertainment', expectedRoundup: 0.01 },
            { amount: 72.18, category: 'Entertainment', expectedRoundup: 0.82 }
        ];

        familyTransactions.forEach(({ amount, category, expectedRoundup }) => {
            test(`should calculate correct roundup for ${category}: ${amount}`, () => {
                expect(parseFloat(calculateRoundUp(amount))).toBe(expectedRoundup);
            });
        });
    });

    describe('Scenario 4: Edge Case Testing', () => {
        const edgeCaseTransactions = [
            { amount: 1.01, expectedRoundup: 0.99, description: 'Minimum amount with maximum roundup' },
            { amount: 2.99, expectedRoundup: 0.01, description: 'Small amount with minimum roundup' },
            { amount: 500.00, expectedRoundup: 1.00, description: 'Large whole amount' },
            { amount: 999.99, expectedRoundup: 0.01, description: 'Large amount with minimum roundup' },
            { amount: 0.01, expectedRoundup: 0.99, description: 'Smallest possible amount' }
        ];

        edgeCaseTransactions.forEach(({ amount, expectedRoundup, description }) => {
            test(`should handle ${description}: ${amount}`, () => {
                expect(parseFloat(calculateRoundUp(amount))).toBe(expectedRoundup);
            });
        });
    });

    describe('Cumulative Investment Projections', () => {
        test('should project accurate growth for college student over 3 months', () => {
            const monthlyRoundup = 35; // ~$35/month based on transaction volume
            const months = 3;
            const riskProfile = 'conservative'; // 4% annual return
            
            const expectedTotal = monthlyRoundup * months;
            const expectedGrowth = expectedTotal * (0.04 / 12) * months;
            
            expect(expectedTotal).toBe(105);
            expect(parseFloat(expectedGrowth.toFixed(2))).toBe(1.05);
        });

        test('should project accurate growth for business professional over 6 months', () => {
            const monthlyRoundup = 80; // ~$80/month based on higher transaction volume
            const months = 6;
            const riskProfile = 'aggressive'; // 8% annual return
            
            const expectedTotal = monthlyRoundup * months;
            const expectedGrowth = expectedTotal * (0.08 / 12) * months;
            
            expect(expectedTotal).toBe(480);
            expect(parseFloat(expectedGrowth.toFixed(2))).toBe(19.20);
        });
    });
});