# Discord Giveaway Bot

A production-focused Discord giveaway bot built with TypeScript, discord.js v14, Drizzle ORM, and PostgreSQL.

## Overview

This bot lets administrators create timed giveaways, allows members to enter through a button, stores all giveaway state in PostgreSQL, and restores active giveaway timers after crashes or restarts.

## Core Features

- Slash command group: `/giveaway`
  - `/giveaway create`
  - `/giveaway list`
  - `/giveaway end`
- One-entry-per-user enforcement at the database level
- Real-time entry count updates on giveaway messages
- Random winner selection at end time
- Automatic timer restoration on startup
- Admin permission checks at command registration and runtime

## Tech Stack

- Runtime: Node.js 20+
- Language: TypeScript (strict)
- Discord SDK: discord.js v14
- Database: PostgreSQL
- ORM: drizzle-orm + drizzle-kit
- Driver: postgres
- Config: dotenv

## Project Structure

```text
src/
  index.ts
  deploy-commands.ts
  db/
    client.ts
    schema.ts
    migrations/
  commands/
    giveaway/
      index.ts
      create.ts
      list.ts
      end.ts
  handlers/
    commandHandler.ts
    interactionHandler.ts
  giveaway/
    scheduler.ts
    logic.ts
  utils/
    time.ts
```

## Environment Variables

Create a `.env` file in the project root:

```env
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DATABASE_URL=
```

`DATABASE_URL` example:

```text
postgresql://user:password@host:5432/dbname?sslmode=require
```

## Commands

- `npm run dev` — run bot in development with ts-node
- `npm run build` — compile TypeScript to `dist/`
- `npm run start` — run compiled bot (`dist/index.js`)
- `npm run deploy-commands` — register slash commands
- `npm run db:generate` — generate Drizzle migration files
- `npm run db:migrate` — run migrations

## Operational Flow

1. Admin creates giveaway with `/giveaway create`
2. Bot stores giveaway row in PostgreSQL
3. Bot posts embed + enter button
4. Members click button to enter
5. Entries are persisted with uniqueness on `(giveaway_id, user_id)`
6. Scheduler ends giveaway at `ends_at`
7. Bot edits message to ended state and replies with winners
8. On restart, bot reloads active giveaways and restores timers

## Permissions

- `/giveaway create`, `/giveaway list`, `/giveaway end`: Administrator
- Enter button: any server member

## Error Handling

- Interaction handlers are wrapped to return an ephemeral generic error message when unhandled exceptions occur
- Duplicate entries are handled via PostgreSQL unique constraint detection
- Giveaway ending logic sets DB `ended=true` even if Discord message edits/replies fail
