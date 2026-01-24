# Deployment Guide: Idea Room

Use **MongoDB Atlas**, **Upstash Redis**, **Railway RabbitMQ**, **Railway (backend)**, and **Vercel (frontend)**.

---

## 1. Get URLs and secrets

### 1.1 MongoDB Atlas

1. [cloud.mongodb.com](https://cloud.mongodb.com) → Create/select cluster.
2. **Connect** → **Drivers** → **Node.js**.
3. Copy the URI. It looks like:
   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Append the DB name or add `/?retryWrites=true&w=majority` and use DB `idea_room` in code (we set it in app).  
   Or add to the URI: `mongodb+srv://...mongodb.net/idea_room?retryWrites=true&w=majority`.
5. **Network Access** → Add `0.0.0.0/0` (or restrict to Railway/Vercel IPs if you prefer).
6. **Database User** → Create a user with read/write; put username and password in the URI.

**Save as:** `MONGO_URL`

---

### 1.2 Upstash Redis

1. [console.upstash.com](https://console.upstash.com) → Create Redis DB (or use existing).
2. In the DB → **REST API** or **.env** tab.
3. For **Node.js (TCP)**, copy the **Redis URL**. It uses TLS:
   ```
   rediss://default:YOUR_PASSWORD@us1-xxx-xxx.upstash.io:6379
   ```
   (Note: `rediss://` with double `s`.)

**Save as:** `REDIS_URL`

---

### 1.3 Railway RabbitMQ

1. In [Railway](https://railway.app): **New Project** → **Add Plugin** → **RabbitMQ** (or add from a template).
2. Open the RabbitMQ service → **Variables** or **Connect**.
3. Copy `AMQP_URL` or `RABBITMQ_URL` (or the full connection string shown):
   ```
   amqps://user:pass@host/vhost
   ```
   or  
   ```
   amqp://user:pass@host:5672
   ```

**Save as:** `RABBITMQ_URL` (or `AMQP_URL`; the app uses `RABBITMQ_URL` first, then `AMQP_URL`).

---

### 1.4 Firebase

From [Firebase Console](https://console.firebase.google.com) → Project → **Project settings**:

- **Authentication** → **Settings** → **Authorized domains**: add your Vercel URL (e.g. `yourapp.vercel.app`).
- **Service account** (Backend): Generate key → use `project_id`, `client_email`, `private_key` (replace `\n` with real newlines when pasting, or keep `\n` if your host supports it).
- **General** (Frontend): `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`.

**Backend:**  
`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`

**Frontend (NEXT_PUBLIC_*):**  
`NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`

---

## 2. Deploy backend on Railway

Deploy **4 services** from the same repo:

| Service        | Port   | Generate domain? |
|----------------|--------|------------------|
| `api-gateway`  | **5000** | Yes (required) |
| `auth-service` | **8003** | Optional       |
| `collab-service` | **4000** | Yes (required) |
| `snapshot-worker` | — (no HTTP) | No  |

When Railway asks for **Port** (in Settings → Networking or when adding a domain), use the value above. Railway usually sets `PORT` for you; if it still prompts, enter that port so traffic is routed correctly. **snapshot-worker** does not listen on any port.

### 2.1 Create a Railway project and connect repo

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub** (or Git).
2. Connect the `idea-room` repo.

### 2.2 Service 1: api-gateway

1. **New** → **GitHub Repo** → select repo.
2. **Settings** → **Root Directory**: `backend/api-gateway`.
3. **Settings** → **Build**: leave default (e.g. Nixpacks) or set **Dockerfile Path**: `Dockerfile` if you use Docker.
4. **Settings** → **Start Command**: `node index.js` (or rely on Dockerfile `CMD`).
5. **Settings** → **Networking** → **Port**: if it asks, enter **5000**.
6. **Variables** – add:

   | Name                 | Value                                             |
   |----------------------|---------------------------------------------------|
   | `MONGO_URL`          | `mongodb+srv://...` (from 1.1)                    |
   | `FIREBASE_PROJECT_ID`| from 1.4                                          |
   | `FIREBASE_CLIENT_EMAIL` | from 1.4                                       |
   | `FIREBASE_PRIVATE_KEY`  | from 1.4 (string, with `\n` or newlines)      |
   | `CORS_ORIGIN`        | (recommended) `https://YOUR_VERCEL_APP.vercel.app` — exact Vercel URL, no trailing slash. For multiple: `https://a.vercel.app,https://b.vercel.app` |

7. **Settings** → **Networking** → **Generate Domain**.  
   Example: `https://api-gateway-xxxx.up.railway.app`

**Write this URL down as:** `API_GATEWAY_URL`

---

### 2.3 Service 2: auth-service

1. **New** → **GitHub Repo** → same repo.
2. **Root Directory**: `backend/auth-service`.
3. **Settings** → **Networking** → **Port**: if it asks, enter **8003**.
4. **Variables**:

   | Name                   | Value   |
   |------------------------|---------|
   | `FIREBASE_PROJECT_ID`  | from 1.4 |
   | `FIREBASE_CLIENT_EMAIL`| from 1.4 |
   | `FIREBASE_PRIVATE_KEY` | from 1.4 |
   | `CORS_ORIGIN`          | (optional) same as api-gateway if the frontend calls auth-service | 

5. **Generate Domain** (optional; only if something will call it by HTTP).

---

### 2.4 Service 3: collab-service

1. **New** → **GitHub Repo** → same repo.
2. **Root Directory**: `backend/collab-service`.
3. **Settings** → **Networking** → **Port**: if it asks, enter **4000**.
4. **Variables**:

   | Name                 | Value                                    |
   |----------------------|------------------------------------------|
   | `MONGO_URL`          | from 1.1                                 |
   | `REDIS_URL`          | from 1.2 (Upstash `rediss://...`)        |
   | `RABBITMQ_URL`       | from 1.3 (or `AMQP_URL`)                 |
   | `API_GATEWAY_URL`    | `https://api-gateway-xxxx.up.railway.app` (from 2.2) |
   | `FIREBASE_PROJECT_ID`| from 1.4                                 |
   | `FIREBASE_CLIENT_EMAIL` | from 1.4                              |
   | `FIREBASE_PRIVATE_KEY`  | from 1.4                              |
   | `CORS_ORIGIN`        | (recommended) `https://YOUR_VERCEL_APP.vercel.app` — same as api-gateway; required for Socket.IO from the frontend |

5. **Generate Domain**.  
   Example: `https://collab-service-xxxx.up.railway.app`

**Write this URL down as:** `COLLAB_URL` (you will put it in Vercel as `NEXT_PUBLIC_COLLAB_BASE`).

---

### 2.5 Service 4: snapshot-worker

1. **New** → **GitHub Repo** → same repo.
2. **Root Directory**: `backend/snapshot-worker`.
3. **Port**: none — this is a worker and does not listen on any port. If the UI asks for a port, leave it blank or use the default; do **not** generate a domain.
4. **Variables**:

   | Name           | Value        |
   |----------------|--------------|
   | `MONGO_URL`    | from 1.1     |
   | `RABBITMQ_URL` | from 1.3     |

5. No public domain needed (worker, no HTTP). Skip **Generate Domain**.

---

## 3. Deploy frontend on Vercel

1. [vercel.com](https://vercel.com) → **Add New** → **Project** → import the `idea-room` repo.
2. **Root Directory**: `frontend`.
3. **Framework Preset**: Next.js.
4. **Environment Variables** – add (for Production, and optionally Preview/Development):

   | Name                             | Value                                         |
   |----------------------------------|-----------------------------------------------|
   | `NEXT_PUBLIC_API_BASE`           | `https://api-gateway-xxxx.up.railway.app`     |
   | `NEXT_PUBLIC_COLLAB_BASE`        | `https://collab-service-xxxx.up.railway.app`  |
   | `NEXT_PUBLIC_FIREBASE_API_KEY`   | from 1.4                                      |
   | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | from 1.4                                    |
   | `NEXT_PUBLIC_FIREBASE_PROJECT_ID`  | from 1.4                                    |
   | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | from 1.4                                |
   | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | from 1.4                             |
   | `NEXT_PUBLIC_FIREBASE_APP_ID`    | from 1.4                                      |

   Use the **real** Railway URLs from 2.2 and 2.4 (no `localhost`).

5. **Deploy**.

After deploy you get e.g. `https://idea-room-xxx.vercel.app`.

---

## 4. Where to put each URL

| Variable / concept              | Where to put it | Example value |
|--------------------------------|-----------------|---------------|
| `MONGO_URL`                    | Railway: api-gateway, collab-service, snapshot-worker | `mongodb+srv://user:pass@cluster.mongodb.net/idea_room?retryWrites=true&w=majority` |
| `REDIS_URL`                    | Railway: collab-service only | `rediss://default:xxx@us1-xxx.upstash.io:6379` |
| `RABBITMQ_URL` (or `AMQP_URL`) | Railway: collab-service, snapshot-worker | `amqps://user:pass@host/vhost` or from RabbitMQ plugin |
| `API_GATEWAY_URL`              | Railway: collab-service | `https://api-gateway-xxxx.up.railway.app` |
| `NEXT_PUBLIC_API_BASE`         | Vercel: frontend | `https://api-gateway-xxxx.up.railway.app` |
| `NEXT_PUBLIC_COLLAB_BASE`      | Vercel: frontend | `https://collab-service-xxxx.up.railway.app` |
| `FIREBASE_*` (backend)         | Railway: api-gateway, auth-service, collab-service | — |
| `NEXT_PUBLIC_FIREBASE_*`       | Vercel: frontend | — |
| `CORS_ORIGIN`                  | Railway: api-gateway, collab-service (recommended); auth-service (optional) | `https://idea-room-ashy.vercel.app` or comma-separated for multiple |

---

## 5. Checklist and order

1. Create MongoDB Atlas cluster and DB user → `MONGO_URL`.
2. Create Upstash Redis → `REDIS_URL`.
3. Add RabbitMQ on Railway (or external) → `RABBITMQ_URL`.
4. Deploy **api-gateway** on Railway → get `API_GATEWAY_URL`.
5. Deploy **auth-service** on Railway.
6. Deploy **collab-service** on Railway with `API_GATEWAY_URL`, `REDIS_URL`, `RABBITMQ_URL` → get `COLLAB_URL`.
7. Deploy **snapshot-worker** on Railway.
8. Deploy **frontend** on Vercel with `NEXT_PUBLIC_API_BASE` = `API_GATEWAY_URL` and `NEXT_PUBLIC_COLLAB_BASE` = `COLLAB_URL`.

---

## 6. Optional: .env for local and Docker

- **Backend:** copy `backend/.env.example` to `.env` (or `backend/.env`) and fill values for local runs or for `docker-compose` / `docker-compose.cloud.yml`.
- **Frontend:** copy `frontend/.env.example` to `frontend/.env.local` and fill; for Vercel, set the same in Project → Environment Variables.

---

## 7. Docker (local / cloud infra)

- **Local stack (Mongo, Redis, Rabbit in Docker):**  
  `docker-compose up`  
  Uses `docker-compose.yml`; `.env` can override `MONGO_URL`, `REDIS_URL`, `RABBITMQ_URL` if you point to Atlas/Upstash/Railway.

- **Only app stack, cloud Mongo/Redis/Rabbit:**  
  Set `MONGO_URL`, `REDIS_URL`, `RABBITMQ_URL` (and FIREBASE, NEXT_PUBLIC_*) in `.env`, then:  
  `docker-compose -f docker-compose.cloud.yml up`

---

## 8. Troubleshooting

- **CORS / Socket.IO:**  
  Set `CORS_ORIGIN` on **api-gateway** and **collab-service** to your Vercel URL (e.g. `https://idea-room-ashy.vercel.app`), **no trailing slash**. For production + preview use comma-separated: `https://idea-room-ashy.vercel.app,https://idea-room-xxx.vercel.app`.  
  If preflight still fails with "No 'Access-Control-Allow-Origin' header": (1) **Remove `CORS_ORIGIN`** from api-gateway in Railway so the app allows any origin; if that fixes it, the value was wrong (typo, slash, space). (2) In Railway → api-gateway → **Settings → Networking**, ensure the service **port** matches what the app uses (default 5000; Railway usually sets `PORT` for you). (3) Check **Deployments → Logs**: the app must log "API Gateway running on port X" and must not crash on startup; if MongoDB fails, the app now starts anyway and `/room` returns 503 until DB is ready.

- **MongoDB:**  
  Ensure Atlas Network Access allows `0.0.0.0/0` or Railway IPs, and the user has read/write on the DB.

- **Redis:**  
  Use `rediss://` for Upstash. If you see connection errors, check the Redis URL and region.

- **RabbitMQ:**  
  `amqplib` supports `amqps://`. If Railway gives `AMQP_URL`, you can set `RABBITMQ_URL` to the same value.

- **`NEXT_PUBLIC_*` on Vercel:**  
  These are fixed at **build** time. After changing them, trigger a new deploy (e.g. re-run Deploy or push a commit).

- **Railway `PORT`:**  
  Railway sets `PORT` automatically; you usually don’t add it as a variable. If the UI asks for **Port** when generating a domain or in Networking, use: **5000** (api-gateway), **8003** (auth-service), **4000** (collab-service). snapshot-worker has no port.
