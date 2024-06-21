import { messageSchema, type Message } from '../types';
// goals:
// - create a lobby of all clients waiting to connect to one another by username
// - any new client can view waiting clients in the lobby by username and create a p2p connection with them
// could support custom usernames (or dynamically generated ones) in the future

type User = { id: string };

// future: support multiple lobbies by request url
const lobby: User[] = [];

const server = Bun.serve<User>({
  fetch(req, server) {
    const ip = server.requestIP(req);
    const id = [req.headers.get('sec-websocket-key'), ip?.address].join('--');
    const websocketUpgradeSucceeded = server.upgrade(req, { data: { id } });
    if (websocketUpgradeSucceeded) return;
    return new Response('this server only handles websocket connections.');
  },
  websocket: {
    open(ws) {
      lobby.push(ws.data);
      console.log(`${ws.data.id} connected`);
      for (const { id } of lobby) {
        const message: Message = { kind: 'connected', id };
        ws.send(JSON.stringify(message));
      }
      server.publish('lobby', JSON.stringify({ kind: 'connected', id: ws.data.id }));
      ws.subscribe('lobby');
    },
    message(ws, rawMessage) {
      if (typeof rawMessage !== 'string') return;
      try {
        const messageJson = JSON.parse(rawMessage);
        const message = messageSchema.parse(messageJson);
        console.log(`received from ${ws.data.id}:`);
        console.log(message);
        ws.publish('lobby', rawMessage);
      } catch (err) {
        console.error(err);
      }
    },
    close(ws) {
      console.log(`${ws.data.id} disconnected.`);
      const index = lobby.findIndex((user) => user.id === ws.data.id);
      if (index !== -1) lobby.splice(index, 1);
      server.publish('lobby', JSON.stringify({ kind: 'disconnected', id: ws.data.id }));
    },
  },
  port: 3333,
});
