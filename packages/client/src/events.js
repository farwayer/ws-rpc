import {RpcPrefix, events} from '@ws-rpc/proto'

export let Connected = RpcPrefix + 'ws.connected'
export let Disconnected = RpcPrefix + 'ws.disconnected'
export let Message = RpcPrefix + 'ws.message'
export let ClientConnected = events.ClientConnected
