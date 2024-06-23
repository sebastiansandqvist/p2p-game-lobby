export const gameState = {
  // TODO: how many of these states can we remove, if any?
  state: 'idle' as
    | 'idle'
    | 'click-to-connect'
    | 'click-to-play'
    | 'waiting-for-first-move'
    | 'connecting'
    | 'playing'
    | 'gameover',
  player: 'x' as 'x' | 'o',
  mouseCoords: { x: -999, y: -999 }, // starting somewhere offscreen so mobile users don't see a weird square
  mouseClickCoords: null as { x: number; y: number } | null,
  xs: [] as { col: number; row: number }[],
  os: [] as { col: number; row: number }[],
};

(window as any)['gameState'] = gameState;

const winningBoards = [
  [
    { col: 0, row: 0 },
    { col: 1, row: 0 },
    { col: 2, row: 0 },
  ],
  [
    { col: 0, row: 1 },
    { col: 1, row: 1 },
    { col: 2, row: 1 },
  ],
  [
    { col: 0, row: 2 },
    { col: 1, row: 2 },
    { col: 2, row: 2 },
  ],

  [
    { col: 0, row: 0 },
    { col: 0, row: 1 },
    { col: 0, row: 2 },
  ],
  [
    { col: 1, row: 0 },
    { col: 1, row: 1 },
    { col: 1, row: 2 },
  ],
  [
    { col: 2, row: 0 },
    { col: 2, row: 1 },
    { col: 2, row: 2 },
  ],

  [
    { col: 0, row: 0 },
    { col: 1, row: 1 },
    { col: 2, row: 2 },
  ],
  [
    { col: 2, row: 0 },
    { col: 1, row: 1 },
    { col: 0, row: 2 },
  ],
] as const;

export function gameOverLineOrState() {
  for (const line of winningBoards) {
    if (
      line.every((win) => gameState.xs.find((coord) => coord.col === win.col && coord.row === win.row) !== undefined)
    ) {
      return line;
    }
    if (
      line.every((win) => gameState.os.find((coord) => coord.col === win.col && coord.row === win.row) !== undefined)
    ) {
      return line;
    }
  }

  if (gameState.xs.length === 5) return true; // draw
  return false;
}
