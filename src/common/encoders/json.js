module.exports = class JsonEncoder {
  name = 'json'

  encode(msgs) {
    return JSON.stringify(msgs)
  }

  decode(packet) {
    return JSON.parse(packet)
  }
}
