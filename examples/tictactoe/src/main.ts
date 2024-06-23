import { initPeerToPeer } from './p2p';
import { gameState } from './state';
import { drawGame, hoverMove } from './tictactoe';

// 1. initialize the canvas
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);

const ctx = canvas.getContext('2d')!;
const canvasRect = canvas.getBoundingClientRect();
canvas.width = canvasRect.width * window.devicePixelRatio;
canvas.height = canvasRect.height * window.devicePixelRatio;
ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

window.onresize = () => {
  drawGame(ctx, canvasRect);
};

drawGame(ctx, canvasRect);

window.onmousemove = (e) => {
  drawGame(ctx, canvasRect);
  hoverMove(ctx, canvasRect, { x: e.x, y: e.y }, gameState);
};

// 2. initialize the p2p connection
initPeerToPeer(() => {
  drawGame(ctx, canvasRect);
});
