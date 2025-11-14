/**
 * HyperSDK Core Classes Validation Tests
 * Tests only SDK-specific classes without Hyperfy re-exports
 */

import { HyperfyClient } from '../src/client/HyperfyClient.js'
import { Entity } from '../src/client/Entity.js'
import { Player } from '../src/client/Player.js'
import { App } from '../src/client/App.js'
import { Chat } from '../src/client/Chat.js'
import { WebSocketManager } from '../src/client/WebSocketManager.js'
import { Packets } from '../src/protocol/Packets.js'

// Test utilities
let testsRun = 0
let testsPassed = 0
let testsFailed = 0
const failedTests = []

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed')
  }
}

function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

function assertInstanceOf(obj, constructor, message) {
  if (!(obj instanceof constructor)) {
    throw new Error(message || `Expected instance of ${constructor.name}, got ${typeof obj}`)
  }
}

async function test(name, fn) {
  testsRun++
  try {
    await fn()
    testsPassed++
    console.log(`✓ ${name}`)
  } catch (error) {
    testsFailed++
    failedTests.push({ name, error: error.message })
    console.error(`✗ ${name}`)
    console.error(`  ${error.message}`)
  }
}

function describe(name, fn) {
  console.log(`\n${name}`)
  return fn()
}

// Mock WebSocket
globalThis.WebSocket = class MockWebSocket {
  constructor(url) {
    this.url = url
    this.readyState = 1 // OPEN
    this.binaryType = 'arraybuffer'
  }
  on() {}
  send() {}
  close() {}
}
globalThis.WebSocket.OPEN = 1
globalThis.WebSocket.CONNECTING = 0
globalThis.WebSocket.CLOSING = 2
globalThis.WebSocket.CLOSED = 3

// Run tests
console.log('='.repeat(70))
console.log('HyperSDK Core Classes Validation Tests')
console.log('='.repeat(70))

await describe('✨ HyperfyClient Tests', async () => {
  await test('instantiates with default options', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    assert(client, 'Client should be defined')
    assertEqual(client.url, 'wss://world.hyperfy.io')
    assertEqual(client.options.name, 'Node.js SDK')
    assertEqual(client.options.autoReconnect, true)
  })

  await test('instantiates with custom options', () => {
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
  })

  await test('builds WebSocket URL with query parameters', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io', {
      name: 'TestBot',
      authToken: 'token-123',
      avatar: 'https://example.com/avatar.png'
    })
    const url = client.buildWebSocketUrl()
    assert(url.includes('authToken=token-123'), 'URL should include auth token')
    assert(url.includes('name=TestBot'), 'URL should include name')
    assert(url.includes('avatar='), 'URL should include avatar')
  })

  await test('has correct initial state', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    assertEqual(client.connected, false)
    assertEqual(client.ready, false)
    assertEqual(client.player, null)
    assertInstanceOf(client.entities, Map)
    assertInstanceOf(client.blueprints, Map)
    assertEqual(client.entities.size, 0)
    assertEqual(client.blueprints.size, 0)
  })

  await test('has WebSocketManager instance', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    assertInstanceOf(client.wsManager, WebSocketManager)
  })

  await test('exposes isConnected() method', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    assertEqual(typeof client.isConnected, 'function')
    assertEqual(client.isConnected(), false)
  })

  await test('exposes isReady() method', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    assertEqual(typeof client.isReady, 'function')
    assertEqual(client.isReady(), false)
  })

  await test('exposes getClientInfo() with correct structure', () => {
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
  })

  await test('handles snapshot and initializes correctly', () => {
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
  })

  await test('getPlayers() returns only player entities', () => {
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
  })

  await test('getApps() returns only app entities', () => {
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
  })

  await test('getStats() returns complete statistics', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    const stats = client.getStats()

    assert(stats.websocket, 'Should have websocket stats')
    assert(stats.errors, 'Should have error stats')
    assert(stats.client, 'Should have client stats')
  })
})

