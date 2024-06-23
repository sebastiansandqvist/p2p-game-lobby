import { createPeerToPeer } from '../../../package/src';
import { gameState } from './state';
import { messageSchema, type Message } from './types';

const clientState = {
  status: 'idle' as 'idle' | 'connecting' | 'playing',
  // TODO: come up with a better api. it's annoying to have to set sendMessage outside of the context of the p2p stuff
  sendMessage: null as ((message: Message) => void) | null,
};

export function initPeerToPeer(redraw: () => void) {
  return createPeerToPeer({
    websocketServerUrl: `wss://p2p-game-lobby.onrender.com/tictactoe/${gameId()}`,
    async onPeerConnected({ sendOffer }) {
      if (clientState.status !== 'idle') return;
      clientState.status = 'connecting';
      await sendOffer();
    },
    async onPeerOffer({ sendAnswer, sendMessage }) {
      if (clientState.status === 'playing') return;
      clientState.status = 'connecting';
      await sendAnswer();
      clientState.sendMessage = (message) => sendMessage(JSON.stringify(message));
      // clientState.sendMessage({
      //   kind: 'new-game',
      //   fromPlayer: Math.random() > 0.5 ? 'x' : 'o',
      // });
      clientState.status = 'playing';
    },
    onPeerAnswer({ sendMessage }) {
      // clientState.sendMessage = (message) => sendMessage(JSON.stringify(message));
      clientState.status = 'playing';
    },
    onMessage(rawMessage) {
      const message = messageSchema.parse(JSON.parse(rawMessage));
      switch (message.kind) {
        case 'new-game': {
          gameState.player = message.fromPlayer === 'x' ? 'o' : 'x';
          gameState.xs = [];
          gameState.os = [];
          redraw();
          break;
        }
        case 'move': {
          const { x, y } = message;
          if (message.fromPlayer === 'x') {
            gameState.xs.push({ x, y });
          } else {
            gameState.os.push({ x, y });
          }
          redraw();
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
