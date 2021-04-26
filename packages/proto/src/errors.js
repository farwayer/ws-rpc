import {Protocol} from './const'


export const ParseError = {code: -32700, message: "Parse error"}
export const InvalidRequest = {code: -32600, message: "Invalid Request"}
export const MethodNotFound = {code: -32601, message: "Method not found"}
export const InvalidParams = {code: -32602, message: "Invalid params"}
export const InternalError = {code: -32603, message: "Internal error"}


// helpers
export const InvalidMessage = {...ParseError, data: "invalid message"}
export const HasErrorAndResult = {...ParseError, data: "message has both error and result"}
export const ErrorIsNotObject = {...ParseError, data: "error is not object"}
export const ErrorCodeIsNotInteger = {...ParseError, data: "error code is not integer"}
export const ErrorMessageIsNotString = {...ParseError, data: "error message is not string"}
export const UnsupportedProtocol = {...InvalidRequest, data: `only ${Protocol} protocol supported`}
export const InvalidId = {...InvalidRequest, data: `invalid id`}
export const MethodMustBeString = {...InvalidRequest, data: "method must be string"}
export const Encoding = {...InternalError, data: "encoding error"}
export const ResponseToServer = {...InvalidRequest, data: "client must not send response message to server"}
export const ErrorToServer = {...InvalidRequest, data: "client must not send error message to server"}
export const NoMethodResultError = {...InvalidRequest, data: "at least one of method, result or error field must be set"}
