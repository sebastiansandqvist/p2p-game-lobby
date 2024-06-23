import { gameState } from './state';

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
}

// unclamped values; could go negative or larger than 2 for both x and y
function getCellUnderMouse(
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
  mouse: { x: number; y: number },
  gameState: typeof import('./state').gameState,
) {
  const board = calculateBoardRect(canvasRect);
  const cell = getCellUnderMouse(mouse, board);
  const cellX = board.x + board.squareSize * cell.x;
  const cellY = board.y + board.squareSize * cell.y;

  const cellHasPiece =
    gameState.xs.some(({ x, y }) => x === cell.x && y === cell.y) ||
    gameState.os.some(({ x, y }) => x === cell.x && y === cell.y);

  if (cellHasPiece) return;

  if (!isCellInBounds(cell)) {
    const lineWidth = board.squareSize * 0.1;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(
      cellX + lineWidth / 2,
      cellY + lineWidth / 2,
      board.squareSize - lineWidth,
      board.squareSize - lineWidth,
    );
    ctx.globalAlpha = 1;
    return;
  }

  ctx.globalAlpha = 0.5;
  if (gameState.player === 'x') {
    if (!gameState.os.some(({ x, y }) => x === cell.x && y === cell.y)) {
      drawX(ctx, board, cell);
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

function calculateBoardRect(availableSpace: DOMRect) {
  const minMargin = availableSpace.width * 0.05;
  const boardSize = Math.min((availableSpace.width - 2 * minMargin) / 2, availableSpace.height - 2 * minMargin);
  const hSpace = (availableSpace.width - boardSize) / 2;
  const vSpace = (availableSpace.height - boardSize) / 2;

  const boardRect = {
    x: hSpace,
    y: vSpace,
    width: boardSize,
    height: boardSize,
    squareSize: boardSize / 3,
  };

  return boardRect;
}
