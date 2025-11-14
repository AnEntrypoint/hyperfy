/**
 * Player Evaluation Tests
 * Tests the Player class and rank/permission system
 */

import { HyperfyClient } from '../src/client/HyperfyClient.js'
import { Player } from '../src/client/Player.js'
import { test, describe, assert, assertEqual, setupMockWebSocket, createTestSummary } from './test-utils.js'

setupMockWebSocket()

const results = []
let client

await describe('👤 Player Tests', async () => {
  results.push(await test('creates player with default values', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const player = new Player(client, { id: 'player-1' })
    assertEqual(player.id, 'player-1')
    assertEqual(player.type, 'player')
    assertEqual(player.health, 100)
    assertEqual(player.rank, 0)
    assertEqual(player.avatar, null)
  }))

  results.push(await test('creates player with custom values', () => {
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
  }))

  results.push(await test('isPlayer() returns true', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const player = new Player(client, { id: 'player-1' })
    assertEqual(player.isPlayer(), true)
    assertEqual(player.isApp(), false)
  }))

  results.push(await test('rank permissions - Visitor (rank 0)', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const visitor = new Player(client, { id: 'player-1', rank: 0 })
    assertEqual(visitor.isVisitor(), true)
    assertEqual(visitor.isBuilder(), false)
    assertEqual(visitor.isAdmin(), false)
    assertEqual(visitor.getRankName(), 'Visitor')
  }))

  results.push(await test('rank permissions - Builder (rank 1)', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const builder = new Player(client, { id: 'player-2', rank: 1 })
    assertEqual(builder.isVisitor(), false)
    assertEqual(builder.isBuilder(), true)
    assertEqual(builder.isAdmin(), false)
    assertEqual(builder.getRankName(), 'Builder')
  }))

  results.push(await test('rank permissions - Admin (rank 2)', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const admin = new Player(client, { id: 'player-3', rank: 2 })
    assertEqual(admin.isVisitor(), false)
    assertEqual(admin.isBuilder(), true)  // Admins also have builder permissions
    assertEqual(admin.isAdmin(), true)
    assertEqual(admin.getRankName(), 'Admin')
  }))

  results.push(await test('hasPermission() checks permissions correctly', () => {
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
  }))

  results.push(await test('getHealth() and health management', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const player = new Player(client, { id: 'player-1', health: 100 })
    assertEqual(player.getHealth(), 100)
    player.health = 50
    assertEqual(player.getHealth(), 50)
  }))

  results.push(await test('avatar management - prioritizes sessionAvatar', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const player = new Player(client, {
      id: 'player-1',
      avatar: 'https://example.com/avatar1.png',
      sessionAvatar: 'https://example.com/avatar2.png'
    })
    assertEqual(player.getAvatar(), 'https://example.com/avatar2.png')

    player.sessionAvatar = null
    assertEqual(player.getAvatar(), 'https://example.com/avatar1.png')
  }))

  results.push(await test('getSessionTime() returns elapsed time', async () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const player = new Player(client, { id: 'player-1', enteredAt: Date.now() - 1000 })
    const sessionTime = player.getSessionTime()
    assert(sessionTime >= 1000, 'Session time should be at least 1 second')
  }))

  results.push(await test('getFormattedSessionTime() formats time correctly', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const player = new Player(client, { id: 'player-1', enteredAt: Date.now() - 3661000 })
    const formatted = player.getFormattedSessionTime()
    assert(formatted.includes('h'), 'Should include hours')
  }))

  results.push(await test('getDisplayName() returns player name', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const player = new Player(client, { id: 'player-123', name: 'TestPlayer' })
    assertEqual(player.getDisplayName(), 'TestPlayer')
  }))

  results.push(await test('toJSON() includes player-specific data', () => {
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
  }))

  results.push(await test('update() updates player-specific properties', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const player = new Player(client, { id: 'player-1', health: 100, rank: 0 })
    player.update({ health: 50, rank: 2 })
    assertEqual(player.health, 50)
    assertEqual(player.rank, 2)
  }))
})

const summary = createTestSummary(results)
console.log(`\n${'='.repeat(60)}`)
console.log(`Results: ${summary.passed}/${summary.total} passed`)

if (summary.failed > 0) {
  process.exit(1)
}
