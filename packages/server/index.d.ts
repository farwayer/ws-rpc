import {WebSocket, ServerOptions} from 'ws'
import {Encoder, Id, RpcError} from '@ws-rpc/proto'


export type Client = {
  id: string
  encoder: Encoder
  ws: WebSocket
}

export type Context<C extends object = {}> = C & {
  client: Client
  method: string
  emit: <Args extends any[]>(event: string, ...args: Args) => Promise<boolean>
  emitAll: <Args extends any[]>(event: string, ...args: Args) => Promise<boolean[]>
  throw: typeof throwRpcError
  throwMethodNotFound: typeof throwMethodNotFound
}

type WSSConfig = ServerOptions & {
  pingInterval: number
}

export type Rpc<C extends object> = <Args extends any[], R>(
  ctx: Context<C>,
  method: string,
  ...args: Args,
) => Promise<R>

export type Event<C extends object> = <Args extends any[]>(
  ctx: Context<C>,
  event: string,
  ...args: Args,
) => void

export type Config<C extends object> = WSSConfig & {
  encoders?: Encoder[]
  maxBatch?: number
  rpc?: Rpc<Context<C>>
  event?: Event<Context<C>>
  context?: C
}

export class Server<C extends object> {
  constructor(cfg: Config<C>)

  readonly clientIds: string[]

  rpc: Rpc<Context<C>>
  event: Event<Context<C>>
  context: C

  getClient(id: string): Client | undefined
  hasClient(id: string): boolean
  onWs(
    wsEvent: 'connection' | 'close' | 'message' | 'error' | 'headers' | 'wsClientError',
    cb: () => void, // TODO
  ): () => void

  emit<Ids extends string | string[]>(
    clientIds: Ids, event: string, ...args: any[],
  ): Promise<Ids extends string ? boolean : boolean[]>

  emitAll(event: string, ...args: any[]): Promise<boolean[]>
}

export function throwRpcError(error: RpcError): void
export function throwMethodNotFound(id: Id, method: string): void
