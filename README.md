# CommunityHero — AI-Powered Hyperlocal Civic Issue Reporting Platform

Built for the Community Hero hackathon challenge. Citizens report civic issues with photos, Gemini AI auto-categorizes and analyzes them, and the community collaborates to verify and resolve them.

## Stack
- **Frontend**: React + Vite + Tailwind CSS → Google Cloud Run
- **Backend**: Node.js + Express → Google Cloud Run
- **Database**: PostgreSQL via Supabase + Prisma ORM
- **AI**: Gemini 2.5 Flash (image analysis + insights + verification agent)
- **Images**: Cloudinary (free tier)

---

## Local Setup

### 1. Supabase (Database)
1. Create project at supabase.com
2. Go to SQL Editor → paste contents of `backend/schema.sql` → Run
3. Go to Settings → Database → **Session Pooler** connection string → copy it

### 2. Cloudinary (Image uploads)
1. Create free account at cloudinary.com
2. Get Cloud Name, API Key, API Secret from dashboard

### 3. Gemini API
1. Go to aistudio.google.com → Get API key
2. Model used: gemini-2.5-flash

---

## Running Locally

**backend/.env:**
```
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
JWT_SECRET=any_random_long_string_here
GEMINI_API_KEY=your_gemini_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
FRONTEND_URL=http://localhost:5173
PORT=5000
```

**frontend/.env:**
```
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_MAPS_KEY=
```

Terminal 1 — backend:
```bash
cd backend
npm install
npx prisma generate
node server.js
```

Terminal 2 — frontend:
```bash
cd frontend
npm install
npm run dev
```

---

## Deployment — Google Cloud Run

Both frontend and backend are deployed as containers on Google Cloud Run.

### Prerequisites
```bash
# Install Google Cloud CLI
# https://cloud.google.com/sdk/docs/install

gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com
```

### Backend → Cloud Run

1. Create `backend/Dockerfile`:
```dockerfile
FROM node:18-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npx prisma generate
EXPOSE 5000
CMD ["node", "server.js"]
```

2. Deploy:
```bash
cd backend
gcloud run deploy community-hero-api \
  --source . \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL="your_db_url",JWT_SECRET="your_secret",GEMINI_API_KEY="your_key",CLOUDINARY_CLOUD_NAME="your_name",CLOUDINARY_API_KEY="your_key",CLOUDINARY_API_SECRET="your_secret"
```

3. Copy the deployed URL (e.g. `https://community-hero-api-xxx-uc.a.run.app`)

### Frontend → Cloud Run

1. Update `frontend/.env`:
```
VITE_API_URL=https://community-hero-api-xxx-uc.a.run.app/api
```

2. Build:
```bash
cd frontend
npm run build
```

3. Create `frontend/Dockerfile`:
```dockerfile
FROM node:18-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

4. Create `frontend/nginx.conf`:
```nginx
server {
    listen 8080;
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

5. Deploy:
```bash
cd frontend
gcloud run deploy community-hero-frontend \
  --source . \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated
```

6. Update backend `FRONTEND_URL` env var in Cloud Run console to the frontend URL.

---

## Features

### Core
- Photo-based issue reporting with image upload
- Gemini Vision AI auto-detects: category, severity, department, estimated fix time, immediate risk
- Community upvoting/verification — each upvote awards points
- Real-time status tracking — Open → In Progress → Resolved
- Comments and updates on each issue

### Agentic AI (Gemini 2.5 Flash)
1. **Issue Vision Analysis** — analyzes uploaded photo, outputs structured JSON with category, severity, department, risk level
2. **Hotspot Cluster Analysis** — runs across all open issues, finds geographic patterns and predictive insights
3. **Auto-escalation Agent** — at milestone upvote counts (5, 10, 25, 50), re-runs AI verification and auto-escalates to critical when warranted

### Gamification
| Action | Points |
|--------|--------|
| Report issue | +10 |
| Upvote/verify | +2 |
| Add comment | +1 |
| Issue resolved | +25 |

Badges: Citizen → Reporter (20pts) → Activist (50pts) → Guardian (100pts) → Hero (200pts) → Champion (500pts)

### Dashboard
- Live summary stats and resolution rate
- Category bar and pie charts
- Community leaderboard
- AI-generated insights panel with caching (on-demand Gemini call)
- Recently resolved issues

---

## Google Technologies Used
- **Gemini 2.5 Flash** — primary AI engine for vision analysis, cluster insights, and auto-escalation
- **Google AI Studio** — Gemini API access
- **Google Cloud Run** — container deployment for both frontend and backend
- **Google Cloud Build** — container image building
