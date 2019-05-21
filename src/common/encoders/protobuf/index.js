const Pbf = require('pbf')
const {Packet, NullValue} = require('./rpc')


module.exports = class ProtobufEncoder {
  name = 'protobuf'

  encode(msgs) {
    if (!Array.isArray(msgs)) msgs = [msgs]

    msgs = msgs.map(encodeMessage)

    const data = {
      jsonrpc: +msgs[0].jsonrpc * 10,
      msgs,
    }

    const pbf = new Pbf()
    Packet.write(data, pbf)
    return pbf.finish()
  }

  decode(packet) {
    const pbf = new Pbf(packet)
    let {jsonrpc, msgs} = Packet.read(pbf)

    jsonrpc = `${~~(jsonrpc / 10)}.${jsonrpc % 10}`
    msgs.forEach(decodeMessage.bind(this, jsonrpc))

    return msgs
  }
}

function encodeMessage(msg) {
  msg = {...msg}

  switch (typeof msg.id) {
    case 'number':
      msg.id = Number.isInteger(msg.id)
        ? {num: msg.id}
        : {double: msg.id}
      break
    case 'string': msg.id = {str: msg.id}; break
    case 'undefined': break
    default:
      if (msg.id !== null) {
        throw new Error(`invalid message id type '${typeof msg.id}'`)
      }
      msg.id = {null: NullValue.NULL_VALUE.value}
  }

  return msg
}

function decodeMessage(jsonrpc, msg) {
  msg.jsonrpc = jsonrpc
  msg.id = msg.id[msg.id.type]
  if (!msg.params) delete msg.params
  if (!msg.error) delete msg.error
  if (!msg.result) delete msg.result
}
