export class RpcError extends Error {
  constructor(id, method, error) {
    super(error.message)
    Object.assign(this, error, {id, method})
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
