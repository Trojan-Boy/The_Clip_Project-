#!/bin/bash
# Neighborly Project Initialization Script
# This script will be executed by the DevOps Engineer once hired

echo "=========================================="
echo "Neighborly Project - Initial Setup"
echo "=========================================="

# Create project structure
echo "Creating project directory structure..."
mkdir -p neighborly
cd neighborly

# Create main directories
mkdir -p .github/workflows
mkdir -p backend frontend infrastructure docs scripts
mkdir -p backend/src backend/tests backend/prisma/migrations
mkdir -p frontend/src frontend/public

# Create basic README
echo "# Neighborly - Community Service Marketplace

## Project Overview
Neighborly connects local service providers with customers through verified neighborhood recommendations, building trust through real-world social connections.

## Development Setup
1. Run \`docker-compose up -d\` to start development environment
2. Run \`npm install\` in both backend/ and frontend/ directories
3. Run \`npx prisma migrate dev\` in backend/ to setup database

## Team Structure
- **Backend Engineer**: Node.js/TypeScript API, PostgreSQL, Prisma ORM
- **Frontend Engineer**: React/TypeScript, Tailwind CSS, Vite
- **DevOps Engineer**: Docker, CI/CD, Infrastructure

## Getting Started
See individual README files in backend/ and frontend/ directories." > README.md

# Create Docker Compose file for development
echo "version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: neighborly
      POSTGRES_PASSWORD: neighborly123
      POSTGRES_DB: neighborly_dev
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    ports:
      - '3001:3001'
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://neighborly:neighborly123@postgres:5432/neighborly_dev
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./backend:/app
      - /app/node_modules
    depends_on:
      - postgres
      - redis

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - '3000:3000'
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - VITE_API_URL=http://localhost:3001

volumes:
  postgres_data:
  redis_data:" > docker-compose.yml

# Create backend package.json template
echo '{
  "name": "neighborly-backend",
  "version": "1.0.0",
  "description": "Neighborly Backend API",
  "main": "dist/app.js",
  "scripts": {
    "dev": "tsx watch src/app.ts",
    "build": "tsc",
    "start": "node dist/app.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write src/**/*.ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "compression": "^1.7.4",
    "dotenv": "^16.0.3",
    "jsonwebtoken": "^9.0.0",
    "bcrypt": "^5.1.0",
    "prisma": "^4.15.0",
    "@prisma/client": "^4.15.0",
    "redis": "^4.6.7",
    "zod": "^3.21.4"
  },
  "devDependencies": {
    "@types/node": "^20.1.0",
    "@types/express": "^4.17.17",
    "@types/bcrypt": "^5.0.0",
    "@types/cors": "^2.8.13",
    "@types/jsonwebtoken": "^9.0.2",
    "typescript": "^5.0.4",
    "tsx": "^3.12.7",
    "vitest": "^0.31.0",
    "@vitest/coverage-v8": "^0.31.0",
    "eslint": "^8.40.0",
    "@typescript-eslint/eslint-plugin": "^5.59.5",
    "@typescript-eslint/parser": "^5.59.5",
    "prettier": "^2.8.8"
  }
}' > backend/package.json

# Create frontend package.json template
echo '{
  "name": "neighborly-frontend",
  "version": "1.0.0",
  "description": "Neighborly Frontend Application",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:ui": "vitest --ui",
    "lint": "eslint src --ext .ts,.tsx",
    "format": "prettier --write src/**/*.{ts,tsx}"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.11.0",
    "axios": "^1.4.0",
    "zustand": "^4.3.9",
    "@tanstack/react-query": "^4.29.12",
    "react-hook-form": "^7.45.0",
    "zod": "^3.21.4",
    "@hookform/resolvers": "^3.1.1",
    "tailwindcss": "^3.3.2",
    "autoprefixer": "^10.4.14",
    "postcss": "^8.4.24",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.6",
    "@types/react-dom": "^18.2.4",
    "@vitejs/plugin-react": "^4.0.0",
    "@vitest/ui": "^0.31.0",
    "typescript": "^5.0.4",
    "vite": "^4.3.9",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^5.16.5",
    "vitest": "^0.31.0",
    "eslint": "^8.40.0",
    "@typescript-eslint/eslint-plugin": "^5.59.5",
    "@typescript-eslint/parser": "^5.59.5",
    "prettier": "^2.8.8"
  }
}' > frontend/package.json

echo "=========================================="
echo "Project structure created successfully!"
echo ""
echo "Next steps for DevOps Engineer:"
echo "1. Initialize git repository"
echo "2. Push to GitHub/GitLab"
echo "3. Set up CI/CD pipelines in .github/workflows/"
echo "4. Configure environment variables"
echo "5. Set up monitoring and logging"
echo "=========================================="