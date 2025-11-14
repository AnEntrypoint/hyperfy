/**
 * Entity Evaluation Tests
 * Tests the base Entity class
 */

import { HyperfyClient } from '../src/client/HyperfyClient.js'
import { Entity } from '../src/client/Entity.js'
import { test, describe, assert, assertEqual, assertInstanceOf, setupMockWebSocket, createTestSummary } from './test-utils.js'

setupMockWebSocket()

const results = []
let client

await describe('🎯 Entity Tests', async () => {
  results.push(await test('creates entity with default values', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const entity = new Entity(client, { id: 'entity-1' })
    assertEqual(entity.id, 'entity-1')
    assertEqual(entity.type, 'entity')
    assertEqual(entity.position, [0, 0, 0])
    assertEqual(entity.quaternion, [0, 0, 0, 1])
    assertEqual(entity.scale, [1, 1, 1])
    assertEqual(entity.state, {})
  }))

  results.push(await test('creates entity with custom values', () => {
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
  }))

  results.push(await test('getPosition() returns position array', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const entity = new Entity(client, { id: 'entity-1', position: [5, 10, 15] })
    assertEqual(entity.getPosition(), [5, 10, 15])
  }))

  results.push(await test('getQuaternion() returns quaternion array', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const entity = new Entity(client, { id: 'entity-1', quaternion: [0, 1, 0, 0] })
    assertEqual(entity.getQuaternion(), [0, 1, 0, 0])
  }))

  results.push(await test('getScale() returns scale array', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const entity = new Entity(client, { id: 'entity-1', scale: [2, 2, 2] })
    assertEqual(entity.getScale(), [2, 2, 2])
  }))

  results.push(await test('getState() with key returns specific state value', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const entity = new Entity(client, { id: 'entity-1', state: { foo: 'bar', count: 42 } })
    assertEqual(entity.getState('foo'), 'bar')
    assertEqual(entity.getState('count'), 42)
  }))

  results.push(await test('getState() without key returns full state object', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const entity = new Entity(client, { id: 'entity-1', state: { foo: 'bar' } })
    assertEqual(entity.getState(), { foo: 'bar' })
  }))

  results.push(await test('type checking methods work correctly', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const entity = new Entity(client, { id: 'entity-1', type: 'entity' })
    assertEqual(entity.isApp(), false)
    assertEqual(entity.isPlayer(), false)
  }))

  results.push(await test('calculates distance to other entity', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const entity1 = new Entity(client, { id: 'entity-1', position: [0, 0, 0] })
    const entity2 = new Entity(client, { id: 'entity-2', position: [3, 4, 0] })
    assertEqual(entity1.distanceTo(entity2), 5)
  }))

  results.push(await test('getBoundingSphere() returns sphere data', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const entity = new Entity(client, { id: 'entity-1', position: [1, 2, 3], scale: [2, 3, 4] })
    const sphere = entity.getBoundingSphere()
    assertEqual(sphere.center, [1, 2, 3])
    assertEqual(sphere.radius, 4)
  }))

  results.push(await test('toJSON() serializes entity correctly', () => {
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
  }))

  results.push(await test('update() modifies entity properties', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const entity = new Entity(client, { id: 'entity-1', position: [0, 0, 0] })
    entity.update({ position: [5, 5, 5], name: 'Updated' })
    assertEqual(entity.position, [5, 5, 5])
    assertEqual(entity.name, 'Updated')
  }))

  results.push(await test('toString() returns readable string', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    const entity = new Entity(client, { id: 'entity-123', type: 'custom', name: 'Test' })
    const str = entity.toString()
    assert(str.includes('custom'), 'Should include type')
    assert(str.includes('Test'), 'Should include name')
  }))
})

const summary = createTestSummary(results)
console.log(`\n${'='.repeat(60)}`)
console.log(`Results: ${summary.passed}/${summary.total} passed`)

if (summary.failed > 0) {
  process.exit(1)
}
