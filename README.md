# Cloud Notes Manager

A full-stack, AWS-ready note-taking web application. Users register and sign in with **Amazon Cognito**, store notes in **MongoDB Atlas**, and benefit from **Amazon ElastiCache** (Redis-compatible) caching. The application runs on a single **Amazon EC2** instance served by **Express + Nginx**.

---

## Architecture

```
Browser (React + Vite)
     │
     ▼  HTTPS via Nginx
Express (Node.js) on EC2
     │
     ├── Amazon Cognito       (token verification via aws-jwt-verify)
     ├── MongoDB Atlas        (notes persistence, TLS — mongodb+srv://)
     └── Amazon ElastiCache   (notes list cache, Redis-compatible, TLS)
```

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, React Router DOM |
| Icons | Lucide React |
| Auth (client) | AWS Amplify Auth |
| Auth (server) | aws-jwt-verify, Amazon Cognito |
| Backend | Node.js, Express 4 |
| Database | MongoDB Atlas + Mongoose |
| Cache | Amazon ElastiCache (Redis-compatible), `redis` npm package |
| Security | Helmet, express-rate-limit, express-validator, CORS |
| Deployment | Amazon EC2 + Nginx |

---

## Prerequisites

- **Node.js** ≥ 18 and **npm** ≥ 9
- **MongoDB** running locally (for development) or a **MongoDB Atlas** cluster (for production)
- **Redis** running locally (optional, dev) or an **Amazon ElastiCache** cluster (production)
- An **Amazon Cognito User Pool** with a browser app client

---

## Local Installation

```bash
git clone <your-repo-url> cloud-notes-manager
cd cloud-notes-manager

# Backend
cd backend
npm install
cp .env.example .env   # edit COGNITO values; MONGO_URI defaults to localhost

# Frontend
cd ../frontend
npm install
cp .env.example .env   # edit VITE_COGNITO values
```

---

## Environment Configuration

### Backend — `backend/.env`

| Variable | Description |
|---|---|
| `NODE_ENV` | `development` or `production` |
| `PORT` | Express listening port (default `5000`) |
| `CLIENT_URL` | Frontend origin for CORS (e.g. `http://localhost:5173`) |
| `AWS_REGION` | AWS region (e.g. `us-east-1`) |
| `COGNITO_USER_POOL_ID` | Cognito User Pool ID |
| `COGNITO_CLIENT_ID` | Cognito App Client ID |
| `MONGO_URI` | MongoDB connection URI — `mongodb://localhost/cloud-notes` locally, `mongodb+srv://...` on Atlas |
| `REDIS_HOST` | Redis / ElastiCache hostname |
| `REDIS_PORT` | Redis port (default `6379`) |
| `REDIS_TLS` | `true` to enable TLS (required for ElastiCache in-transit encryption) |
| `REDIS_PASSWORD` | Redis AUTH token — omit or leave blank if the cluster has no AUTH configured |
| `CACHE_TTL_SECONDS` | Note list cache TTL (default `60`) |

### Frontend — `frontend/.env`

| Variable | Description |
|---|---|
| `VITE_AWS_REGION` | AWS region |
| `VITE_COGNITO_USER_POOL_ID` | Cognito User Pool ID |
| `VITE_COGNITO_USER_POOL_CLIENT_ID` | Cognito App Client ID |
| `VITE_API_BASE_URL` | Backend base URL (leave empty when using the Vite dev-server proxy) |

> **Never** store database URIs, Redis passwords, or AWS secret keys in frontend env variables.

---

## Required Cognito Setup

1. **Create a User Pool** in the AWS Console:
   - Sign-in option: **Email**
   - Required attributes: `name`, `email`
   - Enable email verification

2. **Create an App Client** (type: **Public client**, no client secret).

3. Copy the **User Pool ID** and **App Client ID** into both `.env` files.

---

## MongoDB Atlas Setup

### Development cluster

