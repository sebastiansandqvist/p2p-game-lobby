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
    // case 'peer-answer-received': {
    //   return;
    // }
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
