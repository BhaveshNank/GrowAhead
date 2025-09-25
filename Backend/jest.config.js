module.exports = {
    testEnvironment: 'node',
    collectCoverageFrom: [
        'routes/**/*.js',
        'utils/**/*.js',
        'server.js'
    ],
    coverageDirectory: 'coverage',
    testMatch: ['**/tests/**/*.test.js'],
    verbose: true,
    testTimeout: 30000
};