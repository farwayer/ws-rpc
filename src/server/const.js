module.exports = {
  WSEvents: {
    Connection: 'connection',
    Close: 'close',
    Message: 'message',
    Error: 'error',
    Pong: 'pong',
    Headers: 'headers',
  },
  ProtocolsHeader: 'sec-websocket-protocol',
  HttpPreconditionFailed: 412,
  DefaultPingInterval: 3000,
}
