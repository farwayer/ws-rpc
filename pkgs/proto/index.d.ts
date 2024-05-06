export type Id = string | number
export const RpcPrefix: 'rpc.'
export const Protocol: '2.0'

export type RpcError = {
  code: number
  message?: string
  data?: any
}

export type Message = {
  jsonrpc: typeof Protocol
  id?: Id | null
  method?: string
  params?: object | any[]
  result?: any
  error?: RpcError
}

export type ErrorMessage = {
  jsonrpc: typeof Protocol
  id?: Id | null
  error: RpcError
}

export interface Encoder {
  name: string
  encode(msg: Message | Message[]): string | ArrayBuffer
  decode(data: ArrayBuffer): Message | Message[]
}

declare namespace errors {
  export function parseError(data?: any): ErrorMessage
  export function invalidRequest(id: Id | null, data?: any): ErrorMessage
  export function methodNotFound(id: Id, data?: any): ErrorMessage
  export function invalidParams(id: Id, data?: any): ErrorMessage
  export function internalError(id?: Id | null, data?: any): ErrorMessage
}

declare namespace events {
  const Connected: 'jsonrpc.connected'
  const Disconnected: 'jsonrpc.disconnected'
}

declare namespace types {
  export const Request: 1
  export const Response: 2
  export const Event: 3
  export const Error: 4
}

export function errNew(
  id: Id | null | undefined,
  code: number,
  message?: string,
  data?: any,
): ErrorMessage

export function eventNew(method: string, args: any[]): Message
export function rpcNew(id: Id, method: string, args: any[]): Message
export function resNew(id: Id, result?: any): Message
export function encoderName(protocol: string): string
export function protocol(encoderName: string): string
export function batch(
  items: object,
  fn: (items: any[]) => any, // TODO
  maxBatch?: number,
): Promise<any>
export function msgParse(msg: Message):
  {type: typeof types.Request, id: Id, method: string, args: any[]} |
  {type: typeof types.Response, id: Id, result: any} |
  {type: typeof types.Event, method: string, args: any[]} |
  {type: typeof types.Error, id?: Id, error: RpcError}
