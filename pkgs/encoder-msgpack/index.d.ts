type RpcError = {
  code: number
  message?: string
  data?: any
}

type Message = {
  jsonrpc: '2.0'
  id?: string | number | null
  method?: string
  params?: object | any[]
  result?: any
  error?: RpcError
}

export const MsgpackEncoder: {
  name: 'msgpack'
  encode(msg: Message | Message[]): ArrayBuffer
  decode(data: ArrayBuffer): Message | Message[]
}