await describe('🎯 Entity Tests', async () => {
  let client

  await test('creates entity with default values', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const entity = new Entity(client, { id: 'entity-1' })
    assertEqual(entity.id, 'entity-1')
    assertEqual(entity.type, 'entity')
    assertEqual(entity.position, [0, 0, 0])
    assertEqual(entity.quaternion, [0, 0, 0, 1])
    assertEqual(entity.scale, [1, 1, 1])
    assertEqual(entity.state, {})
  })

  await test('creates entity with custom values', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const entity = new Entity(client, {
      id: 'entity-1',
      type: 'custom',
      position: [1, 2, 3],
      quaternion: [0, 1, 0, 0],
      scale: [2, 2, 2],
      state: { health: 100, active: true }
    })
    assertEqual(entity.type, 'custom')
    assertEqual(entity.position, [1, 2, 3])
    assertEqual(entity.quaternion, [0, 1, 0, 0])
    assertEqual(entity.scale, [2, 2, 2])
    assertEqual(entity.state.health, 100)
    assertEqual(entity.state.active, true)
  })

  await test('getPosition() returns position array', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const entity = new Entity(client, { id: 'entity-1', position: [5, 10, 15] })
    assertEqual(entity.getPosition(), [5, 10, 15])
  })

  await test('getQuaternion() returns quaternion array', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const entity = new Entity(client, { id: 'entity-1', quaternion: [0, 1, 0, 0] })
    assertEqual(entity.getQuaternion(), [0, 1, 0, 0])
  })

  await test('getScale() returns scale array', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const entity = new Entity(client, { id: 'entity-1', scale: [2, 2, 2] })
    assertEqual(entity.getScale(), [2, 2, 2])
  })

  await test('getState() with key returns specific state value', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const entity = new Entity(client, { id: 'entity-1', state: { foo: 'bar', count: 42 } })
    assertEqual(entity.getState('foo'), 'bar')
    assertEqual(entity.getState('count'), 42)
  })

  await test('getState() without key returns full state object', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const entity = new Entity(client, { id: 'entity-1', state: { foo: 'bar' } })
    assertEqual(entity.getState(), { foo: 'bar' })
  })

  await test('type checking methods work correctly', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const entity = new Entity(client, { id: 'entity-1', type: 'entity' })
    assertEqual(entity.isApp(), false)
    assertEqual(entity.isPlayer(), false)
  })

  await test('calculates distance to other entity', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const entity1 = new Entity(client, { id: 'entity-1', position: [0, 0, 0] })
    const entity2 = new Entity(client, { id: 'entity-2', position: [3, 4, 0] })
    assertEqual(entity1.distanceTo(entity2), 5)
  })

  await test('getBoundingSphere() returns sphere data', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const entity = new Entity(client, { id: 'entity-1', position: [1, 2, 3], scale: [2, 3, 4] })
    const sphere = entity.getBoundingSphere()
    assertEqual(sphere.center, [1, 2, 3])
    assertEqual(sphere.radius, 4)
  })

  await test('toJSON() serializes entity correctly', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const entity = new Entity(client, {
      id: 'entity-1',
      type: 'custom',
      name: 'Test Entity',
      position: [1, 2, 3]
    })
    const json = entity.toJSON()
    assertEqual(json.id, 'entity-1')
    assertEqual(json.type, 'custom')
    assertEqual(json.name, 'Test Entity')
    assertEqual(json.position, [1, 2, 3])
    assert(typeof json.createdAt === 'number', 'Should have createdAt timestamp')
    assert(typeof json.lastModified === 'number', 'Should have lastModified timestamp')
  })

  await test('update() modifies entity properties', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const entity = new Entity(client, { id: 'entity-1', position: [0, 0, 0] })
    entity.update({ position: [5, 5, 5], name: 'Updated' })
    assertEqual(entity.position, [5, 5, 5])
    assertEqual(entity.name, 'Updated')
  })

  await test('toString() returns readable string', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const entity = new Entity(client, { id: 'entity-123', type: 'custom', name: 'Test' })
    const str = entity.toString()
    assert(str.includes('custom'), 'Should include type')
    assert(str.includes('Test'), 'Should include name')
  })
})

