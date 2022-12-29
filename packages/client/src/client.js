import {createNanoEvents} from 'nanoevents'
import WSClient, {WSEvents} from 'wscl'
import {isArr, isStr} from 'istp'
import {msgParse, makeParams, msgSetVersion, MsgType, RpcPrefix} from '@ws-rpc/proto'
import {JsonEncoder} from '@ws-rpc/encoder-json'
import {RpcError, TimeoutError} from './errors.js'
import {Events} from './events.js'


const DefaultTimeout = 5000

export class Client {
  _wsc
  _emitter = createNanoEvents()
  _calls = {}
  _callLastId = 0
  _encoder
  _cfg = {
    timeout: DefaultTimeout,
    encoders: [
      JsonEncoder,
    ],
  }

  constructor(cfg) {
    Object.assign(this._cfg, cfg)

    this._cfg.encoders = this._cfg.encoders.reduce((res, enc) => {
      res[enc.name] = enc
      return res
    }, {})

    this._cfg.protocols = Object.keys(this._cfg.encoders)
      .map(enc => RpcPrefix + enc)
      .join(',')

    this._wsc = new WSClient(this._cfg)
    this._wsc.on(WSEvents.Open, this._reemit(Events.Connected))
    this._wsc.on(WSEvents.Close, this._reemit(Events.Disconnected))
    this._wsc.on(WSEvents.Message, this._reemit(Events.Message))
    this._wsc.on(WSEvents.Open, this._setEncoder)
    this._wsc.on(WSEvents.Message, this._process)
  }

  async connect() {
    if (!this.connected) {
      await this._wsc.connect()
    }

    return this
  }

  get connected() {
    return this._wsc.connected
  }

  async call(method, ...args) {
    const id = ++this._callLastId
    const call = new TimeoutCall(this._cfg.timeout)
    this._calls[id] = call

    try {
      await this._send(method, args, id)
      return await call.result
    }
    finally {
      call.clean()
      delete this._calls[id]
    }
  }

  on(name, fn) {
    this._emitter.on(name, fn)
  }

  emit(name, ...args) {
    if (!isStr(name)) {
      throw new Error("event name must be strings")
    }

    return this._send(name, args)
  }


  _setEncoder = event => {
    const {protocol} = event.target
    const name = protocol.startsWith(RpcPrefix)
      ? protocol.split('.')[1]
      : JsonEncoder.name

    this._encoder = this._cfg.encoders[name]
    if (!this._encoder) {
      throw new Error(`encoder ${name} not in config list`)
    }
  }

  _process = async msgs => {
    try {
      msgs = await preprocessMessage(msgs)
      msgs = await this._encoder.decode(msgs)
    } catch (e) {
      console.warn("server decode error", e)
      return
    }

    if (!isArr(msgs)) msgs = [msgs]
    msgs.forEach(this._msg)
  }

  _msg = msg => {
    try {
      msg = msgParse(msg)
    } catch (e) {
      console.warn("message parse error", e)
      return
    }

    const {type, id, method, args, result, error} = msg

    switch (type) {
      case MsgType.Event:
        return this._emitter.emit(method, ...args)

      case MsgType.Response:
        return this._calls[id]?.success(result)

      case MsgType.Error:
        const e = new RpcError(error)
        return this._calls[id]?.error(e)
    }
  }

  async _send(method, args, id) {
    let msg = {id, method, params: makeParams(args)}
    msgSetVersion(msg)

    await this._wsc.ready // wait encoder choose
    msg = await this._encoder.encode(msg)

    return this._wsc.send(msg)
  }

  _reemit = event => {
    return (...args) => this._emitter.emit(event, ...args)
  }
}

class TimeoutCall {
  result
  _resolve
  _reject
  _timer

  constructor(ms) {
    this.result = new Promise((resolve, reject) => {
      this._resolve = resolve
      this._reject = reject
      this._timer = setTimeout(() => {
        reject(new TimeoutError(ms))
      }, ms)
    })
  }

  success(data) {
    this._resolve(data)
  }

  error(error) {
    this._reject(error)
  }

  clean() {
    clearTimeout(this._timer)
  }
}

function preprocessMessage(msg) {
  return new Promise(resolve => {
    if (!(msg instanceof Blob)) {
      return resolve(msg)
    }

    const reader = new FileReader()
    reader.addEventListener('load', e => resolve(e.target.result))
    reader.readAsArrayBuffer(msg)
  })
}
