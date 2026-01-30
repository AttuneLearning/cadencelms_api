# LMS API V2 - Deployment Guide

**Version:** 2.0.0  
**Last Updated:** January 7, 2026  

---

## Table of Contents

1. [Overview](#overview)
2. [System Requirements](#system-requirements)
3. [Pre-Deployment Setup](#pre-deployment-setup)
4. [Deployment Methods](#deployment-methods)
5. [Environment Configuration](#environment-configuration)
6. [Database Setup](#database-setup)
7. [Application Deployment](#application-deployment)
8. [Monitoring & Logging](#monitoring--logging)
9. [Backup & Recovery](#backup--recovery)
10. [Security Hardening](#security-hardening)
11. [Scaling Strategies](#scaling-strategies)
12. [Troubleshooting](#troubleshooting)

---

## Overview

This guide covers deploying the LMS API V2 to production environments. The application is designed to run on Linux servers with Node.js and MongoDB.

### Architecture Summary

```
┌────────────────────────────────────────────┐
│         Load Balancer (nginx)              │
│         SSL Termination                    │
└──────────┬──────────────────┬──────────────┘
           │                  │
┌──────────▼─────────┐  ┌────▼──────────────┐
│  App Server 1      │  │  App Server 2     │
│  (PM2 Cluster)     │  │  (PM2 Cluster)    │
│  - Node.js         │  │  - Node.js        │
│  - 4 Workers       │  │  - 4 Workers      │
└──────────┬─────────┘  └────┬──────────────┘
           │                  │
           └────────┬─────────┘
                    │
         ┌──────────▼──────────────┐
         │   MongoDB Replica Set   │
         │   - Primary             │
         │   - Secondary (2)       │
         └─────────────────────────┘
```

---

## System Requirements

### Minimum Requirements (Small Deployment)

- **CPU:** 2 cores
- **RAM:** 4 GB
- **Storage:** 20 GB SSD
- **OS:** Ubuntu 22.04 LTS / Debian 11+
- **Network:** 1 Gbps
- **Concurrent Users:** ~100

### Recommended Requirements (Production)

- **CPU:** 4+ cores
- **RAM:** 8+ GB
- **Storage:** 50+ GB SSD
- **OS:** Ubuntu 22.04 LTS
- **Network:** 10 Gbps
- **Concurrent Users:** ~1000+

### Software Dependencies

| Component | Version | Purpose |
|-----------|---------|---------|
| Node.js | >= 18.x LTS | Runtime |
| MongoDB | >= 6.0 | Database |
| Redis | >= 7.0 (optional) | Caching |
| nginx | >= 1.20 | Reverse proxy |
| PM2 | >= 5.x | Process manager |
| Git | >= 2.30 | Version control |

---

## Pre-Deployment Setup

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB 6.0
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org

# Install nginx
sudo apt install -y nginx

# Install PM2 globally
sudo npm install -g pm2

# Install Git
sudo apt install -y git

# Install build tools (for native modules)
sudo apt install -y build-essential python3
```

### 2. Create Application User

```bash
# Create dedicated user (security best practice)
sudo useradd -m -s /bin/bash lmsapi
sudo usermod -aG sudo lmsapi

# Switch to application user
sudo su - lmsapi
```

### 3. Directory Structure

```bash
# Create application directories
mkdir -p ~/lms-api/{app,logs,uploads,backups}
cd ~/lms-api/app
```

---

## Deployment Methods

### Method 1: Git Clone (Recommended for Development)

```bash
# Clone repository
cd ~/lms-api/app
git clone <repository-url> .

# Install dependencies
npm install --production

# Build TypeScript
npm run build

# Verify build
ls -la dist/
```

### Method 2: Pre-built Package (Recommended for Production)

```bash
# On build server:
npm run build
tar -czf lms-api-v2.0.0.tar.gz dist/ node_modules/ package.json ecosystem.config.js

# On production server:
cd ~/lms-api/app
wget https://releases.example.com/lms-api-v2.0.0.tar.gz
tar -xzf lms-api-v2.0.0.tar.gz
```

### Method 3: CI/CD Pipeline (Recommended for Enterprise)

```yaml
# .github/workflows/deploy.yml (GitHub Actions example)
name: Deploy to Production

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
      
      - name: Deploy to server
        uses: appleboy/scp-action@master
        with:
          host: ${{ secrets.PROD_HOST }}
          username: lmsapi
          key: ${{ secrets.SSH_KEY }}
          source: "dist/,node_modules/,package.json,ecosystem.config.js"
          target: "~/lms-api/app"
      
      - name: Restart application
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.PROD_HOST }}
          username: lmsapi
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd ~/lms-api/app
            pm2 reload ecosystem.config.js --env production
```

---

## Environment Configuration

### Production Environment File

Create `/home/lmsapi/lms-api/app/.env.production`:

```bash
# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database
MONGODB_URI=mongodb://localhost:27017/lms_production?replicaSet=rs0
MONGODB_URI_TEST=mongodb://localhost:27017/lms_test

# Security - JWT (CRITICAL: Generate strong secrets)
JWT_SECRET=<generate-with-openssl-rand-base64-64>
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Password Reset
PASSWORD_RESET_EXPIRATION=1h
PASSWORD_RESET_URL=https://lms.example.com/reset-password

# Email Configuration
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<sendgrid-api-key>
EMAIL_FROM=noreply@lms.example.com

# Redis (Optional - for caching and sessions)
REDIS_URL=redis://localhost:6379

# File Upload
MAX_FILE_SIZE=52428800  # 50MB
UPLOAD_DIR=/home/lmsapi/lms-api/uploads

# CORS
ALLOWED_ORIGINS=https://lms.example.com,https://admin.lms.example.com

# Logging
LOG_LEVEL=info
LOG_FILE=/home/lmsapi/lms-api/logs/application.log

# Rate Limiting
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX_REQUESTS=100

# Session
SESSION_SECRET=<generate-with-openssl-rand-base64-64>
SESSION_EXPIRATION=86400  # 24 hours
```

### Generate Secrets

```bash
# Generate JWT secret
openssl rand -base64 64

# Generate session secret
openssl rand -base64 64
```

### PM2 Ecosystem Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'lms-api',
    script: './dist/server.js',
    instances: 'max',  // Use all CPU cores
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/home/lmsapi/lms-api/logs/pm2-error.log',
    out_file: '/home/lmsapi/lms-api/logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

---

## Database Setup

### 1. MongoDB Configuration

Edit `/etc/mongod.conf`:

```yaml
# Network interfaces
net:
  port: 27017
  bindIp: 127.0.0.1

# Storage
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true
  wiredTiger:
    engineConfig:
      cacheSizeGB: 2  # Adjust based on RAM

# Replication (for production)
replication:
  replSetName: "rs0"

# Security
security:
  authorization: enabled
```

### 2. Enable MongoDB Authentication

```bash
# Start MongoDB
sudo systemctl start mongod

# Create admin user
mongosh
> use admin
> db.createUser({
    user: "admin",
    pwd: "SecurePassword123!",
    roles: ["root"]
  })

> use lms_production
> db.createUser({
    user: "lmsapi",
    pwd: "LmsApiPassword123!",
    roles: [
      { role: "readWrite", db: "lms_production" }
    ]
  })

> exit
```

### 3. Initialize Replica Set (Production)

```bash
mongosh -u admin -p SecurePassword123! --authenticationDatabase admin

> rs.initiate({
    _id: "rs0",
    members: [
      { _id: 0, host: "localhost:27017" }
    ]
  })

> rs.status()
```

### 4. Update Connection String

Update `.env.production`:

```bash
MONGODB_URI=mongodb://lmsapi:LmsApiPassword123!@localhost:27017/lms_production?authSource=lms_production&replicaSet=rs0
```

### 5. Run Migrations

```bash
cd ~/lms-api/app
npm run migrate
```

### 6. Create Indexes

Indexes are automatically created by Mongoose models on startup, but you can manually verify:

```bash
mongosh -u lmsapi -p LmsApiPassword123! --authenticationDatabase lms_production lms_production

> db.courses.getIndexes()
> db.enrollments.getIndexes()
# ... verify all collections
```

---

## Application Deployment

### 1. Initial Deployment

```bash
cd ~/lms-api/app

# Install dependencies (if not already done)
npm install --production

# Build TypeScript
npm run build

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 process list
pm2 save

# Setup PM2 startup script
pm2 startup
# Follow the instructions to enable PM2 on system boot
```

### 2. Verify Deployment

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs lms-api --lines 50

# Monitor real-time
pm2 monit

# Test API endpoint
curl http://localhost:3000/health
```

### 3. Configure nginx Reverse Proxy

Create `/etc/nginx/sites-available/lms-api`:

```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

upstream lms_api {
    least_conn;
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    # Add more servers for load balancing:
    # server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name api.lms.example.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.lms.example.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.lms.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.lms.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Logging
    access_log /var/log/nginx/lms-api-access.log;
    error_log /var/log/nginx/lms-api-error.log;
    
    # Client body size (for file uploads)
    client_max_body_size 50M;
    
    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    
    location / {
        # Rate limiting
        limit_req zone=api_limit burst=20 nodelay;
        
        # Proxy to Node.js application
        proxy_pass http://lms_api;
        proxy_http_version 1.1;
        
        # Headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_cache_bypass $http_upgrade;
    }
    
    # Static files (if served by nginx)
    location /uploads {
        alias /home/lmsapi/lms-api/uploads;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Health check endpoint (no rate limiting)
    location /health {
        proxy_pass http://lms_api;
        access_log off;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/lms-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.lms.example.com

# Auto-renewal (already configured by certbot)
sudo certbot renew --dry-run
```

---

## Monitoring & Logging

### 1. Application Logging

The application uses Winston for logging. Logs are written to:

- **Console:** Development mode
- **File:** `/home/lmsapi/lms-api/logs/application.log`
- **Error File:** `/home/lmsapi/lms-api/logs/error.log`

### 2. PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# View logs
pm2 logs lms-api

# Metrics
pm2 show lms-api

# PM2 Web Dashboard (optional)
pm2 install pm2-server-monit
```

### 3. Log Rotation

Create `/etc/logrotate.d/lms-api`:

```bash
/home/lmsapi/lms-api/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 lmsapi lmsapi
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 4. Health Monitoring Script

Create `~/lms-api/scripts/health-check.sh`:

```bash
#!/bin/bash

# Health check endpoint
HEALTH_URL="http://localhost:3000/health"
SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# Check health
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $HTTP_CODE -ne 200 ]; then
    # Send alert
    curl -X POST $SLACK_WEBHOOK \
        -H 'Content-Type: application/json' \
        -d "{\"text\":\"🚨 LMS API Health Check Failed (HTTP $HTTP_CODE)\"}"
    
    # Log
    echo "$(date): Health check failed (HTTP $HTTP_CODE)" >> ~/lms-api/logs/health-check.log
    
    # Restart application
    pm2 restart lms-api
fi
```

Add to crontab:

```bash
crontab -e
# Add line:
*/5 * * * * /home/lmsapi/lms-api/scripts/health-check.sh
```

---

## Backup & Recovery

### 1. Automated MongoDB Backups

Create `~/lms-api/scripts/backup-database.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/home/lmsapi/lms-api/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="lms_backup_$TIMESTAMP"

# Create backup
mongodump \
    --uri="mongodb://lmsapi:LmsApiPassword123!@localhost:27017/lms_production?authSource=lms_production" \
    --out="$BACKUP_DIR/$BACKUP_NAME"

# Compress
cd $BACKUP_DIR
tar -czf "$BACKUP_NAME.tar.gz" $BACKUP_NAME
rm -rf $BACKUP_NAME

# Keep only last 7 days
find $BACKUP_DIR -name "lms_backup_*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_NAME.tar.gz"
```

Add to crontab (daily at 2 AM):

```bash
0 2 * * * /home/lmsapi/lms-api/scripts/backup-database.sh
```

### 2. Restore Database

```bash
# Extract backup
cd ~/lms-api/backups
tar -xzf lms_backup_20260107_020000.tar.gz

# Restore
mongorestore \
    --uri="mongodb://lmsapi:LmsApiPassword123!@localhost:27017/lms_production?authSource=lms_production" \
    --drop \
    lms_backup_20260107_020000/lms_production
```

### 3. Backup Uploads Directory

```bash
# Create backup script
#!/bin/bash
UPLOAD_DIR="/home/lmsapi/lms-api/uploads"
BACKUP_DIR="/home/lmsapi/lms-api/backups/uploads"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

tar -czf "$BACKUP_DIR/uploads_$TIMESTAMP.tar.gz" -C $UPLOAD_DIR .

# Keep only last 7 days
find $BACKUP_DIR -name "uploads_*.tar.gz" -mtime +7 -delete
```

---

## Security Hardening

### 1. Firewall Configuration

```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS (nginx)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# MongoDB (only from localhost)
sudo ufw deny 27017/tcp

# Verify
sudo ufw status
```

### 2. Fail2Ban (Prevent Brute Force)

```bash
# Install
sudo apt install -y fail2ban

# Configure for nginx
sudo nano /etc/fail2ban/jail.local
```

Add:

```ini
[nginx-req-limit]
enabled = true
filter = nginx-req-limit
logpath = /var/log/nginx/lms-api-error.log
maxretry = 5
findtime = 60
bantime = 3600
```

### 3. Application Security Checklist

- [ ] Strong JWT secrets (64+ characters)
- [ ] HTTPS only (SSL/TLS)
- [ ] Rate limiting enabled
- [ ] CORS configured correctly
- [ ] MongoDB authentication enabled
- [ ] File upload validation
- [ ] Input validation (all endpoints)
- [ ] SQL injection prevention (using Mongoose)
- [ ] XSS protection headers
- [ ] CSRF protection (for forms)
- [ ] Audit logging enabled

---

## Scaling Strategies

### Vertical Scaling (Single Server)

```javascript
// Increase PM2 instances
module.exports = {
  apps: [{
    name: 'lms-api',
    script: './dist/server.js',
    instances: 8,  // Increase based on CPU cores
    exec_mode: 'cluster',
    max_memory_restart: '2G'  // Increase memory limit
  }]
};
```

### Horizontal Scaling (Multiple Servers)

```nginx
# Load balancer configuration
upstream lms_api {
    least_conn;
    server 10.0.1.10:3000 max_fails=3 fail_timeout=30s;
    server 10.0.1.11:3000 max_fails=3 fail_timeout=30s;
    server 10.0.1.12:3000 max_fails=3 fail_timeout=30s;
}
```

### MongoDB Replica Set (High Availability)

```bash
# Initialize 3-node replica set
rs.initiate({
    _id: "rs0",
    members: [
      { _id: 0, host: "mongodb1.example.com:27017", priority: 2 },
      { _id: 1, host: "mongodb2.example.com:27017", priority: 1 },
      { _id: 2, host: "mongodb3.example.com:27017", priority: 1 }
    ]
  })
```

Update connection string:

```bash
MONGODB_URI=mongodb://lmsapi:pass@mongodb1.example.com:27017,mongodb2.example.com:27017,mongodb3.example.com:27017/lms_production?authSource=lms_production&replicaSet=rs0
```

### Redis for Session/Cache (Optional)

```bash
# Install Redis
sudo apt install -y redis-server

# Configure for production
sudo nano /etc/redis/redis.conf
# Set: maxmemory 512mb
# Set: maxmemory-policy allkeys-lru

# Restart
sudo systemctl restart redis
```

---

## Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs lms-api --err

# Check MongoDB connection
mongosh -u lmsapi -p <password> --authenticationDatabase lms_production lms_production

# Verify environment variables
pm2 show lms-api

# Check port availability
sudo netstat -tlnp | grep 3000
```

### High Memory Usage

```bash
# Monitor PM2
pm2 monit

# Check for memory leaks
pm2 show lms-api

# Reduce instances or increase max_memory_restart
pm2 delete lms-api
pm2 start ecosystem.config.js --env production
```

### Slow Database Queries

```bash
# Enable MongoDB profiling
mongosh lms_production
> db.setProfilingLevel(1, { slowms: 100 })

# Check slow queries
> db.system.profile.find().sort({ts:-1}).limit(5)

# Create missing indexes
> db.courses.createIndex({ department: 1, status: 1 })
```

### nginx 502 Bad Gateway

```bash
# Check if application is running
pm2 status

# Check nginx error logs
sudo tail -f /var/log/nginx/lms-api-error.log

# Verify upstream configuration
sudo nginx -t

# Check firewall
sudo ufw status
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing (npm test)
- [ ] Security audit (npm audit)
- [ ] Environment variables configured
- [ ] SSL certificate obtained
- [ ] Database backup created
- [ ] Migration scripts tested
- [ ] Team notified

### Deployment

- [ ] Deploy code to server
- [ ] Run migrations
- [ ] Start application with PM2
- [ ] Configure nginx
- [ ] Test API endpoints
- [ ] Verify SSL/HTTPS
- [ ] Check logs for errors

### Post-Deployment

- [ ] Monitor application health
- [ ] Check error rates
- [ ] Verify database performance
- [ ] Test critical user flows
- [ ] Update documentation
- [ ] Tag release in Git

---

## Support & Maintenance

### Regular Maintenance Tasks

**Daily:**
- Monitor error logs
- Check disk space
- Verify backups

**Weekly:**
- Review application metrics
- Check for security updates
- Analyze slow queries

**Monthly:**
- Update dependencies (npm update)
- Review and optimize indexes
- Audit user permissions
- Clean up old logs and backups

### Getting Help

- **Documentation:** `/devdocs/`
- **API Docs:** `https://api.lms.example.com/api-docs`
- **Issues:** GitHub Issues
- **Email:** devops@example.com

---

**Version:** 2.0.0  
**Last Updated:** January 7, 2026  
**Maintained By:** DevOps Team
