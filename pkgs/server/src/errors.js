import {errors} from '@ws-rpc/proto'


export let throwRpcError = (error) => {
  throw new RpcError(error)
}

export let throwMethodNotFound = (id, method) =>
  throwRpcError(errors.methodNotFound(id, method).error)


// internal
export class SendError extends Error {}
export class EncoderError extends Error {}
export class RpcError extends Error {
  constructor(error = errors.internalError()) {
    super(error.message)
    Object.assign(this, error)
  }
}

export let responseToServer = (id) =>
  errors.invalidRequest(id, "client must not send response message to server")

export let errorToServer = (id) =>
  errors.invalidRequest(id, "client must not send error message to server")
