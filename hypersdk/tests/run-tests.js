/**
 * Simple ESM-compatible test runner for HyperSDK
 */

import { HyperfyClient, Entity, Player, App, Chat, WebSocketManager, Packets } from '../src/index.js'

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

// Run tests
console.log('='.repeat(60))
console.log('HyperSDK Validation Tests')
console.log('='.repeat(60))

await describe('HyperfyClient', async () => {
  await test('should instantiate with default options', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    assert(client, 'Client should be defined')
    assertEqual(client.url, 'wss://world.hyperfy.io')
    assertEqual(client.options.name, 'Node.js SDK')
    assertEqual(client.options.autoReconnect, true)
  })

  await test('should instantiate with custom options', () => {
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

  await test('should build WebSocket URL with parameters', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io', {
      name: 'TestBot',
      authToken: 'token-123'
    })
    const url = client.buildWebSocketUrl()
    assert(url.includes('authToken=token-123'), 'URL should include auth token')
    assert(url.includes('name=TestBot'), 'URL should include name')
  })

  await test('should have correct initial state', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    assertEqual(client.connected, false)
    assertEqual(client.ready, false)
    assertEqual(client.player, null)
    assertInstanceOf(client.entities, Map)
    assertInstanceOf(client.blueprints, Map)
    assertEqual(client.entities.size, 0)
    assertEqual(client.blueprints.size, 0)
  })

  await test('should have WebSocketManager', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    assertInstanceOf(client.wsManager, WebSocketManager)
  })

  await test('should expose utility methods', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    assertEqual(typeof client.isConnected, 'function')
    assertEqual(typeof client.isReady, 'function')
    assertEqual(client.isConnected(), false)
    assertEqual(client.isReady(), false)
  })

  await test('should expose getClientInfo() method', () => {
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
  })

  await test('should handle snapshot correctly', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    const mockSnapshot = {
      id: 'player-123',
      serverTime: Date.now(),
      assetsUrl: 'https://assets.hyperfy.io',
      apiUrl: 'https://api.hyperfy.io',
      maxUploadSize: 10485760,
      settings: { foo: 'bar' },
      blueprints: [{ id: 'bp-1', name: 'Test Blueprint' }],
      entities: [{
        id: 'player-123',
        type: 'player',
        position: [0, 0, 0],
        quaternion: [0, 0, 0, 1],
        scale: [1, 1, 1],
        health: 100,
        rank: 1
      }],
      collections: {}
    }
    client.handleSnapshot(mockSnapshot)
    assertEqual(client.ready, true)
    assert(client.player, 'Player should be defined')
    assertInstanceOf(client.player, Player)
    assertEqual(client.entities.size, 1)
    assertEqual(client.blueprints.size, 1)
    assertEqual(client.settings.foo, 'bar')
    assertEqual(client.assetsUrl, 'https://assets.hyperfy.io')
  })
})

await describe('Entity', async () => {
  await test('should create entity with default values', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    const entity = new Entity(client, { id: 'entity-1' })
    assertEqual(entity.id, 'entity-1')
    assertEqual(entity.type, 'entity')
    assertEqual(entity.position, [0, 0, 0])
    assertEqual(entity.quaternion, [0, 0, 0, 1])
    assertEqual(entity.scale, [1, 1, 1])
    assertEqual(entity.state, {})
  })

  await test('should create entity with custom values', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    const entity = new Entity(client, {
      id: 'entity-1',
      type: 'custom',
      position: [1, 2, 3],
      quaternion: [0, 1, 0, 0],
      scale: [2, 2, 2],
      state: { health: 100 }
    })
    assertEqual(entity.type, 'custom')
    assertEqual(entity.position, [1, 2, 3])
    assertEqual(entity.quaternion, [0, 1, 0, 0])
    assertEqual(entity.scale, [2, 2, 2])
    assertEqual(entity.state.health, 100)
  })

  await test('should get and set position', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    const entity = new Entity(client, { id: 'entity-1' })
    assertEqual(entity.getPosition(), [0, 0, 0])
    entity.position = [5, 10, 15]
    assertEqual(entity.getPosition(), [5, 10, 15])
  })

  await test('should get and set state', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    const entity = new Entity(client, { id: 'entity-1' })
    entity.state = { foo: 'bar' }
    assertEqual(entity.getState('foo'), 'bar')
    assertEqual(entity.getState(), { foo: 'bar' })
  })

  await test('should check entity type correctly', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    const entity = new Entity(client, { id: 'entity-1', type: 'entity' })
    assertEqual(entity.isApp(), false)
    assertEqual(entity.isPlayer(), false)
  })

  await test('should calculate distance to other entity', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    const entity1 = new Entity(client, { id: 'entity-1', position: [0, 0, 0] })
    const entity2 = new Entity(client, { id: 'entity-2', position: [3, 4, 0] })
    assertEqual(entity1.distanceTo(entity2), 5)
  })

  await test('should serialize to JSON', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
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
  })
})

