// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default [
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                sourceType: 'module',
                ecmaVersion: 'latest',
                project: ['./tsconfig.json'],
            },
        },
        rules: {
            'no-console': 'off',
            '@typescript-eslint/no-unused-vars': ['warn'],
        },
    },
    prettier,
];
