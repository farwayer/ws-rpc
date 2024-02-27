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

export type Rpc<C extends object> =
  <Args extends any[], R>(ctx: Context<C>, ...args: Args) => Promise<R>

export type Event<C extends object> =
  <Args extends any[]>(ctx: Context<C>, ...args: Args) => void

export type Config<C extends object> = WSSConfig & {
  encoders?: Encoder[]
  maxBatch?: number
  rpc: Rpc<C>
  event: Event<C>
}

export class Server<C extends object> {
  constructor(cfg: Config<C>)

  readonly clientIds: string[]

  rpc: Rpc<C>
  event: Event<C>

  isClientConnected(clientId: string): boolean
  onWsEvent(
    wsEvent: 'connection' | 'close' | 'message' | 'error' | 'headers' | 'wsClientError',
    cb: () => void, // TODO
  ): () => void

  emit(clientIds: string | string[], event: string, ...args: any[]): Promise<boolean | boolean[]>
  emitAll(event: string, ...args: any[]): Promise<boolean[]>
}

export function throwRpcError(error: RpcError): void
export function throwMethodNotFound(id: Id, method: string): void