await describe('👤 Player Tests', async () => {
  let client

  await test('creates player with default values', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const player = new Player(client, { id: 'player-1' })
    assertEqual(player.id, 'player-1')
    assertEqual(player.type, 'player')
    assertEqual(player.health, 100)
    assertEqual(player.rank, 0)
    assertEqual(player.avatar, null)
  })

  await test('creates player with custom values', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const player = new Player(client, {
      id: 'player-1',
      health: 75,
      rank: 2,
      avatar: 'https://example.com/avatar.png',
      name: 'TestPlayer'
    })
    assertEqual(player.health, 75)
    assertEqual(player.rank, 2)
    assertEqual(player.avatar, 'https://example.com/avatar.png')
    assertEqual(player.name, 'TestPlayer')
  })

  await test('isPlayer() returns true', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const player = new Player(client, { id: 'player-1' })
    assertEqual(player.isPlayer(), true)
    assertEqual(player.isApp(), false)
  })

  await test('rank permissions - Visitor (rank 0)', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const visitor = new Player(client, { id: 'player-1', rank: 0 })
    assertEqual(visitor.isVisitor(), true)
    assertEqual(visitor.isBuilder(), false)
    assertEqual(visitor.isAdmin(), false)
    assertEqual(visitor.getRankName(), 'Visitor')
  })

  await test('rank permissions - Builder (rank 1)', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const builder = new Player(client, { id: 'player-2', rank: 1 })
    assertEqual(builder.isVisitor(), false)
    assertEqual(builder.isBuilder(), true)
    assertEqual(builder.isAdmin(), false)
    assertEqual(builder.getRankName(), 'Builder')
  })

  await test('rank permissions - Admin (rank 2)', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const admin = new Player(client, { id: 'player-3', rank: 2 })
    assertEqual(admin.isVisitor(), false)
    assertEqual(admin.isBuilder(), true)  // Admins also have builder permissions
    assertEqual(admin.isAdmin(), true)
    assertEqual(admin.getRankName(), 'Admin')
  })

  await test('hasPermission() checks permissions correctly', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const visitor = new Player(client, { id: 'player-1', rank: 0 })
    const builder = new Player(client, { id: 'player-2', rank: 1 })
    const admin = new Player(client, { id: 'player-3', rank: 2 })

    // Visitor permissions
    assertEqual(visitor.hasPermission('admin'), false)
    assertEqual(visitor.hasPermission('build'), false)
    assertEqual(visitor.hasPermission('chat'), true)

    // Builder permissions
    assertEqual(builder.hasPermission('admin'), false)
    assertEqual(builder.hasPermission('build'), true)
    assertEqual(builder.hasPermission('chat'), true)

    // Admin permissions
    assertEqual(admin.hasPermission('admin'), true)
    assertEqual(admin.hasPermission('build'), true)
    assertEqual(admin.hasPermission('chat'), true)
  })

  await test('getHealth() and health management', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const player = new Player(client, { id: 'player-1', health: 100 })
    assertEqual(player.getHealth(), 100)
    player.health = 50
    assertEqual(player.getHealth(), 50)
  })

  await test('avatar management - prioritizes sessionAvatar', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const player = new Player(client, {
      id: 'player-1',
      avatar: 'https://example.com/avatar1.png',
      sessionAvatar: 'https://example.com/avatar2.png'
    })
    assertEqual(player.getAvatar(), 'https://example.com/avatar2.png')

    player.sessionAvatar = null
    assertEqual(player.getAvatar(), 'https://example.com/avatar1.png')
  })

  await test('getSessionTime() returns elapsed time', async () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const player = new Player(client, { id: 'player-1', enteredAt: Date.now() - 1000 })
    const sessionTime = player.getSessionTime()
    assert(sessionTime >= 1000, 'Session time should be at least 1 second')
  })

  await test('getFormattedSessionTime() formats time correctly', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const player = new Player(client, { id: 'player-1', enteredAt: Date.now() - 3661000 })
    const formatted = player.getFormattedSessionTime()
    assert(formatted.includes('h'), 'Should include hours')
  })

  await test('getDisplayName() returns player name', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const player = new Player(client, { id: 'player-123', name: 'TestPlayer' })
    assertEqual(player.getDisplayName(), 'TestPlayer')
  })

  await test('toJSON() includes player-specific data', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const player = new Player(client, {
      id: 'player-1',
      name: 'TestPlayer',
      health: 100,
      rank: 2
    })
    const json = player.toJSON()
    assertEqual(json.type, 'player')
    assertEqual(json.health, 100)
    assertEqual(json.rank, 2)
    assertEqual(json.rankName, 'Admin')
    assertEqual(json.displayName, 'TestPlayer')
  })

  await test('update() updates player-specific properties', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const player = new Player(client, { id: 'player-1', health: 100, rank: 0 })
    player.update({ health: 50, rank: 2 })
    assertEqual(player.health, 50)
    assertEqual(player.rank, 2)
  })
})

