import { pgTable, serial, text, timestamp, integer, jsonb, pgEnum } from 'drizzle-orm/pg-core';

// Define match_status enum
export const matchStatusEnum = pgEnum('match_status', ['scheduled', 'live', 'finished']);

// Define matches table
export const matches = pgTable('matches', {
  id: serial('id').primaryKey(),
  sport: text('sport').notNull(),
  homeTeam: text('home_team').notNull(),
  awayTeam: text('away_team').notNull(),
  status: matchStatusEnum('status').notNull().default('scheduled'),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  homeScore: integer('home_score').notNull().default(0),
  awayScore: integer('away_score').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Define commentary table
export const commentary = pgTable('commentary', {
  id: serial('id').primaryKey(),
  matchId: integer('match_id')
  .notNull()
  .references(() => matches.id),
  minute: integer('minute'),
  sequence: integer('sequence'),
  period: text('period'),
  eventType: text('event_type').notNull(),
  actor: text('actor'),
  team: text('team'),
  message: text('message'),
  metadata: jsonb('metadata'),
  tags: text('tags'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
