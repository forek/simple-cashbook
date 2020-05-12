module.exports = {
  extends: [
    'standard',
    'standard-jsx'
  ],
  rules: {
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'warn',
    "semi": "off",
    "@typescript-eslint/semi": ['error', 'never']
  },
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint/eslint-plugin',
    'react-hooks'
  ]
}