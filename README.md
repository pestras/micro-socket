# Pestras Micro Nats

Pestras microservice plugin for socket.io server support.

## install

```bash
npm i @pestras/micro @pestras/micro-socket
```

## Template

```bash
$ git clone https://github.com/pestras/pestras-micro-template
```

## Plug In

```ts
import { SERVICE, Micro } from '@pestras/micro';
import { MicroSocket } from '@pestras/micro-socket;

Micro.plugin(new MicroSocket());

@SERVICE()
class test {}

Micro.start(Test);
```

**MicroRouter** class accepts a single optional argument **SocketIOOptions**.

Name | Type | default | Description
--- | --- | --- | ---
serverOptions | SocketIO.ServerOptions | null | see [socket.io docs](https://socket.io/docs/server-api/)
maxListeners  | number  | 10 |
adapter | any | null | SocketIO Adapter

## CONNECT DECORATOR

This decorator will call the method attached to whenever a new socket has connected,
it accepts an optional array of namespaces names, defaults to ['default'] which is the main **io** server instance.

```ts
import { SERVICE } from '@pestras/micro';
import { CONNECT } from '@pestras/micro-socket';

@SERVICE()
class Publisher {

  @CONNECT()
  onSocketConnect(io: SocketIO.Servier, socket: SocketIO.Socket) {}

  @CONNECT(['blog'])
  onSocketConnectToBlog(ns: SocketIO.Namespace, socket: SocketIO.Socket) {}
}
```

## RECONNECT DECORATOR

Called whenever a socket reconnect to the namespace or the server.

```ts
import { SERVICE } from '@pestras/micro';
import { RECONNECT } from '@pestras/micro-socket';

@SERVICE()
class Publisher {

  @RECONNECT()
  onSocketReconnect(io: SocketIO.Servier, socket: SocketIO.Socket) {}

  @RECONNECT(['blog'])
  onSocketReconnectToBlog(ns: SocketIO.Namespace, socket: SocketIO.Socket) {}
}
```

## HANDSHAKE DECORATOE

Called when a socket establish a coonection for the first time, mostly used for authorization.

It accepts an optional array of namespaces names and defaults to ['defualt'].

```ts
import { SERVICE } from '@pestras/micro';
import { HANDSHAKE } from '@pestras/micro-socket';

@SERVICE()
class Publisher {

  @HANDSHAKE()
  handshake(io: SocketIO.Servier, socket: SocketIO.Socket, next: (err?: any) => void) {}

  @HANDSHAKE(['blog'])
  blogHandshake(ns: SocketIO.Namespace, socket: SocketIO.Socket, next: (err?: any) => void) {
    
  }
}
```

## USE DECORATOE

Same as **HANDSHAKE** decorator.

```ts
import { SERVICE } from '@pestras/micro';
import { USE } from '@pestras/micro-socket';

@SERVICE()
class Publisher {

  @USE()
  use(io: SocketIO.Servier, socket: SocketIO.Socket, next: (err?: any) => void) {}

  @USE(['blog'])
  blogUse(ns: SocketIO.Namespace, socket: SocketIO.Socket, next: (err?: any) => void) {}
}
```

## USESOCKET DECORATOE

Used to listen to all socket incoming events.

```ts
import { SERVICE } from '@pestras/micro';
import { USESOCKET } from '@pestras/micro-socket';

@SERVICE()
class Publisher {

  @USESOCKET()
  useSocket(io: SocketIO.Servier, packet: SocketIO.Packet, next: (err?: any) => void) {}

  @USESOCKET(['blog'])
  blogUseSocket(ns: SocketIO.Namespace, packet: SocketIO.Packet, next: (err?: any) => void) {}
}
```

## EVENT DECORATOE

Used to listen to a specific event, accepts an event name as a first parameter and an optional array of namespaces for the second defaults to ['default'].

```ts
import { SERVICE } from '@pestras/micro';
import { EVENT } from '@pestras/micro-socket';

@SERVICE()
class Publisher {

  @EVENT('userLoggedIn')
  userLoggedIn(io: SocketIO.Servier, socket: SocketIO.Socket, ...args: any[]) {}

  @EVENT('newArticle', ['blog'])
  newArticle(ns: SocketIO.Namespace, socket: SocketIO.Socket, ...args: any[]) {}
}
```

## DISCONNECT DECORATOE

Triggered when a socket disconnect form the namespace or the server.

```ts
import { SERVICE } from '@pestras/micro';
import { DISCONNECT } from '@pestras/micro-socket';

@SERVICE()
class Publisher {

  @DISCONNECT()
  socketDisconnected(io: SocketIO.Servier, packet: SocketIO.Packet) {}

  @DISCONNECT(['blog'])
  blogSocketDisconnected(ns: SocketIO.Namespace, socket: SocketIO.Socket) {}
}
```

## Publish

In case of not using a socket io adapter, **PMS** provide another helper method to manage communications between workers for handling socket io broadcasting using *Micro.publish* method which accepts SocketIOPublishMessage object.

Name | Type | Required | Default | Description
--- | --- | ---- | --- | ---
event | string | true | - | Event name that needs to be published
data | any[] | true | - | event payload array distributed on multipe arguments
namespace | string | false | 'default' | If we need to publish through a specific namespace
room | string | false | null | If we need to publish to a specific room
socketId | string | false | null | In case we need to send to specific socket or exclude it from the receivers
broadcast | boolean | false | false | When socketId is provided and broadcast set to true socket will be excluded it from receivers

```ts
import { SERVICE } from '@pestras/micro';
import { MicroSocket, EVENT } from '@pestras/micro-socket';

@SERVICE({ workers: 4 })
class Publisher {

  @EVENT('ArticleUpdated', ['blog'])
  onArticleUpdate(ns: SocketIO.Namespace, socket: SocketIO.Socket, id: string) {
    socket.to('members').emit('ArticleUpdated', id);
    // publish to other worker socket io
    MicroSocket.publish({
      event: 'ArticleUpdated',
      data: [id],
      namespace: 'blog',
      room: 'members'
    });
  }
}
```

Thank you