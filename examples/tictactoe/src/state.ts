export const gameState = {
  state: 'idle' as
    | 'idle'
    | 'click-to-connect'
    | 'click-to-play'
    | 'waiting-for-first-move'
    | 'connecting'
    | 'playing'
    | 'gameover',
  player: 'x' as 'x' | 'o',
  mouseCoords: { x: 0, y: 0 }, // x and y are in px values, not [0, 2]
  mouseClickCoords: null as { x: number; y: number } | null, // also px values
  xs: [] as { x: number; y: number }[],
  os: [] as { x: number; y: number }[],
};

(window as any)['gameState'] = gameState;

const winningBoards = [
  [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
  ],
  [
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
  ],
  [
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
  ],

  [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: 2 },
  ],
  [
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 1, y: 2 },
  ],
  [
    { x: 2, y: 0 },
    { x: 2, y: 1 },
    { x: 2, y: 2 },
  ],

  [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
    { x: 2, y: 2 },
  ],
  [
    { x: 2, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 2 },
  ],
] as const;

export function gameOverLineOrState() {
  for (const line of winningBoards) {
    if (line.every((win) => gameState.xs.find((coord) => coord.x === win.x && coord.y === win.y) !== undefined)) {
      return line;
    }
    if (line.every((win) => gameState.os.find((coord) => coord.x === win.x && coord.y === win.y) !== undefined)) {
      return line;
    }
  }

  if (gameState.xs.length === 5) return true; // draw
  return false;
}