await describe('📱 App Tests', async () => {
  let client

  await test('creates app with default values', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const app = new App(client, { id: 'app-1', blueprint: 'bp-1' })
    assertEqual(app.id, 'app-1')
    assertEqual(app.type, 'app')
    assertEqual(app.pinned, false)
    assertEqual(app.blueprintId, 'bp-1')
  })

  await test('isApp() returns true', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const app = new App(client, { id: 'app-1', blueprint: 'bp-1' })
    assertEqual(app.isApp(), true)
    assertEqual(app.isPlayer(), false)
  })

  await test('gets blueprint information', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    client.blueprints.set('bp-1', {
      id: 'bp-1',
      name: 'Test App',
      desc: 'Test Description',
      author: 'Test Author',
      image: 'https://example.com/image.png',
      props: { color: 'red' }
    })
    const app = new App(client, { id: 'app-1', blueprint: 'bp-1' })

    assertEqual(app.getBlueprintName(), 'Test App')
    assertEqual(app.getBlueprintDescription(), 'Test Description')
    assertEqual(app.getBlueprintAuthor(), 'Test Author')
    assertEqual(app.getBlueprintImage(), 'https://example.com/image.png')
  })

  await test('gets blueprint properties', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    client.blueprints.set('bp-1', {
      id: 'bp-1',
      name: 'Test App',
      props: { color: 'red', size: 'large' }
    })
    const app = new App(client, { id: 'app-1', blueprint: 'bp-1' })

    assertEqual(app.getBlueprintProps(), { color: 'red', size: 'large' })
    assertEqual(app.getBlueprintProperty('color'), 'red')
    assertEqual(app.getBlueprintProperty('size'), 'large')
  })

  await test('handles pinned state', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const app = new App(client, { id: 'app-1', blueprint: 'bp-1', pinned: false })

    assertEqual(app.isPinned(), false)
    app.pinned = true
    assertEqual(app.isPinned(), true)
  })

  await test('getAppInfo() returns app summary', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    client.blueprints.set('bp-1', {
      id: 'bp-1',
      name: 'Test App',
      desc: 'Description',
      author: 'Author'
    })
    const app = new App(client, {
      id: 'app-1',
      blueprint: 'bp-1',
      position: [1, 2, 3],
      pinned: true
    })

    const info = app.getAppInfo()
    assertEqual(info.id, 'app-1')
    assertEqual(info.name, 'Test App')
    assertEqual(info.description, 'Description')
    assertEqual(info.author, 'Author')
    assertEqual(info.position, [1, 2, 3])
    assertEqual(info.pinned, true)
  })

  await test('checks blueprint flags correctly', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    client.blueprints.set('bp-1', {
      id: 'bp-1',
      locked: true,
      frozen: true,
      unique: true,
      scene: false,
      disabled: false
    })
    const app = new App(client, { id: 'app-1', blueprint: 'bp-1' })

    assertEqual(app.isLocked(), true)
    assertEqual(app.isFrozen(), true)
    assertEqual(app.isUnique(), true)
    assertEqual(app.isScene(), false)
    assertEqual(app.isDisabled(), false)
  })

  await test('toJSON() includes app-specific data', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    client.blueprints.set('bp-1', {
      id: 'bp-1',
      name: 'Test App',
      desc: 'Description',
      author: 'Author'
    })
    const app = new App(client, {
      id: 'app-1',
      blueprint: 'bp-1',
      pinned: true
    })

    const json = app.toJSON()
    assertEqual(json.type, 'app')
    assertEqual(json.blueprintName, 'Test App')
    assertEqual(json.pinned, true)
  })

  await test('update() updates app-specific properties', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const app = new App(client, { id: 'app-1', blueprint: 'bp-1', pinned: false })

    app.update({ pinned: true, mover: 'player-123' })
    assertEqual(app.pinned, true)
    assertEqual(app.mover, 'player-123')
  })

  await test('generateId() creates unique ID', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const app = new App(client, { id: 'app-1', blueprint: 'bp-1' })

    const id1 = app.generateId()
    const id2 = app.generateId()
    assert(id1 !== id2, 'IDs should be unique')
    assert(typeof id1 === 'string', 'ID should be a string')
  })
})

