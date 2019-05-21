import NanoEvents from 'nanoevents'
import WSClient from './wsc'
import {msgParse, makeParams, msgSetVersion, MsgType} from '../common/proto'
import {RpcPrefix} from '../common/const'
import is from '../common/is'
import JsonEncoder from '../common/encoders/json'
import {DefaultTimeout, WSEvents} from './const'
import {RpcError, TimeoutError} from './errors'


export {RpcError, TimeoutError}

export const Events = {
  Connected: RpcPrefix + 'connected',
  Disconnected: RpcPrefix + 'disconnected',
  Message: RpcPrefix + 'message',
}

export default class Client {
  #wsc
  #emitter = new NanoEvents()
  #calls = {}
  #callLastId = 0
  #encoder
  #jsonEncoder = new JsonEncoder()
  #cfg = {
    timeout: DefaultTimeout,
    encoders: [
      this.#jsonEncoder,
    ],
  }

  constructor(cfg) {
    Object.assign(this.#cfg, cfg)

    this.#cfg.encoders = this.#cfg.encoders.reduce((res, enc) => {
      res[enc.name] = enc
      return res
    }, {})

    this.#cfg.protocols = Object.keys(this.#cfg.encoders)
      .map(enc => RpcPrefix + enc)
      .join(',')

    this.#wsc = new WSClient(this.#cfg)
    this.#wsc.on(WSEvents.Open, this.#reemit(Events.Connected))
    this.#wsc.on(WSEvents.Close, this.#reemit(Events.Disconnected))
    this.#wsc.on(WSEvents.Message, this.#reemit(Events.Message))
    this.#wsc.on(WSEvents.Open, this.#setEncoder)
    this.#wsc.on(WSEvents.Message, this.#msg)
    this.#wsc.connect()
  }

  get connected() {
    return this.#wsc.connected
  }

  async call(method, ...args) {
    const id = ++this.#callLastId
    const call = new TimeoutCall(this.#cfg.timeout)
    this.#calls[id] = call

    try {
      await this.#send(method, args, id)
      return await call.result
    }
    finally {
      call.clean()
      delete this.#calls[id]
    }
  }

  on(name, fn) {
    this.#emitter.on(name, fn)
  }

  emit(name, ...args) {
    if (!is.string(name)) {
      throw new Error("event name must be strings")
    }

    return this.#send(name, args)
  }


  #setEncoder = event => {
    const {protocol} = event.target
    const name = protocol.startsWith(RpcPrefix)
      ? protocol.split('.')[1]
      : JsonEncoder.name

    this.#encoder = this.#cfg.encoders[name]
    if (!this.#encoder) {
      throw new Error(`encoder ${name} not in config list`)
    }
  }

  #msg = async msg => {
    try {
      msg = await this.#encoder.decode(msg)
      msg = msgParse(msg)
    } catch (e) {
      return
    }

    const {type, id, method, args, result, error} = msg

    switch (type) {
      case MsgType.Event:
        return this.#emitter.emit(method, ...args)

      case MsgType.Response:
        return this.#calls[id]?.success(result)

      case MsgType.Error:
        const e = new RpcError(error)
        return this.#calls[id]?.error(e)
    }
  }

  async #send(method, args, id) {
    let msg = {id, method, params: makeParams(args)}
    msgSetVersion(msg)

    await this.#wsc.ready // wait encoder choose
    msg = await this.#encoder.encode(msg)

    return this.#wsc.send(msg)
  }

  #reemit = event => {
    return (...args) => this.#emitter.emit(event, ...args)
  }
}

class TimeoutCall {
  result
  #resolve
  #reject
  #timer

  constructor(ms) {
    this.result = new Promise((resolve, reject) => {
      this.#resolve = resolve
      this.#reject = reject
      this.#timer = setTimeout(() => {
        reject(new TimeoutError(ms))
      }, ms)
    })
  }

  success(data) {
    this.#resolve(data)
  }

  error(error) {
    this.#reject(error)
  }

  clean() {
    clearTimeout(this.#timer)
  }
}
