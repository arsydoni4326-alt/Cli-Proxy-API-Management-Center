import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
const config = [
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Pages in this app intentionally start async data loads from effects. Those loaders
      // synchronously expose their loading state before awaiting the Management API.
      'react-hooks/set-state-in-effect': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];

// Conditionally load eslint-plugin-jsx-a11y (requires the package to be installed)
try {
  const jsxA11y = await import('eslint-plugin-jsx-a11y');
  config.push({
    plugins: {
      'jsx-a11y': jsxA11y.default ?? jsxA11y,
    },
    rules: {
      ...(jsxA11y.default ?? jsxA11y).configs?.recommended?.rules,
      // Provider forms wrap <label> around <input> within CSS-module-styled <div> wrappers.
      // The rule cannot detect the association through CSS-module classnames. Each label does
      // wrap its input; this is correct HTML even if the rule doesn't detect it.
      // Also PluginStorePage uses <label htmlFor={...}> pattern.
      'jsx-a11y/label-has-associated-control': 'off',
    },
  });
  // Override: allow autoFocus on login page (single-field primary action) and
  // diagram modals (auto-open search/mapping editor).
  config.push({
    files: [
      '**/LoginPage.tsx',
      '**/ExcludedModelsPicker.tsx',
      '**/ModelMappingDiagramModals.tsx',
    ],
    rules: {
      'jsx-a11y/no-autofocus': 'off',
    },
  });
  // Override: model-mapping diagram context menu items are <div onClick> with
  // click/keyboard handled by a shared keydown listener at the menu parent.
  config.push({
    files: ['**/ModelMappingDiagramContextMenu.tsx'],
    rules: {
      'jsx-a11y/click-events-have-key-events': 'off',
      'jsx-a11y/no-static-element-interactions': 'off',
    },
  });
  // Override: Sheet overlay uses role="presentation" with onMouseDown for
  // click-to-close backdrop. Keyboard close is handled by the document-level
  // keydown listener (Escape). The onMouseDown is needed for the overlay
  // backdrop dismiss pattern.
  config.push({
    files: ['**/Sheet/Sheet.tsx'],
    rules: {
      'jsx-a11y/no-noninteractive-element-interactions': 'off',
    },
  });
} catch {
  // Plugin not installed; skip jsx-a11y rules.
}

export default tseslint.config(...config);