// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { JS_BUDGET_KB, totalGzipKb } from './bundle-budget.ts'

const dir = mkdtempSync(join(tmpdir(), 'budget-'))
afterAll(() => rmSync(dir, { recursive: true, force: true }))

describe('totalGzipKb', () => {
  it('sums gzip size of js files only', () => {
    writeFileSync(join(dir, 'a.js'), 'x'.repeat(100_000))
    writeFileSync(join(dir, 'b.css'), 'y'.repeat(100_000))
    const kb = totalGzipKb(dir)
    expect(kb).toBeGreaterThan(0)
    expect(kb).toBeLessThan(JS_BUDGET_KB)
  })
})
