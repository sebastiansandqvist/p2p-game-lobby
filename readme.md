# peer-to-peer communication

this is a proof-of-concept client and server implementation of a peer-to-peer game lobby system using webrtc. the server facilitates the peers' initial handshakes. then once a data channel is established between the peers, no further data needs to hit the server.

## setup

```bash
bun i
bun run dev:server # localhost:3333
bun run dev:client # open client/index.html, no dev server
```

## usage

for complete, runnable examples see [these](/examples). here's a simplified example p2p chat application:

```ts
// client.ts
import { createPeerToPeer } from './package';

const p2p = createPeerToPeer({
  websocketServerUrl: 'ws://localhost:3333/chat-room',

  // called when you successfully join the lobby
  onSelfJoinedLobby({ selfId, peers }) {
    console.log(`connected as ${selfId}`);
    console.log(`${peers.length} other users in lobby`);
  },

  // called when another user joins the lobby
  async onPeerJoinedLobby({ peerId, sendOffer }) {
    console.log(`${peerId} joined the lobby`);

    // send connection offer to new peers
    if (confirm(`connect to peer ${peerId}?`)) {
      await sendOffer();
    }
  },

  // called when another user wants to connect to you
  async onPeerOffer({ peerId, sendAnswer, rejectOffer }) {
    console.log(`${peerId} wants to connect`);

    // accept the connection
    if (confirm(`accept peer request from ${peerId}?`)) {
      await sendAnswer();
      console.log(`connected to ${peerId}!`);
    }
  },

  // called when your connection offer is accepted
  onPeerAnswer({ peerId, sendMessage }) {
    console.log(`connected to ${peerId}!`);

    // send a welcome message
    sendMessage('hello! we are now connected p2p');
  },

  // called when you receive a p2p message
  onMessage(message) {
    console.log(`peer: ${message}`);
  },

  // called when a peer leaves the lobby
  onPeerLeftLobby(peerId) {
    console.log(`${peerId} disconnected`);
  },
});

// send a simple message
function sendChatMessage(text) {
  p2p.sendMessage(text);
}

// send a message with delivery confirmation
async function sendImportantMessage(text) {
  const { roundTripTime } = await p2p.sendMessageWithReceipt(text);
  console.log(`message delivered in ${roundTripTime}ms`);
}
```

## how this p2p lobby works

details about the implementation:

1. when loading the page, the client creates a websocket connection to the server. this connection is NOT used to communicate data--only to establish a p2p connection with another client.

```ts
const ws = new WebSocket('ws://localhost:3333');
```

2. once connected...

- the user is added to the server's lobby--an array of all connected user IDs.
- the user receives a message that tells them their own ID as well as the IDs of everyone else already in the lobby.
- the user is subscribed to a "lobby" channel in the websocket server so that they can get updated when other users join or leave the lobby.
- all subscribed users are notified that the new user has joined the lobby.

```ts
// server.ts
// @see https://bun.sh/docs/api/websockets

// `ws` here is the WebSocket connection to the client who just connected
// `server` can be used to publish messages to all connected clients

// 1. tell the new client that they're connected
ws.send(JSON.stringify({ kind: 'self-connected', id: ws.data.id }));

// 2. tell the new client who else is in the lobby
for (const user of lobby) {
  ws.send(JSON.stringify({ kind: 'connected', id: user.id }));
}

// 3. tell everyone else in the lobby that a new client has joined
server.publish('lobby', JSON.stringify({ kind: 'connected', id: ws.data.id }));

// 4. subscribe the new client to all new lobby messages
ws.subscribe('lobby');
```

3. given the up-to-date list of users in the lobby, the client can click the "request" button to request to make a p2p connection with any other user. this offer request is still handled on the websocket server. but the "offer" that is being transmitted contains all the data that the other uesr needs in order to establish a direct p2p connection.

```ts
// client.ts for User A
// @see https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection
const peerConnection = new RTCPeerConnection();

// create an object that contains the data that the other user needs to establish a direct p2p connection
const offer = await peerConnection.createOffer();

// tell the local WebRTC session that there is an outbound offer
await peerConnection.setLocalDescription(new RTCSessionDescription(offer));

// ideally send this message only to the user with the `toId`
ws.send(
  JSON.stringify({
    toId: "[User B's id]",
    fromId: "[User A's id]",
    offer,
  }),
);
```

4. the other user receives this message with an offer. they can then choose to accept by sending this answer:

```ts
// client.ts for User B
const peerConnection = new RTCPeerConnection();

// tell the local WebRTC session about the remote peer's offer
await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

// create an answer object (basically identical to an offer object)
const answer = await peerConnection.createAnswer();

// set that answer locally, then send it to the other user over websocket
await peerConnection.setLocalDescription(new RTCSessionDescription(answer));

ws.send(
  JSON.stringify({
    toId: "[User A's id]",
    fromId: "[User B's id]",
    answer,
  }),
);
```

5. finally, User A can complete the p2p connection handshake:

```ts
// client.ts for User A
await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
```

the two users are now connected and can communicate directly via WebRTC without hitting the server. (they could even both disconnect from it at this point and still communicate with one another.)

## how to send data between two peers

**(TODO)**

- https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Using_data_channels
