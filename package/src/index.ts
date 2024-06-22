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
  onPeerOffer?: ({ peerId, sendAnswer }: { peerId: string; sendAnswer: () => Promise<void> }) => void;
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
        // TEMPORARY.
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
        });
      }
      case 'peer-answer': {
        if (message.fromId === selfId) return;
        await completePeerHandshake(message.answer);
        const { channel, sendMessage } = makeDataChannel(message.fromId);
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

  async function makePeerOffer() {
    await wait(1000);
    console.log('makePeerOffer', peerConnection.signalingState);
    const offer = await peerConnection.createOffer();
    await wait(1000);
    console.log('makePeerOffer:setLocalDescription', peerConnection.signalingState);
    await peerConnection.setLocalDescription(new RTCSessionDescription(offer));
    return offer;
  }

  async function makePeerAnswer(offer: RTCSessionDescriptionInit) {
    await wait(1000);
    console.log('makePeerAnswer', peerConnection.signalingState);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    await wait(1000);
    console.log('makePeerAnswer:createAnswer', peerConnection.signalingState);
    const answer = await peerConnection.createAnswer();
    await wait(1000);
    console.log('makePeerAnswer:setLocalDescription', peerConnection.signalingState);
    await peerConnection.setLocalDescription(new RTCSessionDescription(answer));
    return answer;
  }

  async function completePeerHandshake(answer: RTCSessionDescriptionInit) {
    await wait(1000);
    console.log('completePeerHandshake', peerConnection.signalingState);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  }

  peerConnection.oniceconnectionstatechange = () => {
    console.log('ICE Connection State Change:', peerConnection.iceConnectionState);
  };

  peerConnection.onsignalingstatechange = () => {
    console.log('Signaling State Change:', peerConnection.signalingState, peerConnection);
  };

  peerConnection.setConfiguration({
    iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
  });

  peerConnection.onicecandidate = (event) => {
    console.log('ICE Candidate:', event.candidate);
  };

  peerConnection.ondatachannel = (event) => {
    console.log('Data Channel:', event.channel, event);
  };

  function makeDataChannel(channelId: string) {
    console.log('makeDataChannel', channelId);
    const channel = peerConnection.createDataChannel(channelId);
    channel.onopen = () => {
      console.log('Data channel open', channelId);
    };
    channel.onmessage = (event) => {
      console.log('Data channel message:', event.data, channelId);
    };
    channel.onclose = () => {
      console.log('Data channel closed', channelId);
    };
    channel.onclosing = () => {
      console.log('Data channel closing', channelId);
    };
    return {
      channel,
      async sendMessage(message: string) {
        console.log(channel.readyState);
        await wait(1000);
        console.log(channel.readyState);
        if (channel.readyState !== 'open') {
          console.error('Data channel is not open', channel.readyState);
          return;
        }
        channel.send(message);
      },
    };
  }

  return () => {
    ws.close();
    peerConnection.close();
  };
}
