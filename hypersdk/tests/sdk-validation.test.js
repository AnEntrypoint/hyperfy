/**
 * Comprehensive HyperSDK Validation Tests
 * Tests all SDK core functionality including classes, re-exports, and integration
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { HyperfyClient, Entity, Player, App, Chat, WebSocketManager, Packets } from '../src/index.js'

// Mock WebSocket for testing
global.WebSocket = class MockWebSocket {
  constructor(url) {
    this.url = url
    this.readyState = 0 // CONNECTING
    this.binaryType = 'arraybuffer'
    setTimeout(() => {
      this.readyState = 1 // OPEN
      if (this.onopen) this.onopen()
    }, 10)
  }

  on(event, handler) {
    this[`on${event}`] = handler
  }

  send(data) {
    // Mock send
  }

  close() {
    this.readyState = 3 // CLOSED
    if (this.onclose) this.onclose(1000, 'Normal closure')
  }
}

global.WebSocket.CONNECTING = 0
global.WebSocket.OPEN = 1
global.WebSocket.CLOSING = 2
global.WebSocket.CLOSED = 3

describe('HyperSDK Core Validation', () => {

  describe('HyperfyClient', () => {
    test('should instantiate with default options', () => {
      const client = new HyperfyClient('wss://world.hyperfy.io')
      expect(client).toBeDefined()
      expect(client.url).toBe('wss://world.hyperfy.io')
      expect(client.options.name).toBe('Node.js SDK')
      expect(client.options.autoReconnect).toBe(true)
    })

    test('should instantiate with custom options', () => {
      const client = new HyperfyClient('wss://world.hyperfy.io', {
        name: 'TestBot',
        authToken: 'token-123',
        avatar: 'https://example.com/avatar.png',
        autoReconnect: false
      })

      expect(client.options.name).toBe('TestBot')
      expect(client.options.authToken).toBe('token-123')
      expect(client.options.avatar).toBe('https://example.com/avatar.png')
      expect(client.options.autoReconnect).toBe(false)
    })

    test('should build WebSocket URL with parameters', () => {
      const client = new HyperfyClient('wss://world.hyperfy.io', {
        name: 'TestBot',
        authToken: 'token-123'
      })

      const url = client.buildWebSocketUrl()
      expect(url).toContain('authToken=token-123')
      expect(url).toContain('name=TestBot')
    })

    test('should have correct initial state', () => {
      const client = new HyperfyClient('wss://world.hyperfy.io')

      expect(client.connected).toBe(false)
      expect(client.ready).toBe(false)
      expect(client.player).toBe(null)
      expect(client.entities).toBeInstanceOf(Map)
      expect(client.blueprints).toBeInstanceOf(Map)
      expect(client.entities.size).toBe(0)
      expect(client.blueprints.size).toBe(0)
    })

    test('should have WebSocketManager', () => {
      const client = new HyperfyClient('wss://world.hyperfy.io')
      expect(client.wsManager).toBeInstanceOf(WebSocketManager)
    })

    test('should expose isConnected() method', () => {
      const client = new HyperfyClient('wss://world.hyperfy.io')
      expect(typeof client.isConnected).toBe('function')
      expect(client.isConnected()).toBe(false)
    })

    test('should expose isReady() method', () => {
      const client = new HyperfyClient('wss://world.hyperfy.io')
      expect(typeof client.isReady).toBe('function')
      expect(client.isReady()).toBe(false)
    })

    test('should expose getClientInfo() method', () => {
      const client = new HyperfyClient('wss://world.hyperfy.io')
      const info = client.getClientInfo()

      expect(info).toBeDefined()
      expect(info.connected).toBe(false)
      expect(info.ready).toBe(false)
      expect(info.playerCount).toBe(0)
      expect(info.appCount).toBe(0)
      expect(info.totalEntities).toBe(0)
      expect(info.blueprintCount).toBe(0)
      expect(info.url).toBe('wss://world.hyperfy.io')
    })

    test('should handle snapshot correctly', () => {
      const client = new HyperfyClient('wss://world.hyperfy.io')

      const mockSnapshot = {
        id: 'player-123',
        serverTime: Date.now(),
        assetsUrl: 'https://assets.hyperfy.io',
        apiUrl: 'https://api.hyperfy.io',
        maxUploadSize: 10485760,
        settings: { foo: 'bar' },
        blueprints: [
          { id: 'bp-1', name: 'Test Blueprint' }
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

      expect(client.ready).toBe(true)
      expect(client.player).toBeDefined()
      expect(client.player).toBeInstanceOf(Player)
      expect(client.entities.size).toBe(1)
      expect(client.blueprints.size).toBe(1)
      expect(client.settings.foo).toBe('bar')
      expect(client.assetsUrl).toBe('https://assets.hyperfy.io')
      expect(client.apiUrl).toBe('https://api.hyperfy.io')
    })
  })

  describe('Entity', () => {
    let client

    beforeEach(() => {
      client = new HyperfyClient('wss://world.hyperfy.io')
    })

    test('should create entity with default values', () => {
      const entity = new Entity(client, { id: 'entity-1' })

      expect(entity.id).toBe('entity-1')
      expect(entity.type).toBe('entity')
      expect(entity.position).toEqual([0, 0, 0])
      expect(entity.quaternion).toEqual([0, 0, 0, 1])
      expect(entity.scale).toEqual([1, 1, 1])
      expect(entity.state).toEqual({})
    })

    test('should create entity with custom values', () => {
      const entity = new Entity(client, {
        id: 'entity-1',
        type: 'custom',
        position: [1, 2, 3],
        quaternion: [0, 1, 0, 0],
        scale: [2, 2, 2],
        state: { health: 100 }
      })

      expect(entity.type).toBe('custom')
      expect(entity.position).toEqual([1, 2, 3])
      expect(entity.quaternion).toEqual([0, 1, 0, 0])
      expect(entity.scale).toEqual([2, 2, 2])
      expect(entity.state.health).toBe(100)
    })

    test('should get and set position', () => {
      const entity = new Entity(client, { id: 'entity-1' })

      expect(entity.getPosition()).toEqual([0, 0, 0])
      entity.position = [5, 10, 15]
      expect(entity.getPosition()).toEqual([5, 10, 15])
    })

    test('should get and set state', () => {
      const entity = new Entity(client, { id: 'entity-1' })

      entity.state = { foo: 'bar' }
      expect(entity.getState('foo')).toBe('bar')
      expect(entity.getState()).toEqual({ foo: 'bar' })
    })

    test('should check entity type correctly', () => {
      const entity = new Entity(client, { id: 'entity-1', type: 'entity' })

      expect(entity.isApp()).toBe(false)
      expect(entity.isPlayer()).toBe(false)
    })

    test('should calculate distance to other entity', () => {
      const entity1 = new Entity(client, {
        id: 'entity-1',
        position: [0, 0, 0]
      })
      const entity2 = new Entity(client, {
        id: 'entity-2',
        position: [3, 4, 0]
      })

      expect(entity1.distanceTo(entity2)).toBe(5)
    })

    test('should serialize to JSON', () => {
      const entity = new Entity(client, {
        id: 'entity-1',
        type: 'custom',
        name: 'Test Entity',
        position: [1, 2, 3]
      })

      const json = entity.toJSON()
      expect(json.id).toBe('entity-1')
      expect(json.type).toBe('custom')
      expect(json.name).toBe('Test Entity')
      expect(json.position).toEqual([1, 2, 3])
    })
  })

  describe('Player', () => {
    let client

    beforeEach(() => {
      client = new HyperfyClient('wss://world.hyperfy.io')
    })

    test('should create player with default values', () => {
      const player = new Player(client, { id: 'player-1' })

      expect(player.id).toBe('player-1')
      expect(player.type).toBe('player')
      expect(player.health).toBe(100)
      expect(player.rank).toBe(0)
    })

    test('should create player with custom values', () => {
      const player = new Player(client, {
        id: 'player-1',
        health: 75,
        rank: 2,
        avatar: 'https://example.com/avatar.png'
      })

      expect(player.health).toBe(75)
      expect(player.rank).toBe(2)
      expect(player.avatar).toBe('https://example.com/avatar.png')
    })

    test('should check player type correctly', () => {
      const player = new Player(client, { id: 'player-1' })

      expect(player.isPlayer()).toBe(true)
      expect(player.isApp()).toBe(false)
    })

    test('should check rank permissions correctly', () => {
      const visitor = new Player(client, { id: 'player-1', rank: 0 })
      const builder = new Player(client, { id: 'player-2', rank: 1 })
      const admin = new Player(client, { id: 'player-3', rank: 2 })

      expect(visitor.isVisitor()).toBe(true)
      expect(visitor.isBuilder()).toBe(false)
      expect(visitor.isAdmin()).toBe(false)

      expect(builder.isVisitor()).toBe(false)
      expect(builder.isBuilder()).toBe(true)
      expect(builder.isAdmin()).toBe(false)

      expect(admin.isVisitor()).toBe(false)
      expect(admin.isBuilder()).toBe(true)
      expect(admin.isAdmin()).toBe(true)
    })

    test('should get correct rank names', () => {
      const visitor = new Player(client, { id: 'player-1', rank: 0 })
      const builder = new Player(client, { id: 'player-2', rank: 1 })
      const admin = new Player(client, { id: 'player-3', rank: 2 })

      expect(visitor.getRankName()).toBe('Visitor')
      expect(builder.getRankName()).toBe('Builder')
      expect(admin.getRankName()).toBe('Admin')
    })

    test('should check permissions correctly', () => {
      const visitor = new Player(client, { id: 'player-1', rank: 0 })
      const builder = new Player(client, { id: 'player-2', rank: 1 })
      const admin = new Player(client, { id: 'player-3', rank: 2 })

      expect(visitor.hasPermission('admin')).toBe(false)
      expect(visitor.hasPermission('build')).toBe(false)
      expect(visitor.hasPermission('chat')).toBe(true)

      expect(builder.hasPermission('admin')).toBe(false)
      expect(builder.hasPermission('build')).toBe(true)
      expect(builder.hasPermission('chat')).toBe(true)

      expect(admin.hasPermission('admin')).toBe(true)
      expect(admin.hasPermission('build')).toBe(true)
      expect(admin.hasPermission('chat')).toBe(true)
    })

    test('should get and set health', () => {
      const player = new Player(client, { id: 'player-1' })

      expect(player.getHealth()).toBe(100)
      player.health = 50
      expect(player.getHealth()).toBe(50)
    })

    test('should handle avatar correctly', () => {
      const player = new Player(client, {
        id: 'player-1',
        avatar: 'https://example.com/avatar1.png',
        sessionAvatar: 'https://example.com/avatar2.png'
      })

      expect(player.getAvatar()).toBe('https://example.com/avatar2.png')

      player.sessionAvatar = null
      expect(player.getAvatar()).toBe('https://example.com/avatar1.png')
    })
  })

  describe('App', () => {
    let client

    beforeEach(() => {
      client = new HyperfyClient('wss://world.hyperfy.io')
      client.blueprints.set('bp-1', {
        id: 'bp-1',
        name: 'Test App',
        desc: 'Test Description',
        author: 'Test Author',
        props: { color: 'red' }
      })
    })

    test('should create app with default values', () => {
      const app = new App(client, { id: 'app-1', blueprint: 'bp-1' })

      expect(app.id).toBe('app-1')
      expect(app.type).toBe('app')
      expect(app.pinned).toBe(false)
    })

    test('should check app type correctly', () => {
      const app = new App(client, { id: 'app-1', blueprint: 'bp-1' })

      expect(app.isApp()).toBe(true)
      expect(app.isPlayer()).toBe(false)
    })

    test('should get blueprint information', () => {
      const app = new App(client, { id: 'app-1', blueprint: 'bp-1' })

      expect(app.getBlueprintName()).toBe('Test App')
      expect(app.getBlueprintDescription()).toBe('Test Description')
      expect(app.getBlueprintAuthor()).toBe('Test Author')
    })

    test('should get blueprint properties', () => {
      const app = new App(client, { id: 'app-1', blueprint: 'bp-1' })

      expect(app.getBlueprintProps()).toEqual({ color: 'red' })
      expect(app.getBlueprintProperty('color')).toBe('red')
    })

    test('should handle pinned state', () => {
      const app = new App(client, { id: 'app-1', blueprint: 'bp-1' })

      expect(app.isPinned()).toBe(false)
      app.pinned = true
      expect(app.isPinned()).toBe(true)
    })

    test('should get app info', () => {
      const app = new App(client, {
        id: 'app-1',
        blueprint: 'bp-1',
        position: [1, 2, 3]
      })

      const info = app.getAppInfo()
      expect(info.id).toBe('app-1')
      expect(info.name).toBe('Test App')
      expect(info.position).toEqual([1, 2, 3])
      expect(info.pinned).toBe(false)
    })
  })

  describe('Chat', () => {
    let client
    let chat

    beforeEach(() => {
      client = new HyperfyClient('wss://world.hyperfy.io')
      chat = new Chat(client)
    })

    test('should create chat with default values', () => {
      expect(chat.messages).toEqual([])
      expect(chat.maxMessages).toBe(100)
    })

    test('should add messages correctly', () => {
      const message = chat.addMessage({
        userId: 'user-1',
        name: 'Test User',
        text: 'Hello World',
        timestamp: Date.now()
      })

      expect(chat.messages.length).toBe(1)
      expect(message.text).toBe('Hello World')
      expect(message.name).toBe('Test User')
    })

    test('should get messages', () => {
      chat.addMessage({ userId: 'user-1', name: 'User 1', text: 'Message 1' })
      chat.addMessage({ userId: 'user-2', name: 'User 2', text: 'Message 2' })

      const messages = chat.getMessages()
      expect(messages.length).toBe(2)
      expect(messages[0].text).toBe('Message 1')
      expect(messages[1].text).toBe('Message 2')
    })

    test('should get last message', () => {
      chat.addMessage({ userId: 'user-1', name: 'User 1', text: 'Message 1' })
      chat.addMessage({ userId: 'user-2', name: 'User 2', text: 'Message 2' })

      const lastMessage = chat.getLastMessage()
      expect(lastMessage.text).toBe('Message 2')
    })

    test('should filter messages by user', () => {
      chat.addMessage({ userId: 'user-1', name: 'User 1', text: 'Message 1' })
      chat.addMessage({ userId: 'user-2', name: 'User 2', text: 'Message 2' })
      chat.addMessage({ userId: 'user-1', name: 'User 1', text: 'Message 3' })

      const user1Messages = chat.getMessagesByUser('user-1')
      expect(user1Messages.length).toBe(2)
      expect(user1Messages[0].text).toBe('Message 1')
      expect(user1Messages[1].text).toBe('Message 3')
    })

    test('should search messages', () => {
      chat.addMessage({ userId: 'user-1', name: 'User 1', text: 'Hello World' })
      chat.addMessage({ userId: 'user-2', name: 'User 2', text: 'Goodbye World' })
      chat.addMessage({ userId: 'user-3', name: 'User 3', text: 'Hello Everyone' })

      const results = chat.searchMessages('Hello')
      expect(results.length).toBe(2)
      expect(results[0].text).toBe('Hello World')
      expect(results[1].text).toBe('Hello Everyone')
    })

    test('should clear messages', () => {
      chat.addMessage({ userId: 'user-1', name: 'User 1', text: 'Message 1' })
      chat.addMessage({ userId: 'user-2', name: 'User 2', text: 'Message 2' })

      expect(chat.messages.length).toBe(2)
      chat.clear()
      expect(chat.messages.length).toBe(0)
    })

    test('should respect max messages limit', () => {
      chat.setMaxMessages(5)

      for (let i = 0; i < 10; i++) {
        chat.addMessage({ userId: `user-${i}`, name: `User ${i}`, text: `Message ${i}` })
      }

      expect(chat.messages.length).toBe(5)
      expect(chat.messages[0].text).toBe('Message 5')
      expect(chat.messages[4].text).toBe('Message 9')
    })

    test('should get message count', () => {
      expect(chat.getMessageCount()).toBe(0)

      chat.addMessage({ userId: 'user-1', name: 'User 1', text: 'Message 1' })
      expect(chat.getMessageCount()).toBe(1)

      chat.addMessage({ userId: 'user-2', name: 'User 2', text: 'Message 2' })
      expect(chat.getMessageCount()).toBe(2)
    })

    test('should format messages correctly', () => {
      const message = {
        userId: 'user-1',
        name: 'Admin User',
        text: 'Hello',
        timestamp: Date.now(),
        rank: 2
      }

      const formatted = chat.formatMessage(message, false)
      expect(formatted).toContain('[Admin]')
      expect(formatted).toContain('Admin User')
      expect(formatted).toContain('Hello')
    })

    test('should export messages as JSON', () => {
      chat.addMessage({ userId: 'user-1', name: 'User 1', text: 'Message 1' })
      chat.addMessage({ userId: 'user-2', name: 'User 2', text: 'Message 2' })

      const json = chat.exportMessages('json')
      const parsed = JSON.parse(json)
      expect(parsed.length).toBe(2)
      expect(parsed[0].text).toBe('Message 1')
    })

    test('should export messages as text', () => {
      chat.addMessage({ userId: 'user-1', name: 'User 1', text: 'Message 1' })
      chat.addMessage({ userId: 'user-2', name: 'User 2', text: 'Message 2' })

      const text = chat.exportMessages('text')
      expect(text).toContain('User 1')
      expect(text).toContain('Message 1')
      expect(text).toContain('User 2')
      expect(text).toContain('Message 2')
    })
  })

  describe('WebSocketManager', () => {
    test('should create WebSocketManager with default options', () => {
      const wsManager = new WebSocketManager('wss://world.hyperfy.io')

      expect(wsManager.url).toBe('wss://world.hyperfy.io')
      expect(wsManager.connected).toBe(false)
      expect(wsManager.maxReconnectAttempts).toBe(5)
      expect(wsManager.reconnectDelay).toBe(1000)
    })

    test('should create WebSocketManager with custom options', () => {
      const wsManager = new WebSocketManager('wss://world.hyperfy.io', {
        maxReconnectAttempts: 10,
        reconnectDelay: 2000
      })

      expect(wsManager.maxReconnectAttempts).toBe(10)
      expect(wsManager.reconnectDelay).toBe(2000)
    })

    test('should have correct connection state methods', () => {
      const wsManager = new WebSocketManager('wss://world.hyperfy.io')

      expect(typeof wsManager.isConnected).toBe('function')
      expect(typeof wsManager.getConnectionState).toBe('function')
      expect(wsManager.isConnected()).toBe(false)
    })

    test('should have queue for messages', () => {
      const wsManager = new WebSocketManager('wss://world.hyperfy.io')

      expect(wsManager.queue).toEqual([])
    })

    test('should get stats', () => {
      const wsManager = new WebSocketManager('wss://world.hyperfy.io')

      const stats = wsManager.getStats()
      expect(stats).toBeDefined()
      expect(stats.connected).toBe(false)
      expect(stats.reconnectAttempts).toBe(0)
      expect(stats.queueLength).toBe(0)
      expect(stats.url).toBe('wss://world.hyperfy.io')
    })
  })

  describe('Packets', () => {
    test('should have writePacket method', () => {
      expect(typeof Packets.writePacket).toBe('function')
    })

    test('should have readPacket method', () => {
      expect(typeof Packets.readPacket).toBe('function')
    })
  })

  describe('Re-exports Validation', () => {
    test('should export all core SDK classes', async () => {
      const exports = await import('../src/index.js')

      expect(exports.HyperfyClient).toBeDefined()
      expect(exports.Entity).toBeDefined()
      expect(exports.Player).toBeDefined()
      expect(exports.App).toBeDefined()
      expect(exports.Chat).toBeDefined()
      expect(exports.WebSocketManager).toBeDefined()
      expect(exports.Packets).toBeDefined()
    })

    test('should export default as HyperfyClient', async () => {
      const exports = await import('../src/index.js')

      expect(exports.default).toBe(exports.HyperfyClient)
    })

    test('should re-export Hyperfy core entities', async () => {
      const exports = await import('../src/index.js')

      expect(exports.PlayerLocal).toBeDefined()
      expect(exports.HyperfyCoreEntity).toBeDefined()
      expect(exports.World).toBeDefined()
      expect(exports.createClientWorld).toBeDefined()
    })

    test('should re-export Hyperfy systems', async () => {
      const exports = await import('../src/index.js')

      expect(exports.Client).toBeDefined()
      expect(exports.ClientActions).toBeDefined()
      expect(exports.ClientAudio).toBeDefined()
      expect(exports.ClientBuilder).toBeDefined()
      expect(exports.ClientControls).toBeDefined()
      expect(exports.ClientEnvironment).toBeDefined()
      expect(exports.ClientGraphics).toBeDefined()
      expect(exports.ClientLiveKit).toBeDefined()
      expect(exports.ClientLoader).toBeDefined()
      expect(exports.ClientNetwork).toBeDefined()
      expect(exports.ClientPointer).toBeDefined()
      expect(exports.ClientPrefs).toBeDefined()
      expect(exports.ClientStats).toBeDefined()
      expect(exports.ClientTarget).toBeDefined()
      expect(exports.ClientUI).toBeDefined()
    })
  })

  describe('Integration Tests', () => {
    test('should create client and handle complete flow', () => {
      const client = new HyperfyClient('wss://world.hyperfy.io', {
        name: 'TestBot',
        authToken: 'test-token'
      })

      // Initial state
      expect(client.isConnected()).toBe(false)
      expect(client.isReady()).toBe(false)

      // Simulate snapshot
      const mockSnapshot = {
        id: 'player-123',
        serverTime: Date.now(),
        assetsUrl: 'https://assets.hyperfy.io',
        apiUrl: 'https://api.hyperfy.io',
        maxUploadSize: 10485760,
        settings: { worldName: 'Test World' },
        blueprints: [
          { id: 'bp-1', name: 'Test Blueprint', desc: 'A test blueprint' }
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

      // Verify state after snapshot
      expect(client.isReady()).toBe(true)
      expect(client.player).toBeDefined()
      expect(client.player.isAdmin()).toBe(true)
      expect(client.player.getName()).toBe('TestBot')
      expect(client.entities.size).toBe(2)
      expect(client.getPlayers().length).toBe(1)
      expect(client.getApps().length).toBe(1)
      expect(client.blueprints.size).toBe(1)

      // Verify chat is initialized
      expect(client.chat).toBeDefined()
      expect(client.chat).toBeInstanceOf(Chat)

      // Test entity retrieval
      const player = client.getEntity('player-123')
      expect(player).toBeInstanceOf(Player)
      expect(player.getHealth()).toBe(100)

      const app = client.getEntity('app-1')
      expect(app).toBeInstanceOf(App)
      expect(app.getBlueprintName()).toBe('Test Blueprint')

      // Test client info
      const info = client.getClientInfo()
      expect(info.ready).toBe(true)
      expect(info.playerCount).toBe(1)
      expect(info.appCount).toBe(1)
      expect(info.totalEntities).toBe(2)
      expect(info.blueprintCount).toBe(1)
    })

    test('should handle entity added event', () => {
      const client = new HyperfyClient('wss://world.hyperfy.io')

      // Initialize with snapshot
      client.handleSnapshot({
        id: 'player-123',
        serverTime: Date.now(),
        assetsUrl: 'https://assets.hyperfy.io',
        apiUrl: 'https://api.hyperfy.io',
        maxUploadSize: 10485760,
        settings: {},
        blueprints: [],
        entities: [
          { id: 'player-123', type: 'player' }
        ],
        collections: {}
      })

      // Add new entity
      client.handleEntityAdded({
        id: 'app-2',
        type: 'app',
        blueprint: 'bp-1',
        position: [10, 0, 0]
      })

      expect(client.entities.size).toBe(2)
      const app = client.getEntity('app-2')
      expect(app).toBeInstanceOf(App)
      expect(app.position).toEqual([10, 0, 0])
    })

    test('should handle entity modified event', () => {
      const client = new HyperfyClient('wss://world.hyperfy.io')

      // Initialize with snapshot
      client.handleSnapshot({
        id: 'player-123',
        serverTime: Date.now(),
        assetsUrl: 'https://assets.hyperfy.io',
        apiUrl: 'https://api.hyperfy.io',
        maxUploadSize: 10485760,
        settings: {},
        blueprints: [],
        entities: [
          { id: 'app-1', type: 'app', position: [0, 0, 0] }
        ],
        collections: {}
      })

      // Modify entity
      client.handleEntityModified({
        id: 'app-1',
        position: [5, 5, 5]
      })

      const app = client.getEntity('app-1')
      expect(app.position).toEqual([5, 5, 5])
    })

    test('should handle entity removed event', () => {
      const client = new HyperfyClient('wss://world.hyperfy.io')

      // Initialize with snapshot
      client.handleSnapshot({
        id: 'player-123',
        serverTime: Date.now(),
        assetsUrl: 'https://assets.hyperfy.io',
        apiUrl: 'https://api.hyperfy.io',
        maxUploadSize: 10485760,
        settings: {},
        blueprints: [],
        entities: [
          { id: 'app-1', type: 'app' },
          { id: 'app-2', type: 'app' }
        ],
        collections: {}
      })

      expect(client.entities.size).toBe(2)

      // Remove entity
      client.handleEntityRemoved('app-1')

      expect(client.entities.size).toBe(1)
      expect(client.getEntity('app-1')).toBeUndefined()
      expect(client.getEntity('app-2')).toBeDefined()
    })

    test('should handle chat messages', () => {
      const client = new HyperfyClient('wss://world.hyperfy.io')

      // Initialize with snapshot
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

      // Add chat message
      client.handleChatAdded({
        userId: 'user-1',
        name: 'Test User',
        text: 'Hello World',
        timestamp: Date.now()
      })

      expect(client.chat.getMessageCount()).toBe(1)
      const lastMessage = client.chat.getLastMessage()
      expect(lastMessage.text).toBe('Hello World')
      expect(lastMessage.name).toBe('Test User')
    })
  })
})
