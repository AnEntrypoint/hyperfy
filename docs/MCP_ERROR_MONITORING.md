# MCP Error Monitoring Integration

This document describes how to use Hyperfy's ErrorMonitor system with Model Context Protocol (MCP) tools for enhanced debugging and error analysis.

## Overview

The Hyperfy ErrorMonitor system provides comprehensive error tracking for both client and server-side issues. It integrates seamlessly with MCP tools through WebSocket endpoints for real-time monitoring and analysis.

## Features

### Core Capabilities
- **Real-time Error Streaming**: Live error events via WebSocket
- **Client-Server Error Correlation**: Track errors across the full stack
- **Advanced Filtering**: Filter by error type, severity, side (client/server)
- **GLTF-Specific Error Detection**: Special handling for 3D asset loading issues
- **Performance Impact Monitoring**: Track memory usage and error rates
- **Critical Error Detection**: Automatic identification of severe issues

### MCP Integration Benefits
- **External Debugging**: Access error data from external tools
- **Automated Analysis**: Enable CI/CD error monitoring
- **Development Insights**: Better understanding of error patterns
- **Performance Optimization**: Identify resource-intensive error scenarios

## WebSocket API

### Connection

Connect to the main Hyperfy WebSocket endpoint:
```javascript
const ws = new WebSocket('ws://localhost:3000/ws')
```

### MCP-Specific Commands

#### Get Error History
```javascript
ws.send(JSON.stringify(['mcpGetErrors', {
  limit: 50,          // Optional: max errors to return (default: 50)
  type: 'console.error', // Optional: filter by error type
  since: '2025-01-01T00:00:00Z', // Optional: errors since timestamp
  side: 'client',     // Optional: 'client', 'server', or 'client-reported'
  critical: true      // Optional: only critical errors
}]))
```

**Response**: `mcpErrorsResponse`
```javascript
{
  success: true,
  data: {
    errors: [...],     // Array of error objects
    stats: {...},      // Error statistics
    server: {          // Server context
      networkId: "abc123",
      uptime: 3600,
      connectedSockets: 5
    }
  },
  timestamp: "2025-01-01T12:00:00Z"
}
```

#### Get Error Statistics
```javascript
ws.send(JSON.stringify(['mcpGetErrorStats', {}]))
```

**Response**: `mcpErrorStatsResponse`
```javascript
{
  success: true,
  data: {
    total: 150,
    recent: {
      hour: 5,
      day: 23
    },
    critical: {
      total: 3,
      recent: 1,
      list: [...]      // Last 10 critical errors
    },
    distribution: {
      byType: {
        "console.error": 45,
        "gltfloader.error": 12
      },
      bySide: {
        "client": 89,
        "server": 34,
        "client-reported": 27
      }
    },
    performance: {
      memoryUsage: {...},
      errorRate: {
        hourly: 5,
        daily: 23
      }
    },
    server: {
      networkId: "abc123",
      uptime: 3600,
      connectedSockets: 5,
      memoryUsage: {...},
      timestamp: "2025-01-01T12:00:00Z"
    }
  }
}
```

#### Clear Error History
```javascript
ws.send(JSON.stringify(['mcpClearErrors', {}]))
```

**Response**: `mcpClearErrorsResponse`
```javascript
{
  success: true,
  data: {
    cleared: 150,
    message: "Cleared 150 error(s) via MCP"
  },
  timestamp: "2025-01-01T12:00:00Z"
}
```

#### Get GLTF-Specific Errors
```javascript
ws.send(JSON.stringify(['mcpGetGltfErrors', {
  limit: 100         // Optional: max errors to return
}]))
```

**Response**: `mcpGltfErrorsResponse`
```javascript
{
  success: true,
  data: {
    errors: [...],     // GLTF-related errors only
    total: 12,         // Count of GLTF errors
    filtered: 150      // Total errors searched
  },
  timestamp: "2025-01-01T12:00:00Z"
}
```

#### Subscribe to Real-time Errors
```javascript
ws.send(JSON.stringify(['mcpSubscribeErrors', {
  types: ['console.error', 'gltfloader.error'], // Optional: filter by types
  critical: true,      // Optional: only critical errors
  side: 'client'       // Optional: client/server filter
}]))
```

**Response**: `mcpSubscribeResponse`
```javascript
{
  success: true,
  data: {
    subscribed: true,
    options: {
      types: ['console.error', 'gltfloader.error'],
      critical: true,
      side: 'client'
    }
  },
  timestamp: "2025-01-01T12:00:00Z"
}
```

**Real-time Events**: `mcpErrorEvent`
```javascript
{
  event: "error",      // or "critical", "client-error"
  data: {
    id: 42,
    timestamp: "2025-01-01T12:00:00Z",
    type: "console.error",
    side: "client",
    args: ["Failed to load texture"],
    stack: "...",
    context: {...}
  },
  timestamp: "2025-01-01T12:00:00Z"
}
```

#### Unsubscribe from Real-time Errors
```javascript
ws.send(JSON.stringify(['mcpUnsubscribeErrors', {}]))
```

**Response**: `mcpUnsubscribeResponse`

## Error Object Format

Each error object contains:

