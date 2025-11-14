/**
 * WebSocketManager Evaluation Tests
 * Tests the WebSocket connection management
 */

import { WebSocketManager } from '../src/client/WebSocketManager.js'
import { test, describe, assert, assertEqual, assertInstanceOf, setupMockWebSocket, createTestSummary } from './test-utils.js'

setupMockWebSocket()

const results = []

await describe('🌐 WebSocketManager Tests', async () => {
  results.push(await test('creates with default options', () => {
    const wsManager = new WebSocketManager('wss://world.hyperfy.io')
    assertEqual(wsManager.url, 'wss://world.hyperfy.io')
    assertEqual(wsManager.connected, false)
    assertEqual(wsManager.maxReconnectAttempts, 5)
    assertEqual(wsManager.reconnectDelay, 1000)
    assertEqual(wsManager.heartbeatInterval, 30000)
  }))

  results.push(await test('creates with custom options', () => {
    const wsManager = new WebSocketManager('wss://world.hyperfy.io', {
      maxReconnectAttempts: 10,
      reconnectDelay: 2000,
      heartbeatInterval: 60000
    })
    assertEqual(wsManager.maxReconnectAttempts, 10)
    assertEqual(wsManager.reconnectDelay, 2000)
    assertEqual(wsManager.heartbeatInterval, 60000)
  }))

  results.push(await test('has correct initial state', () => {
    const wsManager = new WebSocketManager('wss://world.hyperfy.io')
    assertEqual(wsManager.connected, false)
    assertEqual(wsManager.reconnectAttempts, 0)
    assertEqual(wsManager.ws, null)
    assertEqual(wsManager.heartbeatTimer, null)
    assertInstanceOf(wsManager.queue, Array)
    assertEqual(wsManager.queue.length, 0)
  }))

  results.push(await test('isConnected() returns connection state', () => {
    const wsManager = new WebSocketManager('wss://world.hyperfy.io')
    assertEqual(typeof wsManager.isConnected, 'function')
    assertEqual(wsManager.isConnected(), false)
  }))

  results.push(await test('getConnectionState() returns state string', () => {
    const wsManager = new WebSocketManager('wss://world.hyperfy.io')
    const state = wsManager.getConnectionState()
    assertEqual(state, 'DISCONNECTED')
  }))

  results.push(await test('getStats() returns statistics', () => {
    const wsManager = new WebSocketManager('wss://world.hyperfy.io')
    const stats = wsManager.getStats()

    assert(stats, 'Stats should be defined')
    assertEqual(stats.connected, false)
    assertEqual(stats.state, 'DISCONNECTED')
    assertEqual(stats.reconnectAttempts, 0)
    assertEqual(stats.queueLength, 0)
    assertEqual(stats.url, 'wss://world.hyperfy.io')
  }))

  results.push(await test('has message queue', () => {
    const wsManager = new WebSocketManager('wss://world.hyperfy.io')
    assertInstanceOf(wsManager.queue, Array)
  }))

  results.push(await test('shouldReconnect() checks reconnect attempts', () => {
    const wsManager = new WebSocketManager('wss://world.hyperfy.io', {
      maxReconnectAttempts: 5
    })

    assertEqual(wsManager.shouldReconnect(), true)
    wsManager.reconnectAttempts = 5
    assertEqual(wsManager.shouldReconnect(), false)
  }))
})

const summary = createTestSummary(results)
console.log(`\n${'='.repeat(60)}`)
console.log(`Results: ${summary.passed}/${summary.total} passed`)

if (summary.failed > 0) {
  process.exit(1)
}
