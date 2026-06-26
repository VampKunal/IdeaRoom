# Idea Room

A real-time collaborative whiteboard application where teams can brainstorm, draw, and work together in shared virtual spaces. Built with Next.js, Node.js, Socket.IO, MongoDB, Redis, and RabbitMQ.

## 🎯 Project Overview

Idea Room is a full-stack collaborative whiteboard platform that enables real-time multi-user collaboration. Users can create rooms, draw freehand strokes, add shapes, text, images, and nodes, all synchronized in real-time across all connected clients.

### Key Features

- **Real-time Collaboration**: Multiple users can work simultaneously with live cursor tracking
- **Rich Drawing Tools**: Freehand drawing, shapes (rectangles, circles, triangles, diamonds, parallelogram, hexagon, cloud), arrows/edges, text, images
- **Room Management**: Create, join, and manage collaborative rooms
- **User Authentication**: Firebase Authentication for secure access
- **Persistent Storage**: MongoDB for long-term data persistence, Redis for hot caching
- **Event-Driven Architecture**: RabbitMQ for asynchronous event processing
- **Undo/Redo**: Full history tracking for collaborative editing
- **Pan & Zoom**: Navigate large canvases with smooth panning and zooming
- **Minimap**: Visual overview of the entire canvas
- **Export Whiteboard**: Download the canvas as **PNG** or **JPEG** (via `html2canvas`, with a safe color pipeline for modern CSS `lab`/`oklch` so exports don’t crash)
- **Idle Cursor Hint**: After **30 seconds** without input, a subtle non-interactive ring appears at the last pointer position (does not block drawing)
- **Dashboard Network Status**: Live **online/offline**, **Network Information API** (effective-type, downlink, RTT when available), and **API latency** via `GET /health` polling with a small history sparkline
- **AI Chat (Room)**: Side panel chat; messages prefixed with `@ai` can attach a **screenshot of the board** for context (JPEG, client-side capture)

## 🏗️ Architecture

### Frontend
- **Framework**: Next.js 16.1.1 (React 19.2.3)
- **Styling**: Tailwind CSS 4
- **Real-time**: Socket.IO Client
- **UI Components**: HeroUI (buttons, dropdowns, toolbars), Framer Motion (home dashboard)
- **Canvas export**: html2canvas + `app/lib/html2canvasSafe.js` (normalizes colors for the library)
- **Authentication**: Firebase Client SDK

### Backend Services

1. **API Gateway** (Port 5000)
   - RESTful API for room management
   - Firebase token verification
   - MongoDB integration for room data

2. **Auth Service** (Port 8003)
   - Token verification endpoint
   - Firebase Admin SDK integration

3. **Collab Service** (Port 4000)
   - Socket.IO server for real-time collaboration
   - Redis for hot state caching
   - MongoDB for persistence
   - RabbitMQ for event publishing

4. **Snapshot Worker**
   - Background worker processing room events
   - Creates periodic snapshots from RabbitMQ events
   - Stores snapshots in MongoDB

### Infrastructure

- **MongoDB**: Primary database for rooms and snapshots
- **Redis**: Hot cache for active room states
- **RabbitMQ**: Message queue for event processing

## 📁 Project Structure

```
IdeaRoom/
├── backend/
│   ├── api-gateway/          # REST API service
│   │   ├── routes/            # API routes
│   │   ├── middleware/        # Auth middleware
│   │   ├── store/             # Data access layer
│   │   └── Dockerfile
│   ├── auth-service/          # Authentication service
│   │   └── Dockerfile
│   ├── collab-service/        # Real-time collaboration service
│   │   ├── db.js              # MongoDB connection
│   │   ├── redis.js           # Redis client
│   │   ├── rabbit.js          # RabbitMQ client
│   │   └── Dockerfile
│   └── snapshot-worker/       # Background worker
│       └── Dockerfile
├── frontend/                  # Next.js application
│   ├── app/
│   │   ├── auth/              # Authentication page
│   │   ├── room/[id]/         # Whiteboard room (dynamic)
│   │   ├── lib/               # api.js, socket.js, html2canvasSafe.js
│   │   ├── page.js            # Home / dashboard
│   │   ├── layout.js
│   │   └── globals.css
│   ├── components/            # RoomChat.js, BackgroundAnimation.js, …
│   ├── context/               # Auth (AuthContext)
│   ├── lib/                   # firebase.js (client config)
│   └── Dockerfile
├── docker-compose.yml         # Docker orchestration
└── .env                       # Environment variables (create this)
```

