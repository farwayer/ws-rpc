import {WebSocket, ServerOptions} from 'ws'
import * as proto from '@ws-rpc/proto'
import {events} from '@ws-rpc/proto'


export type Client = {
  id: string
  encoder: proto.Encoder
  ws: WebSocket
}

export type Context<C extends Client, Ctx extends object> = Ctx & {
  client: C
  wss: Server<C, Ctx>
  emit: <Args extends any[]>(event: string, ...args: Args) => Promise<boolean>
  emitAll: <Args extends any[]>(event: string, ...args: Args) => Promise<boolean[]>
  throw: typeof throwRpcError
  throwMethodNotFound: () => void
}

export type OnRpc<C extends Client, Ctx extends object> = <Args extends any[], R>(
  ctx: Context<C, Ctx>,
  method: string,
  ...args: Args,
) => Promise<R>

export type OnEvent<C extends Client, Ctx extends object> = <Args extends any[]>(
  ctx: Context<C, Ctx>,
  event: string,
  ...args: Args,
) => void

type WSSConfig = ServerOptions & {
  pingInterval: number
}

export type Config<C extends Client, Ctx extends object> = WSSConfig & {
  encoders?: proto.Encoder[]
  maxBatch?: number
  onrpc?: OnRpc<C, Ctx>
  onevent?: OnEvent<C, Ctx>
  ctx?: Ctx
}

export class Server<C extends Client, Ctx extends object = {}> {
  constructor(cfg: Config<C, Ctx>)

  onrpc?: OnRpc<C, Ctx>
  onevent?: OnEvent<C, Ctx>
  ctx: Ctx

  readonly clientIds: IterableIterator<string>
  readonly clients: IterableIterator<C>
  getClient(id: string): C | undefined
  hasClient(id: string): boolean

  onWs(
    wsEvent: 'connection' | 'close' | 'message' | 'error' | 'headers' | 'wsClientError',
    cb: () => void, // TODO
  ): () => void

  emit<Ids extends string | string[], Args extends any[]>(
    clientIds: Ids,
    event: string,
    ...args: Args,
  ): Promise<Ids extends string ? boolean : boolean[]>

  emitAll<Args extends any[]>(event: string, ...args: Args): Promise<boolean[]>
}

export function throwRpcError(error: proto.RpcError): void
export function throwMethodNotFound(id: proto.Id, method: string): void

export interface SendError extends Error {}
export interface EncoderError extends Error {}
export interface RpcError extends Error {}
export interface SendError extends Error, proto.ErrorMessage {}

export {events}
