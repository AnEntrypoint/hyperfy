import { createNode } from './createNode'
import { LerpQuaternion } from './LerpQuaternion'
import { LerpVector3 } from './LerpVector3'
import { emotes } from './playerEmotes'

export class PlayerRemote {
  constructor(entity) {
    this.entity = entity
    this.data = entity.data
    this.world = entity.world
    this.init()
  }

  async init() {
    this.base = createNode({ name: 'group' })
    this.base.position.fromArray(this.data.position)
    this.base.quaternion.fromArray(this.data.quaternion)
    this.base.activate({ world: this.world, entity: this.entity, physics: true })

    this.position = new LerpVector3(this.base.position, this.world.networkRate)
    this.quaternion = new LerpQuaternion(this.base.quaternion, this.world.networkRate)
    this.emote = 'asset://emote-idle.glb'

    const glb = await this.world.loader.load('vrm', 'asset://avatar.vrm')
    this.vrm = glb.toNodes()
    this.base.add(this.vrm)

    this.world.setHot(this, true)
  }

  update(delta) {
    this.position.update(delta)
    this.quaternion.update(delta)
    this.vrm?.vrm?.setEmote(emotes[this.emote])
  }

  modify(data) {
    if (data.hasOwnProperty('p')) {
      this.data.position = data.p
      this.position.pushArray(data.p)
    }
    if (data.hasOwnProperty('q')) {
      this.data.quaternion = data.q
      this.quaternion.pushArray(data.q)
    }
    if (data.hasOwnProperty('e')) {
      this.data.emote = data.e
      this.emote = data.e
    }
    if (data.hasOwnProperty('user')) {
      this.data.user = data.user
    }
  }

  destroy() {
    this.base.deactivate()
    this.vrm = null
    this.world.setHot(this, false)
  }
}
