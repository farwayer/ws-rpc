export class RpcError extends Error {
  constructor(id, method, error) {
    let {code, message, data} = error
    super(message)
    this.id = id
    this.method = method
    this.code = code
    this.data = data
  }

  toString() {
    let str = `[${this.id}:${this.method}]`
    if (this.code) str += ` code=${this.code}`
    if (this.message) str += ` message="${this.message}"`
    if (this.data) str += ` data='${JSON.stringify(this.data)}'`
    return str
  }

  toJSON() {
    let {id, method, code, message, data} = this
    return {id, code, message, method, data}
  }
}

export class RpcTimeout extends RpcError {
  constructor(id, method, timeout) {
    let error = {message: `rpc '${method}' timeout ${timeout}ms`}
    super(id, method, error)
    this.timeout = timeout
  }
}
