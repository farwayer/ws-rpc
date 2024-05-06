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

export const JsonEncoder: {
  name: 'json'
  encode(msg: Message | Message[]): string
  decode(data: ArrayBuffer): Message | Message[]
}
