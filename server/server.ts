import { messageSchema, type Message } from '../package/src/types';
// goals:
// - create a lobby of all clients waiting to connect to one another by username
// - any new client can view waiting clients in the lobby by username and create a p2p connection with them
// could support custom usernames (or dynamically generated ones) in the future

type User = { id: string };

// future: support multiple lobbies by request url
// const lobbies = new Map<string, User[]>();

const lobby: User[] = [];

const server = Bun.serve<User>({
  fetch(req, server) {
    // a health check endpoint for zero-downtime deploys
    const url = new URL(req.url);
    if (url.pathname === '/healthz') return new Response('ok');

    // all other requests are websocket connections
    const ip = server.requestIP(req) ?? { address: 'anonymous' };
    const id = [req.headers.get('sec-websocket-key'), ip.address].join('--');
    const websocketUpgradeSucceeded = server.upgrade(req, { data: { id } });
    if (websocketUpgradeSucceeded) return;

    return new Response('this server only handles websocket connections.');
  },
  websocket: {
    open(ws) {
      console.log(`${ws.data.id} connected`);
      // 1. tell the new client that they're connected
      {
        const message: Message = { kind: 'self-connected', id: ws.data.id };
        ws.send(JSON.stringify(message));
      }

      // 2. tell the new client who else is in the lobby
      for (const { id } of lobby) {
        const message: Message = { kind: 'connected', id };
        ws.send(JSON.stringify(message));
      }

      // 3. tell everyone else in the lobby that a new client has joined
      {
        const message: Message = { kind: 'connected', id: ws.data.id };
        lobby.push(ws.data);
        server.publish('lobby', JSON.stringify(message));
      }

      // 4. subscribe the new client to all new lobby messages
      ws.subscribe('lobby');

      // 5. subscribe to your own id so that others can send you direct messages
      ws.subscribe(ws.data.id);
    },
    message(ws, rawMessage) {
      if (typeof rawMessage !== 'string') return;
      try {
        const messageJson = JSON.parse(rawMessage);
        const message = messageSchema.parse(messageJson);
        switch (message.kind) {
          case 'self-connected': {
            console.log('self-connected should never fire in this part of the code');
            return;
          }
          case 'peer-answer':
          case 'peer-offer': {
            server.publish(message.toId, rawMessage);
            return;
          }
          default: {
            console.log(`received from ${ws.data.id}:`);
            console.log(message);
            server.publish('lobby', rawMessage);
          }
        }
      } catch (err) {
        console.error(err);
      }
    },
    close(ws) {
      console.log(`${ws.data.id} disconnected.`);
      const index = lobby.findIndex((user) => user.id === ws.data.id);
      if (index !== -1) lobby.splice(index, 1);
      const message: Message = { kind: 'disconnected', id: ws.data.id };
      server.publish('lobby', JSON.stringify(message));
    },
  },
  port: process.env['PORT'] ?? 3333,
});
