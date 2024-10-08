import {randomBytes} from 'node:crypto'
import * as is from 'istp'
import {
  errors, events, types, RpcPrefix, encoderName, eventNew, errNew, resNew,
  batch, msgParse, protocol,
} from '@ws-rpc/proto'
import {JsonEncoder} from '@ws-rpc/encoder-json'
import {WSServer} from './wss.js'
import {
  SendError, RpcError, throwRpcError, throwMethodNotFound, EncoderError,
} from './errors.js'
import {$InternalSuppressRpcResponse} from './internal.js'


export class Server {
  onrpc
  onevent
  ctx

  #maxBatch
  #wss
  #encoders = new Map().set(JsonEncoder.name, JsonEncoder)
  #clients = new Map()

  constructor(cfg = {}) {
    let {
      encoders = [],
      maxBatch = 128,
      onrpc, onevent,
      ctx = {},
      ...wssOpts
    } = cfg

    this.#maxBatch = maxBatch
    this.onrpc = onrpc
    this.onevent = onevent
    this.ctx = ctx

    for (let encoder of encoders) {
      this.#encoders.set(encoder.name, encoder)
    }

    wssOpts = {
      handleProtocols: this.#wsProtocols,
      ...wssOpts,
    }
    this.#wss = new WSServer(wssOpts)
    this.#wss.on('connection', this.#wsConnected)
  }

  get clientIds() {
    return this.#clients.keys()
  }

  get clients() {
    return this.#clients.values()
  }

  hasClient(id) {
    return this.#clients.has(id)
  }

  getClient(id) {
    return this.#clients.get(id)
  }

  async emit(clientIds, event, ...args) {
    if (!is.str(clientIds) && !(is.arr(clientIds) && clientIds.every(is.str))) {
      throw new Error("clientIds must be a string or an array of string")
    }

    if (!is.str(event)) {
      throw new Error("event must be a string")
    }

    return batch(clientIds, async clientIds => {
      let msg = eventNew(event, args)

      return Promise.all(clientIds.map(async id => {
        let client = this.#clients.get(id)
        if (!client) return false

        try {
          await send(client, msg)
          return true
        }
        catch {
          return false
        }
      }))
    })
  }

  async emitAll(event, ...args) {
    let clientIds = Array.from(this.clientIds)
    return this.emit(clientIds, event, ...args)
  }

  onWs(event, cb) {
    this.#wss.on(event, cb)
    return () => this.#wss.off(event, cb)
  }


  #wsConnected = ws => {
    let id = randomId()
    let encoder = this.#getEncoder(ws.protocol)
    let client = {id, encoder, ws}
    this.#clients.set(id, client)

    ws.on('close', this.#wsCloseHandler(id))
    ws.on('message', this.#wsMessageHandler(client))

    this.emit(id, events.Connected, id)
  }

  #wsCloseHandler = clientId => () =>
    this.#clients.delete(clientId)

  #wsMessageHandler = client => async data => {
    let [resp, opts] = await this.#handle(client, data)
    if (!resp) return

    this.#sendResponse(client, resp, opts)
  }

  // never throws
  async #handle(client, req) {
    try {
      req = await client.encoder.decode(req)
    }
    catch {
      // decoding error, send json response to simplify debugging
      let resp = errors.parseError("decoding failed")
      let opts = {encoder: JsonEncoder}
      return [resp, opts]
    }

    try {
      let resp = await batch(req, async msgs => {
        let resps = await Promise.all(msgs.map(this.#msgHandler(client)))
        return resps.filter(Boolean)
      }, this.#maxBatch)

      return [resp]
    }
    catch (resp) {
      return [resp]
    }
  }

  #msgHandler = client => async msg => {
    try {
      msg = msgParse(msg)
    }
    catch (resp) {
      return resp
    }

    let {type, id, method, args} = msg

    if (type === types.Response) {
      return responseToServer(id)
    }

    if (type === types.Error) {
      return errorToServer(id)
    }

    let ctx = {
      client,
      wss: this,
      emit: this.emit.bind(this, client.id),
      emitAll: this.emitAll.bind(this),
      throw: throwRpcError,
      throwMethodNotFound: () => throwMethodNotFound(id, method),
      ...this.ctx,
    }

    if (type === types.Event) {
      try {
        this.onevent?.(ctx, method, ...args)
      }
      // we should not throw if event handler failed
      catch {}
      return
    }

    if (!this.onrpc) {
      return errors.methodNotFound(id, method)
    }

    try {
      let result = await this.onrpc(ctx, method, ...args)

      // this behavior is not standard
      // we should always return a response or error to a valid request
      // but sometimes there are situations when we may not do this
      // rate-limiter as an example, which can drop requests without notification
      if (result === $InternalSuppressRpcResponse) {
        return
      }

      return resNew(id, result)
    }
    catch (e) {
      return e instanceof RpcError
        ? errNew(id, e.code, e.message, e.data)
        : errors.internalError(id)
    }
  }

  async #sendResponse(client, resp, opts) {
    try {
      await send(client, resp, opts)
    }
    catch (e) {
      if (e instanceof SendError) {
        return
      }

      if (e instanceof EncoderError) {
        let resp = errors.internalError(null, "encoding failed")
        let opts = {encoder: JsonEncoder}
        await send(client, resp, opts)
      }

      throw e
    }
  }

  #wsProtocols = protocols => {
    let name = Array.from(protocols)
      .filter(protocol => protocol.startsWith(RpcPrefix))
      .map(encoderName)
      .find(name => this.#encoders.has(name))

    return name && protocol(name)
  }

  #getEncoder(protocol) {
    let name = encoderName(protocol)
    return this.#encoders.get(name)
  }
}


// internal
let send = async (client, msg, opt = {}) => {
  let encoder = opt.encoder ?? client.encoder

  try {
    msg = await encoder.encode(msg)
  }
  catch {
    throw new EncoderError()
  }

  try {
    await wsSend(client.ws, msg)
  }
  catch {
    throw new SendError()
  }
}

let wsSend = (ws, data) =>
  new Promise((resolve, reject) => {
    let error = e => {
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

let randomId = () =>
  randomBytes(16).toString('base64url')

export let responseToServer = (id) =>
  errors.invalidRequest(id, "client must not send response message to server")

export let errorToServer = (id) =>
  errors.invalidRequest(id, "client must not send error message to server")
