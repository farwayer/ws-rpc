import * as is from 'istp'
import {Protocol} from './const.js'


export let parseError = (data) =>
  errNew(null, -32700, "Parse error", data)

export let invalidRequest = (id, data) =>
  errNew(id, -32600, "Invalid Request", data)

export let methodNotFound = (id, data) =>
  errNew(id, -32601, "Method not found", data)

export let invalidParams = (id, data) =>
  errNew(id, -32602, "Invalid params", data)

export let internalError = (id, data) =>
  errNew(id, -32603, "Internal error", data)

export let errNew = (id, code, message, data) => ({
  jsonrpc: Protocol,
  ...(is.def(id) ? {id} : {}),
  error: {
    code,
    ...(is.def(message) ? {message} : {}),
    ...(is.def(data) ? {data} : {}),
  },
})