1. Go to [https://cloud.mongodb.com](https://cloud.mongodb.com) and create a free **M0** cluster.
2. Under **Database Access**, create a database user with a strong password.
3. Under **Network Access**, add your local machine's IP address.
4. Under **Database → Connect → Drivers**, copy the connection string.
5. Replace `<db_password>` with your user's password and paste it into `backend/.env`:
   ```
   MONGO_URI=mongodb+srv://<username>:<db_password>@cluster0.xxxxx.mongodb.net/cloud-notes?retryWrites=true&w=majority
   ```

### Production on EC2

Follow the same steps, then:

1. Under **Network Access**, add the **EC2 instance's public IP address** (not `0.0.0.0/0`).
2. Set the production `MONGO_URI` on the EC2 instance (see the EC2 deployment steps below).

> **Security note:** Never add an unrestricted `0.0.0.0/0` IP allow rule to Atlas. Add only the specific public IP of your EC2 instance. If the EC2 IP changes, update the Atlas rule accordingly or use an Elastic IP.

---

## ElastiCache Configuration

The application uses this ElastiCache endpoint:

```
master.cloud-notes-cache.24fns6.use1.cache.amazonaws.com:6379
```

Production settings in `backend/.env` on EC2:

```
REDIS_ENABLED=true
REDIS_HOST=master.cloud-notes-cache.24fns6.use1.cache.amazonaws.com
REDIS_PORT=6379
REDIS_TLS=true
CACHE_TTL_SECONDS=60
# Do not set REDIS_PASSWORD — this cluster has no AUTH token
```

Local development default (no Redis server needed):

```
REDIS_ENABLED=false
```

The EC2 security group must permit outbound traffic to the ElastiCache security group on port 6379. The ElastiCache security group must accept inbound traffic from the EC2 application security group only.

If Redis is unavailable, the application falls back to querying MongoDB directly and logs the connection error without exposing secrets.

---

## Running Locally

```bash
# Terminal 1 — Backend (local MongoDB must be running)
cd backend
npm run dev     # → http://localhost:5000

# Terminal 2 — Frontend
cd frontend
npm run dev     # → http://localhost:5173
```

The Vite dev server proxies `/api` requests to `http://localhost:5000`.

---

## Test Commands

```bash
cd backend
npm test
```

Tests cover: health endpoint, Cognito auth middleware, note CRUD, input validation, and user-data isolation. All AWS, MongoDB, and Redis calls are mocked — no live credentials required.

---

## Production Build

```bash
# Build the React frontend
cd frontend
npm run build
# Output: frontend/dist/

# Run Express in production (serves the built frontend)
cd ../backend
NODE_ENV=production node server.js
```

---

## AWS Deployment — Step-by-Step

### 1. VPC and Security Groups

- **EC2 security group** (`sg-app`): allow inbound 22 (SSH, your IP only), 80 (HTTP), 443 (HTTPS).
- **ElastiCache security group** (`sg-redis`): allow inbound 6379 from `sg-app` only.

No database security group is required on EC2 — Atlas is reached over the internet via TLS.

### 2. Amazon Cognito

Follow the [Cognito setup](#required-cognito-setup) section above. Note the **User Pool ID** and **App Client ID**.

### 3. MongoDB Atlas

Follow the [MongoDB Atlas setup](#mongodb-atlas-setup) section above:

- Create the cluster and database user.
- Add the EC2 instance's **Elastic IP** to Atlas Network Access.
- Copy the `mongodb+srv://` connection URI for use in the next step.

### 4. Amazon ElastiCache

The cluster is already provisioned at:

```
master.cloud-notes-cache.24fns6.use1.cache.amazonaws.com:6379
```

Verify that the EC2 instance's security group can reach the ElastiCache security group on port 6379.

### 5. Amazon EC2 Instance

1. Launch an **Amazon Linux 2023** or **Ubuntu 22.04** EC2 instance (t3.small or larger).
2. Assign an **Elastic IP** to ensure a stable public IP for Atlas Network Access.
3. Associate `sg-app`.

```bash
# Install Node.js 20 (Amazon Linux)
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Install Nginx
sudo yum install -y nginx
```

### 6. Deploy Application

```bash
# Upload or clone the project
git clone <your-repo-url> /home/ec2-user/cloud-notes
cd /home/ec2-user/cloud-notes

# Install backend dependencies
cd backend
npm install --omit=dev

# Build frontend
cd ../frontend
npm install
npm run build

# Create and populate the backend .env
cd ../backend
cat > .env << 'EOF'
NODE_ENV=production
PORT=5000
CLIENT_URL=https://yourdomain.com
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
MONGO_URI=mongodb+srv://<username>:<db_password>@cluster0.xxxxx.mongodb.net/cloud-notes?retryWrites=true&w=majority
REDIS_ENABLED=true
REDIS_HOST=master.cloud-notes-cache.24fns6.use1.cache.amazonaws.com
REDIS_PORT=6379
REDIS_TLS=true
CACHE_TTL_SECONDS=60
EOF
chmod 600 .env
```

> Replace all placeholder values with real ones. Never commit this file.

### 7. Configure Nginx

```bash
sudo cp /home/ec2-user/cloud-notes/deploy/nginx.conf.example /etc/nginx/conf.d/cloud-notes.conf
sudo nano /etc/nginx/conf.d/cloud-notes.conf   # set server_name to your domain or Elastic IP
sudo nginx -t
sudo systemctl enable --now nginx
```

### 8. Run the Application with systemd

Create `/etc/systemd/system/cloud-notes.service`:

```ini
[Unit]
Description=Cloud Notes Manager
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/cloud-notes/backend
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
EnvironmentFile=/home/ec2-user/cloud-notes/backend/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now cloud-notes
sudo journalctl -u cloud-notes -f
```

### 9. Verify Deployment

```bash
curl http://your-elastic-ip/api/health
# {"status":"ok","timestamp":"..."}
```

Then open the application in a browser and complete a full sign-in / note-creation cycle.

### 10. HTTPS (strongly recommended)

```bash
# Using Certbot (requires a domain pointed at the Elastic IP)
sudo snap install --classic certbot
sudo certbot --nginx -d yourdomain.com
```

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `Token verification failed` | Wrong `COGNITO_USER_POOL_ID` or `COGNITO_CLIENT_ID` |
| `MongoServerSelectionError` on startup | Atlas IP not whitelisted, wrong URI, or wrong password |
| `MongoServerError: bad auth` | Wrong Atlas database user password in `MONGO_URI` |
| Redis `ECONNREFUSED` | Wrong `REDIS_HOST`/port or TLS mismatch |
| Redis `ECONNRESET` / TLS error | `REDIS_TLS=true` required for ElastiCache in-transit encryption |
| CORS errors in browser | `CLIENT_URL` doesn't match the actual frontend origin |
| 502 from Nginx | Express not running; check `systemctl status cloud-notes` |

---

## Features

- **Authentication**: Register, email confirmation, sign in, session restoration, sign out via Amazon Cognito
- **Notes CRUD**: Create, read, update, delete
- **Pin/Unpin**: Toggle pinned state; pinned notes appear first
- **Search**: Full-text search on title and content with 350ms debounce
- **Tag filtering**: Tag chips on the dashboard; search + tag filters work together
- **Caching**: Per-user versioned Redis cache for note lists; invalidated on every mutation
- **Security**: Helmet, rate limiting, CORS, JWT verification, per-user DB scoping, input validation

---

## License

MIT
