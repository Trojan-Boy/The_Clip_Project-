# Neighborly Project Structure

## Repository Organization

```
neighborly/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   ├── app.ts
│   │   │   └── auth.ts
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── controllers/
│   │   │   │   ├── services/
│   │   │   │   ├── validators/
│   │   │   │   └── routes.ts
│   │   │   ├── users/
│   │   │   │   ├── controllers/
│   │   │   │   ├── services/
│   │   │   │   ├── validators/
│   │   │   │   └── routes.ts
│   │   │   ├── providers/
│   │   │   │   ├── controllers/
│   │   │   │   ├── services/
│   │   │   │   ├── validators/
│   │   │   │   └── routes.ts
│   │   │   └── bookings/
│   │   │       ├── controllers/
│   │   │       ├── services/
│   │   │       ├── validators/
│   │   │       └── routes.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── error.middleware.ts
│   │   │   └── validation.middleware.ts
│   │   ├── utils/
│   │   │   ├── logger.ts
│   │   │   ├── apiResponse.ts
│   │   │   └── helpers.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── app.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── tests/
│   │   ├── unit/
│   │   └── integration/
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── docker-compose.yml
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   └── Card.tsx
│   │   │   ├── auth/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── RegisterForm.tsx
│   │   │   │   └── ForgotPassword.tsx
│   │   │   ├── marketplace/
│   │   │   │   ├── ServiceCard.tsx
│   │   │   │   ├── ProviderCard.tsx
│   │   │   │   ├── SearchBar.tsx
│   │   │   │   └── Filters.tsx
│   │   │   └── booking/
│   │   │       ├── BookingForm.tsx
│   │   │       ├── Calendar.tsx
│   │   │       └── PaymentForm.tsx
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Marketplace.tsx
│   │   │   ├── ProviderProfile.tsx
│   │   │   ├── Booking.tsx
│   │   │   └── Dashboard.tsx
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   ├── auth.ts
│   │   │   ├── providers.ts
│   │   │   └── bookings.ts
│   │   ├── store/
│   │   │   ├── slices/
│   │   │   │   ├── auth.slice.ts
│   │   │   │   ├── user.slice.ts
│   │   │   │   └── ui.slice.ts
│   │   │   ├── hooks.ts
│   │   │   └── store.ts
│   │   ├── utils/
│   │   │   ├── constants.ts
│   │   │   ├── helpers.ts
│   │   │   └── validation.ts
│   │   ├── styles/
│   │   │   ├── globals.css
│   │   │   └── tailwind.css
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── docker/
│   ├── docker-compose.prod.yml
│   ├── docker-compose.dev.yml
│   ├── nginx/
│   │   └── nginx.conf
│   ├── postgres/
│   │   └── init.sql
│   └── redis/
│       └── redis.conf
├── docs/
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT.md
│   └── DEPLOYMENT.md
├── scripts/
│   ├── setup-dev.sh
│   ├── deploy.sh
│   └── test.sh
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── deploy.yml
│   │   └── security.yml
│   └── pull_request_template.md
├── .env.example
├── docker-compose.yml
├── Makefile
├── README.md
└── package.json
```

## Development Environment Setup

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 14+
- Redis

### Quick Start
```bash
# Clone repository
git clone https://github.com/your-org/neighborly.git
cd neighborly

# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start development environment
docker-compose up -d

# Install dependencies
npm install
cd backend && npm install
cd ../frontend && npm install

# Run database migrations
cd backend
npx prisma migrate dev
npx prisma generate

# Start development servers
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend  
cd frontend && npm run dev
```

## API Endpoints Structure

### Auth Module
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh token

### Users Module
- `GET /api/users` - List users (admin)
- `GET /api/users/:id` - Get user profile
- `PATCH /api/users/:id` - Update user profile
- `GET /api/users/:id/friends` - Get user's friends
- `POST /api/users/:id/friends` - Add friend

### Providers Module
- `GET /api/providers` - List providers with filters
- `GET /api/providers/:id` - Get provider details
- `POST /api/providers` - Create provider profile
- `PATCH /api/providers/:id` - Update provider profile
- `GET /api/providers/:id/reviews` - Get provider reviews

### Bookings Module
- `GET /api/bookings` - List user bookings
- `GET /api/bookings/:id` - Get booking details
- `POST /api/bookings` - Create booking
- `PATCH /api/bookings/:id/status` - Update booking status
- `DELETE /api/bookings/:id` - Cancel booking
```