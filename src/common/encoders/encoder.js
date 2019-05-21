module.exports = class Encoder {
  encode(msgs) {
    throw new Error("encode is not implemented")
  }

  decode(packet) {
    throw new Error("decode is not implemented")
  }
}
