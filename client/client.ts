import { createPeerToPeer } from '../package/src';

const lobby = document.getElementById('lobby') as HTMLUListElement;

createPeerToPeer({
  websocketServerUrl: 'wss://p2p-game-lobby.onrender.com/',
  onSelfConnected: (id) => {
    console.log('self connected', id);
  },
  onPeerConnected: ({ peerId, sendOffer }) => {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.textContent = 'request';
    button.onclick = async () => {
      button.disabled = true;
      await sendOffer();
    };
    li.dataset['id'] = peerId;
    li.appendChild(button);
    li.appendChild(document.createTextNode(peerId));
    lobby.appendChild(li);
  },
  onPeerDisconnected: (peerId) => {
    const li = document.querySelector(`li[data-id="${peerId}"]`);
    if (li) li.remove();
  },
  onPeerOffer: ({ peerId, sendAnswer }) => {
    const li = document.querySelector(`li[data-id="${peerId}"]`) as HTMLLIElement;
    if (!li) return;
    const button = li.querySelector('button')!;
    button.onclick = async () => {
      button.disabled = true;
      await sendAnswer();
      li.style.color = 'green';
    };
    button.textContent = 'accept';
  },
  onPeerAnswer: ({ peerId, sendMessage }) => {
    const li = document.querySelector(`li[data-id="${peerId}"]`) as HTMLLIElement;
    if (!li) return;
    const button = li.querySelector('button')!;
    button.disabled = true;
    li.style.color = 'green';

    const input = document.createElement('input');
    input.placeholder = 'message';
    const submitButton = document.createElement('button');
    submitButton.textContent = 'send';
    submitButton.onclick = () => {
      sendMessage(input.value);
      input.value = '';
    };
    li.appendChild(input);
    li.appendChild(submitButton);
  },
});
