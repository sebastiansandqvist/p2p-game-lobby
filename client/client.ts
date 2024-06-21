import { messageSchema, type Message } from '../types';

const lobby = document.getElementById('lobby') as HTMLUListElement;

const peerConnection = new RTCPeerConnection();
const ws = new WebSocket('ws://localhost:3333');

let selfId = '';

ws.onopen = () => {
  console.log('connected');
};

ws.onmessage = async (event) => {
  const message = messageSchema.parse(JSON.parse(event.data));
  console.log(message);
  switch (message.kind) {
    case 'self-connected': {
      selfId = message.id;
      return;
    }
    case 'connected': {
      const li = document.createElement('li');
      if (message.id === selfId) return;
      const button = document.createElement('button');
      button.textContent = 'request';
      button.onclick = async () => {
        const offerMessage: Message = {
          kind: 'peer-offer',
          toId: message.id,
          fromId: selfId,
          offer: await makePeerOffer(),
        };
        ws.send(JSON.stringify(offerMessage));
      };
      li.dataset.id = message.id;
      li.appendChild(button);
      li.appendChild(document.createTextNode(message.id));
      lobby.appendChild(li);
      return;
    }
    case 'disconnected': {
      const li = document.querySelector(`li[data-id="${message.id}"]`);
      if (li) li.remove();
      return;
    }
    case 'peer-offer': {
      if (message.toId !== selfId) return; // TEMPORARY. todo: handle this server-side by putting each user into a channel keyed on their id
      const li = document.querySelector(`li[data-id="${message.fromId}"]`);
      if (!li) return;
      const button = li.querySelector('button')!;
      button.onclick = async () => {
        button.disabled = true;
        const answerMessage: Message = {
          kind: 'peer-answer',
          toId: message.fromId,
          fromId: selfId,
          answer: await makePeerAnswer(message.offer),
        };
        ws.send(JSON.stringify(answerMessage));
        (li as HTMLLIElement).style.color = 'green';
      };
      button.textContent = 'accept';
      return;
    }
    case 'peer-answer': {
      const li = document.querySelector(`li[data-id="${message.fromId}"]`);
      if (!li) return;
      const button = li.querySelector('button')!;
      button.disabled = true;
      await completePeerHandshake(message.answer);
      (li as HTMLLIElement).style.color = 'green';
      return;
    }
    default:
      throw new Error('unknown message kind');
  }
};

ws.onclose = () => {
  console.log('disconnected');
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

/*
// Create a data channel when the peer connection is created (typically by the offerer)
const dataChannel = peerConnection.createDataChannel("messagingChannel");

// Setup the data channel event handlers immediately after creation
dataChannel.onopen = () => {
  console.log('Data channel open');
};

dataChannel.onmessage = (event) => {
  console.log('Received message:', event.data);
};

dataChannel.onclose = () => {
  console.log('Data channel closed');
};

// When receiving an answer (typically by the answerer), listen for the incoming data channel
peerConnection.ondatachannel = (event) => {
  const receivedChannel = event.channel;
  receivedChannel.onmessage = (e) => {
    console.log('Received via DataChannel:', e.data);
  };
  receivedChannel.onopen = () => {
    console.log('Data channel opened by peer');
  };
  receivedChannel.onclose = () => {
    console.log('Data channel closed by peer');
  };
  };

  function sendMessage(message: string) {
    if (dataChannel.readyState === 'open') {
      dataChannel.send(message);
      console.log('Sent:', message);
    } else {
      console.error('Data channel is not open');
    }
  }

*/
