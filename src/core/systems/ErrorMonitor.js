import { System } from './System'

/**
 * Error Monitor System
 * 
 * - Centralizes error capture from all subsystems
 * - Streams errors to MCP tooling via WebSocket
 * - Correlates client/server errors with context
 * - Provides real-time debugging capabilities
 */
export class ErrorMonitor extends System {
  constructor(world) {
    super(world)
    this.isClient = !world.isServer
    this.isServer = world.isServer
    this.errors = []
    this.maxErrors = 500 // Keep last 500 errors
    this.listeners = new Set()
    this.originalConsole = {}
    this.errorId = 0
    
    // Initialize error capture
    this.interceptConsole()
    this.interceptGlobalErrors()
    
    // Set up periodic cleanup
    setInterval(() => this.cleanup(), 60000) // Every minute
  }

  init(options = {}) {
    this.mcpEndpoint = options.mcpEndpoint || null
    this.enableRealTimeStreaming = options.enableRealTimeStreaming !== false
    this.debugMode = options.debugMode === true
  }

  interceptConsole() {
    // Store original console methods
    this.originalConsole = {
      error: console.error,
      warn: console.warn,
      log: console.log,
    }

    // Check if console properties can be modified
    try {
      // Try to intercept console.error
      const originalError = console.error
      console.error = (...args) => {
        originalError.apply(console, args)
        this.captureError('console.error', args, this.getStackTrace())
      }

      // Try to intercept console.warn  
      const originalWarn = console.warn
      console.warn = (...args) => {
        originalWarn.apply(console, args)
        this.captureError('console.warn', args, this.getStackTrace())
      }

      // Only intercept console.log in debug mode
      if (this.debugMode) {
        const originalLog = console.log
        console.log = (...args) => {
          originalLog.apply(console, args)
          this.captureError('console.log', args, this.getStackTrace())
        }
      }
    } catch (error) {
      // If console interception fails (like in some Node.js setups with SES),
      // we'll rely on global error handlers only
      console.warn('ErrorMonitor: Cannot intercept console methods, using global handlers only:', error.message)
    }
  }

  interceptGlobalErrors() {
    if (this.isClient && typeof window !== 'undefined') {
      // Client-side global error handlers
      window.addEventListener('error', (event) => {
        this.captureError('window.error', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error
        }, event.error?.stack)
      })

      window.addEventListener('unhandledrejection', (event) => {
        this.captureError('unhandled.promise.rejection', {
          reason: event.reason,
          promise: event.promise
        }, event.reason?.stack)
      })
    }

