// src/state.ts
var gameState = {
  player: "x",
  xs: [
    { x: 1, y: 1 },
    { x: 2, y: 0 }
  ],
  os: [
    { x: 0, y: 0 },
    { x: 0, y: 2 }
  ]
};

// src/tictactoe.ts
function drawGame(ctx, canvasRect) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvasRect.width, canvasRect.height);
  const boardRect = calculateBoardRect(canvasRect);
  drawLines(ctx, boardRect);
  for (const { x, y } of gameState.xs) {
    drawX(ctx, boardRect, { x, y });
  }
  for (const { x, y } of gameState.os) {
    drawO(ctx, boardRect, { x, y });
  }
}
var getCellUnderMouse = function(mouse, boardRect) {
  const x = Math.floor((mouse.x - boardRect.x) / boardRect.squareSize);
  const y = Math.floor((mouse.y - boardRect.y) / boardRect.squareSize);
  return { x, y };
};
var isCellInBounds = function({ x, y }) {
  return x >= 0 && x <= 2 && y >= 0 && y <= 2;
};
function hoverMove(ctx, canvasRect, mouse, gameState2) {
  const board = calculateBoardRect(canvasRect);
  const cell = getCellUnderMouse(mouse, board);
  const cellX = board.x + board.squareSize * cell.x;
  const cellY = board.y + board.squareSize * cell.y;
  const cellHasPiece = gameState2.xs.some(({ x, y }) => x === cell.x && y === cell.y) || gameState2.os.some(({ x, y }) => x === cell.x && y === cell.y);
  if (cellHasPiece)
    return;
  if (!isCellInBounds(cell)) {
    const lineWidth = board.squareSize * 0.1;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(cellX + lineWidth / 2, cellY + lineWidth / 2, board.squareSize - lineWidth, board.squareSize - lineWidth);
    ctx.globalAlpha = 1;
    return;
  }
  ctx.globalAlpha = 0.5;
  if (gameState2.player === "x") {
    if (!gameState2.os.some(({ x, y }) => x === cell.x && y === cell.y)) {
      drawX(ctx, board, cell);
    }
  }
  ctx.globalAlpha = 1;
}
var drawX = function(ctx, board, cell) {
  const cellX = board.x + board.squareSize * cell.x;
  const cellY = board.y + board.squareSize * cell.y;
  const padding = board.squareSize * 0.3;
  ctx.strokeStyle = "#34d399";
  ctx.lineWidth = board.squareSize * 0.1;
  ctx.beginPath();
  ctx.moveTo(cellX + padding, cellY + padding);
  ctx.lineTo(cellX - padding + board.squareSize, cellY - padding + board.squareSize);
  ctx.moveTo(cellX - padding + board.squareSize, cellY + padding);
  ctx.lineTo(cellX + padding, cellY - padding + board.squareSize);
  ctx.stroke();
};
var drawO = function(ctx, board, cell) {
  const cellX = board.x + board.squareSize * cell.x;
  const cellY = board.y + board.squareSize * cell.y;
  const padding = board.squareSize * 0.25;
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = board.squareSize * 0.1;
  ctx.beginPath();
  ctx.roundRect(cellX + padding, cellY + padding, board.squareSize - padding * 2, board.squareSize - padding * 2, (board.squareSize - padding) / 2);
  ctx.stroke();
};
var drawLines = function(ctx, board) {
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = board.squareSize * 0.1;
  ctx.beginPath();
  ctx.moveTo(board.x + board.squareSize, board.y);
  ctx.lineTo(board.x + board.squareSize, board.y + board.height);
  ctx.moveTo(board.x + board.squareSize * 2, board.y);
  ctx.lineTo(board.x + board.squareSize * 2, board.y + board.height);
  ctx.moveTo(board.x, board.y + board.squareSize);
  ctx.lineTo(board.x + board.width, board.y + board.squareSize);
  ctx.moveTo(board.x, board.y + board.squareSize * 2);
  ctx.lineTo(board.x + board.width, board.y + board.squareSize * 2);
  ctx.stroke();
};
var calculateBoardRect = function(availableSpace) {
  const minMargin = availableSpace.width * 0.05;
  const boardSize = Math.min((availableSpace.width - 2 * minMargin) / 2, availableSpace.height - 2 * minMargin);
  const hSpace = (availableSpace.width - boardSize) / 2;
  const vSpace = (availableSpace.height - boardSize) / 2;
  const boardRect = {
    x: hSpace,
    y: vSpace,
    width: boardSize,
    height: boardSize,
    squareSize: boardSize / 3
  };
  return boardRect;
};

// src/main.ts
var canvas = document.createElement("canvas");
document.body.appendChild(canvas);
var ctx = canvas.getContext("2d");
var canvasRect = canvas.getBoundingClientRect();
canvas.width = canvasRect.width * window.devicePixelRatio;
canvas.height = canvasRect.height * window.devicePixelRatio;
ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
drawGame(ctx, canvasRect);
window.onmousemove = (e) => {
  drawGame(ctx, canvas.getBoundingClientRect());
  hoverMove(ctx, canvas.getBoundingClientRect(), { x: e.x, y: e.y }, gameState);
};
