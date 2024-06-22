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
  onPeerAnswer: ({ peerId, answer }) => {
    const li = document.querySelector(`li[data-id="${peerId}"]`) as HTMLLIElement;
    if (!li) return;
    const button = li.querySelector('button')!;
    button.disabled = true;
    li.style.color = 'green';
  },
});

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
