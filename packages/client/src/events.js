import {RpcPrefix, Events as ProtoEvents} from 'rpc-ws-proto'


export const Events = {
  Connected: RpcPrefix + 'connected',
  Disconnected: RpcPrefix + 'disconnected',
  Message: RpcPrefix + 'message',
  ...ProtoEvents,
}
