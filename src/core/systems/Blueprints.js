import { isEqual, merge } from 'lodash-es'
import { System } from './System'

/**
 * Blueprints System
 *
 * - Runs on both the server and client.
 * - A central registry for app blueprints
 *
 */
export class Blueprints extends System {
  constructor(world) {
    super(world)
    this.items = new Map()
  }

  get(id) {
    return this.items.get(id)
  }

  getScene() {
    return this.items.get('$scene')
  }

  async add(data, local) {
    this.items.set(data.id, data)
    if (local) {
      // Monitor for immediate errors and include them in the response
      const response = await this.executeWithErrorMonitoring(data.id, async () => {
        return { ...data, success: true }
      })
      this.world.network.send('blueprintAdded', response)
    }
  }

  
  isBlueprintRelatedError(error, blueprintId) {
    // Always capture errors during blueprint operations - they could be part of error chains
    // that originate from various sources like script execution, model loading, or async operations
    
    // Check for explicit blueprint-related error types
    const explicitBlueprintErrors = [
      'app.script.load',
      'app.model.load', 
      'app.script.compile',
      'app.script.runtime',
      'blueprint.validation',
      'gltfloader.error',
      'console.error',
      'console.warn'
    ];
    
    if (explicitBlueprintErrors.includes(error.type)) {
      return true;
    }
    
    // Check error message content for blueprint-related patterns
    const errorMessage = error.args ? error.args.join(' ').toLowerCase() : '';
    const stack = error.stack ? error.stack.toLowerCase() : '';
    
    // Comprehensive pattern matching for all possible error sources
    const errorPatterns = [
      'gltfloader',
      'syntaxerror', 
      'unexpected token',
      'json.parse',
      'failed to load',
      'failed to parse',
      'referenceerror',
      'typeerror',
      'cannot read',
      'is not defined',
      'is not a function',
      'model.load',
      'script.load',
      'asset loading',
      'three.js',
      'webgl',
      'shader',
      'texture',
      'geometry',
      'material',
      blueprintId // Always include blueprint ID matches
    ];
    
    // Check both error message and stack trace
    const hasErrorPattern = errorPatterns.some(pattern => 
      errorMessage.includes(pattern) || stack.includes(pattern)
    );
    
    if (hasErrorPattern) {
      return true;
    }
    
    // For any errors that occur during blueprint operations, assume they could be related
    // This ensures we capture error chains that might originate from blueprint changes
    // but manifest as different error types
    return true; // Capture ALL errors during blueprint operations to catch error chains
  }

  async executeWithErrorMonitoring(blueprintId, operation) {
    const errorMonitor = this.world.errorMonitor
    if (!errorMonitor) {
      // No error monitoring available, proceed normally
      return await operation()
    }

    // Capture ALL errors globally for 1 second to catch error chains
    // Error chains can propagate through async operations, model loading, 
    // script compilation, and other delayed processes
    const errorsBefore = errorMonitor.errors.length
    
    // Execute the operation
    const result = await operation()

    // Wait 1 full second to capture any error chains that might propagate
    // This catches:
    // - Immediate errors (0-100ms)
    // - Async operation errors (100-500ms) 
    // - Model loading chain errors (500ms-1s)
    // - Script compilation cascading errors (up to 1s)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Capture ALL new errors that occurred during this window
    const errorsAfter = errorMonitor.errors.length
    if (errorsAfter > errorsBefore) {
      const newErrors = errorMonitor.errors.slice(errorsBefore)
      
      // Since error chains can be complex, capture ALL errors during blueprint operations
      // The isBlueprintRelatedError method will return true for everything during this window
      const blueprintErrors = newErrors.filter(error => 
        this.isBlueprintRelatedError(error, blueprintId)
      )
      
      if (blueprintErrors.length > 0) {
        // Include ALL errors in the response for complete error chain visibility
        return {
          ...result,
          success: false,
          errors: blueprintErrors.map(error => ({
            type: error.type,
            message: error.args.join(' '),
            stack: error.stack,
            timestamp: error.timestamp,
            critical: errorMonitor.isCriticalError ? errorMonitor.isCriticalError(error.type, error.args) : true,
            // Add context about when this error occurred relative to blueprint operation
            timeFromOperation: new Date(error.timestamp) - Date.now() + 1000
          })),
          // Additional metadata about the error capture window
          errorCaptureWindow: '1000ms',
          totalErrorsCaptured: newErrors.length,
          blueprintRelatedErrors: blueprintErrors.length
        }
      }
    }
    
    return result
  }

  async modify(data) {
    const blueprint = this.items.get(data.id)
    const modified = {
      ...blueprint,
      ...data,
    }
    const changed = !isEqual(blueprint, modified)
    if (!changed) return
    this.items.set(blueprint.id, modified)
    
    // Monitor for immediate errors during blueprint modification and send response
    const response = await this.executeWithErrorMonitoring(blueprint.id, async () => {
      for (const [_, entity] of this.world.entities.items) {
        if (entity.data.blueprint === blueprint.id) {
          entity.data.state = {}
          entity.build()
        }
      }
      return { ...modified, success: true }
    })
    
    this.world.network.send('blueprintModified', response)
    this.emit('modify', modified)
  }

  serialize() {
    const datas = []
    this.items.forEach(data => {
      datas.push(data)
    })
    return datas
  }

  deserialize(datas) {
    for (const data of datas) {
      this.add(data)
    }
  }

  destroy() {
    this.items.clear()
  }
}
