const {Protocol} = require('./const')


const Errors = {
  ParseError: {code: -32700, message: "Parse error"},
  InvalidRequest: {code: -32600, message: "Invalid Request"},
  MethodNotFound: {code: -32601, message: "Method not found"},
  InvalidParams: {code: -32602, message: "Invalid params"},
  InternalError: {code: -32603, message: "Internal error"},
}

// helpers
module.exports = Object.assign(Errors, {
  InvalidMessage: {...Errors.ParseError, data: "invalid message"},
  HasErrorAndResult: {...Errors.ParseError, data: "message has both error and result"},
  ErrorIsNotObject: {...Errors.ParseError, data: "error is not object"},
  ErrorCodeIsNotInteger: {...Errors.ParseError, data: "error code is not integer"},
  ErrorMessageIsNotString: {...Errors.ParseError, data: "error message is not string"},
  UnsupportedProtocol: {...Errors.InvalidRequest, data: `only ${Protocol} protocol supported`},
  InvalidId: {...Errors.InvalidRequest, data: `invalid id`},
  MethodMustBeString: {...Errors.InvalidRequest, data: "method must be string"},
  Encoding: {...Errors.InternalError, data: "encoding error"},
  ResponseToServer: {...Errors.InvalidRequest, data: "client must not send response message to server"},
  ErrorToServer: {...Errors.InvalidRequest, data: "client must not send error message to server"},
  NoMethodResultError: {...Errors.InvalidRequest, data: "at least one of method, result or error field must be set"},
})
