import { messageSchema, type Message } from './types';

/** returns a cleanup function */
export function createPeerToPeer({
  websocketServerUrl,
  onSelfConnected,
  onPeerConnected,
  onPeerDisconnected,
  onPeerOffer,
  onPeerAnswer,
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
  onPeerOffer?: ({ peerId, sendAnswer }: { peerId: string; sendAnswer: () => Promise<void> }) => void;
  /** called when another user has sent a p2p connection answer to the current user */
  onPeerAnswer?: (peerId: string) => void;
}) {
  const peerConnection = new RTCPeerConnection();
  const ws = new WebSocket(websocketServerUrl);

  let selfId = '';

  ws.onopen = () => {
    // if (import.meta.env.DEV) {
    console.log('ws onopen');
    // }
  };

  ws.onclose = () => {
    // if (import.meta.env.DEV) {
    console.log('ws onclose');
    // }
  };

  ws.onmessage = async (event) => {
    const message = messageSchema.parse(JSON.parse(event.data));
    // if (import.meta.env.DEV) {
    console.log(message);
    // }

    switch (message.kind) {
      case 'self-connected': {
        selfId = message.id;
        return onSelfConnected?.(selfId);
      }
      case 'connected': {
        if (message.id === selfId) return; // TODO: probably ensure this server-side instead
        return onPeerConnected?.({
          peerId: message.id,
          async sendOffer() {
            const offerMessage: Message = {
              kind: 'peer-offer',
              toId: message.id,
              fromId: selfId,
              offer: await makePeerOffer(),
            };
            ws.send(JSON.stringify(offerMessage));
          },
        });
      }
      case 'disconnected': {
        // TODO: what if message.id === selfId?
        return onPeerDisconnected?.(message.id);
      }
      case 'peer-offer': {
        // TEMPORARY.
        // TODO: handle this server-side by putting each user into a channel keyed on their id
        if (message.toId !== selfId) return;
        return onPeerOffer?.({
          peerId: message.fromId,
          async sendAnswer() {
            const answerMessage: Message = {
              kind: 'peer-answer',
              toId: message.fromId,
              fromId: selfId,
              answer: await makePeerAnswer(message.offer),
            };
            ws.send(JSON.stringify(answerMessage));
          },
        });
      }
      case 'peer-answer': {
        await completePeerHandshake(message.answer);
        return onPeerAnswer?.(message.fromId);
      }
      default: {
        throw new Error('unknown message kind');
      }
    }
  };

  async function makePeerOffer() {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(new RTCSessionDescription(offer));
    return offer;
  }

  async function makePeerAnswer(offer: RTCSessionDescriptionInit) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(new RTCSessionDescription(answer));
    return answer;
  }

  async function completePeerHandshake(answer: RTCSessionDescriptionInit) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  }

  return () => {
    ws.close();
    peerConnection.close();
  };
}