await describe('Player', async () => {
  await test('should create player with default values', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    const player = new Player(client, { id: 'player-1' })
    assertEqual(player.id, 'player-1')
    assertEqual(player.type, 'player')
    assertEqual(player.health, 100)
    assertEqual(player.rank, 0)
  })

  await test('should create player with custom values', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    const player = new Player(client, {
      id: 'player-1',
      health: 75,
      rank: 2,
      avatar: 'https://example.com/avatar.png'
    })
    assertEqual(player.health, 75)
    assertEqual(player.rank, 2)
    assertEqual(player.avatar, 'https://example.com/avatar.png')
  })

  await test('should check player type correctly', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    const player = new Player(client, { id: 'player-1' })
    assertEqual(player.isPlayer(), true)
    assertEqual(player.isApp(), false)
  })

  await test('should check rank permissions correctly', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    const visitor = new Player(client, { id: 'player-1', rank: 0 })
    const builder = new Player(client, { id: 'player-2', rank: 1 })
    const admin = new Player(client, { id: 'player-3', rank: 2 })

    assertEqual(visitor.isVisitor(), true)
    assertEqual(visitor.isBuilder(), false)
    assertEqual(visitor.isAdmin(), false)

    assertEqual(builder.isBuilder(), true)
    assertEqual(builder.isAdmin(), false)

    assertEqual(admin.isBuilder(), true)
    assertEqual(admin.isAdmin(), true)
  })

  await test('should get correct rank names', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    const visitor = new Player(client, { id: 'player-1', rank: 0 })
    const builder = new Player(client, { id: 'player-2', rank: 1 })
    const admin = new Player(client, { id: 'player-3', rank: 2 })

    assertEqual(visitor.getRankName(), 'Visitor')
    assertEqual(builder.getRankName(), 'Builder')
    assertEqual(admin.getRankName(), 'Admin')
  })

  await test('should check permissions correctly', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    const visitor = new Player(client, { id: 'player-1', rank: 0 })
    const builder = new Player(client, { id: 'player-2', rank: 1 })
    const admin = new Player(client, { id: 'player-3', rank: 2 })

    assertEqual(visitor.hasPermission('admin'), false)
    assertEqual(visitor.hasPermission('build'), false)
    assertEqual(visitor.hasPermission('chat'), true)

    assertEqual(builder.hasPermission('admin'), false)
    assertEqual(builder.hasPermission('build'), true)
    assertEqual(builder.hasPermission('chat'), true)

    assertEqual(admin.hasPermission('admin'), true)
    assertEqual(admin.hasPermission('build'), true)
    assertEqual(admin.hasPermission('chat'), true)
  })

  await test('should handle avatar correctly', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    const player = new Player(client, {
      id: 'player-1',
      avatar: 'https://example.com/avatar1.png',
      sessionAvatar: 'https://example.com/avatar2.png'
    })

    assertEqual(player.getAvatar(), 'https://example.com/avatar2.png')
    player.sessionAvatar = null
    assertEqual(player.getAvatar(), 'https://example.com/avatar1.png')
  })
})

