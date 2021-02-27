import { Micro, MicroPlugin } from '@pestras/micro';
import { WorkerMessage } from '@pestras/micro/workers';
import * as http from 'http';
import { type } from 'os';
import * as SocketIO from 'socket.io';

export interface SocketIOOptions {
  serverOptions?: SocketIO.ServerOptions;
  maxListeners?: number;
  adapter?: any;
  port?: number;
  host?: string;
}

/**
 * Socket IO namespace config interface
 */
export interface IONamespace {
  service: any;
  connect?: string;
  reconnect?: string;
  handshake?: string;
  use?: string;
  useSocket?: string;
  events?: { [key: string]: string };
  disconnect?: string;
}

export interface SocketIOPublishMessage {
  event: string;
  data: any[];
  namespace?: string;
  room?: string;
  socketId?: string;
  broadcast?: boolean;
}

/**
 * Socket IO namespaces repo
 */
let serviceNamespaces: { [key: string]: IONamespace } = {};

/**
 * Socket IO connect decorator
 * accepts list of namespaces names
 * @param namespaces 
 */
export function CONNECT(namespaces: string[] = ['default']) {
  return (target: any, key: string) => {
    for (let namespace of namespaces) {
      serviceNamespaces[namespace] = serviceNamespaces[namespace] || { service: target.constructor };
      serviceNamespaces[namespace].connect = key;
    }
  }
}

/**
 * Socket IO reconnect decorator
 * accepts list of namespaces names
 * @param namespaces 
 */
export function RECONNECT(namespaces: string[] = ['default']) {
  return (target: any, key: string) => {
    for (let namespace of namespaces) {
      serviceNamespaces[namespace] = serviceNamespaces[namespace] || { service: target.constructor };
      serviceNamespaces[namespace].reconnect = key;
    }
  }
}

/**
 * Socket IO handshake decorator
 * accepts list of namespaces names with auth boolean option
 * @param namespaces 
 */
export function HANDSHAKE(namespaces: string[] = ['default']) {
  return (target: any, key: string) => {
    for (let namespace of namespaces) {
      serviceNamespaces[namespace] = serviceNamespaces[namespace] || { service: target.constructor };
      serviceNamespaces[namespace].handshake = key;
    }
  }
}

/**
 * Socket IO use decorator
 * accepts list of namespaces names
 * @param namespaces 
 */
export function USE(namespaces: string[] = ['default']) {
  return (target: any, key: string) => {
    for (let namespace of namespaces) {
      serviceNamespaces[namespace] = serviceNamespaces[namespace] || { service: target.constructor };
      serviceNamespaces[namespace].use = key;
    }
  }
}

/**
 * Socket IO usesocket decorator
 * accepts list of namespaces names
 * @param namespaces 
 */
export function USESOCKET(namespaces: string[] = ['default']) {
  return (target: any, key: string) => {
    for (let namespace of namespaces) {
      serviceNamespaces[namespace] = serviceNamespaces[namespace] || { service: target.constructor };
      serviceNamespaces[namespace].useSocket = key;
    }
  }
}

/**
 * Socket IO event decorator
 * accepts event name and list of namespaces names
 * @param namespaces 
 */
export function EVENT(name?: string, namespaces: string[] = ["default"]) {
  return (target: any, key: string) => {
    for (let namespace of namespaces) {
      serviceNamespaces[namespace] = serviceNamespaces[namespace] || { service: target.constructor };
      serviceNamespaces[namespace].events = serviceNamespaces[namespace].events || {};
      serviceNamespaces[namespace].events[name] = key;
    }
  }
}

/**
 * Socket IO disconnect decorator
 * accepts list of namespaces names
 * @param namespaces 
 */
export function DISCONNECT(namespaces: string[] = ['default']) {
  return (target: any, key: string) => {
    for (let namespace of namespaces) {
      serviceNamespaces[namespace] = serviceNamespaces[namespace] || { service: target.constructor };
      serviceNamespaces[namespace].disconnect = key;
    }
  }
}

export class MicroSocket extends MicroPlugin {
  private namespaces = new Map<string, SocketIO.Server | SocketIO.Namespace>();
  healthy = true;

  constructor(private _config: SocketIOOptions, private _server?: http.Server | (() => http.Server)) {
    super();
  }

