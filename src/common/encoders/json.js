const Encoder = require('./encoder')


module.exports = class JsonEncoder extends Encoder {
  static name = 'json'

  encode(msgs) {
    return JSON.stringify(msgs)
  }

  decode(packet) {
    return JSON.parse(packet)
  }
}
