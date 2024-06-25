import { z } from 'zod';

export const selfConnectionMessageSchema = z.object({
  kind: z.literal('self-connected'),
  id: z.string(),
  peerIds: z.array(z.string()),
});

export type SelfConnectionMessage = z.infer<typeof selfConnectionMessageSchema>;

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

// this comes directly from the WebRTC API:
const webRtcOfferSchema = z.object({
  type: z.union([z.literal('offer'), z.literal('answer'), z.literal('pranswer'), z.literal('rollback')]),
  sdp: z.string().optional(),
});

export const peerOfferMessageSchema = z.object({
  kind: z.literal('peer-offer'),
  toId: z.string(),
  fromId: z.string(),
  offer: webRtcOfferSchema,
});

export type PeerOfferMessage = z.infer<typeof peerOfferMessageSchema>;

export const peerAnswerMessageSchema = z.object({
  kind: z.literal('peer-answer'),
  toId: z.string(),
  fromId: z.string(),
  answer: webRtcOfferSchema,
});

export type PeerAnswerMessage = z.infer<typeof peerAnswerMessageSchema>;

export const pingSchema = z.object({
  kind: z.literal('ping'),
  toId: z.string(),
  fromId: z.string(),
});

export type Ping = z.infer<typeof pingSchema>;

export const pongSchema = z.object({
  kind: z.literal('pong'),
  toId: z.string(),
  fromId: z.string(),
});

export type Pong = z.infer<typeof pongSchema>;

export const messageSchema = z.union([
  selfConnectionMessageSchema,
  connectionMessageSchema,
  disconnectionMessageSchema,
  peerOfferMessageSchema,
  peerAnswerMessageSchema,
  pingSchema,
  pongSchema,
]);

export type Message = z.infer<typeof messageSchema>;

export const p2pMessageRequestingReceiptSchema = z.object({
  kind: z.literal('message-requesting-receipt'),
  id: z.string(),
  message: z.string(),
  sentAt: z.number(),
  start: z.number(),
});

export type P2pMessageWithReceipt = z.infer<typeof p2pMessageRequestingReceiptSchema>;

export const p2pMessageReceiptSchema = z.object({
  kind: z.literal('message-receipt'),
  id: z.string(),
});

export type P2pMessageReceipt = z.infer<typeof p2pMessageReceiptSchema>;

export const p2pPlainMessageSchema = z.object({
  kind: z.literal('message'),
  message: z.string(),
});

export type P2pPlainMessage = z.infer<typeof p2pPlainMessageSchema>;

export const p2pMessageSchema = z.union([
  p2pPlainMessageSchema,
  p2pMessageRequestingReceiptSchema,
  p2pMessageReceiptSchema,
]);

export type P2pMessage = z.infer<typeof p2pMessageSchema>;
