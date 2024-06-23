import { createPeerToPeer } from '../../../package/src';
import { gameOverLineOrState, gameState } from './state';
import { messageSchema, type Message } from './types';

const p2p = createPeerToPeer({
  websocketServerUrl: `wss://p2p-game-lobby.onrender.com/tictactoe/${gameId()}`,
  async onPeerJoinedLobby({ sendOffer }) {
    if (gameState.state === 'playing') return;
    gameState.state = 'click-to-connect';
    window.onpointerup = async () => {
      window.onpointerup = null;
      if (gameState.state !== 'click-to-connect') return;
      gameState.state = 'connecting';
      await sendOffer();
    };
  },
  async onPeerOffer({ sendAnswer }) {
    if (gameState.state === 'playing') return;
    gameState.state = 'click-to-play';
    await sendAnswer();
    const priorClickHandler = window.onpointerup;
    window.onpointerup = () => {
      window.onpointerup = priorClickHandler;
      gameState.state = 'playing';
      gameState.player = 'x';
      gameState.xs = [];
      gameState.os = [];
      sendMessage({
        kind: 'new-game',
        fromPlayer: 'x',
      });
    };
  },
  onPeerAnswer() {
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
        if (gameOverLineOrState()) {
          gameState.state = 'gameover';
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

export function sendMessage(message: Message) {
  p2p.sendMessage(JSON.stringify(message));
}

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
