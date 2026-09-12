import { resolveStaticFilePath } from './static'
import path from 'node:path'
import { expect, it } from 'vitest'

it('resolves built assets within the app bundle', () => {
  expect(resolveStaticFilePath('/assets/index.js')).toBe(
    path.join(process.cwd(), 'dist', 'assets/index.js'),
  )
})
