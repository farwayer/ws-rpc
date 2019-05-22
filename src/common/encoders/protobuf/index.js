const Pbf = require('pbf')
const {Packet, Null} = require('./rpc')
const is = require('../../is')


module.exports = {
  name: 'protobuf',

  encode(msgs) {
    if (!Array.isArray(msgs)) msgs = [msgs]

    const jsonrpc = numVersion(msgs[0].jsonrpc)
    msgs = msgs.map(encodeMessage)
    const data = {jsonrpc, msgs}

    const pbf = new Pbf()
    Packet.write(data, pbf)
    return pbf.finish()
  },

  decode(packet) {
    const pbf = new Pbf(packet)
    let {jsonrpc, msgs} = Packet.read(pbf)

    jsonrpc = strVersion(jsonrpc)
    msgs.forEach(decodeMessage.bind(this, jsonrpc))

    return msgs
  },
}

function encodeMessage(msg) {
  return {
    method: msg.method,
    id: encodeValue(msg.id),
    params: encodeValue(msg.params),
    result: encodeValue(msg.result),
    error: msg.error && {...msg.error, data: encodeValue(msg.error.data)},
  }
}

function decodeMessage(jsonrpc, msg) {
  msg.jsonrpc = jsonrpc
  msg.id = decodeValue(msg.id)
  msg.params = decodeValue(msg.params)
  msg.result = decodeValue(msg.result)
  msg.error = !is.null(msg.error)
    ? {...msg.error, data: decodeValue(msg.error.data)}
    : undefined
}

function encodeValue(val) {
  switch (typeof val) {
    case 'undefined': return
    case 'number': return is.integer(val) ? {int: val} : {double: val}
    case 'string': return {str: val}
    case 'boolean': return {bool: val}
    case 'object':
      if (is.null(val)) {
        return {null: Null.NULL_VALUE.value}
      }
      if (is.array(val)) {
        return {arr: {items: val.map(encodeValue)}}
      }
      return {obj: {fields: Object.entries(val)
        .reduce((res, [k, v]) => {
          res[k] = encodeValue(v)
          return res
        }, {})
      }}
    default:
      throw new Error(`invalid value type ${typeof val}`)
  }
}

function decodeValue(val) {
  if (is.null(val)) return
  const {type} = val

  switch (type) {
    case undefined: return val
    case null: return
    case 'null': return null
    case 'arr': return val.arr.items.map(decodeValue)
    case 'obj': return Object.entries(val.obj.fields)
      .reduce((res, [k, v]) => {
        res[k] = decodeValue(v)
        return res
      }, {})
    default: return val[type]
  }
}

function numVersion(jsonrpc) {
  return +jsonrpc * 10 - 20
}

function strVersion(jsonrpc) {
  jsonrpc += 20
  return `${~~(jsonrpc / 10)}.${jsonrpc % 10}`
}
