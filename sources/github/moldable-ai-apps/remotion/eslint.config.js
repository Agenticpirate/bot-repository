import app from '@moldable-ai/eslint-config/app'

// User projects live under data/ at runtime; they are content, not source.
export default [{ ignores: ['data/**', 'dist-mobile/**'] }, ...app]
