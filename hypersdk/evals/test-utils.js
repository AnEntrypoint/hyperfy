/**
 * Shared test utilities for all evals
 */

export function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed')
  }
}

export function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

export function assertInstanceOf(obj, constructor, message) {
  if (!(obj instanceof constructor)) {
    throw new Error(message || `Expected instance of ${constructor.name}, got ${typeof obj}`)
  }
}

export async function test(name, fn) {
  try {
    await fn()
    console.log(`  ✓ ${name}`)
    return { passed: true, name }
  } catch (error) {
    console.error(`  ✗ ${name}`)
    console.error(`    ${error.message}`)
    return { passed: false, name, error: error.message }
  }
}

export function describe(name, fn) {
  console.log(`\n${name}`)
  return fn()
}

// Mock WebSocket for testing
export function setupMockWebSocket() {
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
}

export function createTestSummary(results) {
  const total = results.length
  const passed = results.filter(r => r.passed).length
  const failed = total - passed

  return { total, passed, failed, results }
}
