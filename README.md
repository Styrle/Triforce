# TriForce - Triathlon Training Platform

A comprehensive training platform for triathletes, featuring activity tracking, performance analytics, training plans, and strength standards.

## Features

- 🏊 **Multi-sport tracking** - Swim, Bike, Run, and Strength
- 📊 **Performance Management Chart (PMC)** - CTL, ATL, TSB tracking
- 🔗 **Strava Integration** - Automatic activity sync
- 📅 **Training Plans** - Periodized plan builder
- 💪 **Strength Standards** - Symmetric Strength-style analysis
- 📈 **Advanced Analytics** - Zones, efficiency, duration curves
- 🎯 **Tri-Score** - Composite fitness metric

## Tech Stack

- **Backend**: Node.js 20, Express, TypeScript, Prisma
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Frontend**: React 18, TypeScript, Tailwind CSS, D3.js
- **Infrastructure**: Docker, GitHub Actions

## Quick Start

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- PostgreSQL 16 (or use Docker)
- Redis 7 (or use Docker)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/triforce.git
   cd triforce
   ```

2. **Start database services**
   ```bash
   docker-compose up -d postgres redis
   ```

3. **Setup backend**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   npm install
   npx prisma migrate dev
   npm run dev
   ```

4. **Setup frontend** (in another terminal)
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. **Access the app**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001/api
   - API Health: http://localhost:3001/api/health

### Using Docker (Full Stack)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql://triforce:triforce_dev@localhost:5432/triforce

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d

# Strava OAuth
STRAVA_CLIENT_ID=your-client-id
STRAVA_CLIENT_SECRET=your-client-secret
STRAVA_REDIRECT_URI=http://localhost:3001/api/strava/callback

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Server
PORT=3001
NODE_ENV=development
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:3001/api
```

## Deployment on Digital Ocean

### Option 1: App Platform (Recommended)

1. Connect your GitHub repository to Digital Ocean App Platform
2. Create a managed PostgreSQL database
3. Create a managed Redis cluster
4. Configure environment variables
5. Deploy!

### Option 2: Droplet

1. Create a Droplet (Ubuntu 22.04, 2GB+ RAM)
2. Install Docker and Docker Compose
3. Clone the repository
4. Create `.env` file with production values
5. Run `docker-compose -f docker-compose.prod.yml up -d`
6. Configure Nginx reverse proxy with SSL

### Database Setup (Managed)

For Digital Ocean Managed PostgreSQL:
```env
DATABASE_URL=postgresql://user:password@host:25060/triforce?sslmode=require
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh token

### Strava
- `GET /api/strava/auth` - Get OAuth URL
- `GET /api/strava/callback` - OAuth callback
- `GET /api/strava/status` - Connection status
- `DELETE /api/strava/disconnect` - Disconnect

### Health
- `GET /api/health` - Health check

## Project Structure

```
triforce/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuration
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utilities
│   ├── prisma/             # Database schema
│   └── __tests__/          # Tests
├── frontend/
│   └── src/
│       ├── components/     # React components
│       ├── pages/          # Page components
│       ├── hooks/          # Custom hooks
│       ├── services/       # API client
│       └── stores/         # State management
└── shared/                 # Shared types
```

## Development

### Commands

```bash
# Run tests
make test

# Run linter
make lint

# Reset database
make reset-db

# Open Prisma Studio
make studio
```

### Adding Migrations

```bash
cd backend
npx prisma migrate dev --name your_migration_name
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