  async init() {
    let server: http.Server;
    let outSourceServer = !!this._server;

    if (outSourceServer) server = typeof this._server === "function" ? this._server() : this._server;
    else server = http.createServer();

    Micro.logger.info('initializing socketIO server');
    let ioOptions = Object.assign({ origin: '*:*' }, this._config ? this._config.serverOptions || {} : {});
    let io = SocketIO(server, ioOptions);
    if (this._config && this._config.adapter) io.adapter(this._config.adapter);
    io.sockets.setMaxListeners(this._config ? this._config.maxListeners || 10 : 10);

    for (let namespace in serviceNamespaces) {
      let ns = await this.initializeNamespace(io, namespace, serviceNamespaces[namespace]);
      this.namespaces.set(namespace, ns);
    }

    if (Micro.config.workers !== 0) this.initilizaSocketMessaging();

    if (!this.namespaces.has('default')) this.namespaces.set('default', io);
    Micro.logger.info('socketIO server initiatlized successfully');

    if (!outSourceServer) {
      let port = this._config.port || 3001;
      let host = this._config.host || "0.0.0.0";
      server.listen(port, host, () => Micro.logger.info(`socket server running on: ${host}:${port}`));
    }

    this.ready = true;
    this.live = true;
  }
  
  static publish(msg: SocketIOPublishMessage) {
    process.send({ message: 'publish', ...msg });
  }

  private initilizaSocketMessaging() {
    process.on('message', (msg: WorkerMessage) => {
      if (msg.message !== 'publish' || !msg.data) return;
  
      let namespace: string = msg.namespace || 'defualt';
      let event: string = msg.event;
      let room: string = msg.room;
      let socketId: string = msg.socket;
      let broadcast: boolean = !!msg.broadcast;
      let payload: any[] = msg.payload;
      let ns: SocketIO.Server | SocketIO.Namespace = this.namespaces.get(namespace);
  
      if (!namespace) return;
      if (!socketId) {
        if (!room) return ns.to(room).emit(event, ...payload);
        return ns.emit(event, ...payload);
      } else {
        let io = <SocketIO.Server>this.namespaces.get('default');
        if (io.sockets.sockets[socketId] === undefined) {
          if (!broadcast) return;
          if (room) return ns.to(room).emit(event, ...payload);
          return ns.emit(event, ...payload);
        }

        let socket = io.sockets.sockets[socketId];
        if (room) return socket.to(room).emit(event, ...payload);
        return broadcast ? socket.broadcast.emit(event, ...payload) : socket.emit(event, ...payload);
      }
    });
  }

  private async initializeNamespace(io: SocketIO.Server, namespace: string, options: IONamespace) {
    let ns = namespace === 'default' ? io : io.of(`/${namespace}`);
    let currService = Micro.getCurrentService(options.service) || Micro.service;

    if (options.handshake || options.use) {
      ns.use(async (socket, next) => {
        options.use && typeof Micro.service[options.use] === "function" && Micro.service[options.use](ns, socket, next);
        options.handshake && typeof Micro.service[options.handshake] === "function" && Micro.service[options.handshake](ns, socket, next);
      });
    }

    ns.on('connection', socket => {
      if (options.connect)
        try { currService[options.connect](ns, socket); } catch (e) { Micro.logger.error(e, { event: { name: 'connect' } }); }
      if (options.reconnect)
        socket.on('connect', () => {
          try { currService[options.reconnect](ns, socket); } catch (e) { Micro.logger.error(e, { event: { name: 'reconnect' } }) }
        });
      if (options.useSocket)
        socket.use((packet, next) => {
          try { currService[options.useSocket](ns, packet, next); } catch (e) { Micro.logger.error(e, { event: { name: 'useSocket' } }) }
        });
      if (options.disconnect)
        socket.on('disconnect', () => {
          try { currService[options.disconnect](ns, socket); } catch (e) { Micro.logger.error(e, { event: { name: 'disconnect' } }) }
        });
      for (let event in options.events)
        socket.on(event, (...args) => {
          try { currService[options.events[event]](ns, socket, ...args); } catch (e) { Micro.logger.error(e, { event: { name: event, data: args } }) }
        });
    });

    return ns;
  }
}