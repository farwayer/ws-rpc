import {WebSocket, ServerOptions} from 'ws'
import {Encoder, Id, RpcError} from '@ws-rpc/proto'


export type Client = {
  id: string
  encoder: Encoder
  ws: WebSocket
}

export type Context<C extends object = {}> = () => C & {
  client: Client
  method: string
  throw: typeof throwRpcError
  throwMethodNotFound: typeof throwMethodNotFound
}

type WSSConfig = ServerOptions & {
  pingInterval: number
}

export type Rpc<C extends object, R> =
  (ctx: Context<C>, ...args: any[]) => Promise<R>

export type Event<C extends object, R> =
  (ctx: Context<C>, ...args: any[]) => void

export type Config<C extends object, R> = WSSConfig & {
  encoders?: Encoder[]
  maxBatch?: number
  rpc: Rpc<C, R>
  event: Event<C, R>
}

export class Server<C extends object, R> {
  constructor(cfg: Config<C, R>)

  readonly clientIds: string[]

  isClientConnected(clientId: string): boolean
  emit(clientIds: string | string[], event: string, ...args: any[]): Promise<boolean | boolean[]>
  emitAll(event: string, ...args: any[]): Promise<boolean[]>
}

export function throwRpcError(error: RpcError): void
export function throwMethodNotFound(id: Id, method: string): void