await describe('💬 Chat Tests', async () => {
  let client, chat

  await test('creates chat with default values', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    chat = new Chat(client)
    assertEqual(chat.messages, [])
    assertEqual(chat.maxMessages, 100)
  })

  await test('addMessage() adds message correctly', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    chat = new Chat(client)
    const message = chat.addMessage({
      userId: 'user-1',
      name: 'Test User',
      text: 'Hello World',
      timestamp: Date.now()
    })

    assertEqual(chat.messages.length, 1)
    assertEqual(message.text, 'Hello World')
    assertEqual(message.name, 'Test User')
    assertEqual(message.userId, 'user-1')
  })

  await test('getMessages() returns all messages', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    chat = new Chat(client)
    chat.addMessage({ userId: 'user-1', name: 'User 1', text: 'Message 1' })
    chat.addMessage({ userId: 'user-2', name: 'User 2', text: 'Message 2' })

    const messages = chat.getMessages()
    assertEqual(messages.length, 2)
    assertEqual(messages[0].text, 'Message 1')
    assertEqual(messages[1].text, 'Message 2')
  })

  await test('getMessages(limit) returns limited messages', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    chat = new Chat(client)
    for (let i = 0; i < 5; i++) {
      chat.addMessage({ userId: `user-${i}`, name: `User ${i}`, text: `Message ${i}` })
    }

    const messages = chat.getMessages(3)
    assertEqual(messages.length, 3)
    assertEqual(messages[0].text, 'Message 2')
    assertEqual(messages[2].text, 'Message 4')
  })

  await test('getLastMessage() returns most recent message', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    chat = new Chat(client)
    chat.addMessage({ userId: 'user-1', name: 'User 1', text: 'First' })
    chat.addMessage({ userId: 'user-2', name: 'User 2', text: 'Last' })

    const lastMessage = chat.getLastMessage()
    assertEqual(lastMessage.text, 'Last')
  })

  await test('getMessagesByUser() filters by user', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    chat = new Chat(client)
    chat.addMessage({ userId: 'user-1', name: 'User 1', text: 'Message 1' })
    chat.addMessage({ userId: 'user-2', name: 'User 2', text: 'Message 2' })
    chat.addMessage({ userId: 'user-1', name: 'User 1', text: 'Message 3' })

    const user1Messages = chat.getMessagesByUser('user-1')
    assertEqual(user1Messages.length, 2)
    assertEqual(user1Messages[0].text, 'Message 1')
    assertEqual(user1Messages[1].text, 'Message 3')
  })

  await test('searchMessages() finds matching messages', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    chat = new Chat(client)
    chat.addMessage({ userId: 'user-1', name: 'User 1', text: 'Hello World' })
    chat.addMessage({ userId: 'user-2', name: 'User 2', text: 'Goodbye World' })
    chat.addMessage({ userId: 'user-3', name: 'User 3', text: 'Hello Everyone' })

    const results = chat.searchMessages('Hello')
    assertEqual(results.length, 2)
    assert(results[0].text.includes('Hello'), 'Should contain Hello')
    assert(results[1].text.includes('Hello'), 'Should contain Hello')
  })

  await test('clear() removes all messages', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    chat = new Chat(client)
    chat.addMessage({ userId: 'user-1', name: 'User 1', text: 'Message 1' })
    chat.addMessage({ userId: 'user-2', name: 'User 2', text: 'Message 2' })

    assertEqual(chat.messages.length, 2)
    chat.clear()
    assertEqual(chat.messages.length, 0)
  })

  await test('respects max messages limit', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    chat = new Chat(client)
    chat.setMaxMessages(5)

    for (let i = 0; i < 10; i++) {
      chat.addMessage({ userId: `user-${i}`, name: `User ${i}`, text: `Message ${i}` })
    }

    assertEqual(chat.messages.length, 5)
    assertEqual(chat.messages[0].text, 'Message 5')
    assertEqual(chat.messages[4].text, 'Message 9')
  })

  await test('getMessageCount() returns correct count', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    chat = new Chat(client)

    assertEqual(chat.getMessageCount(), 0)
    chat.addMessage({ userId: 'user-1', name: 'User 1', text: 'Message 1' })
    assertEqual(chat.getMessageCount(), 1)
    chat.addMessage({ userId: 'user-2', name: 'User 2', text: 'Message 2' })
    assertEqual(chat.getMessageCount(), 2)
  })

  await test('formatMessage() formats correctly', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    chat = new Chat(client)
    const message = {
      userId: 'user-1',
      name: 'Admin User',
      text: 'Hello',
      timestamp: Date.now(),
      rank: 2
    }

    const formatted = chat.formatMessage(message, false)
    assert(formatted.includes('[Admin]'), 'Should include rank')
    assert(formatted.includes('Admin User'), 'Should include name')
    assert(formatted.includes('Hello'), 'Should include text')
  })

  await test('getMessageStats() returns statistics', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    chat = new Chat(client)
    chat.addMessage({ userId: 'user-1', name: 'User 1', text: 'Message 1', type: 'chat' })
    chat.addMessage({ userId: 'user-1', name: 'User 1', text: 'Message 2', type: 'chat' })
    chat.addMessage({ userId: 'user-2', name: 'User 2', text: 'Message 3', type: 'system' })

    const stats = chat.getMessageStats()
    assertEqual(stats.totalMessages, 3)
    assertEqual(stats.uniqueUsers, 2)
    assertEqual(stats.messagesByUser['user-1'], 2)
    assertEqual(stats.messagesByUser['user-2'], 1)
    assertEqual(stats.messagesByType['chat'], 2)
    assertEqual(stats.messagesByType['system'], 1)
  })

  await test('exportMessages() as JSON', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    chat = new Chat(client)
    chat.addMessage({ userId: 'user-1', name: 'User 1', text: 'Message 1' })

    const json = chat.exportMessages('json')
    const parsed = JSON.parse(json)
    assertEqual(parsed.length, 1)
    assertEqual(parsed[0].text, 'Message 1')
  })

  await test('exportMessages() as text', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    chat = new Chat(client)
    chat.addMessage({ userId: 'user-1', name: 'User 1', text: 'Message 1' })

    const text = chat.exportMessages('text')
    assert(text.includes('User 1'), 'Should include username')
    assert(text.includes('Message 1'), 'Should include message text')
  })
})

