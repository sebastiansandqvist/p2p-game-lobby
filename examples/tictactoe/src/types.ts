import { z } from 'zod';

const newGame = z.object({
  kind: z.literal('new-game'),
  fromPlayer: z.union([z.literal('x'), z.literal('o')]),
});

const move = z.object({
  kind: z.literal('move'),
  fromPlayer: z.union([z.literal('x'), z.literal('o')]),
  x: z.number(),
  y: z.number(),
});

export const messageSchema = z.union([newGame, move]);

export type Message = z.infer<typeof messageSchema>;
