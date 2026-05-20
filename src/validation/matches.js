import { z } from 'zod';

// Constants
export const MATCH_STATUS = {
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  FINISHED: 'finished',
};

// Schema for query parameters - list matches
export const listMatchesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

// Schema for route parameters - match ID
export const matchIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Schema for creating a new match
export const createMatchSchema = z
  .object({
    sport: z.string().min(1, 'Sport is required'),
    homeTeam: z.string().min(1, 'Home team is required'),
    awayTeam: z.string().min(1, 'Away team is required'),
    startTime: z.iso.datetime({ error: 'startTime must be a valid ISO date string' }),
    endTime: z.iso.datetime({ error: 'endTime must be a valid ISO date string' }),
    
    homeScore: z.coerce.number().int().nonnegative().optional(),
    awayScore: z.coerce.number().int().nonnegative().optional(),
  })
  .superRefine((data, ctx) => {
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);

    if (endTime <= startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'endTime must be chronologically after startTime',
      });
    }
  });

// Schema for updating match score
export const updateScoreSchema = z.object({
  homeScore: z.coerce.number().int().nonnegative(),
  awayScore: z.coerce.number().int().nonnegative(),
});