    if (this.isServer && typeof process !== 'undefined') {
      // Server-side global error handlers
      process.on('uncaughtException', (error) => {
        this.captureError('uncaught.exception', {
          message: error.message,
          name: error.name
        }, error.stack)
      })

      process.on('unhandledRejection', (reason, promise) => {
        this.captureError('unhandled.promise.rejection', {
          reason: reason,
          promise: promise
        }, reason?.stack)
      })
    }
  }

  captureError(type, args, stack) {
    const errorEntry = {
      id: ++this.errorId,
      timestamp: new Date().toISOString(),
      type,
      side: this.isClient ? 'client' : 'server',
      args: this.serializeArgs(args),
      stack: this.cleanStack(stack),
      context: this.getContext(),
      networkId: this.world.network?.id,
      playerId: this.world.entities?.player?.data?.id
    }

    this.errors.push(errorEntry)
    
    // Maintain max size
    if (this.errors.length > this.maxErrors) {
      this.errors.shift()
    }

    // Notify listeners
    this.notifyListeners('error', errorEntry)

    // Stream to MCP if configured
    if (this.enableRealTimeStreaming && this.mcpEndpoint) {
      this.streamToMCP(errorEntry)
    }

    // Special handling for critical errors
    if (this.isCriticalError(type, args)) {
      this.handleCriticalError(errorEntry)
    }
  }

  serializeArgs(args) {
    try {
      return Array.from(args).map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          if (arg instanceof Error) {
            return {
              __error: true,
              name: arg.name,
              message: arg.message,
              stack: arg.stack
            }
          }
          // Try to serialize object, fallback to string representation
          try {
            return JSON.parse(JSON.stringify(arg))
          } catch {
            return String(arg)
          }
        }
        return arg
      })
    } catch {
      return ['[Serialization Error]']
    }
  }

  cleanStack(stack) {
    if (!stack) return null
    
    return stack
      .split('\n')
      .filter(line => {
        // Remove noise from stack traces
        return !line.includes('node_modules') && 
               !line.includes('webpack') &&
               !line.includes('<anonymous>') &&
               line.trim().length > 0
      })
      .slice(0, 10) // Limit stack depth
      .join('\n')
  }

  getStackTrace() {
    try {
      throw new Error()
    } catch (error) {
      return error.stack
    }
  }

  getContext() {
    const context = {
      timestamp: Date.now(),
      url: this.isClient ? window.location?.href : null,
      userAgent: this.isClient ? navigator?.userAgent : null,
      memory: this.getMemoryUsage(),
      entities: this.world.entities?.count || 0,
      blueprints: this.world.blueprints?.count || 0
    }

    // Add performance context if available
    if (typeof performance !== 'undefined') {
      context.performance = {
        now: performance.now(),
        memory: performance.memory ? {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        } : null
      }
    }

    return context
  }

  getMemoryUsage() {
    if (this.isServer && typeof process !== 'undefined') {
      const usage = process.memoryUsage()
      return {
        rss: usage.rss,
        heapTotal: usage.heapTotal,
        heapUsed: usage.heapUsed,
        external: usage.external
      }
    }
    
    if (this.isClient && typeof performance !== 'undefined' && performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      }
    }
    
    return null
  }

  isCriticalError(type, args) {
    const criticalPatterns = [
      /gltfloader/i,
      /syntax.*error/i,
      /unexpected.*token/i,
      /failed.*to.*load/i,
      /network.*error/i,
      /script.*crashed/i,
      /three\.js/i,
      /webgl/i
    ]

    const message = args.join(' ').toLowerCase()
    return criticalPatterns.some(pattern => pattern.test(message))
  }

  handleCriticalError(errorEntry) {
    // Send critical error notification
    this.notifyListeners('critical', errorEntry)
    
    // Log to server if client
    if (this.isClient && this.world.network) {
      this.world.network.send('errorReport', {
        critical: true,
        error: errorEntry
      })
    }
  }

  streamToMCP(errorEntry) {
    // Send to MCP endpoint if configured
    if (typeof fetch !== 'undefined') {
      fetch(this.mcpEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'error',
          data: errorEntry
        })
      }).catch(() => {
        // Silently ignore MCP streaming errors
      })
    }
  }

  // Public API
  addListener(callback) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data)
      } catch (err) {
        // Don't let listener errors crash the error monitor
        this.originalConsole.error('ErrorMonitor listener error:', err)
      }
    })
  }

  getErrors(options = {}) {
    const { 
      limit = 50, 
      type = null, 
      since = null,
      side = null,
      critical = null
    } = options

    let filtered = this.errors

    if (type) {
      filtered = filtered.filter(error => error.type === type)
    }

    if (since) {
      const sinceTime = new Date(since).getTime()
      filtered = filtered.filter(error => new Date(error.timestamp).getTime() >= sinceTime)
    }

    if (side) {
      filtered = filtered.filter(error => error.side === side)
    }

    if (critical !== null) {
      filtered = filtered.filter(error => this.isCriticalError(error.type, error.args) === critical)
    }

    return filtered
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit)
  }

  clearErrors() {
    const count = this.errors.length
    this.errors = []
    this.errorId = 0
    return count
  }

  getStats() {
    const now = Date.now()
    const hourAgo = now - (60 * 60 * 1000)
    const recent = this.errors.filter(error => 
      new Date(error.timestamp).getTime() >= hourAgo
    )

    const byType = {}
    recent.forEach(error => {
      byType[error.type] = (byType[error.type] || 0) + 1
    })

    return {
      total: this.errors.length,
      recent: recent.length,
      critical: recent.filter(error => 
        this.isCriticalError(error.type, error.args)
      ).length,
      byType
    }
  }

  cleanup() {
    // Remove very old errors to prevent memory leaks
    const cutoff = Date.now() - (24 * 60 * 60 * 1000) // 24 hours ago
    this.errors = this.errors.filter(error => 
      new Date(error.timestamp).getTime() >= cutoff
    )
  }

  // Restore original console methods
  restore() {
    Object.keys(this.originalConsole).forEach(method => {
      console[method] = this.originalConsole[method]
    })
  }

  destroy() {
    this.restore()
    this.listeners.clear()
    this.errors = []
  }
}