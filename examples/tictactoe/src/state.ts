export const gameState = {
  state: 'idle' as 'idle' | 'click-to-connect' | 'click-to-play' | 'waiting-for-first-move' | 'connecting' | 'playing',
  player: 'x' as 'x' | 'o',
  mouseCoords: { x: 0, y: 0 }, // x and y are in px values, not [0, 2]
  pendingMove: null as { x: number; y: number } | null, // also px values
  xs: [{ x: 1, y: 1 }] as { x: number; y: number }[],
  os: [{ x: 0, y: 2 }] as { x: number; y: number }[],
};

export function makeMove(mouseX: number, mouseY: number) {
  gameState.pendingMove = { x: mouseX, y: mouseY }; // could be an invalid move!
}
