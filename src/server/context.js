const nanoid = require('nanoid')
const {InternalError} = require('../common/errors')


module.exports = class Context {
  state = {}
  #ws
  #client
  #encoder

  constructor(encoder) {
    this.#encoder = encoder
    this.#client = nanoid()
    this._readonly('ws')
    this._readonly('client')
    this._readonly('encoder')
  }

  get ws() {
    return this.#ws
  }

  get client() {
    return this.#client
  }

  get encoder() {
    return this.#encoder
  }

  throw(
    code = InternalError.code,
    message = InternalError.message,
    data,
  ) {
    const error = new Error(message)
    error.code = code
    error.data = data
    throw error
  }

  _readonly(name) {
    Object.getPrototypeOf(this).__defineSetter__(name, () => this.throw(
      InternalError.code,
      InternalError.message,
      `${name} field is read-only`,
    ))
  }

  _setWs(ws) {
    this.#ws = ws
  }
}
