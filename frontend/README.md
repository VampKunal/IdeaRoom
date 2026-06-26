# IdeaRoom — Frontend (Next.js)

This folder is the **Next.js 16** app for IdeaRoom. Full documentation (architecture, deployment, APIs, features) lives in the **[repository root `README.md`](../README.md)**.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Set `NEXT_PUBLIC_API_BASE` and `NEXT_PUBLIC_COLLAB_BASE` in `.env.local` (see root README).

## Main routes

| Path        | Purpose                          |
|------------|-----------------------------------|
| `/`        | Dashboard: rooms, network status  |
| `/auth`    | Sign-in                           |
| `/room/[id]` | Collaborative whiteboard      |
