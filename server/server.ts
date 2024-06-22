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
      const reply = (message: Message) => ws.send(JSON.stringify(message));
      const broadcast = (message: Message) => server.publish(lobbyId, JSON.stringify(message));

      console.log(`${userId} connected to lobby ${lobbyId}`);

      // 1. tell the new client that they're connected
      reply({ kind: 'self-connected', id: userId });

      // 2. tell the new client who else is in the lobby
      const lobby = lobbies.get(lobbyId) ?? [];
      for (const id of lobby) {
        reply({ kind: 'connected', id });
      }

      // 3. tell everyone else in the lobby that a new client has joined
      {
        lobby.push(userId);
        lobbies.set(lobbyId, lobby);
        broadcast({ kind: 'connected', id: userId });
      }

      // 4. subscribe the new client to all new lobby messages
      ws.subscribe(lobbyId);

      // 5. subscribe to your own id so that others can send you direct messages
      ws.subscribe(userId);
    },
    message(ws, rawMessage) {
      const { userId, lobbyId } = ws.data;
      if (typeof rawMessage !== 'string') return;
      try {
        const messageJson = JSON.parse(rawMessage);
        const message = messageSchema.parse(messageJson);
        switch (message.kind) {
          case 'peer-answer':
          case 'peer-offer': {
            server.publish(message.toId, rawMessage);
            return;
          }
          case 'self-connected': {
            throw new Error('self-connected should never fire message handler');
          }
          default: {
            console.log(`received from ${userId}: ${rawMessage}}`);
            server.publish(lobbyId, rawMessage);
          }
        }
      } catch (err) {
        console.error(err);
      }
    },
    close(ws) {
      const { userId, lobbyId } = ws.data;
      const broadcast = (message: Message) => server.publish(lobbyId, JSON.stringify(message));
      console.log(`${userId} disconnected.`);
      const lobby = lobbies.get(lobbyId) ?? [];
      const index = lobby.findIndex((id) => id === userId);
      if (index !== -1) lobby.splice(index, 1);
      broadcast({ kind: 'disconnected', id: userId });
    },
  },
  port: process.env['PORT'] ?? 3333,
});