## ☁️ Deployment (MongoDB Atlas, Upstash, Railway, Vercel)

For production with **MongoDB Atlas**, **Upstash Redis**, **Railway RabbitMQ**, **Railway (backend)**, and **Vercel (frontend)**, see **[DEPLOYMENT.md](./DEPLOYMENT.md)**. It covers:

- Where to get each URL (Atlas, Upstash, Railway RabbitMQ, Firebase)
- Step-by-step backend deploy on Railway (api-gateway, auth-service, collab-service, snapshot-worker)
- Frontend deploy on Vercel and which variables to set
- A **“Where to put each URL”** table and a deployment checklist

---

## 🚀 Getting Started

### Prerequisites

- Docker and Docker Compose installed
- Firebase project with Authentication enabled
- Firebase Service Account credentials

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd IdeaRoom
```

### Step 2: Set Up Firebase

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication (Google provider recommended)
3. Go to Project Settings → Service Accounts
4. Generate a new private key (JSON file)
5. Extract the following from the JSON:
   - `project_id`
   - `client_email`
   - `private_key`

### Step 3: Create Environment File

Create a `.env` file in the `idea-room/` directory (same level as `docker-compose.yml`):

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nPrivate\nKey\nHere\n-----END PRIVATE KEY-----\n"
```

**Important Notes:**
- The `FIREBASE_PRIVATE_KEY` must be wrapped in quotes
- Include the `\n` characters (or use actual newlines)
- Include the full key with `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` markers

### Step 4: Configure Frontend Firebase

Update `frontend/lib/firebase.js` with your Firebase web app configuration (or use env-based config if you add it):

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  // ... other config
};
```

### Step 5: Build and Run

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode (background)
docker-compose up --build -d
```

### Step 6: Access the Application

- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:5000
- **Auth Service**: http://localhost:8003
- **Collab Service**: http://localhost:4000 (Socket.IO)
- **RabbitMQ Management UI**: http://localhost:15672 (username: `guest`, password: `guest`)

## 🔧 Environment Variables

### Backend Services

All backend services receive environment variables from:
1. `.env` file (via `env_file` in docker-compose.yml)
2. Explicit `environment` section in docker-compose.yml

**API Gateway:**
- `MONGO_URL`: MongoDB connection string (default: `mongodb://mongodb:27017`)
- `FIREBASE_PROJECT_ID`: Firebase project ID
- `FIREBASE_CLIENT_EMAIL`: Firebase service account email
- `FIREBASE_PRIVATE_KEY`: Firebase private key
- `NODE_ENV`: Environment mode (production/development)

**Collab Service:**
- `MONGO_URL`: MongoDB connection string
- `REDIS_URL`: Redis connection string (default: `redis://redis:6379`)
- `RABBITMQ_URL`: RabbitMQ connection string (default: `amqp://rabbitmq`)
- `API_GATEWAY_URL`: API Gateway URL for internal calls (default: `http://api-gateway:5000`)
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`: Firebase credentials
- `NODE_ENV`: Environment mode

**Snapshot Worker:**
- `MONGO_URL`: MongoDB connection string
- `RABBITMQ_URL`: RabbitMQ connection string
- `NODE_ENV`: Environment mode

**Frontend:**
- `NEXT_PUBLIC_API_BASE`: API Gateway URL (default: `http://localhost:5000`) — used for REST calls and **dashboard health** / latency checks (`GET /health`)
- `NEXT_PUBLIC_COLLAB_BASE`: Collab/Socket.IO server URL (default: `http://localhost:4000`)
- `NODE_ENV`: Environment mode

**SEO / indexing:** The frontend does **not** set `noindex` by default. Add `robots` metadata in `app/layout.js` if you need to block crawlers in production.

## 📝 How Environment Variables Work

1. **Docker Compose** reads the `.env` file from the `idea-room/` directory
2. Services receive variables through:
   - `env_file: - .env` (loads all variables from `.env`)
   - `environment:` section (explicit variables with fallback values)
3. In Docker containers, services use environment variables directly (no `.env` file loading needed)
4. For local development (without Docker), services use `dotenv` to load `.env` files

## 🐳 Docker Services

### Infrastructure Services

