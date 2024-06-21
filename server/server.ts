import { messageSchema, type Message } from '../types';
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
    console.log(req.url);
    if (req.url === '/healthz') return new Response('ok');

    // all other requests are websocket connections
    const ip = server.requestIP(req) ?? { address: 'anonymous' };
    const id = [req.headers.get('sec-websocket-key'), ip.address].join('--');
    const websocketUpgradeSucceeded = server.upgrade(req, { data: { id } });
    if (websocketUpgradeSucceeded) return;

    return new Response('this server only handles websocket connections.');
  },
  websocket: {
    open(ws) {
      lobby.push(ws.data);
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
        server.publish('lobby', JSON.stringify(message));
      }

      // 4. subscribe the new client to all new lobby messages
      ws.subscribe('lobby');

      // IDEA:
      // support "I'll play anyone" mode by having the client transmit
      // an offer to ALL connected clients. (basically what we currently
      // do, minus the client-side filtering by id) but also allow the client
      // to specify which user(s) they want to send offers to directly.

      // without this, all requests get sent to all users in the lobby
      // ws.subscribe(ws.data.id); // subscribe to your own id so that others can send you direct messages?
    },
    message(ws, rawMessage) {
      if (typeof rawMessage !== 'string') return;
      try {
        const messageJson = JSON.parse(rawMessage);
        const message = messageSchema.parse(messageJson);
        console.log(`received from ${ws.data.id}:`);
        console.log(message);
        server.publish('lobby', rawMessage);
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
  port: 3333,
});
