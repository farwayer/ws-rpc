import * as is from 'istp'
import * as e from './msg-errors.js'
import * as t from './types.js'
import {Protocol, RpcPrefix} from './const.js'


export {errNew} from './errors.js'

export let eventNew = (method, args) => {
  let params = paramsNew(args)

  return {
    jsonrpc: Protocol,
    method,
    ...(is.def(params) ? {params} : {}),
  }
}

export let rpcNew = (id, method, args) => {
  let params = paramsNew(args)

  return {
    jsonrpc: Protocol,
    id, method,
    ...(is.def(params) ? {params} : {}),
  }
}

export let resNew = (id, result = null) => ({
  jsonrpc: Protocol,
  id, result,
})

export let encoderName = (protocol) =>
  protocol?.split('.')[1]

export let protocol = (encoderName) =>
  RpcPrefix + encoderName

export let batch = async (items, fn, maxBatch) => {
  let isBatch = is.arr(items)
  if (!isBatch) {
    items = [items]
  }

  if (items.length > maxBatch) {
    e.throwMaxBatch(maxBatch)
  }

  try {
    items = await fn(items)
  }
  catch {
    e.throwInternalError("processing failed")
  }

  if (!items?.length) return

  return isBatch ? items : items[0]
}

export let msgParse = (msg) => {
  if (!is.nonNulObj(msg)) {
    e.throwInvalidMsgType(msg)
  }

  let {jsonrpc, id, method, params, error, result} = msg

  if (jsonrpc !== Protocol) {
    e.throwUnsupportedProtocol(id)
  }

  let hasId = is.def(id)
  if (hasId && !is.str(id) && !is.num(id) && !is.nul(id)) {
    e.throwInvalidIdType(id)
  }

  if (is.def(result)) {
    if (is.def(error)) {
      e.throwHasErrorAndResult(id)
    }

    let type = t.Response
    return {type, id, result}
  }

  if (is.def(error)) {
    if (!is.obj(error)) {
      e.throwErrorIsNotObject(id)
    }
    if (!is.int(error.code)) {
      e.throwErrorCodeIsNotInteger(id)
    }
    if (!is.str(error.message)) {
      e.throwErrorMessageIsNotString(id)
    }

    let type = t.Error
    return {type, id, error}
  }

  if (is.undef(method)) {
    e.throwNoMethodResultError(id)
  }

  if (!is.str(method)) {
    e.throwMethodMustBeString(id)
  }

  if (is.def(params) && !is.nonNulObj(params)) {
    e.throwInvalidParams(id)
  }

  let args = paramsParse(params)

  if (hasId) {
    let type = t.Request
    return {type, id, method, args}
  }

  let type = t.Event
  return {type, method, args}
}


// internal
let paramsNew = (args = []) => {
  switch (args.length) {
    case 0:
      return
    case 1:
      return is.nonNulObj(args[0]) && !is.arr(args[0])
        ? args[0]
        : args
    default:
      return args
  }
}

let paramsParse = params => {
  if (is.undef(params)) {
    return []
  }

  return is.arr(params) ? params : [params]
}
