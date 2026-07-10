# Neighborly DevOps - Detailed Implementation Plan

## Phase 1: Infrastructure Setup (Week 1)

### Day 1: Development Environment & CI/CD Pipeline

#### 1. Initialize GitHub Repository Structure
```bash
# Create repository structure
mkdir neighborly
cd neighborly
mkdir -p {backend,frontend,infrastructure,docs,scripts}
```

#### 2. Create Repository Organization
```
neighborly/
├── .github/
│   ├── workflows/
│   │   ├── backend-ci.yml
│   │   ├── frontend-ci.yml
│   │   ├── security-scan.yml
│   │   └── release.yml
│   ├── ISSUE_TEMPLATE/
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── CODEOWNERS
├── backend/
│   ├── .env.example
│   ├── docker-compose.dev.yml
│   ├── Dockerfile
│   ├── package.json
│   └── README.md
├── frontend/
│   ├── .env.example
│   ├── docker-compose.dev.yml
│   ├── Dockerfile
│   ├── package.json
│   └── README.md
├── infrastructure/
│   ├── terraform/
│   ├── kubernetes/
│   ├── scripts/
│   └── README.md
├── docs/
│   ├── api/
│   ├── architecture/
│   ├── deployment/
│   └── CONTRIBUTING.md
└── Makefile
```

#### 3. Backend CI/CD Pipeline (.github/workflows/backend-ci.yml)
```yaml
name: Backend CI/CD

on:
  push:
    paths:
      - 'backend/**'
      - '.github/workflows/backend-ci.yml'
  pull_request:
    paths:
      - 'backend/**'

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_USER: postgres
          POSTGRES_DB: neighborly_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
        cache-dependency-path: backend/package-lock.json

    - name: Install dependencies
      working-directory: ./backend
      run: npm ci

    - name: Generate Prisma client
      working-directory: ./backend
      run: npx prisma generate

    - name: Run database migrations
      working-directory: ./backend
      run: npx prisma migrate dev --name init
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/neighborly_test

    - name: Run tests
      working-directory: ./backend
      run: npm test
      env:
        NODE_ENV: test
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/neighborly_test
        REDIS_URL: redis://localhost:6379
        JWT_SECRET: test-secret

    - name: Run linting
      working-directory: ./backend
      run: npm run lint

    - name: Type check
      working-directory: ./backend
      run: npm run typecheck

  build:
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'

    - name: Build backend
      working-directory: ./backend
      run: npm run build

    - name: Log in to Docker Hub
      uses: docker/login-action@v3
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}

    - name: Build and push Docker image
      uses: docker/build-push-action@v5
      with:
        context: ./backend
        push: true
        tags: |
          ${{ secrets.DOCKER_USERNAME }}/neighborly-backend:latest
          ${{ secrets.DOCKER_USERNAME }}/neighborly-backend:${{ github.sha }}
```

#### 4. Frontend CI/CD Pipeline (.github/workflows/frontend-ci.yml)
```yaml
name: Frontend CI/CD

on:
  push:
    paths:
      - 'frontend/**'
      - '.github/workflows/frontend-ci.yml'
  pull_request:
    paths:
      - 'frontend/**'

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json

    - name: Install dependencies
      working-directory: ./frontend
      run: npm ci

    - name: Run tests
      working-directory: ./frontend
      run: npm test

    - name: Run linting
      working-directory: ./frontend
      run: npm run lint

    - name: Type check
      working-directory: ./frontend
      run: npm run typecheck

  build:
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'

    - name: Build frontend
      working-directory: ./frontend
      run: npm run build

    - name: Log in to Docker Hub
      uses: docker/login-action@v3
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}

    - name: Build and push Docker image
      uses: docker/build-push-action@v5
      with:
        context: ./frontend
        push: true
        tags: |
          ${{ secrets.DOCKER_USERNAME }}/neighborly-frontend:latest
          ${{ secrets.DOCKER_USERNAME }}/neighborly-frontend:${{ github.sha }}
```

### Day 2-3: Docker Development Environment

