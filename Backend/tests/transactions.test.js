// Save this as tests/transactions.test.js
const { calculateRoundUp, processTransactionRoundUps } = require('../utils/roundup');

describe('GrowAhead Transaction Processing Tests', () => {

    describe('Transaction Data Validation', () => {
        test('should validate transaction structure', () => {
            const validTransaction = {
                merchant: 'Starbucks',
                amount: 4.67,
                category: 'Food & Drink',
                date: '2025-09-22'
            };

            // Check required fields
            expect(validTransaction.merchant).toBeDefined();
            expect(validTransaction.amount).toBeDefined();
            expect(validTransaction.category).toBeDefined();
            expect(validTransaction.date).toBeDefined();

            // Check data types
            expect(typeof validTransaction.merchant).toBe('string');
            expect(typeof validTransaction.amount).toBe('number');
            expect(typeof validTransaction.category).toBe('string');
            expect(typeof validTransaction.date).toBe('string');

            // Check amount is positive
            expect(validTransaction.amount).toBeGreaterThan(0);
        });

        test('should validate transaction categories', () => {
            const validCategories = [
                'Food & Drink',
                'Groceries', 
                'Shopping',
                'Transport',
                'Entertainment',
                'Utilities'
            ];

            const testTransactions = [
                { category: 'Food & Drink', valid: true },
                { category: 'Invalid Category', valid: false },
                { category: 'Groceries', valid: true },
                { category: 'Random', valid: false }
            ];

            testTransactions.forEach(({ category, valid }) => {
                if (valid) {
                    expect(validCategories).toContain(category);
                } else {
                    expect(validCategories).not.toContain(category);
                }
            });
        });
    });

    describe('Scenario 1: College Student Transaction Processing', () => {
        const collegeTransactions = [
            { id: 1, merchant: 'Starbucks', amount: 3.47, category: 'Food & Drink' },
            { id: 2, merchant: 'McDonald\'s', amount: 8.23, category: 'Food & Drink' },
            { id: 3, merchant: 'Walmart', amount: 28.33, category: 'Groceries' },
            { id: 4, merchant: 'Movie Theater', amount: 15.50, category: 'Entertainment' },
            { id: 5, merchant: 'Bus Fare', amount: 2.75, category: 'Transport' }
        ];

        test('should process college student transactions correctly', () => {
            const result = processTransactionRoundUps(collegeTransactions);
            
            expect(result.processedCount).toBe(5);
            expect(parseFloat(result.totalRoundUps)).toBeGreaterThan(2.5);
            
            console.log(`College Student - Total Roundups: $${result.totalRoundUps}`);
            console.log(`Processed ${result.processedCount} transactions`);
        });

        test('should categorize college transactions correctly', () => {
            const categories = {};
            collegeTransactions.forEach(t => {
                categories[t.category] = (categories[t.category] || 0) + 1;
            });

            expect(categories['Food & Drink']).toBe(2); // 40%
            expect(categories['Groceries']).toBe(1);    // 20%
            expect(categories['Entertainment']).toBe(1); // 20%
            expect(categories['Transport']).toBe(1);    // 20%
        });
    });

    describe('Scenario 2: Business Professional Transaction Processing', () => {
        const businessTransactions = [
            { id: 1, merchant: 'Business Lunch', amount: 47.68, category: 'Food & Drink' },
            { id: 2, merchant: 'Gas Station', amount: 52.87, category: 'Transport' },
            { id: 3, merchant: 'Department Store', amount: 125.44, category: 'Shopping' },
            { id: 4, merchant: 'Whole Foods', amount: 87.33, category: 'Groceries' },
            { id: 5, merchant: 'Client Dinner', amount: 65.43, category: 'Food & Drink' }
        ];

        test('should process business professional transactions correctly', () => {
            const result = processTransactionRoundUps(businessTransactions);
            
            expect(result.processedCount).toBe(5);
            expect(parseFloat(result.totalRoundUps)).toBeGreaterThan(1.5);
            
            console.log(`Business Professional - Total Roundups: $${result.totalRoundUps}`);
            
            // Higher amounts should generally have varied roundups
            result.processedTransactions.forEach(t => {
                expect(parseFloat(t.roundUpAmount)).toBeGreaterThan(0);
                expect(parseFloat(t.roundUpAmount)).toBeLessThan(1);
            });
        });
    });

    describe('Scenario 3: Family Household Transaction Processing', () => {
        const familyTransactions = [
            { id: 1, merchant: 'Costco', amount: 156.78, category: 'Groceries' },
            { id: 2, merchant: 'Target', amount: 98.67, category: 'Shopping' },
            { id: 3, merchant: 'Electric Company', amount: 267.84, category: 'Utilities' },
            { id: 4, merchant: 'Kids Activity Center', amount: 45.99, category: 'Entertainment' }
        ];

        test('should process family household transactions correctly', () => {
            const result = processTransactionRoundUps(familyTransactions);
            
            expect(result.processedCount).toBe(4);
            expect(parseFloat(result.totalRoundUps)).toBeGreaterThan(0.5);
            
            console.log(`Family Household - Total Roundups: $${result.totalRoundUps}`);
            
            // Large transactions should have reasonable roundups
            expect(parseFloat(result.totalRoundUps)).toBeLessThan(4.0);
        });
    });

    describe('Scenario 4: Edge Case Transaction Processing', () => {
        const edgeCaseTransactions = [
            { id: 1, merchant: 'Small Purchase', amount: 1.01, category: 'Shopping' },
            { id: 2, merchant: 'Almost Whole', amount: 2.99, category: 'Food & Drink' },
            { id: 3, merchant: 'Exact Amount', amount: 500.00, category: 'Shopping' },
            { id: 4, merchant: 'Large Purchase', amount: 999.99, category: 'Shopping' }
        ];

        test('should handle edge case transactions correctly', () => {
            const result = processTransactionRoundUps(edgeCaseTransactions);
            
            expect(result.processedCount).toBe(4);
            
            // Verify specific edge case calculations
            const smallPurchase = result.processedTransactions.find(t => t.amount === 1.01);
            expect(parseFloat(smallPurchase.roundUpAmount)).toBe(0.99);

            const almostWhole = result.processedTransactions.find(t => t.amount === 2.99);
            expect(parseFloat(almostWhole.roundUpAmount)).toBe(0.01);

            const exactAmount = result.processedTransactions.find(t => t.amount === 500.00);
            expect(parseFloat(exactAmount.roundUpAmount)).toBe(1.00);

            console.log(`Edge Cases - Total Roundups: $${result.totalRoundUps}`);
        });
    });

    describe('CSV Data Structure Validation', () => {
        test('should validate CSV headers', () => {
            const requiredHeaders = ['merchant', 'amount', 'category', 'date'];
            const csvHeaders = 'merchant,amount,category,date';
            
            const headers = csvHeaders.split(',');
            
            requiredHeaders.forEach(required => {
                expect(headers).toContain(required);
            });
        });

        test('should validate CSV data format', () => {
            const csvRow = 'Starbucks,4.67,Food & Drink,2025-09-22';
            const [merchant, amount, category, date] = csvRow.split(',');
            
            expect(merchant).toBe('Starbucks');
            expect(parseFloat(amount)).toBe(4.67);
            expect(category).toBe('Food & Drink');
            expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD format
        });
    });
});