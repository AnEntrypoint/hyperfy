import { writePacket as hyperfyWritePacket, readPacket as hyperfyReadPacket } from '../../../src/core/packets.js'

export class Packets {
  static writePacket(name, data) {
    return hyperfyWritePacket(name, data)
  }

  static readPacket(packet) {
    return hyperfyReadPacket(packet)
  }
}

export { writePacket, readPacket } from '../../../src/core/packets.js'