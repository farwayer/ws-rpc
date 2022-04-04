import {createNanoEvents} from 'nanoevents'
import {isStr, isInt, isUndef, isDef, isObj, isArr} from 'istp'
import {
  msgParse, msgSetVersion, msgErr, makeParams,
  Errors, MsgType, RpcPrefix, Events,
} from '@ws-rpc/proto'
import {JsonEncoder} from '@ws-rpc/encoder-json'
import WSServer from './wss'
import Client from './client'
import Context from './context'
import {SendError, EncodeError} from './errors'
import {
  WSEvents, ProtocolsHeader, HttpPreconditionFailed, DefaultPingInterval,
} from './const'


export class Server {
  clients = new Map()
  context = {}

  #wss
  #emitter = createNanoEvents()
  #rpc = {}
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

    wsOpts = {
      ...wsOpts,
      handleProtocols,
      verifyClient: this.#initClient.bind(this, wsOpts.verifyClient),
    }
    this.#wss = new WSServer(wsOpts, this.#cfg)
    this.#wss.on(WSEvents.Connection, this.#connection)
  }

  isClientConnected(clientId) {
    return this.clients.has(clientId)
  }

  rpc(name, fn) {
    if (name.startsWith(RpcPrefix)) {
      throw new Error(`method '${name}' must not starts with '${RpcPrefix}'`)
    }

    this.#rpc[name] = fn
  }

  on(event, fn) {
    return this.#emitter.on(event, fn)
  }

  async emit(clientIds, event, ...args) {
    if (!isStr(event)) {
      throw new Error("event name must be string")
    }

    const isBatch = isArr(clientIds)
    if (!isBatch) clientIds = [clientIds]

    clientIds.forEach(id => {
      if (isStr(id)) return
      throw new Error("event client must be string")
    })

    const params = makeParams(args)

    const success = await Promise.all(clientIds.map(async id => {
      const client = this.clients.get(id)
      if (!client) return false

      try {
        const msg = {method: event, params}
        await send(client, msg)
        return true
      }
      catch (e) {
        return false
      }
    }))

    return isBatch ? success : success[0] // TODO
  }

  async emitAll(event, ...args) {
    const clientIds = Array.from(this.clients.keys())
    return await this.emit(clientIds, event, ...args)
  }


  #initClient(verifyClient, info, cb) {
    try {
      const encoder = this.#findEncoder(info.req)
      info.req.client = new Client(encoder)
    }
    catch (e) {
      return cb(false, HttpPreconditionFailed, e.message)
    }

    if (!verifyClient) return cb(true)
    if (verifyClient.length === 2) return verifyClient(info, cb)
    cb(verifyClient(info))
  }

  #connection = (ws, req) => {
    const {client} = req
    client.ws = ws
    this.clients.set(client.id, client)

    ws.on(WSEvents.Message, this.#process.bind(this, client))
    ws.on(WSEvents.Close, () => this.clients.delete(client.id))

    this.emit(client.id, Events.ClientConnected, client.id)
  }

  async #process(client, msgs) {
    try {
      msgs = await client.encoder.decode(msgs, client)
    }
    catch (e) {
      // decoding error, send json response to simplify debugging
      const resp = msgErr({...Errors.ParseError, data: e.message})
      const opts = {json: true}
      return this.#sendResponse(client, resp, opts)
    }

    if (!isObj(msgs)) {
      const resp = msgErr(Errors.InvalidMessage)
      return this.#sendResponse(client, resp)
    }

    const isBatch = isArr(msgs)
    if (!isBatch) msgs = [msgs]

    let resps = await Promise.all(msgs.map(this.#msg.bind(this, client)))
    resps = resps.filter(resp => resp)
    if (!resps.length) return

    if (!isBatch) resps = resps[0]
    this.#sendResponse(client, resps)
  }

  async #msg(client, msg) {
    try {
      msg = msgParse(msg)
    }
    catch (e) {
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
      return this.#emitter.emit(client, ...args)
    }

    const call = this.#rpc[method]
    if (!call) {
      return msgErr(Errors.MethodNotFound, id)
    }

    try {
      const ctx = new Context(client, method, this.context)
      let result = await call(ctx, ...args)
      if (isUndef(result)) result = null

      return {id, result}
    }
    catch (e) {
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

  async #sendResponse(client, msgs, opt) {
    try {
      await send(client, msgs, opt)
    }
    catch (e) {
      if (e instanceof SendError) return
      if (e instanceof EncodeError) {
        this.#sendEncodeError(client, e)
      }
      throw e
    }
  }

  #findEncoder(req) {
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

  async #sendEncodeError(client, e) {
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
      await send(client, msgs, opt)
    }
    catch (e) {
      if (e instanceof SendError) return
      throw e
    }
  }
}

function handleProtocols(protocols, req) {
  return RpcPrefix + req.client.encoder.name
}

async function send(client, msgs, opt = {}) {
  msgSetVersion(msgs)

  const encoder = opt.json ? JsonEncoder : client.encoder

  try {
    msgs = await encoder.encode(msgs)
  }
  catch (e) {
    throw new EncodeError(encoder, e.message, msgs, opt)
  }

  try {
    await socketSend(client.ws, msgs)
  }
  catch (e) {
    throw new SendError(e.message)
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
    }
    catch (e) {
      error(e)
    }
  })
}
