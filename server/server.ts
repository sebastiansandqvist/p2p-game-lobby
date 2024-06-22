import { messageSchema, type Message } from '../package/src/types';

const lobbies = new Map<string, string[]>();

const server = Bun.serve<{ userId: string; lobbyId: string }>({
  fetch(req, server) {
    // a health check endpoint for zero-downtime deploys
    const url = new URL(req.url);
    if (url.pathname === '/healthz') return new Response('ok');

    // all other requests are websocket connections
    const websocketUpgradeSucceeded = server.upgrade(req, {
      data: {
        userId: req.headers.get('sec-websocket-key'),
        lobbyId: url.pathname,
      },
    });
    if (websocketUpgradeSucceeded) return;

    return new Response('this server only handles websocket connections.');
  },
  websocket: {
    open(ws) {
      const { userId, lobbyId } = ws.data;
      console.log(`${userId} connected to lobby ${lobbyId}`);
      // 1. tell the new client that they're connected
      {
        const message: Message = { kind: 'self-connected', id: userId };
        ws.send(JSON.stringify(message));
      }

      // 2. tell the new client who else is in the lobby
      const lobby = lobbies.get(lobbyId) ?? [];
      for (const id of lobby) {
        const message: Message = { kind: 'connected', id };
        ws.send(JSON.stringify(message));
      }

      // 3. tell everyone else in the lobby that a new client has joined
      {
        const message: Message = { kind: 'connected', id: userId };
        lobby.push(userId);
        server.publish(lobbyId, JSON.stringify(message));
      }

      // 4. subscribe the new client to all new lobby messages
      ws.subscribe(lobbyId);

      // 5. subscribe to your own id so that others can send you direct messages
      ws.subscribe(userId);
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
            console.log(`received from ${ws.data.userId}:`);
            console.log(message);
            server.publish(ws.data.lobbyId, rawMessage);
          }
        }
      } catch (err) {
        console.error(err);
      }
    },
    close(ws) {
      console.log(`${ws.data.userId} disconnected.`);
      const lobby = lobbies.get(ws.data.lobbyId) ?? [];
      const index = lobby.findIndex((userId) => userId === ws.data.userId);
      if (index !== -1) lobby.splice(index, 1);
      const message: Message = { kind: 'disconnected', id: ws.data.userId };
      server.publish(ws.data.lobbyId, JSON.stringify(message));
    },
  },
  port: process.env['PORT'] ?? 3333,
});
