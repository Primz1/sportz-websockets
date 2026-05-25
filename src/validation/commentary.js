  import { z } from 'zod';

// Schema for query parameters - list commentary
export const listCommentaryQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

// Schema for creating a new commentary item
export const createCommentarySchema = z.object({
  minute: z.coerce.number().int().nonnegative(),
  sequence: z.coerce.number().int().nonnegative(),
  period: z.string().min(1, 'Period is required'),
  eventType: z.string().min(1, 'Event type is required'),
  actor: z.string().min(1, 'Actor is required'),
  team: z.string().min(1, 'Team is required'),
  message: z.string().min(1, 'Message is required'),
  metadata: z.record(z.string(), z.unknown()),
  tags: z.array(z.string()),
});