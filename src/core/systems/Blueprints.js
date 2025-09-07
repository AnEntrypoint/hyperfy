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

  async executeWithErrorMonitoring(blueprintId, operation) {
    const errorMonitor = this.world.errorMonitor
    if (!errorMonitor) {
      // No error monitoring available, proceed normally
      return await operation()
    }

    // Capture error count before operation
    const errorsBefore = errorMonitor.errors.length
    
    // Execute the operation
    const result = await operation()

    // Wait briefly to catch immediate errors
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Check for new errors
    const errorsAfter = errorMonitor.errors.length
    if (errorsAfter > errorsBefore) {
      const newErrors = errorMonitor.errors.slice(errorsBefore)
      const blueprintErrors = newErrors.filter(error => 
        this.isBlueprintRelatedError(error, blueprintId)
      )
      
      if (blueprintErrors.length > 0) {
        // Include errors in the response
        return {
          ...result,
          success: false,
          errors: blueprintErrors.map(error => ({
            type: error.type,
            message: error.args.join(' '),
            stack: error.stack,
            timestamp: error.timestamp,
            critical: errorMonitor.isCriticalError(error.type, error.args)
          }))
        }
      }
    }
    
    return result
  }

  isBlueprintRelatedError(error, blueprintId) {
    const errorMessage = error.args.join(' ').toLowerCase()
    return (
      errorMessage.includes('gltfloader') ||
      errorMessage.includes('syntaxerror') ||
      errorMessage.includes('unexpected token') ||
      errorMessage.includes('json.parse') ||
      errorMessage.includes('failed to load') ||
      errorMessage.includes(blueprintId)
    )
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
