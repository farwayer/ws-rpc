import {RpcPrefix, Events as ProtoEvents} from '@ws-rpc/proto'


export const Events = {
  Connected: RpcPrefix + 'connected',
  Disconnected: RpcPrefix + 'disconnected',
  Message: RpcPrefix + 'message',
  ...ProtoEvents,
}
