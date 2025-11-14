/**
 * Integration Evaluation Tests
 * Tests complete workflows and component integration
 */

import { HyperfyClient } from '../src/client/HyperfyClient.js'
import { Player } from '../src/client/Player.js'
import { App } from '../src/client/App.js'
import { Chat } from '../src/client/Chat.js'
import { test, describe, assert, assertEqual, assertInstanceOf, setupMockWebSocket, createTestSummary } from './test-utils.js'

setupMockWebSocket()

const results = []

await describe('🔗 Integration Tests', async () => {
  results.push(await test('complete client initialization and snapshot flow', () => {
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
  }))

  results.push(await test('entity lifecycle - add, modify, remove', () => {
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
  }))

  results.push(await test('chat message flow', () => {
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
  }))

  results.push(await test('blueprint management', () => {
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
  }))

  results.push(await test('multiple players with different ranks', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')

    client.handleSnapshot({
      id: 'admin-player',
      serverTime: Date.now(),
      assetsUrl: 'https://assets.hyperfy.io',
      apiUrl: 'https://api.hyperfy.io',
      maxUploadSize: 10485760,
      settings: {},
      blueprints: [],
      entities: [
        { id: 'admin-player', type: 'player', rank: 2, name: 'Admin' },
        { id: 'builder-player', type: 'player', rank: 1, name: 'Builder' },
        { id: 'visitor-player', type: 'player', rank: 0, name: 'Visitor' }
      ],
      collections: {}
    })

    const admin = client.getEntity('admin-player')
    const builder = client.getEntity('builder-player')
    const visitor = client.getEntity('visitor-player')

    // All should be Player instances
    assertInstanceOf(admin, Player)
    assertInstanceOf(builder, Player)
    assertInstanceOf(visitor, Player)

    // Verify rank-specific methods work
    assertEqual(admin.isAdmin(), true)
    assertEqual(builder.isBuilder(), true)
    assertEqual(visitor.isVisitor(), true)

    // Verify permissions
    assertEqual(admin.hasPermission('admin'), true)
    assertEqual(builder.hasPermission('build'), true)
    assertEqual(visitor.hasPermission('chat'), true)
    assertEqual(visitor.hasPermission('build'), false)
  }))

  results.push(await test('app with blueprint properties', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')

    client.handleSnapshot({
      id: 'player-1',
      serverTime: Date.now(),
      assetsUrl: 'https://assets.hyperfy.io',
      apiUrl: 'https://api.hyperfy.io',
      maxUploadSize: 10485760,
      settings: {},
      blueprints: [
        {
          id: 'test-bp',
          name: 'Interactive App',
          desc: 'A test interactive app',
          author: 'Test Author',
          props: { color: 'blue', interactive: true },
          locked: false,
          frozen: false
        }
      ],
      entities: [
        {
          id: 'test-app',
          type: 'app',
          blueprint: 'test-bp',
          position: [0, 0, 0],
          pinned: true
        }
      ],
      collections: {}
    })

    const app = client.getEntity('test-app')
    assertInstanceOf(app, App)

    // Blueprint data accessible through app
    assertEqual(app.getBlueprintName(), 'Interactive App')
    assertEqual(app.getBlueprintProperty('color'), 'blue')
    assertEqual(app.getBlueprintProperty('interactive'), true)
    assertEqual(app.isLocked(), false)
    assertEqual(app.isPinned(), true)
  }))

  results.push(await test('error-free state transitions', () => {
    const client = new HyperfyClient('wss://world.hyperfy.io')

    // Snapshot
    client.handleSnapshot({
      id: 'player-1',
      serverTime: Date.now(),
      assetsUrl: 'https://assets.hyperfy.io',
      apiUrl: 'https://api.hyperfy.io',
      maxUploadSize: 10485760,
      settings: { test: true },
      blueprints: [],
      entities: [{ id: 'player-1', type: 'player' }],
      collections: {}
    })
    assertEqual(client.isReady(), true)

    // Settings update
    client.handleSettingsModified({ key: 'newSetting', value: 'testValue' })
    assertEqual(client.getSetting('newSetting'), 'testValue')

    // Entity operations
    client.handleEntityAdded({ id: 'app-1', type: 'app', blueprint: 'bp-1' })
    assertEqual(client.entities.size, 2)

    client.handleEntityModified({ id: 'app-1', position: [1, 2, 3] })
    assertEqual(client.getEntity('app-1').position, [1, 2, 3])

    client.handleEntityRemoved('app-1')
    assertEqual(client.entities.size, 1)

    // Blueprint operations
    client.handleBlueprintAdded({ id: 'new-bp', name: 'New' })
    assertEqual(client.blueprints.size, 1)

    client.handleBlueprintModified({ id: 'new-bp', name: 'Updated' })
    assertEqual(client.getBlueprint('new-bp').name, 'Updated')

    // Chat operations
    client.handleChatAdded({ userId: '1', name: 'User', text: 'Message' })
    assertEqual(client.chat.getMessageCount(), 1)

    client.handleChatCleared()
    assertEqual(client.chat.getMessageCount(), 0)

    // All transitions successful, no errors
    assert(true, 'All state transitions completed without errors')
  }))
})

const summary = createTestSummary(results)
console.log(`\n${'='.repeat(60)}`)
console.log(`Results: ${summary.passed}/${summary.total} passed`)

if (summary.failed > 0) {
  process.exit(1)
}