await describe('🌐 WebSocketManager Tests', async () => {
  await test('creates with default options', () => {
    const wsManager = new WebSocketManager('wss://world.hyperfy.io')
    assertEqual(wsManager.url, 'wss://world.hyperfy.io')
    assertEqual(wsManager.connected, false)
    assertEqual(wsManager.maxReconnectAttempts, 5)
    assertEqual(wsManager.reconnectDelay, 1000)
    assertEqual(wsManager.heartbeatInterval, 30000)
  })

  await test('creates with custom options', () => {
    const wsManager = new WebSocketManager('wss://world.hyperfy.io', {
      maxReconnectAttempts: 10,
      reconnectDelay: 2000,
      heartbeatInterval: 60000
    })
    assertEqual(wsManager.maxReconnectAttempts, 10)
    assertEqual(wsManager.reconnectDelay, 2000)
    assertEqual(wsManager.heartbeatInterval, 60000)
  })

  await test('has correct initial state', () => {
    const wsManager = new WebSocketManager('wss://world.hyperfy.io')
    assertEqual(wsManager.connected, false)
    assertEqual(wsManager.reconnectAttempts, 0)
    assertEqual(wsManager.ws, null)
    assertEqual(wsManager.heartbeatTimer, null)
    assertInstanceOf(wsManager.queue, Array)
    assertEqual(wsManager.queue.length, 0)
  })

  await test('isConnected() returns connection state', () => {
    const wsManager = new WebSocketManager('wss://world.hyperfy.io')
    assertEqual(typeof wsManager.isConnected, 'function')
    assertEqual(wsManager.isConnected(), false)
  })

  await test('getConnectionState() returns state string', () => {
    const wsManager = new WebSocketManager('wss://world.hyperfy.io')
    const state = wsManager.getConnectionState()
    assertEqual(state, 'DISCONNECTED')
  })

  await test('getStats() returns statistics', () => {
    const wsManager = new WebSocketManager('wss://world.hyperfy.io')
    const stats = wsManager.getStats()

    assert(stats, 'Stats should be defined')
    assertEqual(stats.connected, false)
    assertEqual(stats.state, 'DISCONNECTED')
    assertEqual(stats.reconnectAttempts, 0)
    assertEqual(stats.queueLength, 0)
    assertEqual(stats.url, 'wss://world.hyperfy.io')
  })

  await test('has message queue', () => {
    const wsManager = new WebSocketManager('wss://world.hyperfy.io')
    assertInstanceOf(wsManager.queue, Array)
  })

  await test('shouldReconnect() checks reconnect attempts', () => {
    const wsManager = new WebSocketManager('wss://world.hyperfy.io', {
      maxReconnectAttempts: 5
    })

    assertEqual(wsManager.shouldReconnect(), true)
    wsManager.reconnectAttempts = 5
    assertEqual(wsManager.shouldReconnect(), false)
  })
})

