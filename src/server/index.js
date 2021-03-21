const {Emitter} = require('nanoevents')
const WSServer = require('./wss')
const Context = require('./context')
const JsonEncoder = require('../common/encoders/json')
const {isStr, isInt, isUndef, isDef} = require('istp')
const Errors = require('../common/errors')
const {isObj} = require('istp')
const {isArr} = require('istp')
const {msgParse, msgSetVersion, msgErr, makeParams, MsgType} = require('../common/proto')
const {RpcPrefix} = require('../common/const')
const {WSEvents, ProtocolsHeader, HttpPreconditionFailed, DefaultPingInterval} = require('./const')


module.exports = class Server {
  #wss
  #emitter = new Emitter()
  #rpc = {}
  #clients = {}
  #cfg = {
    pingInterval: DefaultPingInterval,
    encoders: [
      JsonEncoder,
    ],
  }

  constructor(wsOpts, cfg) {
    Object.assign(this.#cfg, cfg)

    this.#cfg.encoders = this.#cfg.encoders.reduce((res, enc) => {
      res[enc.name] = enc
      return res
    }, {})

    wsOpts.verifyClient = this._initClient.bind(this, wsOpts.verifyClient)
    this.#wss = new WSServer(wsOpts, this.#cfg)
    this.#wss.handleProtocols = this._handleProtocols
    this.#wss.on(WSEvents.Connection, this._connection)
  }

  rpc(name, fn) {
    if (name.startsWith(RpcPrefix)) {
      throw new Error(`method '${name}' must not starts with '${RpcPrefix}'`)
    }

    this.#rpc[name] = fn
  }

  on(name, fn) {
    return this.#emitter.on(name, fn)
  }

  async emit(clients, name, ...args) {
    if (!isStr(name)) {
      throw new Error("event name must be string")
    }

    const isBatch = isArr(clients)
    if (!isBatch) clients = [clients]

    clients.forEach(id => {
      if (isStr(id)) return
      throw new Error("event client must be string")
    })

    const params = makeParams(args)

    const success = await Promise.all(clients.map(async id => {
      const ctx = this.#clients[id]
      if (!ctx) return false

      try {
        const msg = {method: name, params}
        await send(ctx, msg)
        return true
      } catch (e) {
        return false
      }
    }))

    return isBatch ? success : success[0]
  }

  async emitAll(name, ...args) {
    const clients = Object.keys(this.#clients)
    return await this.emit(clients, name, ...args)
  }


  _initClient(verifyClient, info, cb) {
    try {
      const encoder = this._findEncoder(info.req)
      info.req.ctx = new Context(encoder)
    } catch (e) {
      return cb(false, HttpPreconditionFailed, e.message)
    }

    if (!verifyClient) return cb(true)
    if (verifyClient.length === 2) return verifyClient(info, cb)
    cb(verifyClient(info))
  }

  _handleProtocols = (protocols, req) => {
    return RpcPrefix + req.ctx.encoder.name
  }

  _connection = (ws, req) => {
    const {client} = req.ctx
    req.ctx._setWs(ws)
    this.#clients[client] = req.ctx

    ws.on(WSEvents.Message, this._process.bind(this, req.ctx))
    ws.on(WSEvents.Close, () => delete this.#clients[client])
  }

  async _process(ctx, msgs) {
    try {
      msgs = await ctx.encoder.decode(msgs, ctx)
    } catch (e) {
      // decoding error, send json response to simplify debugging
      const resp = msgErr({...Errors.ParseError, data: e.message})
      const opts = {json: true}
      return this._sendResponse(ctx, resp, opts)
    }

    if (!isObj(msgs)) {
      const resp = msgErr(Errors.InvalidMessage)
      return this._sendResponse(ctx, resp)
    }

    const isBatch = isArr(msgs)
    if (!isBatch) msgs = [msgs]

    let resps = await Promise.all(msgs.map(this._msg.bind(this, ctx)))
    resps = resps.filter(resp => resp)
    if (!resps.length) return

    if (!isBatch) resps = resps[0]
    this._sendResponse(ctx, resps)
  }

  async _msg(ctx, msg) {
    try {
      msg = msgParse(msg)
    } catch (e) {
      if (e.error) return e
      return msgErr({...Errors.InternalError, data: e.message}, msg.id)
    }

    const {type, id, method, args} = msg

    if (type === MsgType.Response) {
      return msgErr(Errors.ResponseToServer, id)
    }

    if (type === MsgType.Error) {
      return msgErr(Errors.ErrorToServer, id)
    }

    if (type === MsgType.Event) {
      return this.#emitter.emit(ctx, ...args)
    }

    const call = this.#rpc[method]
    if (!call) {
      return msgErr(Errors.MethodNotFound, id)
    }

    try {
      let result = await call(ctx, ...args)
      if (isUndef(result)) result = null

      return {id, result}
    } catch (e) {
      if (isUndef(e.code)) {
        return msgErr({...Errors.InternalError, data: e.message}, id)
      }

      if (isInt(e.code)) {
        return msgErr({code: e.code, message: e.message, data: e.data}, id)
      }

      return msgErr({
        ...Errors.InternalError,
        data: `server throws error with non-integer code ${e.code}`,
      }, id)
    }
  }

  async _sendResponse(ctx, msgs, opt) {
    try {
      await send(ctx, msgs, opt)
    } catch (e) {
      if (e instanceof SendError) return
      if (e instanceof EncodeError) {
        this._sendEncodeError(ctx, e)
      }
      throw e
    }
  }

  _findEncoder(req) {
    let encoders = req.headers[ProtocolsHeader]
    encoders = encoders ? encoders.split(',') : []
    encoders = encoders
      .map(enc => enc.trim())
      .filter(enc => enc.startsWith(RpcPrefix))
      .map(enc => enc.split('.')[1])
    encoders.push(JsonEncoder.name)

    const name = encoders.find(name => this.#cfg.encoders[name])
    const encoder = this.#cfg.encoders[name]
    if (encoder) return encoder

    throw new Error(`No suitable encoder found.
Requested encoders: ${encoders.join(', ')}.
Encoders supported by server: ${Object.keys(this.#cfg.encoders).join(', ')}.
Try to set encoder in options or with 'sec-websocket-protocol: rpc.protobuf, rpc.json' header.`)
  }

  async _sendEncodeError(ctx, e) {
    let {message, encoder, msgs, opt} = e
    message = `${encoder} encode error - ${message}`
    const error = {...Errors.Encoding, data: message}

    msgs = isArr(msgs)
      ? msgs
        .map(msg => msg.id)
        .filter(isDef)
        .map(id => msgErr(error, id))
      : msgErr(error)

    try {
      await send(ctx, msgs, opt)
    } catch (e) {
      if (e instanceof SendError) return
      throw e
    }
  }
}

async function send(ctx, msgs, opt = {}) {
  msgSetVersion(msgs)

  const encoder = opt.json ? JsonEncoder : ctx.encoder

  try {
    msgs = await encoder.encode(msgs)
  } catch (e) {
    throw new EncodeError(encoder, e.message, msgs, opt)
  }

  try {
    await socketSend(ctx.ws, msgs)
  } catch (e) {
    new SendError(e.message)
  }
}

function socketSend(ws, data) {
  return new Promise((resolve, reject) => {
    const error = e => {
      ws.terminate()
      reject(e)
    }

    try {
      ws.send(data, e => e ? error(e) : resolve())
    } catch (e) {
      error(e)
    }
  })
}

class SendError extends Error {}
class EncodeError extends Error {
  constructor(encoder, message, msgs, opt) {
    if (message instanceof Error) message = message.message
    message = `<${encoder.name} encoder> ${message}`
    super(message)
    this.encoder = encoder.name
    this.msgs = msgs
    this.opt = opt
  }
}
