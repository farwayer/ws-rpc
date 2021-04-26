export class RpcError extends Error {
  constructor(error) {
    super(error.message)
    this.code = error.code
    this.data = error.data
  }

  toString() {
    let str = `[${this.code}] ${this.message}`
    if (this.data) str += " " + JSON.stringify(this.data)
    return str
  }
}

export class TimeoutError extends Error {
  constructor(ms) {
    super(`timeout ${ms}ms`)
  }
}
