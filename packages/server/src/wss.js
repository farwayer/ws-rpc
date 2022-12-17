import {createNanoEvents} from 'nanoevents'
import {WebSocketServer} from 'ws'
import {WSEvents} from './const.js'


export default class WSServer {
  #ws
  #pingTimer
  #emitter = createNanoEvents()

  constructor(wsOpt, cfg = {}) {
    const {pingInterval} = cfg
    if (!pingInterval) {
      throw new Error(`cfg.pingInterval required`)
    }

    this.#ws = new WebSocketServer(wsOpt)

    this.#ws.on(WSEvents.Connection, ws => {
      ws.alive = true

      ws.on(WSEvents.Pong, function () {
        this.alive = true
      })
    })

    this.#pingTimer = setInterval(() => {
      this.#ws.clients.forEach(ws => {
        if (!ws.alive) {
          return ws.terminate()
        }

        ws.alive = false
        ws.ping()
      })
    }, pingInterval)
  }

  close() {
    clearInterval(this.#pingTimer)
    this.#ws.close(...arguments)
  }

  on(event, cb) {
    this.#emitter.on(event, cb)
    this.#ws.on(event, (...args) => {
      this.#emitter.emit(event, ...args)
    })
  }
}
