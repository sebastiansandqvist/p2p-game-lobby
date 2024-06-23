import { createPeerToPeer } from '../../../package/src';
import { gameState } from './state';
import { messageSchema, type Message } from './types';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const p2p = {
  // TODO: come up with a better api. it's annoying to have to set sendMessage outside of the context of the p2p stuff
  sendMessage: null as ((message: Message) => void) | null,
};

createPeerToPeer({
  websocketServerUrl: `wss://p2p-game-lobby.onrender.com/tictactoe/${gameId()}`,
  async onPeerConnected({ sendOffer }) {
    if (gameState.state === 'playing') return;
    gameState.state = 'click-to-connect';
    window.onclick = async () => {
      window.onclick = null;
      if (gameState.state !== 'click-to-connect') return;
      gameState.state = 'connecting';
      await sendOffer();
    };
  },
  async onPeerOffer({ sendAnswer, sendMessage }) {
    if (gameState.state === 'playing') return;
    gameState.state = 'click-to-play';
    await sendAnswer();
    const priorClickHandler = window.onclick;
    window.onclick = () => {
      window.onclick = priorClickHandler;
      p2p.sendMessage = (message) => sendMessage(JSON.stringify(message));
      gameState.state = 'playing';
      gameState.player = 'x';
      gameState.xs = [];
      gameState.os = [];
      p2p.sendMessage?.({
        kind: 'new-game',
        fromPlayer: 'x',
      });
    };
  },
  onPeerAnswer({ sendMessage }) {
    p2p.sendMessage = (message) => sendMessage(JSON.stringify(message));
    gameState.state = 'waiting-for-first-move';
  },
  onMessage(rawMessage) {
    const message = messageSchema.parse(JSON.parse(rawMessage));
    switch (message.kind) {
      case 'new-game': {
        gameState.state = 'playing';
        gameState.player = message.fromPlayer === 'x' ? 'o' : 'x';
        gameState.xs = [];
        gameState.os = [];
        break;
      }
      case 'move': {
        const { x, y } = message;
        if (message.fromPlayer === 'x') {
          gameState.xs.push({ x, y });
        } else {
          gameState.os.push({ x, y });
        }
        break;
      }
      default: {
        console.error('unknown message kind', message);
      }
    }
  },
  debug(...args) {
    console.log(...args);
  },
});

function gameId() {
  const paramsGameId = new URLSearchParams(window.location.search).get('game');
  if (paramsGameId) return paramsGameId;
  const gameId = randomId();
  window.history.pushState(null, '', `?game=${gameId}`);
  return gameId;
}

function randomId() {
  return (Math.random() * 100_000).toString().replace('.', '');
}
