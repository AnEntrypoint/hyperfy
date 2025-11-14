/**
 * App Evaluation Tests
 * Tests the App class and blueprint integration
 */

import { HyperfyClient } from '../src/client/HyperfyClient.js'
import { App } from '../src/client/App.js'
import { test, describe, assert, assertEqual, setupMockWebSocket, createTestSummary } from './test-utils.js'

setupMockWebSocket()

const results = []
let client

await describe('📱 App Tests', async () => {
  results.push(await test('creates app with default values', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const app = new App(client, { id: 'app-1', blueprint: 'bp-1' })
    assertEqual(app.id, 'app-1')
    assertEqual(app.type, 'app')
    assertEqual(app.pinned, false)
    assertEqual(app.blueprintId, 'bp-1')
  }))

  results.push(await test('isApp() returns true', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const app = new App(client, { id: 'app-1', blueprint: 'bp-1' })
    assertEqual(app.isApp(), true)
    assertEqual(app.isPlayer(), false)
  }))

  results.push(await test('gets blueprint information', () => {
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
  }))

  results.push(await test('gets blueprint properties', () => {
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
  }))

  results.push(await test('handles pinned state', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const app = new App(client, { id: 'app-1', blueprint: 'bp-1', pinned: false })

    assertEqual(app.isPinned(), false)
    app.pinned = true
    assertEqual(app.isPinned(), true)
  }))

  results.push(await test('getAppInfo() returns app summary', () => {
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
  }))

  results.push(await test('checks blueprint flags correctly', () => {
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
  }))

  results.push(await test('toJSON() includes app-specific data', () => {
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
  }))

  results.push(await test('update() updates app-specific properties', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const app = new App(client, { id: 'app-1', blueprint: 'bp-1', pinned: false })

    app.update({ pinned: true, mover: 'player-123' })
    assertEqual(app.pinned, true)
    assertEqual(app.mover, 'player-123')
  }))

  results.push(await test('generateId() creates unique ID', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const app = new App(client, { id: 'app-1', blueprint: 'bp-1' })

    const id1 = app.generateId()
    const id2 = app.generateId()
    assert(id1 !== id2, 'IDs should be unique')
    assert(typeof id1 === 'string', 'ID should be a string')
  }))
})

const summary = createTestSummary(results)
console.log(`\n${'='.repeat(60)}`)
console.log(`Results: ${summary.passed}/${summary.total} passed`)

if (summary.failed > 0) {
  process.exit(1)
}
