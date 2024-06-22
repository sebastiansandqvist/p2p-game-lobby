import { z } from 'zod';

export const selfConnectionMessageSchema = z.object({
  kind: z.literal('self-connected'),
  id: z.string(),
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

// export const iceCandidateMessageSchema = z.object({
//   kind: z.literal('ice-candidate'),
//   toId: z.string(),
//   fromId: z.string(),
//   candidate: z
//     .object({
//       address: z.string().nullable(),
//     })
//     .nullable(),
// });

// export type IceCandidateMessage = z.infer<typeof iceCandidateMessageSchema>;

export type PeerAnswerMessage = z.infer<typeof peerAnswerMessageSchema>;

export const messageSchema = z.union([
  selfConnectionMessageSchema,
  connectionMessageSchema,
  disconnectionMessageSchema,
  peerOfferMessageSchema,
  peerAnswerMessageSchema,
  // iceCandidateMessageSchema,
]);

export type Message = z.infer<typeof messageSchema>;
