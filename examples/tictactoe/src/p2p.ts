import { createPeerToPeer } from '../../../package/src';

createPeerToPeer({
  websocketServerUrl: `wss://p2p-game-lobby.onrender.com/tictactoe/${gameId()}`,
  onSelfConnected: (id) => {},
  onPeerConnected: ({ peerId, sendOffer }) => {},
  onPeerDisconnected: (peerId) => {},
  onPeerOffer: ({ peerId, sendAnswer, sendMessage }) => {},
  onPeerAnswer: ({ peerId, sendMessage }) => {},
  onMessage(message) {},
});

function gameId() {
  const paramsGameId = new URLSearchParams(window.location.search).get('game');
  if (paramsGameId) return paramsGameId;
  const gameId = randomId();
  window.history.pushState(null, '', `?game=${gameId}`);
  return gameId;
}

function randomId() {
  (Math.random() * 100_000).toString().replace('.', '');
}
