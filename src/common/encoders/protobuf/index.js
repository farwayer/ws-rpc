const Pbf = require('pbf')
const {Packet, Null} = require('./rpc')
const is = require('../../is')
const {RpcPrefix} = require('../../const')


const EmptyMethod = RpcPrefix + 'empty'

module.exports = {
  name: 'protobuf',

  encode(msgs) {
    if (!Array.isArray(msgs)) msgs = [msgs]

    const jsonrpc = encodeVersion(msgs[0].jsonrpc)
    msgs = msgs.map(encodeMessage)
    const data = {jsonrpc, msgs}

    const pbf = new Pbf()
    Packet.write(data, pbf)
    return pbf.finish()
  },

  decode(packet) {
    const pbf = new Pbf(packet)
    let {jsonrpc, msgs} = Packet.read(pbf)

    jsonrpc = decodeVersion(jsonrpc)
    msgs.forEach(decodeMessage.bind(this, jsonrpc))

    return msgs
  },
}

function encodeVersion(jsonrpc) {
  return +jsonrpc * 10 - 20
}

function decodeVersion(jsonrpc) {
  jsonrpc += 20
  return `${~~(jsonrpc / 10)}.${jsonrpc % 10}`
}

function encodeMessage(msg) {
  return {
    method: encodeMethod(msg.method),
    id: encodeValue(msg.id),
    params: encodeValue(msg.params),
    result: encodeValue(msg.result),
    error: encodeError(msg.error),
  }
}

function decodeMessage(jsonrpc, msg) {
  msg.jsonrpc = jsonrpc
  msg.method = decodeMethod(msg.method)
  msg.id = decodeValue(msg.id)
  msg.params = decodeValue(msg.params)
  msg.result = decodeValue(msg.result)
  msg.error = decodeError(msg.error)
}

function encodeMethod(method) {
  return method === '' ? EmptyMethod : method
}

function decodeMethod(method) {
  if (method === '') return
  return method === EmptyMethod ? '' : method
}

function encodeError(error) {
  if (!error) return
  return {...error, data: encodeValue(error.data)}
}

function decodeError(error) {
  if (!error) return
  return {...error, data: decodeValue(error.data)}
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
