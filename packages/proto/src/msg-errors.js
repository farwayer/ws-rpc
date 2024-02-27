import {Protocol} from './const.js'
import {invalidParams, invalidRequest, internalError} from './errors.js'


export let throwInvalidMsgType = (msg) =>
  th(invalidRequest(null, `invalid msg type '${typeof msg}'`))

export let throwInvalidIdType = (id) =>
  th(invalidRequest(null, `invalid id type '${typeof id}'`))

export let throwUnsupportedProtocol = (id) =>
  th(invalidRequest(id, `only ${Protocol} protocol supported`))

export let throwHasErrorAndResult = (id) =>
  th(invalidRequest(id, "message has both error and result"))

export let throwErrorIsNotObject = (id) =>
  th(invalidRequest(id, "error is not object"))

export let throwErrorCodeIsNotInteger = (id) =>
  th(invalidRequest(id, "error code is not integer"))

export let throwErrorMessageIsNotString = (id) =>
  th(invalidRequest(id, "error message is not string"))

export let throwNoMethodResultError = (id) =>
  th(invalidRequest(id, "at least one of method, result or error field must be set"))

export let throwMethodMustBeString = (id) =>
  th(invalidRequest(id, "method must be string"))

export let throwInvalidParams = (id) =>
  th(invalidParams(id))

export let throwMaxBatch = (maxBatch) =>
  th(invalidRequest(null, `batch is too large size=${maxBatch}`))

export let throwInternalError = (id, data) =>
  th(internalError(id, data))


let th = err => {
  throw err
}
