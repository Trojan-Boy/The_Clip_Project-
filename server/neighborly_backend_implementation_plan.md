# Neighborly Backend - Detailed Implementation Plan

## Phase 1: Foundation Setup (Week 1)

### Day 1: Project Initialization
1. **Initialize TypeScript Project**
   ```bash
   mkdir neighborly-backend
   cd neighborly-backend
   npm init -y
   npm install typescript @types/node ts-node --save-dev
   npx tsc --init
   ```

2. **Install Core Dependencies**
   ```bash
   npm install express cors helmet morgan dotenv
   npm install @types/express @types/cors @types/morgan --save-dev
   ```

3. **Database & ORM Setup**
   ```bash
   npm install prisma @prisma/client
   npm install pg
   npx prisma init
   ```

### Day 2-3: Authentication System

#### 1. User Model Schema
```prisma
// prisma/schema.prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  firstName     String
  lastName      String
  phone         String?
  avatarUrl     String?
  
  role          UserRole  @default(CUSTOMER)
  emailVerified Boolean   @default(false)
  phoneVerified Boolean   @default(false)
  
  // Relationships
  profile       Profile?
  providerProfile ProviderProfile?
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Profile {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id])
  
  bio         String?
  location    String?
  latitude    Float?
  longitude   Float?
  
  // Social connections
  friends     User[]   @relation("Friends")
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum UserRole {
  CUSTOMER
  PROVIDER
  ADMIN
}
```

#### 2. Authentication Endpoints
```typescript
// src/auth/auth.controller.ts
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const register = async (req: Request, res: Response) => {
  // Implementation details
};

export const login = async (req: Request, res: Response) => {
  // Implementation details  
};

export const getCurrentUser = async (req: Request, res: Response) => {
  // Implementation details
};

export const refreshToken = async (req: Request, res: Response) => {
  // Implementation details
};
```

### Day 4-5: Service Provider Models

#### 1. Service Provider Schema
```prisma
model ProviderProfile {
  id                String   @id @default(cuid())
  userId            String   @unique
  user              User     @relation(fields: [userId], references: [id])
  
  businessName      String?
  description       String?
  yearsOfExperience Int      @default(0)
  
  // Verification status
  isVerified        Boolean  @default(false)
  verificationDate  DateTime?
  
  // Categories & Services
  categories        Category[] @relation("ProviderCategories")
  services          ServiceListing[]
  
  // Location
  serviceRadius     Int?     @default(10) // miles
  
  // Availability
  availability      Availability?
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

## Phase 2: Core Marketplace Features (Weeks 2-3)

### Week 2: Service Listings & Search

#### 1. Service Listing Schema
```prisma
model ServiceListing {
  id          String   @id @default(cuid())
  providerId  String
  provider    ProviderProfile @relation(fields: [providerId], references: [id])
  
  title       String
  description String
  price       Float
  priceType   PriceType @default(HOURLY)
  
  // Categories
  categoryId  String
  category    Category @relation(fields: [categoryId], references: [id])
  
  // Media
  images      String[]
  
  // Status
  isActive    Boolean  @default(true)
  
  // Metadata
  views       Int      @default(0)
  bookings    Booking[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum PriceType {
  HOURLY
  FIXED
  CONSULTATION
}
```

#### 2. Search Endpoints
```typescript
// src/services/search.controller.ts
export const searchServices = async (req: Request, res: Response) => {
  const { q, category, location, minPrice, maxPrice, page = 1, limit = 20 } = req.query;
  
  // Elasticsearch implementation or Prisma full-text search
};

export const findNearbyProviders = async (req: Request, res: Response) => {
  const { lat, lng, radius = 10 } = req.query;
  
  // Geospatial query implementation
};
```

### Week 3: Booking & Scheduling System

#### 1. Booking Schema
```prisma
model Booking {
  id          String    @id @default(cuid())
  customerId  String
  customer    User      @relation(fields: [customerId], references: [id])
  
  providerId  String
  provider    ProviderProfile @relation(fields: [providerId], references: [id])
  
  serviceId   String
  service     ServiceListing @relation(fields: [serviceId], references: [id])
  
  // Scheduling
  startTime   DateTime
  endTime     DateTime
  duration    Int       // in minutes
  
  // Status
  status      BookingStatus @default(PENDING)
  
  // Payment
  totalAmount Float
  currency    String   @default("USD")
  paymentId   String?  // Stripe payment intent ID
  
  // Messages
  messages    Message[]
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

enum BookingStatus {
  PENDING
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  DISPUTED
}
```

## Phase 3: Advanced Features (Weeks 4-6)

### Week 4: Payment Integration (Stripe)

#### 1. Stripe Setup
```typescript
// src/payments/stripe.service.ts
import Stripe from 'stripe';

export class StripeService {
  private stripe: Stripe;
  
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-12-18.acacia',
    });
  }
  
  async createPaymentIntent(amount: number, customerId: string) {
    // Implementation
  }
  
  async confirmBookingPayment(paymentIntentId: string) {
    // Implementation
  }
}
```

### Week 5: Real-time Messaging

#### 1. WebSocket Setup
```typescript
// src/websocket/server.ts
import { WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws, req: IncomingMessage) => {
  // Authentication and connection handling
});
```

### Week 6: Recommendation Engine

#### 1. Basic Collaborative Filtering
```typescript
// src/recommendations/engine.ts
export class RecommendationEngine {
  async getRecommendationsForUser(userId: string): Promise<ServiceListing[]> {
    // 1. Based on friends' bookings
    // 2. Based on similar users
    // 3. Based on location proximity
    // 4. Based on category preferences
  }
}
```

## Phase 4: Testing & Deployment (Week 7-8)

### Week 7: Comprehensive Testing

#### 1. Unit Tests
```typescript
// tests/auth.test.ts
describe('Authentication', () => {
  test('should register a new user', async () => {
    // Test implementation
  });
});
```

### Week 8: Deployment Configuration

#### 1. Docker Setup
```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

#### 2. Docker Compose
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_DB: neighborly
  
  redis:
    image: redis:7-alpine
  
  backend:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
```

## GitHub Repository Structure

```
neighborly-backend/
├── src/
│   ├── index.ts              # Entry point
│   ├── config/               # Configuration
│   ├── middleware/           # Express middleware
│   ├── routes/               # API routes
│   │   ├── auth.routes.ts
│   │   ├── users.routes.ts
│   │   ├── providers.routes.ts
│   │   ├── services.routes.ts
│   │   ├── bookings.routes.ts
│   │   └── messaging.routes.ts
│   ├── controllers/          # Route handlers
│   ├── services/             # Business logic
│   ├── models/               # Database models
│   ├── utils/                # Utility functions
│   └── websocket/            # WebSocket server
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── README.md
```

## Ready for Engineer Assignment

This detailed implementation plan provides a complete roadmap for the Backend Engineer. Once hired, they can immediately start with Phase 1 Day 1 tasks.