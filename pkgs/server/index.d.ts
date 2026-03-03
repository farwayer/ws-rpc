import * as http from 'node:http'
import {WebSocket, ServerOptions} from 'ws'
import * as proto from '@ws-rpc/proto'
import {events} from '@ws-rpc/proto'

export type Client = {
	id: string
	encoder: proto.Encoder
	ws: WebSocket
}

export type Context<
	C extends Client = Client,
	Ctx extends object = object,
> = Ctx & {
	client: C
	wss: Server<C, Ctx>
	emit: <Args extends any[]>(event: string, ...args: Args) => Promise<boolean>
	emitAll: <Args extends any[]>(event: string, ...args: Args) => Promise<boolean[]>
	throw: typeof throwRpcError
	throwMethodNotFound: () => never
}

export type OnRpc<
	C extends Client = Client,
	Ctx extends object = {},
> = <Args extends any[], R>(
	ctx: Context<C, Ctx>,
	method: string,
	...args: Args,
) => Promise<R>

export type OnEvent<
	C extends Client = Client,
	Ctx extends object = {},
> = <Args extends any[]>(
	ctx: Context<C, Ctx>,
	event: string,
	...args: Args,
) => void

export type OnConnected<C extends Client = Client> = (
	client: C,
	req: http.IncomingMessage,
) => void

type WSSConfig = ServerOptions & {
	pingInterval: number
}

export type Config<
	C extends Client = Client,
	Ctx extends object = {},
> = WSSConfig & {
	encoders?: proto.Encoder[]
	maxBatch?: number
	onrpc?: OnRpc<C, Ctx>
	onevent?: OnEvent<C, Ctx>
	onconnected?: OnConnected<C>
	ctx?: Ctx
}

export class Server<
	C extends Client = Client,
	Ctx extends object = {}
> {
	constructor(cfg: Config<C, Ctx>)

	onrpc?: OnRpc<C, Ctx>
	onevent?: OnEvent<C, Ctx>
	onconnect?: OnConnected<C>
	ctx: Ctx

	readonly clientIds: IterableIterator<string>
	readonly clients: IterableIterator<C>

	getClient(id: string): C | undefined

	hasClient(id: string): boolean

	onWs(
		wsEvent: 'connection' | 'close' | 'message' | 'error' | 'headers' | 'wsClientError',
		cb: (...args: any[]) => void, // TODO
	): () => void

	emit<Ids extends string | string[], Args extends any[]>(
		clientIds: Ids,
		event: string,
		...args: Args,
	): Promise<Ids extends string ? boolean : boolean[]>

	emitAll<Args extends any[]>(event: string, ...args: Args): Promise<boolean[]>
}

export function throwRpcError(error: proto.RpcError): never

export function throwMethodNotFound(id: proto.Id, method: string): never

export interface SendError extends Error {}
export interface EncoderError extends Error {}
export interface RpcError extends Error {}
export interface SendError extends Error, proto.ErrorMessage {}

export {events}
