import { messageSchema, type Message } from './types';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// list of free STUN servers: https://gist.github.com/zziuni/3741933
// GLOSSARY:
// - STUN: Session Traversal Utilities for NAT
// - TURN: Traversal Using Relay around NAT
// - ICE: Interactive Connectivity Establishment

/** returns a cleanup function */
export function createPeerToPeer({
  websocketServerUrl,
  onSelfConnected,
  onPeerConnected,
  onPeerDisconnected,
  onPeerOffer,
  onPeerAnswer,
  onMessage,
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
  onMessage?: (message: string) => void;
}) {
  const ws = new WebSocket(websocketServerUrl);
  const peerConnection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
  const channel = peerConnection.createDataChannel('lobby', { id: 0, negotiated: true });

  const sendMessage = (message: string) => channel.send(message);
  channel.onmessage = (e) => onMessage?.(e.data);

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
        if (candidate || !peerConnection.localDescription) return;
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
    const message = messageSchema.parse(JSON.parse(event.data));
    console.log(message);

    switch (message.kind) {
      case 'self-connected': {
        localState.id = message.id;
        return onSelfConnected?.(localState.id);
      }
      case 'connected': {
        return onPeerConnected?.({
          peerId: message.id,
          async sendOffer() {
            await peerConnection.setLocalDescription(await peerConnection.createOffer());
            const sdp = await awaitLocalSdp();
            const offerMessage: Message = {
              kind: 'peer-offer',
              toId: message.id,
              fromId: localState.id,
              offer: { type: 'offer', sdp },
            };
            ws.send(JSON.stringify(offerMessage));
          },
        });
      }
      case 'disconnected': {
        return onPeerDisconnected?.(message.id);
      }
      case 'peer-offer': {
        await peerConnection.setRemoteDescription({ type: 'offer', sdp: message.offer.sdp });
        return onPeerOffer?.({
          peerId: message.fromId,
          async sendAnswer() {
            await peerConnection.setLocalDescription(await peerConnection.createAnswer());
            const sdp = await awaitLocalSdp();
            const answerMessage: Message = {
              kind: 'peer-answer',
              toId: message.fromId,
              fromId: localState.id,
              answer: { type: 'answer', sdp: sdp },
            };
            ws.send(JSON.stringify(answerMessage));
          },
          sendMessage,
        });
      }
      case 'peer-answer': {
        await peerConnection.setRemoteDescription({ type: 'answer', sdp: message.answer.sdp });
        return onPeerAnswer?.({
          peerId: message.fromId,
          channel,
          sendMessage,
        });
      }
      default: {
        throw new Error('unknown message kind');
      }
    }
  };

  peerConnection.oniceconnectionstatechange = () => {
    console.log('ICE Connection State Change:', peerConnection.iceConnectionState);
  };

  peerConnection.onsignalingstatechange = () => {
    console.log('Signaling State Change:', peerConnection.signalingState, peerConnection);
  };

  peerConnection.ondatachannel = (event) => {
    console.log('Data Channel:', event.channel, event);
  };

  return () => {
    ws.close();
    peerConnection.close();
  };
}
