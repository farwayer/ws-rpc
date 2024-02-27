import {WebSocketServer} from 'ws'


export class WSServer extends WebSocketServer {
  #pingTimer

  constructor(cfg = {}) {
    let {pingInterval = 3000, ...wsOpts} = cfg
    super(wsOpts)

    this.on('connection', ws => {
      ws.alive = true

      ws.on('pong', () => {
        ws.alive = true
      })
    })

    this.#pingTimer = setInterval(this.#checkClients, pingInterval)
  }

  close(cb) {
    clearInterval(this.#pingTimer)
    super.close(cb)
  }

  #checkClients = () => {
    for (let ws of this.clients) {
      if (!ws.alive) {
        return ws.terminate()
      }

      ws.alive = false
      ws.ping()
    }
  }
}
