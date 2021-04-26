import {Errors} from '@ws-rpc/proto'


export default class Context {
  #client
  #method

  constructor(client, method, globalContext) {
    this.#client = client
    this.#method = method
    Object.assign(this, globalContext)
  }

  get client() {
    return this.#client
  }

  get method() {
    return this.#method
  }

  throw(
    code = Errors.InternalError.code,
    message = Errors.InternalError.message,
    data,
  ) {
    const error = new Error(message)
    error.code = code
    error.data = data
    throw error
  }
}
