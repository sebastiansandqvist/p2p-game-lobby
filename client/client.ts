import { messageSchema } from '../types';

const lobby = document.getElementById('lobby') as HTMLUListElement;

const ws = new WebSocket('ws://localhost:3333');

ws.onopen = () => {
  console.log('connected');
};

ws.onmessage = (event) => {
  const message = messageSchema.parse(JSON.parse(event.data));
  console.log(message);
  switch (message.kind) {
    case 'connected': {
      const li = document.createElement('li');
      li.dataset.id = message.id;
      li.textContent = message.id;
      lobby.appendChild(li);
      break;
    }
    case 'disconnected': {
      const li = document.querySelector(`li[data-id="${message.id}"]`);
      if (li) li.remove();
      break;
    }
    default:
      throw new Error('unknown message kind');
  }
};

ws.onclose = () => {
  console.log('disconnected');
};
