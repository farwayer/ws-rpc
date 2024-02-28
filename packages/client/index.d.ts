import * as wscl from 'wscl'
import {Encoder, Id, events} from '@ws-rpc/proto'

export type OnEvent = <Args extends any[]>(event: string, ...args: Args) => void
export type OnError = (error: any) => void

export type Config = wscl.Config & {
  onevent?: OnEvent
  onerror?: OnError
  encoders?: Encoder[]
  timeout?: number
}

export class Client {
  constructor(cfg: Config)

  onevent?: OnEvent
  onerror?: OnError

  readonly connected: boolean

  connect(): Promise<this>
  close: wscl.Client['close']
  onWs: wscl.Client['on']

  rpc<Args extends any[], T>(method: string, ...args: Args): Promise<T>
  emit<Args extends any[]>(event: string, ...args: Args): Promise<void>
}

export class RpcError extends Error {
  id: Id
  method: string
  code: number
  data?: any
}
export class RpcTimeout extends RpcError {
  timeout: number
}

export {events}
