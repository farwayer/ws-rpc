export class SendError extends Error {}

export class EncodeError extends Error {
  constructor(encoder, message, msgs, opt) {
    if (message instanceof Error) message = message.message
    message = `<${encoder.name} encoder> ${message}`
    super(message)
    this.encoder = encoder.name
    this.msgs = msgs
    this.opt = opt
  }
}
