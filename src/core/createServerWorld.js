import { World } from './World.js'

import { Server } from './systems/Server.js'
import { ServerLiveKit } from './systems/ServerLiveKit.js'
import { ServerNetwork } from './systems/ServerNetwork.js'
import { ServerLoader } from './systems/ServerLoader.js'
import { ServerEnvironment } from './systems/ServerEnvironment.js'
import { ServerMonitor } from './systems/ServerMonitor.js'
import { ErrorMonitor } from './systems/ErrorMonitor.js'

export function createServerWorld() {
  const world = new World()
  world.isServer = true
  world.register('server', Server)
  world.register('livekit', ServerLiveKit)
  world.register('network', ServerNetwork)
  world.register('loader', ServerLoader)
  world.register('environment', ServerEnvironment)
  world.register('monitor', ServerMonitor)
  world.register('errorMonitor', ErrorMonitor)
  return world
}