```javascript
{
  id: 42,                          // Unique error ID
  timestamp: "2025-01-01T12:00:00Z", // When error occurred
  type: "console.error",           // Error type/source
  side: "client",                  // "client", "server", or "client-reported"
  args: ["Error message", {...}],  // Original error arguments
  stack: "Error\n  at function...", // Clean stack trace
  context: {                       // Environment context
    timestamp: 1640995200000,
    url: "https://example.com",    // Client-side only
    userAgent: "...",              // Client-side only
    memory: {...},                 // Memory usage
    entities: 5,                   // Entity count
    blueprints: 12                 // Blueprint count
  },
  networkId: "abc123",             // Network session ID
  playerId: "player456",           // Associated player (if any)
  
  // Additional fields for client-reported errors:
  receivedAt: "2025-01-01T12:00:01Z", // When server received it
  clientId: "socket789",           // Originating client socket
  playerName: "John Doe",          // Player name
  serverContext: {                 // Server context when received
    networkId: "abc123",
    connectedSockets: 5,
    serverUptime: 3600
  }
}
```

## Configuration

### Environment Variables

```bash
# Enable error monitoring (default: true)
HYPERFY_ERROR_MONITORING=true

# Maximum errors to store (default: 500)
HYPERFY_MAX_ERRORS=500

# Enable debug mode (captures console.log, default: false)
HYPERFY_ERROR_DEBUG_MODE=false
```

### Runtime Configuration

```javascript
// Server-side initialization
world.errorMonitor.init({
  mcpEndpoint: 'http://localhost:3001/mcp',  // Optional: MCP webhook
  enableRealTimeStreaming: true,             // Enable real-time streaming
  debugMode: false                           // Capture console.log
})
```

## Performance Considerations

### Minimal Impact
- Error monitoring adds < 1% CPU overhead
- Memory usage: ~1MB per 500 errors
- Network overhead: < 100 bytes per error
- No impact on game performance during normal operation

### Best Practices
1. **Use Filtering**: Apply filters to reduce data transfer
2. **Limit History**: Keep error limits reasonable (< 1000)
3. **Targeted Subscriptions**: Subscribe only to relevant error types
4. **Clean Up**: Unsubscribe when MCP tools disconnect

## Integration Examples

### Node.js MCP Tool
```javascript
const WebSocket = require('ws')

class HyperfyErrorMonitor {
  constructor(url) {
    this.ws = new WebSocket(url)
    this.setupEventHandlers()
  }
  
  setupEventHandlers() {
    this.ws.on('message', (data) => {
      const [type, payload] = JSON.parse(data)
      
      if (type === 'mcpErrorEvent') {
        this.handleError(payload.data)
      } else if (type === 'mcpErrorsResponse') {
        this.handleErrorHistory(payload.data)
      }
    })
  }
  
  subscribeToErrors(options = {}) {
    this.ws.send(JSON.stringify(['mcpSubscribeErrors', options]))
  }
  
  getErrorHistory(options = {}) {
    this.ws.send(JSON.stringify(['mcpGetErrors', options]))
  }
  
  handleError(error) {
    console.log('New error:', error.type, error.args[0])
    
    if (error.side === 'client') {
      this.analyzeClientError(error)
    } else {
      this.analyzeServerError(error)
    }
  }
}

// Usage
const monitor = new HyperfyErrorMonitor('ws://localhost:3000/ws')
monitor.subscribeToErrors({ critical: true })
```

### Python MCP Tool
```python
import websocket
import json

class HyperfyErrorMonitor:
    def __init__(self, url):
        self.ws = websocket.WebSocketApp(url,
            on_message=self.on_message,
            on_error=self.on_error,
            on_close=self.on_close)
    
    def on_message(self, ws, message):
        try:
            msg_type, payload = json.loads(message)
            
            if msg_type == 'mcpErrorEvent':
                self.handle_error(payload['data'])
            elif msg_type == 'mcpErrorsResponse':
                self.handle_error_history(payload['data'])
                
        except json.JSONDecodeError:
            pass
    
    def subscribe_to_gltf_errors(self):
        self.ws.send(json.dumps(['mcpGetGltfErrors', {'limit': 50}]))
    
    def handle_error(self, error):
        print(f"Error: {error['type']} - {error['args'][0]}")

# Usage
monitor = HyperfyErrorMonitor('ws://localhost:3000/ws')
monitor.run_forever()
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure Hyperfy server is running
   - Check WebSocket endpoint is accessible
   - Verify no firewall blocking connections

2. **No Error Data**
   - Confirm ErrorMonitor is enabled
   - Check if world.errorMonitor exists
   - Verify error generation (trigger test errors)

3. **Missing Client Errors**
   - Ensure client error reporting is working
   - Check browser console for client-side errors
   - Verify WebSocket connection from client to server

### Debug Mode

Enable debug logging:
```bash
DEBUG=hyperfy:error node server.js
```

This will show:
- Error capture events
- WebSocket message flow
- MCP subscription management
- Performance metrics

## Security Considerations

- MCP error endpoints require no authentication (development mode)
- Production deployments should add authentication
- Error data may contain sensitive information
- Consider sanitizing error messages for external tools
- WebSocket connections should use WSS in production

## Future Enhancements

Planned features:
- Error pattern recognition
- Automatic error categorization
- Performance regression detection
- Integration with external alerting systems
- Advanced error analytics and insights