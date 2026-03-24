import type {Message} from '@ws-rpc/proto'

export const JsonEncoder: {
	name: 'json'
	encode(msg: Message | Message[]): string
	decode(data: string | ArrayBuffer): Message | Message[]
}