/**
 * HyperfyClient Evaluation Tests
 * Tests the main SDK client class
 */

import { HyperfyClient } from '../src/client/HyperfyClient.js'
import { Player } from '../src/client/Player.js'
import { App } from '../src/client/App.js'
import { Chat } from '../src/client/Chat.js'
import { WebSocketManager } from '../src/client/WebSocketManager.js'
import { test, describe, assert, assertEqual, assertInstanceOf, setupMockWebSocket, createTestSummary } from './test-utils.js'

setupMockWebSocket()

const results = []

await describe('✨ HyperfyClient Tests', async () => {
  results.push(await test('instantiates with default options', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    assert(client, 'Client should be defined')
    assertEqual(client.url, 'wss://world.hyperfy.io')
    assertEqual(client.options.name, 'Node.js SDK')
    assertEqual(client.options.autoReconnect, true)
  }))

  results.push(await test('instantiates with custom options', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io', {
      name: 'TestBot',
      authToken: 'token-123',
      avatar: 'https://example.com/avatar.png',
      autoReconnect: false
    })
    assertEqual(client.options.name, 'TestBot')
    assertEqual(client.options.authToken, 'token-123')
    assertEqual(client.options.avatar, 'https://example.com/avatar.png')
    assertEqual(client.options.autoReconnect, false)
  }))

  results.push(await test('builds WebSocket URL with query parameters', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io', {
      name: 'TestBot',
      authToken: 'token-123',
      avatar: 'https://example.com/avatar.png'
    })
    const url = client.buildWebSocketUrl()
    assert(url.includes('authToken=token-123'), 'URL should include auth token')
    assert(url.includes('name=TestBot'), 'URL should include name')
    assert(url.includes('avatar='), 'URL should include avatar')
  }))

  results.push(await test('has correct initial state', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    assertEqual(client.connected, false)
    assertEqual(client.ready, false)
    assertEqual(client.player, null)
    assertInstanceOf(client.entities, Map)
    assertInstanceOf(client.blueprints, Map)
    assertEqual(client.entities.size, 0)
    assertEqual(client.blueprints.size, 0)
  }))

  results.push(await test('has WebSocketManager instance', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    assertInstanceOf(client.wsManager, WebSocketManager)
  }))

  results.push(await test('exposes isConnected() method', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    assertEqual(typeof client.isConnected, 'function')
    assertEqual(client.isConnected(), false)
  }))

  results.push(await test('exposes isReady() method', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    assertEqual(typeof client.isReady, 'function')
    assertEqual(client.isReady(), false)
  }))

  results.push(await test('exposes getClientInfo() with correct structure', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    const info = client.getClientInfo()
    assert(info, 'Client info should be defined')
    assertEqual(info.connected, false)
    assertEqual(info.ready, false)
    assertEqual(info.playerCount, 0)
    assertEqual(info.appCount, 0)
    assertEqual(info.totalEntities, 0)
    assertEqual(info.blueprintCount, 0)
    assertEqual(info.url, 'wss://world.hyperfy.io')
    assert(typeof info.serverTimeOffset === 'number', 'serverTimeOffset should be a number')
  }))

  results.push(await test('handles snapshot and initializes correctly', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    const mockSnapshot = {
      id: 'player-123',
      serverTime: Date.now(),
      assetsUrl: 'https://assets.hyperfy.io',
      apiUrl: 'https://api.hyperfy.io',
      maxUploadSize: 10485760,
      settings: { foo: 'bar', worldName: 'Test World' },
      blueprints: [
        { id: 'bp-1', name: 'Test Blueprint', desc: 'A test blueprint' }
      ],
      entities: [
        {
          id: 'player-123',
          type: 'player',
          position: [0, 0, 0],
          quaternion: [0, 0, 0, 1],
          scale: [1, 1, 1],
          health: 100,
          rank: 1
        }
      ],
      collections: {}
    }
    client.handleSnapshot(mockSnapshot)

    assertEqual(client.ready, true)
    assert(client.player, 'Player should be initialized')
    assertInstanceOf(client.player, Player)
    assertEqual(client.entities.size, 1)
    assertEqual(client.blueprints.size, 1)
    assertEqual(client.settings.foo, 'bar')
    assertEqual(client.settings.worldName, 'Test World')
    assertEqual(client.assetsUrl, 'https://assets.hyperfy.io')
    assertEqual(client.apiUrl, 'https://api.hyperfy.io')
    assertEqual(client.maxUploadSize, 10485760)
    assertInstanceOf(client.chat, Chat)
  }))

  results.push(await test('getPlayers() returns only player entities', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    client.handleSnapshot({
      id: 'player-1',
      serverTime: Date.now(),
      assetsUrl: 'https://assets.hyperfy.io',
      apiUrl: 'https://api.hyperfy.io',
      maxUploadSize: 10485760,
      settings: {},
      blueprints: [],
      entities: [
        { id: 'player-1', type: 'player' },
        { id: 'player-2', type: 'player' },
        { id: 'app-1', type: 'app' },
        { id: 'entity-1', type: 'entity' }
      ],
      collections: {}
    })

    const players = client.getPlayers()
    assertEqual(players.length, 2)
    assert(players.every(p => p.isPlayer()), 'All should be players')
  }))

  results.push(await test('getApps() returns only app entities', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    client.handleSnapshot({
      id: 'player-1',
      serverTime: Date.now(),
      assetsUrl: 'https://assets.hyperfy.io',
      apiUrl: 'https://api.hyperfy.io',
      maxUploadSize: 10485760,
      settings: {},
      blueprints: [],
      entities: [
        { id: 'player-1', type: 'player' },
        { id: 'app-1', type: 'app' },
        { id: 'app-2', type: 'app' }
      ],
      collections: {}
    })

    const apps = client.getApps()
    assertEqual(apps.length, 2)
    assert(apps.every(a => a.isApp()), 'All should be apps')
  }))

  results.push(await test('getStats() returns complete statistics', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    const stats = client.getStats()

    assert(stats.websocket, 'Should have websocket stats')
    assert(stats.errors, 'Should have error stats')
    assert(stats.client, 'Should have client stats')
  }))
})

const summary = createTestSummary(results)
console.log(`\n${'='.repeat(60)}`)
console.log(`Results: ${summary.passed}/${summary.total} passed`)

if (summary.failed > 0) {
  process.exit(1)
}
