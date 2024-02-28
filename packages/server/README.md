# ws-rpc

*Simple, small rfc-correct JSON-RPC 2.0 implementation with encoders support

## Usage

### Server

```js
import {Server} from '@ws-rpc/server'
import {MsgpackEncoder} from '@ws-rpc/encoder-msgpack'

// see ws lib options
let wss = new Server({
  port: 8081,
  encoders: [MsgpackEncoder], // json by default
  ctx: {db},
})

let bookUpsert = async (ctx, data) => {
  let {book, created} = await ctx.db.bookUpsert(data)
  
  if (created) {
    ctx.emit('book.created', book) // emit event to current client
    // ctx.emitAll('book.created', book) // or to all clients
  }
  
  return book
}

wss.onrpc = async (ctx, method, ...args) => {
  switch (method) {
    case 'book.upsert':
      return bookUpsert(ctx, ...args)
    default:
      ctx.throwMethodNotFound()
  }
}

wss.onevent = (name, ...args) => {
  // process event from client
}
```

### Client

```js
import {Client} from '@ws-rpc/client'
import {MsgpackEncoder} from '@ws-rpc/encoder-msgpack'

let wsc = await new Client({
  url: 'ws://localhost:8080',
  encoders: [MsgpackEncoder], // json by default
}).connect()

wsc.onevent = (event, ...args) => {
  // process event from server
}

let book = await wsc.rpc('book.upsert', {
  name: 'Dune',
  author: 'Franklin Patrick Herbert',
})
```
