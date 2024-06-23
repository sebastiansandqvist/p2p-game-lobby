import { p2p } from './p2p';
import { gameState, gameOverLineOrState } from './state';

const gameStateMessages = {
  'idle': 'Waiting for another player. Share your url!',
  'click-to-connect': 'Click anywhere to connect.',
  'click-to-play': 'Click anywhere to play.',
  'waiting-for-first-move': 'Waiting for other player to make a move.',
  'connecting': 'Connecting...',
  'playing': '',
  'gameover': 'Draw!', // we'll only display this gameover state if there is no winning line
};

export function drawGame(ctx: CanvasRenderingContext2D, canvasRect: DOMRect) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvasRect.width, canvasRect.height);
  const boardRect = calculateBoardRect(canvasRect);

  drawLines(ctx, boardRect);

  for (const { x, y } of gameState.xs) {
    drawX(ctx, boardRect, { x, y });
  }

  for (const { x, y } of gameState.os) {
    drawO(ctx, boardRect, { x, y });
  }

  const gameOverLine = gameOverLineOrState();
  if (Array.isArray(gameOverLine)) {
    drawLine(ctx, boardRect, gameOverLine);
    return;
  }

  if (gameState.state !== 'playing') {
    drawOverlay(ctx, canvasRect, gameStateMessages[gameState.state]);
    return;
  }

  hoverMove(ctx, canvasRect, gameState);

  if (gameState.mouseClickCoords) {
    const cell = getCellUnderMouse(gameState.mouseClickCoords, boardRect);
    gameState.mouseClickCoords = null;

    const isOnBoard = cell.x >= 0 && cell.x <= 2 && cell.y >= 0 && cell.y <= 2;
    if (!isOnBoard) return;

    const isUnplayed =
      gameState.xs.every(({ x, y }) => x !== cell.x || y !== cell.y) &&
      gameState.os.every(({ x, y }) => x !== cell.x || y !== cell.y);
    if (!isUnplayed) return;

    const isCurrentPlayerTurn =
      gameState.player === 'x'
        ? gameState.xs.length === gameState.os.length
        : gameState.xs.length > gameState.os.length;
    if (!isCurrentPlayerTurn) return;

    const moves = gameState.player === 'x' ? gameState.xs : gameState.os;
    moves.push(cell);

    const gameOverState = gameOverLineOrState();
    if (gameOverState) {
      gameState.state = 'gameover';
      setTimeout(() => {
        gameState.state = 'playing';
        gameState.player = gameState.player === 'x' ? 'o' : 'x';
        gameState.mouseClickCoords = null;
        gameState.xs = [];
        gameState.os = [];
        p2p.sendMessage?.({
          kind: 'new-game',
          fromPlayer: gameState.player,
        });
      }, 1000);
    }

    p2p.sendMessage?.({
      kind: 'move',
      fromPlayer: gameState.player,
      x: cell.x,
      y: cell.y,
    });
  }
}

// unclamped values; could go negative or larger than 2 for both x and y
export function getCellUnderMouse(
  mouse: { x: number; y: number },
  boardRect: { x: number; y: number; width: number; height: number; squareSize: number },
) {
  const x = Math.floor((mouse.x - boardRect.x) / boardRect.squareSize);
  const y = Math.floor((mouse.y - boardRect.y) / boardRect.squareSize);
  return { x, y };
}

function isCellInBounds({ x, y }: { x: number; y: number }) {
  return x >= 0 && x <= 2 && y >= 0 && y <= 2;
}

export function hoverMove(
  ctx: CanvasRenderingContext2D,
  canvasRect: DOMRect,
  gameState: typeof import('./state').gameState,
) {
  const board = calculateBoardRect(canvasRect);
  const cell = getCellUnderMouse(gameState.mouseCoords, board);
  const cellX = board.x + board.squareSize * cell.x;
  const cellY = board.y + board.squareSize * cell.y;

  const cellHasPiece =
    gameState.xs.some(({ x, y }) => x === cell.x && y === cell.y) ||
    gameState.os.some(({ x, y }) => x === cell.x && y === cell.y);

  if (cellHasPiece) return;

  if (!isCellInBounds(cell)) {
    const lineWidth = board.squareSize * 0.1;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(
      cellX + lineWidth / 2,
      cellY + lineWidth / 2,
      board.squareSize - lineWidth,
      board.squareSize - lineWidth,
    );
    return;
  }

  ctx.globalAlpha = 0.5;
  if (gameState.player === 'x') {
    if (!gameState.os.some(({ x, y }) => x === cell.x && y === cell.y)) {
      drawX(ctx, board, cell);
    }
  }
  if (gameState.player === 'o') {
    if (!gameState.xs.some(({ x, y }) => x === cell.x && y === cell.y)) {
      drawO(ctx, board, cell);
    }
  }
  ctx.globalAlpha = 1;
}