await describe('📦 Packets Tests', async () => {
  await test('has writePacket static method', () => {
    assertEqual(typeof Packets.writePacket, 'function')
  })

  await test('has readPacket static method', () => {
    assertEqual(typeof Packets.readPacket, 'function')
  })
})

await describe('🔗 Integration Tests', async () => {
  await test('complete client initialization and snapshot flow', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io', {
      name: 'TestBot',
      authToken: 'test-token'
    })

    // Initial state
    assertEqual(client.isConnected(), false)
    assertEqual(client.isReady(), false)

    // Simulate full snapshot
    const mockSnapshot = {
      id: 'player-123',
      serverTime: Date.now(),
      assetsUrl: 'https://assets.hyperfy.io',
      apiUrl: 'https://api.hyperfy.io',
      maxUploadSize: 10485760,
      settings: { worldName: 'Test World', maxPlayers: 100 },
      blueprints: [
        { id: 'bp-1', name: 'Test Blueprint', desc: 'A test blueprint' },
        { id: 'bp-2', name: 'Another Blueprint', desc: 'Another test' }
      ],
      entities: [
        {
          id: 'player-123',
          type: 'player',
          position: [0, 1, 0],
          quaternion: [0, 0, 0, 1],
          scale: [1, 1, 1],
          health: 100,
          rank: 2,
          name: 'TestBot'
        },
        {
          id: 'player-456',
          type: 'player',
          position: [5, 1, 0],
          quaternion: [0, 0, 0, 1],
          scale: [1, 1, 1],
          health: 100,
          rank: 0,
          name: 'Visitor'
        },
        {
          id: 'app-1',
          type: 'app',
          blueprint: 'bp-1',
          position: [5, 0, 0],
          quaternion: [0, 0, 0, 1],
          scale: [1, 1, 1],
          pinned: false
        }
      ],
      collections: {}
    }

    client.handleSnapshot(mockSnapshot)

    // Verify complete state
    assertEqual(client.isReady(), true)
    assert(client.player, 'Player should be initialized')
    assertEqual(client.player.isAdmin(), true)
    assertEqual(client.player.getName(), 'TestBot')
    assertEqual(client.entities.size, 3)
    assertEqual(client.getPlayers().length, 2)
    assertEqual(client.getApps().length, 1)
    assertEqual(client.blueprints.size, 2)
    assertInstanceOf(client.chat, Chat)

    // Verify entities
    const player = client.getEntity('player-123')
    assert(player, 'Player entity should exist')
    assertEqual(player.type, 'player')
    assertEqual(player.getHealth(), 100)
    assertEqual(player.getRankName(), 'Admin')

    const visitor = client.getEntity('player-456')
    assert(visitor, 'Visitor entity should exist')
    assertEqual(visitor.type, 'player')
    assertEqual(visitor.getRankName(), 'Visitor')

    const app = client.getEntity('app-1')
    assert(app, 'App entity should exist')
    assertEqual(app.type, 'app')
    assertEqual(app.getBlueprintName(), 'Test Blueprint')

    // Verify client info
    const info = client.getClientInfo()
    assertEqual(info.ready, true)
    assertEqual(info.playerCount, 2)
    assertEqual(info.appCount, 1)
    assertEqual(info.totalEntities, 3)
    assertEqual(info.blueprintCount, 2)
  })

  await test('entity lifecycle - add, modify, remove', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')

    // Initialize
    client.handleSnapshot({
      id: 'player-123',
      serverTime: Date.now(),
      assetsUrl: 'https://assets.hyperfy.io',
      apiUrl: 'https://api.hyperfy.io',
      maxUploadSize: 10485760,
      settings: {},
      blueprints: [{ id: 'bp-1', name: 'Test' }],
      entities: [{ id: 'player-123', type: 'player' }],
      collections: {}
    })

    assertEqual(client.entities.size, 1)

    // Add entity
    client.handleEntityAdded({
      id: 'app-1',
      type: 'app',
      blueprint: 'bp-1',
      position: [10, 0, 0],
      quaternion: [0, 0, 0, 1],
      scale: [1, 1, 1]
    })

    assertEqual(client.entities.size, 2)
    const app = client.getEntity('app-1')
    assertInstanceOf(app, App)
    assertEqual(app.position, [10, 0, 0])

    // Modify entity
    client.handleEntityModified({
      id: 'app-1',
      position: [20, 5, 10],
      pinned: true
    })

    assertEqual(app.position, [20, 5, 10])
    assertEqual(app.pinned, true)

    // Remove entity
    client.handleEntityRemoved('app-1')

    assertEqual(client.entities.size, 1)
    assertEqual(client.getEntity('app-1'), undefined)
  })

  await test('chat message flow', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')

    // Initialize
    client.handleSnapshot({
      id: 'player-123',
      serverTime: Date.now(),
      assetsUrl: 'https://assets.hyperfy.io',
      apiUrl: 'https://api.hyperfy.io',
      maxUploadSize: 10485760,
      settings: {},
      blueprints: [],
      entities: [],
      collections: {}
    })

    assertEqual(client.chat.getMessageCount(), 0)

    // Add messages
    client.handleChatAdded({
      userId: 'user-1',
      name: 'User 1',
      text: 'Hello World',
      timestamp: Date.now()
    })

    client.handleChatAdded({
      userId: 'user-2',
      name: 'User 2',
      text: 'Hi there!',
      timestamp: Date.now()
    })

    assertEqual(client.chat.getMessageCount(), 2)
    const lastMessage = client.chat.getLastMessage()
    assertEqual(lastMessage.text, 'Hi there!')

    // Clear chat
    client.handleChatCleared()
    assertEqual(client.chat.getMessageCount(), 0)
  })

  await test('blueprint management', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')

    // Initialize
    client.handleSnapshot({
      id: 'player-123',
      serverTime: Date.now(),
      assetsUrl: 'https://assets.hyperfy.io',
      apiUrl: 'https://api.hyperfy.io',
      maxUploadSize: 10485760,
      settings: {},
      blueprints: [{ id: 'bp-1', name: 'Original', version: 1 }],
      entities: [],
      collections: {}
    })

    assertEqual(client.blueprints.size, 1)
    let bp = client.getBlueprint('bp-1')
    assertEqual(bp.name, 'Original')

    // Add blueprint
    client.handleBlueprintAdded({
      id: 'bp-2',
      name: 'New Blueprint',
      version: 1
    })

    assertEqual(client.blueprints.size, 2)

    // Modify blueprint
    client.handleBlueprintModified({
      id: 'bp-1',
      name: 'Modified',
      version: 2
    })

    bp = client.getBlueprint('bp-1')
    assertEqual(bp.name, 'Modified')
    assertEqual(bp.version, 2)
  })
})

// Print summary
console.log('\n' + '='.repeat(70))
console.log('Test Results Summary')
console.log('='.repeat(70))
console.log(`\n📊 Total Tests: ${testsRun}`)
console.log(`✅ Passed: ${testsPassed}`)
console.log(`❌ Failed: ${testsFailed}`)

if (testsFailed > 0) {
  console.log('\n❌ Failed Tests:')
  console.log('='.repeat(70))
  failedTests.forEach(({ name, error }) => {
    console.log(`\n✗ ${name}`)
    console.log(`  Error: ${error}`)
  })
  console.log('\n' + '='.repeat(70))
  process.exit(1)
} else {
  console.log('\n✅ All tests passed successfully!')
  console.log('='.repeat(70))
  console.log('\n🎉 HyperSDK validation complete! All core functionality working as expected.')
  process.exit(0)
}