#### 1. Backend Dockerfile
```dockerfile
# backend/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://localhost:${PORT || 3000}/health', (res) => { if (res.statusCode !== 200) process.exit(1); }).on('error', () => process.exit(1));"

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

#### 2. Backend Docker Compose for Development
```yaml
# backend/docker-compose.dev.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: neighborly
      POSTGRES_PASSWORD: neighborly123
      POSTGRES_DB: neighborly_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U neighborly"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: Dockerfile.dev
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://neighborly:neighborly123@postgres:5432/neighborly_dev
      REDIS_URL: redis://redis:6379
      JWT_SECRET: dev-secret-key-change-in-production
      PORT: 3000
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev

volumes:
  postgres_data:
  redis_data:
```

#### 3. Frontend Dockerfile
```dockerfile
# frontend/Dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### 4. Frontend Nginx Configuration
```nginx
# frontend/nginx.conf
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # Cache static assets
        location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Handle SPA routing
        location / {
            try_files $uri $uri/ /index.html;
        }

        # API proxy for development
        location /api/ {
            proxy_pass http://backend:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # WebSocket proxy
        location /ws/ {
            proxy_pass http://backend:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "Upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

### Day 4-5: Development Environment Scripts

#### 1. Makefile for Development
```makefile
# Makefile
.PHONY: help start stop logs clean db-migrate db-reset test lint

help:
	@echo "Neighborly Development Commands"
	@echo ""
	@echo "  start          Start all services (backend, database, redis)"
	@echo "  stop           Stop all services"
	@echo "  logs           View service logs"
	@echo "  clean          Remove all containers, volumes, and images"
	@echo "  db-migrate     Run database migrations"
	@echo "  db-reset       Reset database and run migrations"
	@echo "  test           Run backend tests"
	@echo "  lint           Run linting on backend and frontend"
	@echo "  frontend-dev   Start frontend development server"
	@echo "  backend-dev    Start backend development server"

start:
	docker-compose -f backend/docker-compose.dev.yml up -d

stop:
	docker-compose -f backend/docker-compose.dev.yml down

logs:
	docker-compose -f backend/docker-compose.dev.yml logs -f

clean:
	docker-compose -f backend/docker-compose.dev.yml down -v
	docker system prune -a -f

db-migrate:
	docker-compose -f backend/docker-compose.dev.yml exec backend npx prisma migrate dev

db-reset:
	docker-compose -f backend/docker-compose.dev.yml down -v
	docker-compose -f backend/docker-compose.dev.yml up -d postgres redis
	sleep 5
	docker-compose -f backend/docker-compose.dev.yml exec backend npx prisma migrate dev

test:
	docker-compose -f backend/docker-compose.dev.yml exec backend npm test

lint:
	docker-compose -f backend/docker-compose.dev.yml exec backend npm run lint
	cd frontend && npm run lint

frontend-dev:
	cd frontend && npm run dev

backend-dev:
	docker-compose -f backend/docker-compose.dev.yml up -d postgres redis
	cd backend && npm run dev
```

#### 2. Environment Setup Scripts
```bash
#!/bin/bash
# scripts/setup-dev.sh

set -e

echo "Setting up Neighborly development environment..."

# Check for required tools
command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed. Aborting." >&2; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "Docker Compose is required but not installed. Aborting." >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Node.js is required but not installed. Aborting." >&2; exit 1; }

# Create environment files
echo "Creating environment configuration files..."

# Backend .env
cat > backend/.env << EOF
# Database
DATABASE_URL=postgresql://neighborly:neighborly123@localhost:5432/neighborly_dev

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Application
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# Stripe (development)
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_PUBLIC_KEY=pk_test_placeholder

# Email (development)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=test
SMTP_PASS=test

# Google Maps
GOOGLE_MAPS_API_KEY=placeholder_key

# File storage
AWS_ACCESS_KEY_ID=placeholder
AWS_SECRET_ACCESS_KEY=placeholder
AWS_REGION=us-east-1
AWS_BUCKET_NAME=neighborly-dev
EOF

# Frontend .env
cat > frontend/.env.local << EOF
# API Configuration
VITE_API_BASE_URL=http://localhost:3000/api
VITE_WS_URL=ws://localhost:3000

# Mapbox
VITE_MAPBOX_TOKEN=pk.placeholder

# Stripe
VITE_STRIPE_PUBLIC_KEY=pk_test_placeholder

# Feature flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_SENTRY=false
EOF

echo "Development environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Update the environment files with your actual API keys"
echo "2. Run 'make start' to start the development services"
echo "3. Run 'make db-migrate' to set up the database"
```
```

## Phase 2: Production Infrastructure (Weeks 2-3)

