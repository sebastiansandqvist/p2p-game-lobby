import { messageSchema, type Message } from './types';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
}) {
  // list of free STUN servers: https://gist.github.com/zziuni/3741933
  // GLOSSARY:
  // - STUN: Session Traversal Utilities for NAT
  // - TURN: Traversal Using Relay around NAT
  // - ICE: Interactive Connectivity Establishment

  // this is not needed unless users are on different networks:
  // { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
  const peerConnection = new RTCPeerConnection();

  const channel = peerConnection.createDataChannel('12345'); //, { id: 1, negotiated: true }); // TODO: what should channel id be?
  channel.onopen = () => console.log('Data channel open');
  channel.onmessage = (event) => console.log('Data channel message:', event.data);
  channel.onclose = () => console.log('Data channel closed');
  channel.onclosing = () => console.log('Data channel closing');

  async function sendMessage(message: string) {
    console.log('sendMessage', message, channel.readyState);
    if (channel.readyState !== 'open') {
      console.error('Data channel is not open', channel.readyState);
    }
    channel.send(message);
  }

  const ws = new WebSocket(websocketServerUrl);
  let selfId = '';

  ws.onopen = () => console.log('ws onopen');
  ws.onclose = () => console.log('ws onclose');

  ws.onmessage = async (event) => {
    const message = messageSchema.parse(JSON.parse(event.data));
    console.log(message);

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
            console.log('sendOffer', peerConnection.signalingState, message.id);
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
        // TODO: handle this server-side by putting each user into a channel keyed on their id
        if (message.toId !== selfId) return;
        return onPeerOffer?.({
          peerId: message.fromId,
          async sendAnswer() {
            console.log('sendAnswer', peerConnection.signalingState, message.fromId);
            const answerMessage: Message = {
              kind: 'peer-answer',
              toId: message.fromId,
              fromId: selfId,
              answer: await makePeerAnswer(message.offer),
            };
            ws.send(JSON.stringify(answerMessage));
          },
          sendMessage,
        });
      }
      case 'peer-answer': {
        if (message.fromId === selfId) return; // TODO: handle this server-side
        await completePeerHandshake(message.answer);
        return onPeerAnswer?.({
          peerId: message.fromId,
          channel,
          sendMessage,
        });
      }
      case 'ice-candidate': {
        if (!message.candidate || !message.candidate.address) return;
        peerConnection.addIceCandidate(new RTCIceCandidate({ candidate: message.candidate.address }));
        return;
      }
      default: {
        throw new Error('unknown message kind');
      }
    }
  };

  async function makePeerOffer() {
    console.log('makePeerOffer', peerConnection.signalingState);
    const offer = await peerConnection.createOffer();
    console.log('makePeerOffer:setLocalDescription', peerConnection.signalingState);
    await peerConnection.setLocalDescription(new RTCSessionDescription(offer));
    return offer;
  }

  async function makePeerAnswer(offer: RTCSessionDescriptionInit) {
    console.log('makePeerAnswer', peerConnection.signalingState);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    console.log('makePeerAnswer:createAnswer', peerConnection.signalingState);
    const answer = await peerConnection.createAnswer();
    console.log('makePeerAnswer:setLocalDescription', peerConnection.signalingState);
    await peerConnection.setLocalDescription(new RTCSessionDescription(answer));
    return answer;
  }

  async function completePeerHandshake(answer: RTCSessionDescriptionInit) {
    console.log('completePeerHandshake', peerConnection.signalingState);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  }

  peerConnection.oniceconnectionstatechange = () => {
    console.log('ICE Connection State Change:', peerConnection.iceConnectionState);
  };

  peerConnection.onsignalingstatechange = () => {
    console.log('Signaling State Change:', peerConnection.signalingState, peerConnection);
  };

  peerConnection.ondatachannel = (event) => {
    console.log('Data Channel:', event.channel, event);
  };

  peerConnection.onicecandidate = (event) => {
    console.log('ICE Candidate:', event.candidate);
    const message: Message = {
      kind: 'ice-candidate',
      fromId: selfId,
      toId: 'TODO',
      candidate: event.candidate,
    };
    ws.send(JSON.stringify(message));
  };

  return () => {
    ws.close();
    peerConnection.close();
  };
}
