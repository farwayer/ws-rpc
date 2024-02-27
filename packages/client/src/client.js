import {createNanoEvents} from 'nanoevents'
import * as wscl from 'wscl'
import * as is from 'istp'
import {
  types, msgParse, rpcNew, eventNew, protocol, encoderName, batch,
} from '@ws-rpc/proto'
import {JsonEncoder} from '@ws-rpc/encoder-json'
import {RpcError, RpcTimeout} from './errors.js'
import * as events from './events.js'


export class Client {
  #timeout
  #wsc
  #emitter = createNanoEvents()
  #encoders = new Map().set(JsonEncoder.name, JsonEncoder)
  #encoder
  #callId = 0
  #calls = new Map()

  get connected() {
    return this.#wsc.connected
  }

  constructor(cfg = {}) {
    let {timeout = 30000, encoders = [], ...wscOpts} = cfg

    this.#timeout = timeout

    for (let encoder of encoders) {
      this.#encoders.set(encoder.name, encoder)
    }

    let protocols = encoders
      .concat(JsonEncoder)
      .map(encoder => protocol(encoder.name))

    wscOpts = {protocols, ...wscOpts}
    this.#wsc = new wscl.Client(wscOpts)

    this.#wsc.on(wscl.events.Open, this.#reemitter(events.Connected))
    this.#wsc.on(wscl.events.Close, this.#reemitter(events.Disconnected))
    this.#wsc.on(wscl.events.Message, this.#reemitter(events.Message))
    this.#wsc.on(wscl.events.Open, this.#setEncoder)
    this.#wsc.on(wscl.events.Message, this.#handle)
  }

  async connect() {
    await this.#wsc.connect(ws => {
      ws.binaryType = 'arraybuffer'
    })

    return this
  }

  close(reason) {
    this.#wsc.close(reason)
  }

  async rpc(method, ...args) {
    let id = ++this.#callId
    let msg = rpcNew(id, method, args)

    return this.#call(msg)
  }

  on(name, fn) {
    this.#emitter.on(name, fn)
  }

  async emit(event, ...args) {
    is.str(event) || 'event must be a string'()

    let msg = eventNew(event, args)
    return this.#send(msg)
  }


  #handle = async msg => {
    try {
      msg = await this.#encoder.decode(msg)
      await batch(msg, msgs => msgs.forEach(this.#msg))
    }
    catch (e) {
      this.#emitter.emit(wscl.events.Error, e)
    }
  }

  #msg = msg => {
    let {type, id, method, args, result, error} = msgParse(msg)

    switch (type) {
      case types.Event:
        return this.#emitter.emit(method, ...args)

      case types.Response:
        return this.#calls.get(id)?.ok(result)

      case types.Error:
        return this.#calls.get(id)?.fail(error)
    }
  }

  async #call(msg) {
    return new Promise(async (resolve, reject) => {
      let {id, method} = msg

      let timer
      let clean = () => {
        clearTimeout(timer)
        this.#calls.delete(id)
      }

      let ok = result => clean() || resolve(result)
      let fail = error => clean() || reject(new RpcError(id, method, error))
      let timeout = () => clean() || reject(new RpcTimeout(id, method, this.#timeout))

      let call = {ok, fail}
      this.#calls.set(id, call)

      timer = setTimeout(timeout, this.#timeout)

      try {
        await this.#send(msg)
      }
      catch (e) {
        fail(e)
      }
    })
  }

  async #send(msg) {
    await this.#wsc.ready // wait encoder choose
    msg = await this.#encoder.encode(msg)
    return this.#wsc.send(msg)
  }

  #setEncoder = event => {
    let {protocol} = event.target
    let name = encoderName(protocol)
    this.#encoder = this.#encoders.get(name)

    if (!this.#encoder) {
      this.#wsc.close('invalid encoder protocol')

      let e = new Error(`invalid protocol '${protocol}' received from server`)
      this.#emitter.emit(wscl.events.Error, e)
    }
  }

  #reemitter = event => (...args) =>
    this.#emitter.emit(event, ...args)
}
