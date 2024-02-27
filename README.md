# ws-rpc

*Simple, small rfc-correct JSON-RPC 2.0 implementation, client and server*

## Usage

### Server

```js
import {Server} from '@ws-rpc/server'

// see ws lib options
let wss = new Server({
  port: 8081,
})
wss.context = {db}

let bookUpsert = async (ctx, id, data) => {
  let {book, created} = await ctx.db.bookUpsert(id, data)
  
  if (created) {
    ctx.emit('book.created', book) // emit event to current client
    // ctx.emitAll('book.created', book) // or to all clients
  }
  
  return book
}

wss.rpc = async (ctx, ...args) => {
  let {method, client, db} = ctx
  
  switch (method) {
    case 'book.upsert':
      return bookUpsert(ctx, ...args)
    default:
      ctx.throwMethodNotFound()
  }
}

wss.event = (name, ...args) => {
  // process event from client
}
```

### Client

```js
import {Client} from '@ws-rpc/client'

let wsc = await new Client({
  url: 'ws://localhost:8080',
}).connect()

wsc.event = (event, ...args) => {
  // process event from server
}

let book = await wsc.rpc('book.upsert', {
  name: 'Dune',
  author: 'Franklin Patrick Herbert',
})
```

```js
import {Client} from '@ws-rpc/client'
import {MsgpackEncoder} from '@ws-rpc/encoder-msgpack'

let wsc = await new Client({
  url: 'ws://localhost:8080',
  encoders: [MsgpackEncoder], // json by default
}).connect()
```