### Week 2: Terraform Infrastructure as Code

#### 1. Terraform Directory Structure
```
infrastructure/terraform/
├── main.tf
├── variables.tf
├── outputs.tf
├── providers.tf
├── backend.tf
├── modules/
│   ├── networking/
│   ├── database/
│   ├── compute/
│   └── storage/
├── environments/
│   ├── dev/
│   ├── staging/
│   └── prod/
└── scripts/
```

#### 2. Terraform Main Configuration
```hcl
# infrastructure/terraform/main.tf
terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }
  
  backend "s3" {
    bucket = "neighborly-terraform-state"
    key    = "terraform.tfstate"
    region = "us-east-1"
    
    dynamodb_table = "neighborly-terraform-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "Neighborly"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# VPC Module
module "vpc" {
  source = "./modules/networking"
  
  vpc_name          = "neighborly-${var.environment}"
  vpc_cidr          = var.vpc_cidr
  availability_zones = var.availability_zones
  
  enable_nat_gateway = var.environment != "dev"
  single_nat_gateway = var.environment == "dev"
}

# Database Module
module "database" {
  source = "./modules/database"
  
  environment = var.environment
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnet_ids
  
  db_name     = "neighborly"
  db_username = var.db_username
  db_password = var.db_password
  
  instance_class = var.environment == "prod" ? "db.t4g.large" : "db.t4g.micro"
  allocated_storage = var.environment == "prod" ? 100 : 20
  
  enable_backup_retention = var.environment == "prod"
  backup_retention_period = var.environment == "prod" ? 30 : 7
}

# Redis Module
module "redis" {
  source = "./modules/redis"
  
  environment = var.environment
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnet_ids
  
  node_type    = var.environment == "prod" ? "cache.t4g.micro" : "cache.t3.micro"
  num_cache_nodes = var.environment == "prod" ? 2 : 1
  
  parameter_group_name = "default.redis7"
}

# EKS Cluster Module
module "eks" {
  source = "./modules/compute"
  
  count = var.environment != "dev" ? 1 : 0
  
  environment = var.environment
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnet_ids
  
  cluster_name = "neighborly-${var.environment}"
  cluster_version = "1.28"
  
  node_groups = {
    general = {
      min_size     = var.environment == "prod" ? 3 : 2
      max_size     = var.environment == "prod" ? 10 : 5
      desired_size = var.environment == "prod" ? 3 : 2
      
      instance_type = var.environment == "prod" ? "t3.medium" : "t3.small"
      disk_size     = 20
    }
  }
}

# S3 Module for file storage
module "storage" {
  source = "./modules/storage"
  
  environment = var.environment
  
  bucket_name = "neighborly-${var.environment}-files"
  
  enable_versioning    = true
  enable_lifecycle     = true
  transition_to_ia_days = 30
  expiration_days      = 365
  
  cors_rules = [
    {
      allowed_headers = ["*"]
      allowed_methods = ["GET", "PUT", "POST", "DELETE"]
      allowed_origins = ["https://*.neighborly.app"]
      expose_headers  = ["ETag"]
      max_age_seconds = 3000
    }
  ]
}
```

### Week 3: Kubernetes Deployment

#### 1. Kubernetes Manifests Directory Structure
```
infrastructure/kubernetes/
├── base/
│   ├── kustomization.yaml
│   ├── namespace.yaml
│   ├── configs/
│   │   ├── configmap.yaml
│   │   └── secrets.yaml
│   ├── backend/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── hpa.yaml
│   │   └── ingress.yaml
│   └── frontend/
│       ├── deployment.yaml
│       ├── service.yaml
│       └── ingress.yaml
├── overlays/
│   ├── dev/
│   ├── staging/
│   └── prod/
└── helm/
    ├── Chart.yaml
    ├── values.yaml
    └── templates/
```

#### 2. Backend Kubernetes Deployment
```yaml
# infrastructure/kubernetes/base/backend/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: neighborly-backend
  namespace: neighborly
spec:
  replicas: 2
  selector:
    matchLabels:
      app: neighborly-backend
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: neighborly-backend
    spec:
      containers:
      - name: backend
        image: neighborly/backend:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: neighborly-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: neighborly-secrets
              key: redis-url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: neighborly-secrets
              key: jwt-secret
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
        volumeMounts:
        - name: tmp
          mountPath: /tmp
      volumes:
      - name: tmp
        emptyDir: {}
      - name: google-cloud-key
        secret:
          secretName: google-cloud-key
```