function drawX(
  ctx: CanvasRenderingContext2D,
  board: { x: number; y: number; width: number; height: number; squareSize: number },
  cell: { x: number; y: number }, // integers from 0 to 2
) {
  const cellX = board.x + board.squareSize * cell.x;
  const cellY = board.y + board.squareSize * cell.y;
  const padding = board.squareSize * 0.3;

  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = board.squareSize * 0.1;
  ctx.beginPath();
  ctx.moveTo(cellX + padding, cellY + padding);
  ctx.lineTo(cellX - padding + board.squareSize, cellY - padding + board.squareSize);
  ctx.moveTo(cellX - padding + board.squareSize, cellY + padding);
  ctx.lineTo(cellX + padding, cellY - padding + board.squareSize);
  ctx.stroke();
}

function drawO(
  ctx: CanvasRenderingContext2D,
  board: { x: number; y: number; width: number; height: number; squareSize: number },
  cell: { x: number; y: number }, // integers from 0 to 2
) {
  const cellX = board.x + board.squareSize * cell.x;
  const cellY = board.y + board.squareSize * cell.y;
  const padding = board.squareSize * 0.25;
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = board.squareSize * 0.1;
  ctx.beginPath();
  ctx.roundRect(
    cellX + padding,
    cellY + padding,
    board.squareSize - padding * 2,
    board.squareSize - padding * 2,
    (board.squareSize - padding) / 2,
  );
  ctx.stroke();
}

export function drawOverlay(ctx: CanvasRenderingContext2D, canvasRect: DOMRect, message: string) {
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, canvasRect.width, canvasRect.height);
  ctx.globalAlpha = 1;
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.fillText(message, canvasRect.width / 2, canvasRect.height / 2);
}

function drawLines(
  ctx: CanvasRenderingContext2D,
  board: { x: number; y: number; width: number; height: number; squareSize: number },
) {
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = board.squareSize * 0.1;
  ctx.beginPath();

  // left vertical line
  ctx.moveTo(board.x + board.squareSize, board.y);
  ctx.lineTo(board.x + board.squareSize, board.y + board.height);

  // right vertical line
  ctx.moveTo(board.x + board.squareSize * 2, board.y);
  ctx.lineTo(board.x + board.squareSize * 2, board.y + board.height);

  // top horizontal line
  ctx.moveTo(board.x, board.y + board.squareSize);
  ctx.lineTo(board.x + board.width, board.y + board.squareSize);

  // bottom horizontal line
  ctx.moveTo(board.x, board.y + board.squareSize * 2);
  ctx.lineTo(board.x + board.width, board.y + board.squareSize * 2);

  ctx.stroke();
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  board: { x: number; y: number; width: number; height: number; squareSize: number },
  line: { x: number; y: number }[],
) {
  const centerOfStartX = board.x + line[0].x * board.squareSize + board.squareSize / 2;
  const centerOfStartY = board.y + line[0].y * board.squareSize + board.squareSize / 2;
  const centerOfEndX = board.x + line[2].x * board.squareSize + board.squareSize / 2;
  const centerOfEndY = board.y + line[2].y * board.squareSize + board.squareSize / 2;

  ctx.strokeStyle = '#e11d48';
  ctx.lineWidth = board.squareSize * 0.1;
  ctx.beginPath();
  ctx.moveTo(centerOfStartX, centerOfStartY);
  ctx.lineTo(centerOfEndX, centerOfEndY);
  ctx.stroke();
}

function calculateBoardRect(availableSpace: DOMRect) {
  const basis = Math.min(availableSpace.width, availableSpace.height);
  const minMargin = basis * 0.1;
  const boardSize = Math.min((availableSpace.width - 2 * minMargin) / 2, availableSpace.height - 2 * minMargin);

  const boardRect = {
    x: (availableSpace.width - boardSize) / 2,
    y: (availableSpace.height - boardSize) / 2,
    width: boardSize,
    height: boardSize,
    squareSize: boardSize / 3,
  };

  return boardRect;
}
