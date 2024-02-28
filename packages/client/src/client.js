import * as wscl from 'wscl'
import {
  types, msgParse, rpcNew, eventNew, protocol, encoderName, batch, events,
} from '@ws-rpc/proto'
import {JsonEncoder} from '@ws-rpc/encoder-json'
import {RpcError, RpcTimeout} from './errors.js'


export class Client {
  onevent
  onerror

  #timeout
  #wsc
  #encoders = new Map().set(JsonEncoder.name, JsonEncoder)
  #encoder
  #callId = 0
  #calls = new Map()

  get connected() {
    return this.#wsc.connected
  }

  constructor(cfg = {}) {
    let {onevent, onerror, encoders = [], timeout = 30000, ...wscOpts} = cfg

    this.onevent = onevent
    this.onerror = onerror
    this.#timeout = timeout

    for (let encoder of encoders) {
      this.#encoders.set(encoder.name, encoder)
    }

    wscOpts.protocols = Array.from(this.#encoders.keys()).map(protocol)

    this.#wsc = new wscl.Client(wscOpts)
    this.#wsc.on(wscl.events.Open, this.#wsOpen)
    this.#wsc.on(wscl.events.Close, this.#wsClose)
    this.#wsc.on(wscl.events.Error, this.#wsError)
    this.#wsc.on(wscl.events.Message, this.#wsMessage)
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

  onWs(event, cb) {
    this.#wsc.on(event, cb)
  }

  async rpc(method, ...args) {
    let id = ++this.#callId
    let msg = rpcNew(id, method, args)

    return this.#call(msg)
  }

  async emit(event, ...args) {
    typeof event === 'string' || 'event must be a string'()

    let msg = eventNew(event, args)
    return this.#send(msg)
  }


  #wsOpen = event => {
    let {protocol} = event.target
    let name = encoderName(protocol)
    this.#encoder = this.#encoders.get(name)

    if (!this.#encoder) {
      this.#wsc.close('invalid encoder protocol')

      this.onerror?.(
        new Error(`invalid protocol '${protocol}' received from server`)
      )
    }
  }

  #wsClose = () =>
    this.onevent?.(events.Disconnected)

  #wsError = err =>
    this.onerror?.(err)

  #wsMessage = async msg => {
    try {
      msg = await this.#encoder.decode(msg)
      await batch(msg, msgs => msgs.forEach(this.#msg))
    }
    catch (e) {
      this.onerror?.(e)
    }
  }

  #msg = msg => {
    let {type, id, method, args, result, error} = msgParse(msg)

    switch (type) {
      case types.Event:
        return this.onevent?.(method, ...args)

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
}
