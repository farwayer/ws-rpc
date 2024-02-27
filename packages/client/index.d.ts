import {Unsubscribe} from 'nanoevents'
import {ClientCfg} from 'wscl'
import {Encoder} from '@ws-rpc/proto'


export type Config = ClientCfg & {
  timeout?: number
  encoders: Encoder[]
}

export class Client {
  constructor(cfg: Config)

  readonly connected: boolean

  connect(): Promise<this>
  close(reason?: string): void
  rpc(method: string, ...args: any[]): Promise<any>
  emit(event: string, ...args: any[]): Promise<void>
  on(event: string, cb: (...args: any[]) => void): Unsubscribe
}

export class TimeoutError extends Error {
  id: string | number
  method: string
  timeout: number
}
export class RpcError extends Error {
  code: number
  data?: any
}

export namespace events {
  export const Connected: 'rpc.ws.connected'
  export const Disconnected: 'rpc.ws.disconnected'
  export const Message: 'rpc.ws.connected'
  export const ClientConnected: 'rpc.client.connected'
}