await describe('App', async () => {
  await test('should create app with blueprint', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    client.blueprints.set('bp-1', {
      id: 'bp-1',
      name: 'Test App',
      desc: 'Test Description',
      author: 'Test Author',
      props: { color: 'red' }
    })
    const app = new App(client, { id: 'app-1', blueprint: 'bp-1' })
    assertEqual(app.id, 'app-1')
    assertEqual(app.type, 'app')
    assertEqual(app.pinned, false)
  })

  await test('should get blueprint information', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    client.blueprints.set('bp-1', {
      id: 'bp-1',
      name: 'Test App',
      desc: 'Test Description',
      author: 'Test Author'
    })
    const app = new App(client, { id: 'app-1', blueprint: 'bp-1' })
    assertEqual(app.getBlueprintName(), 'Test App')
    assertEqual(app.getBlueprintDescription(), 'Test Description')
    assertEqual(app.getBlueprintAuthor(), 'Test Author')
  })

  await test('should check app type correctly', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    const app = new App(client, { id: 'app-1', blueprint: 'bp-1' })
    assertEqual(app.isApp(), true)
    assertEqual(app.isPlayer(), false)
  })

  await test('should handle pinned state', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    const app = new App(client, { id: 'app-1', blueprint: 'bp-1' })
    assertEqual(app.isPinned(), false)
    app.pinned = true
    assertEqual(app.isPinned(), true)
  })
})

await describe('Chat', async () => {
  await test('should create chat with default values', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    const chat = new Chat(client)
    assertEqual(chat.messages, [])
    assertEqual(chat.maxMessages, 100)
  })

  await test('should add messages correctly', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    const chat = new Chat(client)
    const message = chat.addMessage({
      userId: 'user-1',
      name: 'Test User',
      text: 'Hello World',
      timestamp: Date.now()
    })
    assertEqual(chat.messages.length, 1)
    assertEqual(message.text, 'Hello World')
    assertEqual(message.name, 'Test User')
  })

  await test('should get messages', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    const chat = new Chat(client)
    chat.addMessage({ userId: 'user-1', name: 'User 1', text: 'Message 1' })
    chat.addMessage({ userId: 'user-2', name: 'User 2', text: 'Message 2' })
    const messages = chat.getMessages()
    assertEqual(messages.length, 2)
    assertEqual(messages[0].text, 'Message 1')
    assertEqual(messages[1].text, 'Message 2')
  })

  await test('should filter messages by user', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    const chat = new Chat(client)
    chat.addMessage({ userId: 'user-1', name: 'User 1', text: 'Message 1' })
    chat.addMessage({ userId: 'user-2', name: 'User 2', text: 'Message 2' })
    chat.addMessage({ userId: 'user-1', name: 'User 1', text: 'Message 3' })
    const user1Messages = chat.getMessagesByUser('user-1')
    assertEqual(user1Messages.length, 2)
    assertEqual(user1Messages[0].text, 'Message 1')
    assertEqual(user1Messages[1].text, 'Message 3')
  })

  await test('should search messages', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    const chat = new Chat(client)
    chat.addMessage({ userId: 'user-1', name: 'User 1', text: 'Hello World' })
    chat.addMessage({ userId: 'user-2', name: 'User 2', text: 'Goodbye World' })
    chat.addMessage({ userId: 'user-3', name: 'User 3', text: 'Hello Everyone' })
    const results = chat.searchMessages('Hello')
    assertEqual(results.length, 2)
    assertEqual(results[0].text, 'Hello World')
    assertEqual(results[1].text, 'Hello Everyone')
  })

  await test('should clear messages', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    const chat = new Chat(client)
    chat.addMessage({ userId: 'user-1', name: 'User 1', text: 'Message 1' })
    chat.addMessage({ userId: 'user-2', name: 'User 2', text: 'Message 2' })
    assertEqual(chat.messages.length, 2)
    chat.clear()
    assertEqual(chat.messages.length, 0)
  })

  await test('should respect max messages limit', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    const chat = new Chat(client)
    chat.setMaxMessages(5)
    for (let i = 0; i < 10; i++) {
      chat.addMessage({ userId: `user-${i}`, name: `User ${i}`, text: `Message ${i}` })
    }
    assertEqual(chat.messages.length, 5)
    assertEqual(chat.messages[0].text, 'Message 5')
    assertEqual(chat.messages[4].text, 'Message 9')
  })
})

