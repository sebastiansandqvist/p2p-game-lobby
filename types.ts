import { z } from 'zod';

export const connectionMessageSchema = z.object({
  kind: z.literal('connected'),
  id: z.string(),
});

export type ConnectionMessage = z.infer<typeof connectionMessageSchema>;

export const disconnectionMessageSchema = z.object({
  kind: z.literal('disconnected'),
  id: z.string(),
});

export type DisconnectionMessage = z.infer<typeof disconnectionMessageSchema>;

export const peerOfferMessageSchema = z.object({
  kind: z.literal('peer-offer'),
  id: z.string(),
});

export type PeerOfferMessage = z.infer<typeof peerOfferMessageSchema>;

export const peerAnswerMessageSchema = z.object({
  kind: z.literal('peer-answer'),
  id: z.string(),
});

export type PeerAnswerMessage = z.infer<typeof peerAnswerMessageSchema>;

export const messageSchema = z.union([
  connectionMessageSchema,
  disconnectionMessageSchema,
  peerOfferMessageSchema,
  peerAnswerMessageSchema,
]);

export type Message = z.infer<typeof messageSchema>;
