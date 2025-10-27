// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['eslint.config.mjs'],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    eslintPluginPrettierRecommended,
    {
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest,
            },
            sourceType: 'commonjs',
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },

    // TIER 1: Strict rules for core business logic (default for most files)
    {
        rules: {
            // Keep these STRICT - they prevent real runtime errors
            '@typescript-eslint/no-unsafe-assignment': 'error',
            '@typescript-eslint/no-unsafe-member-access': 'error',
            '@typescript-eslint/no-unsafe-call': 'error',

            // Slightly relax these common friction points
            '@typescript-eslint/no-unsafe-argument': 'warn',
            '@typescript-eslint/no-unsafe-return': 'warn',
            '@typescript-eslint/no-floating-promises': 'warn',

            // Allow explicit any when needed (but discourage it)
            '@typescript-eslint/no-explicit-any': 'warn',

            // Keep these for code quality
            '@typescript-eslint/require-await': 'error',
            '@typescript-eslint/no-unused-vars': 'error',
        },
    },

    // TIER 2: Relaxed for infrastructure/middleware code
    {
        files: [
            'src/core/middlewares/**/*',
            'src/core/filters/**/*',
            'src/core/interceptors/**/*',
            'src/core/pipes/**/*',
            'src/main.ts',
        ],
        rules: {
            // Relax type safety rules for infrastructure code that often deals with external libraries
            '@typescript-eslint/no-unsafe-assignment': 'warn',
            '@typescript-eslint/no-unsafe-member-access': 'warn',
            '@typescript-eslint/no-unsafe-call': 'warn',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',

            // Allow explicit any in infrastructure code
            '@typescript-eslint/no-explicit-any': 'off',

            // Still catch logical errors
            '@typescript-eslint/require-await': 'error',
            '@typescript-eslint/no-unused-vars': 'error',
        },
    },

    // TIER 3: Most relaxed for type definitions and configuration
    {
        files: [
            'src/types/**/*',
            '**/*.d.ts',
            'src/config/**/*',
            '*.config.*',
            'test/**/*',
        ],
        rules: {
            // Turn off most type safety rules for type definitions and config
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/no-explicit-any': 'off',

            // Keep basic quality rules
            '@typescript-eslint/no-unused-vars': 'warn',
            '@typescript-eslint/require-await': 'warn',
        },
    },

    // TIER 4: Special handling for external library integration files
    {
        files: [
            'src/core/middlewares/compression.middleware.ts',
            'src/core/middlewares/security.middleware.ts',
            'src/core/middlewares/rate-limit.middleware.ts',
        ],
        rules: {
            // These files deal heavily with external libraries - be very permissive
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/require-await': 'off',
        },
    },
);
