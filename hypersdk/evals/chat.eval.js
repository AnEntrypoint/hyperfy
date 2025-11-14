/**
 * Chat Evaluation Tests
 * Tests the Chat message management system
 */

import { HyperfyClient } from '../src/client/HyperfyClient.js'
import { Chat } from '../src/client/Chat.js'
import { test, describe, assert, assertEqual, setupMockWebSocket, createTestSummary } from './test-utils.js'

setupMockWebSocket()

const results = []
let client, chat

await describe('💬 Chat Tests', async () => {
  results.push(await test('creates chat with default values', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    chat = new Chat(client)
    assertEqual(chat.messages, [])
    assertEqual(chat.maxMessages, 100)
  }))

  results.push(await test('addMessage() adds message correctly', () => {
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
  }))

  results.push(await test('getMessages() returns all messages', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    chat = new Chat(client)
    chat.addMessage({ userId: 'user-1', name: 'User 1', text: 'Message 1' })
    chat.addMessage({ userId: 'user-2', name: 'User 2', text: 'Message 2' })

    const messages = chat.getMessages()
    assertEqual(messages.length, 2)
    assertEqual(messages[0].text, 'Message 1')
    assertEqual(messages[1].text, 'Message 2')
  }))

  results.push(await test('getMessages(limit) returns limited messages', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    chat = new Chat(client)
    for (let i = 0; i < 5; i++) {
      chat.addMessage({ userId: `user-${i}`, name: `User ${i}`, text: `Message ${i}` })
    }

    const messages = chat.getMessages(3)
    assertEqual(messages.length, 3)
    assertEqual(messages[0].text, 'Message 2')
    assertEqual(messages[2].text, 'Message 4')
  }))

  results.push(await test('getLastMessage() returns most recent message', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    chat = new Chat(client)
    chat.addMessage({ userId: 'user-1', name: 'User 1', text: 'First' })
    chat.addMessage({ userId: 'user-2', name: 'User 2', text: 'Last' })

    const lastMessage = chat.getLastMessage()
    assertEqual(lastMessage.text, 'Last')
  }))

  results.push(await test('getMessagesByUser() filters by user', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    chat = new Chat(client)
    chat.addMessage({ userId: 'user-1', name: 'User 1', text: 'Message 1' })
    chat.addMessage({ userId: 'user-2', name: 'User 2', text: 'Message 2' })
    chat.addMessage({ userId: 'user-1', name: 'User 1', text: 'Message 3' })

    const user1Messages = chat.getMessagesByUser('user-1')
    assertEqual(user1Messages.length, 2)
    assertEqual(user1Messages[0].text, 'Message 1')
    assertEqual(user1Messages[1].text, 'Message 3')
  }))

  results.push(await test('searchMessages() finds matching messages', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    chat = new Chat(client)
    chat.addMessage({ userId: 'user-1', name: 'User 1', text: 'Hello World' })
    chat.addMessage({ userId: 'user-2', name: 'User 2', text: 'Goodbye World' })
    chat.addMessage({ userId: 'user-3', name: 'User 3', text: 'Hello Everyone' })

    const results = chat.searchMessages('Hello')
    assertEqual(results.length, 2)
    assert(results[0].text.includes('Hello'), 'Should contain Hello')
    assert(results[1].text.includes('Hello'), 'Should contain Hello')
  }))

  results.push(await test('clear() removes all messages', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    chat = new Chat(client)
    chat.addMessage({ userId: 'user-1', name: 'User 1', text: 'Message 1' })
    chat.addMessage({ userId: 'user-2', name: 'User 2', text: 'Message 2' })

    assertEqual(chat.messages.length, 2)
    chat.clear()
    assertEqual(chat.messages.length, 0)
  }))

  results.push(await test('respects max messages limit', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    chat = new Chat(client)
    chat.setMaxMessages(5)

    for (let i = 0; i < 10; i++) {
      chat.addMessage({ userId: `user-${i}`, name: `User ${i}`, text: `Message ${i}` })
    }

    assertEqual(chat.messages.length, 5)
    assertEqual(chat.messages[0].text, 'Message 5')
    assertEqual(chat.messages[4].text, 'Message 9')
  }))

  results.push(await test('getMessageCount() returns correct count', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    chat = new Chat(client)

    assertEqual(chat.getMessageCount(), 0)
    chat.addMessage({ userId: 'user-1', name: 'User 1', text: 'Message 1' })
    assertEqual(chat.getMessageCount(), 1)
    chat.addMessage({ userId: 'user-2', name: 'User 2', text: 'Message 2' })
    assertEqual(chat.getMessageCount(), 2)
  }))

  results.push(await test('formatMessage() formats correctly', () => {
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
  }))

  results.push(await test('getMessageStats() returns statistics', () => {
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
  }))

  results.push(await test('exportMessages() as JSON', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    chat = new Chat(client)
    chat.addMessage({ userId: 'user-1', name: 'User 1', text: 'Message 1' })

    const json = chat.exportMessages('json')
    const parsed = JSON.parse(json)
    assertEqual(parsed.length, 1)
    assertEqual(parsed[0].text, 'Message 1')
  }))

  results.push(await test('exportMessages() as text', () => {
    client = new HyperfyClient('wss://world.hyperfy.io')
    chat = new Chat(client)
    chat.addMessage({ userId: 'user-1', name: 'User 1', text: 'Message 1' })

    const text = chat.exportMessages('text')
    assert(text.includes('User 1'), 'Should include username')
    assert(text.includes('Message 1'), 'Should include message text')
  }))
})

const summary = createTestSummary(results)
console.log(`\n${'='.repeat(60)}`)
console.log(`Results: ${summary.passed}/${summary.total} passed`)

if (summary.failed > 0) {
  process.exit(1)
}
