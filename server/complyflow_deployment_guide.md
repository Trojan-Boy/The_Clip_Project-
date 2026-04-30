# ComplyFlow Deployment Guide

## Overview
This guide provides instructions for deploying the ComplyFlow platform to production environments.

## Prerequisites
- Docker 20.10.0 or higher
- Kubernetes 1.20 or higher (for containerized deployments)
- 4GB RAM minimum per node
- 2 CPU cores minimum per node

## Local Development Setup

1. Clone the repository
2. Install dependencies with `npm install`
3. Run database migrations with `npm run migrate`
4. Start the development server with `npm run dev`

## Production Deployment

### Using Docker
```
docker build -t complyflow:latest .
docker run -d -p 8080:8080 complyflow:latest
```

### Using Kubernetes
1. Apply the deployment manifest:
   `kubectl apply -f k8s/deployment.yaml`
2. Expose the service:
   `kubectl expose deployment complyflow --type=LoadBalancer --port=8080`

## Environment Variables
- `DATABASE_URL` - Connection string for PostgreSQL
- `JWT_SECRET` - Secret for JWT token generation
- `LOG_LEVEL` - Logging level (debug, info, warn, error)
- `REDIS_URL` - Connection string for Redis cache

## Monitoring
The platform includes built-in monitoring at `/metrics` endpoint.

## Backup Strategy
- Daily database backups to S3-compatible storage
- Weekly snapshot backups of application data
- Automatic recovery procedures in case of failure