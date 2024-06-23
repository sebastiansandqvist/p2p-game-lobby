import { createPeerToPeer } from '../../package/src';

const lobby = document.getElementById('lobby') as HTMLUListElement;
const lobbyId = prompt('which lobby do you want to join?');

createPeerToPeer({
  websocketServerUrl: `wss://p2p-game-lobby.onrender.com/${lobbyId ?? 'shared'}`,
  onSelfJoinedLobby: ({ selfId, peerIds }) => {
    console.log('self connected', selfId, peerIds);
  },
  onPeerJoinedLobby: ({ peerId, sendOffer }) => {
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
  onPeerLeftLobby: (peerId) => {
    const li = document.querySelector(`li[data-id="${peerId}"]`);
    if (li) li.remove();
  },
  onPeerOffer: ({ peerId, sendAnswer, sendMessage }) => {
    const li = document.querySelector(`li[data-id="${peerId}"]`) as HTMLLIElement;
    if (!li) return;
    const button = li.querySelector('button')!;
    button.onclick = async () => {
      button.disabled = true;
      await sendAnswer();
      li.style.color = 'green';

      const input = document.createElement('input');
      input.placeholder = 'message';
      input.onkeydown = (e) => {
        if (e.key === 'Enter') {
          sendMessage(input.value);
          const div = document.createElement('div') as HTMLDivElement;
          div.textContent = input.value;
          div.style.color = 'blue';
          document.body.appendChild(div);
          input.value = '';
        }
      };
      const submitButton = document.createElement('button');
      submitButton.textContent = 'send';
      submitButton.onclick = () => {
        sendMessage(input.value);
        const div = document.createElement('div') as HTMLDivElement;
        div.textContent = input.value;
        div.style.color = 'blue';
        document.body.appendChild(div);
        input.value = '';
        input.focus();
      };
      li.appendChild(input);
      li.appendChild(submitButton);
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
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        sendMessage(input.value);
        const div = document.createElement('div') as HTMLDivElement;
        div.textContent = input.value;
        div.style.color = 'blue';
        document.body.appendChild(div);
        input.value = '';
      }
    };
    const submitButton = document.createElement('button');
    submitButton.textContent = 'send';
    submitButton.onclick = () => {
      sendMessage(input.value);
      const div = document.createElement('div') as HTMLDivElement;
      div.textContent = input.value;
      div.style.color = 'blue';
      document.body.appendChild(div);
      input.value = '';
      input.focus();
    };
    li.appendChild(input);
    li.appendChild(submitButton);
  },
  onMessage(message) {
    const div = document.createElement('div');
    div.textContent = message;
    document.body.appendChild(div);
  },
});