#### 3. Horizontal Pod Autoscaler
```yaml
# infrastructure/kubernetes/base/backend/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: neighborly-backend-hpa
  namespace: neighborly
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: neighborly-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

#### 4. Ingress Configuration
```yaml
# infrastructure/kubernetes/base/backend/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: neighborly-ingress
  namespace: neighborly
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/cors-allow-methods: "GET, PUT, POST, DELETE, OPTIONS"
    nginx.ingress.kubernetes.io/cors-allow-origin: "https://neighborly.app"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - api.neighborly.app
    secretName: neighborly-tls
  rules:
  - host: api.neighborly.app
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: neighborly-backend
            port:
              number: 3000
```

## Phase 3: Monitoring & Observability (Weeks 4-5)

### Week 4: Monitoring Stack Setup

#### 1. Prometheus & Grafana Configuration
```yaml
# infrastructure/monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alerts.yml"

scrape_configs:
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
    - role: pod
    relabel_configs:
    - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
      action: keep
      regex: true
    - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
      action: replace
      target_label: __metrics_path__
      regex: (.+)
    - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
      action: replace
      regex: ([^:]+)(?::\d+)?;(\d+)
      replacement: $1:$2
      target_label: __address__
    - action: labelmap
      regex: __meta_kubernetes_pod_label_(.+)
    - source_labels: [__meta_kubernetes_namespace]
      action: replace
      target_label: kubernetes_namespace
    - source_labels: [__meta_kubernetes_pod_name]
      action: replace
      target_label: kubernetes_pod_name

  - job_name: 'neighborly-backend'
    static_configs:
    - targets: ['neighborly-backend.neighborly.svc.cluster.local:3000']
      labels:
        service: 'neighborly-backend'
        environment: 'production'

  - job_name: 'node-exporter'
    static_configs:
    - targets: ['node-exporter:9100']
```

#### 2. Application Metrics Collection
```typescript
// backend/src/utils/metrics.ts
import promClient from 'prom-client';

// Create a Registry to register the metrics
const register = new promClient.Registry();

// Add default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

const databaseQueryDuration = new promClient.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2],
});

const activeUsersGauge = new promClient.Gauge({
  name: 'active_users_count',
  help: 'Number of active users',
});

// Register custom metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(databaseQueryDuration);
register.registerMetric(activeUsersGauge);

// Express middleware to collect metrics
export const metricsMiddleware = (req: any, res: any, next: any) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  
  res.on('finish', () => {
    end({
      method: req.method,
      route: req.route?.path || req.path,
      code: res.statusCode,
    });
  });
  
  next();
};

// Endpoint to expose metrics
export const metricsEndpoint = async (req: any, res: any) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end(error);
  }
};

