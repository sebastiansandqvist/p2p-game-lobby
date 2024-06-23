import { messageSchema, type Message } from './types';

/** `createPeerToPeer`
  1. creates an immediate websocket connection to a server at websocketServerUrl,
     which must implement the server in server/server.ts.
  2. sets up a RTCPeerConnection with a data channel
  3. returns hooks and methods to allow users to connect to one another p2p, using
     the websocket connection to facilitate the handshake.

  (returns a cleanup function to close all connections)
*/
export function createPeerToPeer({
  websocketServerUrl,
  onSelfConnected,
  onPeerConnected,
  onPeerDisconnected,
  onPeerOffer,
  onPeerAnswer,
  onMessage,
  getRawResources,
  debug,
}: {
  /** eg. "wss://p2p-game-lobby.onrender.com" */
  websocketServerUrl: string;
  /** called when the current user has successfully connected to the lobby, allowing them to know their own id */
  onSelfConnected?: (selfId: string) => void;
  /** called when another user has connected to the lobby */
  onPeerConnected?: ({ peerId, sendOffer }: { peerId: string; sendOffer: () => Promise<void> }) => void;
  /** called when another has disconnected from the lobby */
  onPeerDisconnected?: (peerId: string) => void;
  /** called when another user has sent a p2p connection offer to the current user */
  onPeerOffer?: ({
    peerId,
    sendAnswer,
    sendMessage,
  }: {
    peerId: string;
    sendAnswer: () => Promise<void>;
    sendMessage: (message: string) => void;
  }) => void;
  /** called when another user has sent a p2p connection answer to the current user */
  onPeerAnswer?: ({
    peerId,
    channel,
    sendMessage,
  }: {
    peerId: string;
    channel: RTCDataChannel;
    sendMessage: (message: string) => void;
  }) => void;
  /** called when another user who you are connected to p2p sends a message to you */
  onMessage?: (message: string) => void;
  /** if this API is missing anything, use the underlying resources to do it yourself */
  getRawResources?: (resources: {
    websocket: WebSocket;
    peerConnection: RTCPeerConnection;
    dataChannel: RTCDataChannel;
  }) => void;
  /** debug info to be piped to the console */
  debug?: (...args: unknown[]) => void;
}) {
  const ws = new WebSocket(websocketServerUrl);
  const peerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls: [
          'stun:stun.l.google.com:19302',
          'stun:stun1.l.google.com:19302',
          'stun:stun2.l.google.com:19302',
          'stun:stun3.l.google.com:19302',
          'stun:stun4.l.google.com:19302',
        ],
      },
    ],
  });
  const channel = peerConnection.createDataChannel('lobby', { id: 0, negotiated: true });

  const sendMessage = (message: string) => channel.send(message);
  channel.onmessage = (e) => onMessage?.(e.data);

  getRawResources?.({ websocket: ws, peerConnection, dataChannel: channel });

  // client doesn't initially know its own id, so we receive it in a message from the server in the `onSelfConnected` callback.
  // the sdp state is weird and needs to be set after all ice candidates have been gathered. hoping to find a better solution later.
  const localState = {
    id: '',
    sdp: '',
  };

  const awaitLocalSdp = (): Promise<string> =>
    new Promise((resolve) => {
      if (localState.sdp) return resolve(localState.sdp);
      peerConnection.onicecandidate = ({ candidate }) => {
        debug?.('got ice candidate', candidate);
        if (candidate || !peerConnection.localDescription) return;
        debug?.('got local sdp', peerConnection.localDescription.sdp);
        localState.sdp = peerConnection.localDescription.sdp;
        peerConnection.onicecandidate = null;
        resolve(localState.sdp);
      };
    });

  peerConnection.onicecandidate = ({ candidate }) => {
    if (candidate || !peerConnection.localDescription) return;
    localState.sdp = peerConnection.localDescription.sdp;
    peerConnection.onicecandidate = null;
  };

  ws.onmessage = async (event) => {
    const sendWsMessage = (message: Message) => ws.send(JSON.stringify(message));
    const wsMessage = messageSchema.parse(JSON.parse(event.data));

    debug?.('received message', wsMessage);

    switch (wsMessage.kind) {
      case 'self-connected': {
        localState.id = wsMessage.id;
        return onSelfConnected?.(localState.id);
      }
      case 'connected': {
        return onPeerConnected?.({
          peerId: wsMessage.id,
          async sendOffer() {
            debug?.('sending offer');
            await peerConnection.setLocalDescription(await peerConnection.createOffer());
            if (!localState.sdp) debug?.('waiting for local sdp');
            const sdp = await awaitLocalSdp();
            sendWsMessage({
              kind: 'peer-offer',
              toId: wsMessage.id,
              fromId: localState.id,
              offer: { type: 'offer', sdp },
            });
          },
        });
      }
      case 'disconnected': {
        return onPeerDisconnected?.(wsMessage.id);
      }
      case 'peer-offer': {
        await peerConnection.setRemoteDescription({ type: 'offer', sdp: wsMessage.offer.sdp });
        return onPeerOffer?.({
          peerId: wsMessage.fromId,
          async sendAnswer() {
            await peerConnection.setLocalDescription(await peerConnection.createAnswer());
            const sdp = await awaitLocalSdp();
            sendWsMessage({
              kind: 'peer-answer',
              toId: wsMessage.fromId,
              fromId: localState.id,
              answer: { type: 'answer', sdp: sdp },
            });
          },
          sendMessage,
        });
      }
      case 'peer-answer': {
        await peerConnection.setRemoteDescription({ type: 'answer', sdp: wsMessage.answer.sdp });
        return onPeerAnswer?.({
          peerId: wsMessage.fromId,
          channel,
          sendMessage,
        });
      }
      default: {
        throw new Error('unknown message kind');
      }
    }
  };

  return () => {
    ws.close();
    channel.close();
    peerConnection.close();
  };
}
