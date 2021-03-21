import {isArr} from 'istp'

const {isDef, isUndef, isNum, isStr, isNul, isObj} = require('istp')
const Errors = require('./errors')
const {isInt} = require('istp')
const {Protocol, MsgType} = require('./const')


function msgParse(msg) {
  const {jsonrpc, id, method, params, error, result} = msg
  const hasId = isDef(id)

  if (hasId && !isStr(id) && !isNum(id) && !isNul(id)) {
    throw msgErr(Errors.InvalidId, id)
  }

  if (jsonrpc !== Protocol) {
    throw msgErr(Errors.UnsupportedProtocol, id)
  }

  if (isDef(result)) {
    if (isDef(error)) {
      throw msgErr(Errors.HasErrorAndResult, id)
    }

    return {type: MsgType.Response, id, result}
  }

  if (isDef(error)) {
    if (!isObj(error)) {
      throw msgErr(Errors.ErrorIsNotObject, id)
    }
    if (!isInt(error.code)) {
      throw msgErr(Errors.ErrorCodeIsNotInteger, id)
    }
    if (!isStr(error.message)) {
      throw msgErr(Errors.ErrorMessageIsNotString, id)
    }

    return {type: MsgType.Error, id, error}
  }

  if (isUndef(method)) {
    throw msgErr(Errors.NoMethodResultError, id)
  }

  if (!isStr(method)) {
    throw msgErr(Errors.MethodMustBeString, id)
  }

  if (isDef(params) && !isArr(params) && !isObj(params)) {
    throw msgErr(Errors.InvalidParams, id)
  }

  const args = parseParams(params)
  const type = hasId ? MsgType.Request : MsgType.Event

  return {type, id, method, args}
}

function msgSetVersion(msgs) {
  if (!isArr(msgs)) msgs = [msgs]

  msgs.forEach(msg => {
    msg.jsonrpc = Protocol
  })
}

function msgErr(error, id = null) {
  return {id, error}
}

function parseParams(params) {
  return isArr(params) ? params : [params]
}

function makeParams(args = []) {
  switch (args.length) {
    case 0:
      return
    case 1:
      return isObj(args[0]) && !isArr(args[0])
        ? args[0]
        : args
    default:
      return args
  }
}

module.exports = {
  Protocol,
  MsgType,
  msgParse,
  msgSetVersion,
  parseParams,
  makeParams,
  msgErr,
}
