import {errors} from '@ws-rpc/proto'


export let throwRpcError = (error) => {
  throw new RpcError(error)
}

export let throwMethodNotFound = (id, method) =>
  throwRpcError(errors.methodNotFound(id, method).error)

export class SendError extends Error {}
export class EncoderError extends Error {}
export class RpcError extends Error {
  constructor(error = errors.internalError()) {
    super(error.message)
    Object.assign(this, error)
  }
}
