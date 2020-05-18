module.exports = {
  extends: [
    'standard',
    'standard-jsx'
  ],
  rules: {
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'warn',
    "semi": "off",
    "@typescript-eslint/semi": ['error', 'never'],
    'react/jsx-tag-spacing': 'off',
    'no-unused-expressions': 'off'
  },
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint/eslint-plugin',
    'react-hooks'
  ]
}