- **mongodb**: MongoDB 7 database
- **redis**: Redis 7 cache
- **rabbitmq**: RabbitMQ 3 with management UI

### Application Services

- **api-gateway**: REST API service
- **auth-service**: Authentication service
- **collab-service**: Real-time collaboration service
- **snapshot-worker**: Background event processor
- **frontend**: Next.js frontend application

All services are connected via a Docker bridge network (`idea-room-network`) and have health checks configured.

## 🛠️ Development

### Running Locally (Without Docker)

If you want to run services locally for development:

1. **Start Infrastructure**:
   ```bash
   # MongoDB
   mongod

   # Redis
   redis-server

   # RabbitMQ
   rabbitmq-server
   ```

2. **Backend Services**:
   ```bash
   cd backend/api-gateway
   npm install
   npm start

   cd ../auth-service
   npm install
   npm start

   cd ../collab-service
   npm install
   npm start

   cd ../snapshot-worker
   npm install
   node index.js
   ```

3. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api-gateway
docker-compose logs -f collab-service
docker-compose logs -f frontend
```

### Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

## 🔐 Security Notes

- Firebase private keys should never be committed to version control
- The `.env` file is in `.gitignore` (ensure it's not committed)
- In production, use Docker secrets or a secrets management service
- Ensure MongoDB, Redis, and RabbitMQ are not exposed to the public internet in production

## 📊 Data Flow

1. **User creates/joins room**: Frontend → API Gateway → MongoDB
2. **Real-time updates**: Frontend ↔ Collab Service (Socket.IO) ↔ Redis (hot cache)
3. **Persistence**: Collab Service → MongoDB (when user leaves)
4. **Event processing**: Collab Service → RabbitMQ → Snapshot Worker → MongoDB

## 🐛 Troubleshooting

### Services won't start

1. Check if ports are already in use:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   
   # Linux/Mac
   lsof -i :3000
   ```

2. Check Docker logs:
   ```bash
   docker-compose logs <service-name>
   ```

### Room creation fails

1. Verify Firebase credentials in `.env` file
2. Check API Gateway logs: `docker-compose logs api-gateway`
3. Ensure MongoDB is healthy: `docker-compose ps mongodb`

### Real-time updates not working

1. Check Collab Service logs: `docker-compose logs collab-service`
2. Verify Redis connection: `docker-compose exec redis redis-cli ping`
3. Check Socket.IO connection in browser console

### Database connection issues

1. Verify services are on the same Docker network
2. Check MongoDB health: `docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"`
3. Ensure environment variables are correctly set

## 📚 API Endpoints

### API Gateway (http://localhost:5000)

- `GET /health` - Health check
- `GET /room/:id` - Get room details
- `POST /room` - Create room (requires auth token)
- `GET /room/my` - Get user's rooms (requires auth token)
- `DELETE /room/:id` - Delete room (requires auth token)

### Auth Service (http://localhost:8003)

- `GET /` - Health check
- `POST /verify` - Verify Firebase token

## 🎨 Features in Detail

### Drawing Tools
- **Freehand Drawing**: Smooth stroke rendering (perfect-freehand) with optional dashed/dotted styles
- **Shapes**: Rectangle, circle, triangle, diamond, parallelogram, hexagon, cloud, and more
- **Edges / Arrows**: Connect nodes with rough edges
- **Text**: Editable text boxes with formatting
- **Images**: Upload and place images on canvas
- **Eraser**: Remove any object by clicking on it
- **Export**: Top bar **Export** → **PNG** or **JPEG** (captures `#canvas-container`; uses `html2canvasSafe` so modern CSS colors don’t break the exporter)

### Collaboration
- **Real-time Sync**: All changes sync instantly across clients
- **Cursor Tracking**: See other users' cursors in real-time
- **User Presence**: View active users in the room
- **Join Requests**: Non-owners must request permission to join

### Canvas Features
- **Pan & Zoom**: Navigate large canvases
- **Minimap**: Overview of entire canvas
- **Selection**: Multi-select objects with selection box
- **Group Operations**: Move, resize, delete multiple objects
- **Undo/Redo**: Full history tracking
- **Idle hint**: After 30s without input, a subtle ring at the last cursor position (pointer-events disabled)

### Dashboard (Home)
- **Network Status card**: Browser online state, connection quality hints, and measured API round-trip to `GET {NEXT_PUBLIC_API_BASE}/health`



## 🤝 Contributing

Anybody is free to contribute

