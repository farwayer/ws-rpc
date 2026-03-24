import type {Message} from '@ws-rpc/proto'

export const MsgpackEncoder: {
	name: 'msgpack'
	encode(msg: Message | Message[]): ArrayBuffer
	decode(data: ArrayBuffer): Message | Message[]
}