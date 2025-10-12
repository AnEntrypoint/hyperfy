# WebSocket Error Monitoring

Minimal error monitoring system for WebSocket-based applications.

## Features

- Real-time error capture and streaming
- Client-server error correlation
- GLTF loading error detection
- Critical error identification
- Memory-safe error storage (max 500 errors)

## Configuration

```javascript
world.errorMonitor.init({
  enableRealTimeStreaming: true,
  debugMode: false
})
```

## API

- `captureError(type, args, stack)` - Record an error
- `getErrors(options)` - Retrieve filtered errors
- `getStats()` - Get error statistics
- `clearErrors()` - Clear error history