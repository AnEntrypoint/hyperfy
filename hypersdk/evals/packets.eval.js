/**
 * Packets Evaluation Tests
 * Tests the Packets protocol wrapper
 */

import { Packets } from '../src/protocol/Packets.js'
import { test, describe, assertEqual, createTestSummary } from './test-utils.js'

const results = []

await describe('📦 Packets Tests', async () => {
  results.push(await test('has writePacket static method', () => {
    assertEqual(typeof Packets.writePacket, 'function')
  }))

  results.push(await test('has readPacket static method', () => {
    assertEqual(typeof Packets.readPacket, 'function')
  }))
})

const summary = createTestSummary(results)
console.log(`\n${'='.repeat(60)}`)
console.log(`Results: ${summary.passed}/${summary.total} passed`)

if (summary.failed > 0) {
  process.exit(1)
}
