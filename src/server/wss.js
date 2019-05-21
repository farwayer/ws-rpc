const WS = require('ws')
const {WSEvents} = require('./const')


module.exports = class WSServer extends WS.Server {
  #pingTimer

  constructor(wsOpt, cfg) {
    super(wsOpt)

    this.on(WSEvents.Connection, ws => {
      ws.alive = true
      ws.on(WSEvents.Pong, function () {
        this.alive = true
      })
    })

    this.#pingTimer = setInterval(() => {
      this.clients.forEach(ws => {
        if (!ws.alive) return ws.terminate()
        ws.alive = false
        ws.ping()
      })
    }, cfg.pingInterval)
  }

  close() {
    clearInterval(this.#pingTimer)
    super.close(...arguments)
  }
}
