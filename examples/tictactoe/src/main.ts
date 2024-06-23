import { gameState } from './state';
import { drawGame } from './tictactoe';

// 1. initialize the canvas
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);

const ctx = canvas.getContext('2d')!;
const canvasRect = canvas.getBoundingClientRect();
canvas.width = canvasRect.width * window.devicePixelRatio;
canvas.height = canvasRect.height * window.devicePixelRatio;
ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

drawGame(ctx, canvasRect);

requestAnimationFrame(function render() {
  const canvasRect = canvas.getBoundingClientRect();
  canvas.width = canvasRect.width * window.devicePixelRatio;
  canvas.height = canvasRect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  drawGame(ctx, canvasRect);
  requestAnimationFrame(render);
});

window.addEventListener('mousemove', (e) => {
  gameState.mouseCoords.x = e.x;
  gameState.mouseCoords.y = e.y;
});

window.addEventListener('pointerup', (e) => {
  if (gameState.state !== 'playing') return;
  gameState.mouseClickCoords = { x: e.x, y: e.y };
});