await describe('WebSocketManager', async () => {
  await test('should create with default options', () => {
    const wsManager = new WebSocketManager('wss://world.hyperfy.io')
    assertEqual(wsManager.url, 'wss://world.hyperfy.io')
    assertEqual(wsManager.connected, false)
    assertEqual(wsManager.maxReconnectAttempts, 5)
    assertEqual(wsManager.reconnectDelay, 1000)
  })

  await test('should create with custom options', () => {
    const wsManager = new WebSocketManager('wss://world.hyperfy.io', {
      maxReconnectAttempts: 10,
      reconnectDelay: 2000
    })
    assertEqual(wsManager.maxReconnectAttempts, 10)
    assertEqual(wsManager.reconnectDelay, 2000)
  })

  await test('should have correct methods', () => {
    const wsManager = new WebSocketManager('wss://world.hyperfy.io')
    assertEqual(typeof wsManager.isConnected, 'function')
    assertEqual(typeof wsManager.getConnectionState, 'function')
    assertEqual(typeof wsManager.getStats, 'function')
  })

  await test('should get stats', () => {
    const wsManager = new WebSocketManager('wss://world.hyperfy.io')
    const stats = wsManager.getStats()
    assert(stats, 'Stats should be defined')
    assertEqual(stats.connected, false)
    assertEqual(stats.reconnectAttempts, 0)
    assertEqual(stats.queueLength, 0)
    assertEqual(stats.url, 'wss://world.hyperfy.io')
  })
})

await describe('Packets', async () => {
  await test('should have writePacket method', () => {
    assertEqual(typeof Packets.writePacket, 'function')
  })

  await test('should have readPacket method', () => {
    assertEqual(typeof Packets.readPacket, 'function')
  })
})

await describe('Integration Tests', async () => {
  await test('should handle complete client flow', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io', {
      name: 'TestBot',
      authToken: 'test-token'
    })

    assertEqual(client.isConnected(), false)
    assertEqual(client.isReady(), false)

    const mockSnapshot = {
      id: 'player-123',
      serverTime: Date.now(),
      assetsUrl: 'https://assets.hyperfy.io',
      apiUrl: 'https://api.hyperfy.io',
      maxUploadSize: 10485760,
      settings: { worldName: 'Test World' },
      blueprints: [{ id: 'bp-1', name: 'Test Blueprint', desc: 'A test blueprint' }],
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

    assertEqual(client.isReady(), true)
    assert(client.player, 'Player should be defined')
    assertEqual(client.player.isAdmin(), true)
    assertEqual(client.player.getName(), 'TestBot')
    assertEqual(client.entities.size, 2)
    assertEqual(client.getPlayers().length, 1)
    assertEqual(client.getApps().length, 1)
    assertEqual(client.blueprints.size, 1)

    assertInstanceOf(client.chat, Chat)

    const player = client.getEntity('player-123')
    assertInstanceOf(player, Player)
    assertEqual(player.getHealth(), 100)

    const app = client.getEntity('app-1')
    assertInstanceOf(app, App)
    assertEqual(app.getBlueprintName(), 'Test Blueprint')

    const info = client.getClientInfo()
    assertEqual(info.ready, true)
    assertEqual(info.playerCount, 1)
    assertEqual(info.appCount, 1)
    assertEqual(info.totalEntities, 2)
    assertEqual(info.blueprintCount, 1)
  })

  await test('should handle entity events', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')
    client.handleSnapshot({
      id: 'player-123',
      serverTime: Date.now(),
      assetsUrl: 'https://assets.hyperfy.io',
      apiUrl: 'https://api.hyperfy.io',
      maxUploadSize: 10485760,
      settings: {},
      blueprints: [],
      entities: [{ id: 'player-123', type: 'player' }],
      collections: {}
    })

    client.handleEntityAdded({
      id: 'app-2',
      type: 'app',
      blueprint: 'bp-1',
      position: [10, 0, 0]
    })
    assertEqual(client.entities.size, 2)
    const app = client.getEntity('app-2')
    assertInstanceOf(app, App)
    assertEqual(app.position, [10, 0, 0])

    client.handleEntityModified({ id: 'app-2', position: [5, 5, 5] })
    assertEqual(app.position, [5, 5, 5])

    client.handleEntityRemoved('app-2')
    assertEqual(client.entities.size, 1)
    assertEqual(client.getEntity('app-2'), undefined)
  })
})

// Print summary
console.log('\n' + '='.repeat(60))
console.log('Test Results')
console.log('='.repeat(60))
console.log(`Total: ${testsRun}`)
console.log(`Passed: ${testsPassed}`)
console.log(`Failed: ${testsFailed}`)

if (testsFailed > 0) {
  console.log('\nFailed Tests:')
  failedTests.forEach(({ name, error }) => {
    console.log(`  ✗ ${name}`)
    console.log(`    ${error}`)
  })
  process.exit(1)
} else {
  console.log('\n✓ All tests passed!')
  process.exit(0)
}
