const is = require('./is')
const Errors = require('./errors')
const {Protocol, MsgType} = require('./const')


function msgParse(msg) {
  const {jsonrpc, id, method, params, error, result} = msg
  const hasId = is.defined(id)

  if (hasId && !is.string(id) && !is.number(id) && !is.null(id)) {
    throw msgErr(Errors.InvalidId, id)
  }

  if (jsonrpc !== Protocol) {
    throw msgErr(Errors.UnsupportedProtocol, id)
  }

  if (is.defined(result)) {
    if (is.defined(error)) {
      throw msgErr(Errors.HasErrorAndResult, id)
    }

    return {type: MsgType.Response, id, result}
  }

  if (is.defined(error)) {
    if (!is.object(error)) {
      throw msgErr(Errors.ErrorIsNotObject, id)
    }
    if (!is.integer(error.code)) {
      throw msgErr(Errors.ErrorCodeIsNotInteger, id)
    }
    if (!is.string(error.message)) {
      throw msgErr(Errors.ErrorMessageIsNotString, id)
    }

    return {type: MsgType.Error, id, error}
  }

  if (!is.defined(method)) {
    throw msgErr(Errors.NoMethodResultError, id)
  }

  if (!is.string(method)) {
    throw msgErr(Errors.MethodMustBeString, id)
  }

  if (is.defined(params) && !is.array(params) && !is.object(params)) {
    throw msgErr(Errors.InvalidParams, id)
  }

  const args = parseParams(params)
  const type = hasId ? MsgType.Request : MsgType.Event

  return {type, id, method, args}
}

function msgSetVersion(msgs) {
  if (!is.array(msgs)) msgs = [msgs]

  msgs.forEach(msg => {
    msg.jsonrpc = Protocol
  })
}

function msgErr(error, id = null) {
  return {id, error}
}

function parseParams(params) {
  return is.array(params) ? params : [params]
}

function makeParams(args = []) {
  switch (args.length) {
    case 0:
      return
    case 1:
      return is.object(args[0]) && !is.array(args[0])
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