export { register, httpRequestDurationMicroseconds, databaseQueryDuration, activeUsersGauge };
```

#### 3. Grafana Dashboards
```json
{
  "dashboard": {
    "title": "Neighborly - Production Dashboard",
    "panels": [
      {
        "title": "HTTP Requests",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_request_duration_seconds_count[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      },
      {
        "title": "Database Performance",
        "type": "graph", 
        "targets": [
          {
            "expr": "rate(database_query_duration_seconds_sum[5m]) / rate(database_query_duration_seconds_count[5m])",
            "legendFormat": "{{operation}} {{table}}"
          }
        ]
      },
      {
        "title": "Active Users",
        "type": "singlestat",
        "targets": [
          {
            "expr": "active_users_count"
          }
        ]
      },
      {
        "title": "Container Resources",
        "type": "row",
        "panels": [
          {
            "title": "CPU Usage",
            "type": "graph",
            "targets": [
              {
                "expr": "sum(rate(container_cpu_usage_seconds_total{container_name=\"backend\"}[5m])) by (pod_name)"
              }
            ]
          },
          {
            "title": "Memory Usage",
            "type": "graph",
            "targets": [
              {
                "expr": "sum(container_memory_working_set_bytes{container_name=\"backend\"}) by (pod_name) / 1024 / 1024"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

### Week 5: Logging & Alerting

#### 1. ELK Stack Configuration
```yaml
# infrastructure/logging/elasticsearch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: elasticsearch
  namespace: logging
spec:
  replicas: 3
  selector:
    matchLabels:
      app: elasticsearch
  template:
    metadata:
      labels:
        app: elasticsearch
    spec:
      containers:
      - name: elasticsearch
        image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
        env:
        - name: discovery.type
          value: single-node
        - name: ES_JAVA_OPTS
          value: "-Xms512m -Xmx512m"
        - name: xpack.security.enabled
          value: "false"
        ports:
        - containerPort: 9200
          name: http
        - containerPort: 9300
          name: transport
        volumeMounts:
        - name: data
          mountPath: /usr/share/elasticsearch/data
      volumes:
      - name: data
        emptyDir: {}
```

#### 2. Structured Logging Setup
```typescript
// backend/src/utils/logger.ts
import pino from 'pino';
import { randomUUID } from 'crypto';

// Create a request ID for tracing
const generateRequestId = () => randomUUID();

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    }
  } : undefined,
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
    bindings: (bindings) => ({
      pid: bindings.pid,
      hostname: bindings.hostname,
      node_version: process.version,
    }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: null, // Remove pid and hostname from log output
});

// Request-specific logger
export const createRequestLogger = (requestId: string) => {
  return logger.child({ requestId });
};

// Application-specific loggers
export const dbLogger = logger.child({ module: 'database' });
export const authLogger = logger.child({ module: 'auth' });
export const paymentLogger = logger.child({ module: 'payment' });

export { logger, generateRequestId };
```

#### 3. Alert Manager Configuration
```yaml
# infrastructure/alerting/alertmanager.yml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@neighborly.app'
  smtp_auth_username: 'alerts@neighborly.app'
  smtp_auth_password: '${SMTP_PASSWORD}'

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 6h
  receiver: 'slack-notifications'
  
  routes:
  - match:
      severity: critical
    receiver: 'pagerduty'
  - match:
      severity: warning
    receiver: 'email-notifications'

receivers:
- name: 'slack-notifications'
  slack_configs:
  - api_url: '${SLACK_WEBHOOK_URL}'
    channel: '#neighborly-alerts'
    title: '{{ .GroupLabels.alertname }}'
    text: '{{ .CommonAnnotations.summary }}'
    
- name: 'pagerduty'
  pagerduty_configs:
  - service_key: '${PAGERDUTY_SERVICE_KEY}'
    description: '{{ .CommonAnnotations.description }}'
    
- name: 'email-notifications'
  email_configs:
  - to: 'devops@neighborly.app'
    from: 'alerts@neighborly.app'
    smarthost: 'smtp.gmail.com:587'
    auth_username: '${SMTP_USERNAME}'
    auth_password: '${SMTP_PASSWORD}'
```

## Phase 4: Security & Compliance (Weeks 6-8)

### Week 6: Security Scanning & Hardening

#### 1. Security Scanning Pipeline
```yaml
# .github/workflows/security-scan.yml
name: Security Scanning

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  sast:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Run SonarQube Scan
      uses: SonarSource/sonarqube-scan-action@v4
      env:
        SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
        SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}

    - name: Run Semgrep
      uses: returntocorp/semgrep-action@v1
      with:
        config: p/security-audit

  dependency-check:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: OWASP Dependency Check
      uses: dependency-check/Dependency-Check_Action@main
      with:
        project: 'Neighborly'
        path: '.'
        format: 'HTML'
        out: 'reports'

    - name: Upload report
      uses: actions/upload-artifact@v3
      with:
        name: dependency-check-report
        path: reports/

  container-scan:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Build Docker image
      run: docker build -t neighborly/backend:scan -f backend/Dockerfile backend/

    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: 'neighborly/backend:scan'
        format: 'sarif'
        output: 'trivy-results.sarif'

    - name: Upload Trivy scan results
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'
```

#### 2. Infrastructure Security Policies
```hcl
# infrastructure/security/iam-policies.tf
resource "aws_iam_policy" "neighborly_ecr_policy" {
  name        = "neighborly-ecr-policy-${var.environment}"
  description = "Policy for Neighborly ECR access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:GetRepositoryPolicy",
          "ecr:DescribeRepositories",
          "ecr:ListImages",
          "ecr:DescribeImages",
          "ecr:BatchGetImage"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "eks_node_ecr" {
  role       = module.eks.node_role_name
  policy_arn = aws_iam_policy.neighborly_ecr_policy.arn
}

# Security Group Rules
resource "aws_security_group_rule" "backend_ingress" {
  type              = "ingress"
  from_port         = 3000
  to_port           = 3000
  protocol          = "tcp"
  cidr_blocks       = ["10.0.0.0/16"]  # Only allow from within VPC
  security_group_id = module.eks.node_security_group_id
}

resource "aws_security_group_rule" "database_ingress" {
  type              = "ingress"
  from_port         = 5432
  to_port           = 5432
  protocol          = "tcp"
  security_group_id = module.database.security_group_id
  source_security_group_id = module.eks.node_security_group_id
}
```

### Week 7-8: Disaster Recovery & Backup Strategy

#### 1. Automated Backup Strategy
```bash
#!/bin/bash
# infrastructure/scripts/backup.sh

set -e

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/neighborly_backup_${TIMESTAMP}.sql.gz"

echo "Starting database backup..."

# Backup PostgreSQL
pg_dump $DATABASE_URL | gzip > $BACKUP_FILE

# Upload to S3
aws s3 cp $BACKUP_FILE s3://${BACKUP_BUCKET}/database/

# Keep only last 7 daily backups locally
find $BACKUP_DIR -name "neighborly_backup_*.sql.gz" -mtime +7 -delete

# Upload Redis backup if needed
redis-cli -u $REDIS_URL --rdb /tmp/dump.rdb
aws s3 cp /tmp/dump.rdb s3://${BACKUP_BUCKET}/redis/dump_${TIMESTAMP}.rdb
rm /tmp/dump.rdb

echo "Backup completed: ${BACKUP_FILE}"
```

#### 2. Disaster Recovery Runbook
```markdown
# Disaster Recovery Runbook

## Database Recovery

### Step 1: Identify the Issue
1. Check CloudWatch alarms for database metrics
2. Verify database connectivity from application logs
3. Check RDS console for instance status

### Step 2: Restore from Backup
```bash
# Stop application traffic
kubectl scale deployment neighborly-backend --replicas=0

# Restore database
aws s3 cp s3://neighborly-backups/database/latest_backup.sql.gz - | \
  gunzip | psql $DATABASE_URL

# Verify data integrity
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"

# Restart application
kubectl scale deployment neighborly-backend --replicas=2
```

### Step 3: Failover to Standby
```bash
# Promote read replica
aws rds promote-read-replica \
  --db-instance-identifier neighborly-db-standby

# Update application configuration
kubectl set env deployment/neighborly-backend \
  DATABASE_URL=postgresql://new-primary-url:5432/neighborly
```

## Application Recovery

### Step 1: Rollback Deployment
```bash
# List previous deployments
kubectl rollout history deployment/neighborly-backend

# Rollback to previous version
kubectl rollout undo deployment/neighborly-backend

# Monitor rollback status
kubectl rollout status deployment/neighborly-backend
```

### Step 2: Scale Resources
```bash
# Increase resources temporarily
kubectl scale deployment neighborly-backend --replicas=5

# Adjust HPA thresholds
kubectl edit hpa neighborly-backend-hpa
```

## Incident Communication Protocol
1. **SEV-1 (Critical)**: Page on-call engineer, notify CTO within 15 minutes
2. **SEV-2 (High)**: Page on-call engineer within 30 minutes
3. **SEV-3 (Medium)**: Address within 4 hours during business hours
4. **SEV-4 (Low)**: Address within next business day
```

## Ready for Engineer Assignment

This comprehensive DevOps implementation plan provides:

### Week 1 Tasks (Ready immediately):
1. ✅ GitHub repository setup with CI/CD pipelines
2. ✅ Docker development environment configuration
3. ✅ Development automation scripts (Makefile, setup scripts)
4. ✅ Local development environment setup

### Weeks 2-3 Tasks:
5. Production infrastructure with Terraform (AWS, VPC, RDS, EKS)
6. Kubernetes deployment configurations
7. Load balancing and auto-scaling setup

### Weeks 4-5 Tasks:
8. Monitoring stack (Prometheus, Grafana, ELK)
9. Application metrics collection and dashboards
10. Alerting and incident management

### Weeks 6-8 Tasks:
11. Security scanning and compliance
12. Backup and disaster recovery strategy
13. Infrastructure hardening and security policies

The DevOps Engineer can start immediately with Day 1 tasks and follow the phased approach to build a robust, scalable, and secure infrastructure for Neighborly.