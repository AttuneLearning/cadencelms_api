# ADR-INFRA-001: Infrastructure Architecture

**Status:** Accepted
**Date:** 2026-01-27
**Domain:** Infrastructure

## Context

CadenceLMS requires a production-ready infrastructure that provides:
- High availability and reliability
- Scalability for growing user base
- Security and compliance (FERPA, GDPR)
- Cost-effective operation
- Observable and maintainable systems
- Disaster recovery capabilities

This ADR establishes the infrastructure architecture for deploying and operating CadenceLMS.

## Decision

### 1. Infrastructure Overview

#### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CADENCELMS INFRASTRUCTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐                                                            │
│  │   Users     │                                                            │
│  │  (Browser)  │                                                            │
│  └──────┬──────┘                                                            │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                   │
│  │ CloudFlare  │────▶│   AWS ALB   │────▶│   AWS ECS   │                   │
│  │    (CDN)    │     │   (Load     │     │  (Fargate)  │                   │
│  │             │     │  Balancer)  │     │             │                   │
│  └─────────────┘     └─────────────┘     └──────┬──────┘                   │
│         │                                        │                          │
│         │                                        │                          │
│         │              ┌─────────────────────────┼─────────────────────┐   │
│         │              │                         │                     │   │
│         │              ▼                         ▼                     ▼   │
│         │       ┌─────────────┐          ┌─────────────┐       ┌─────────┐│
│         │       │  MongoDB    │          │   Redis     │       │   S3    ││
│         │       │   Atlas     │          │ ElastiCache │       │ Content ││
│         │       │  (Cluster)  │          │  (Cluster)  │       │         ││
│         │       └─────────────┘          └─────────────┘       └─────────┘│
│         │                                                            │     │
│         └────────────────────────────────────────────────────────────┘     │
│                            (Static content via CDN)                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. Cloud Provider

**Primary Cloud:** Amazon Web Services (AWS)

#### AWS Services Used

| Service | Purpose | Configuration |
|---------|---------|---------------|
| ECS Fargate | Container orchestration | Serverless containers |
| ALB | Load balancing | Application Load Balancer |
| ECR | Container registry | Docker image storage |
| S3 | Object storage | Content, uploads, backups |
| ElastiCache | Redis caching | Cluster mode enabled |
| CloudWatch | Monitoring & logs | Metrics, alarms, log groups |
| Secrets Manager | Secret storage | API keys, credentials |
| Route 53 | DNS | Domain management |
| ACM | SSL certificates | Managed TLS |
| WAF | Web application firewall | OWASP protection |
| CloudFront | CDN | Content delivery |

**Database:** MongoDB Atlas (Managed)
- Provides automated backups, scaling, and multi-region replication
- Integrates with AWS via VPC peering

### 3. Environment Architecture

#### Environments

| Environment | Purpose | Infrastructure |
|-------------|---------|----------------|
| Development | Local development | Docker Compose |
| Staging | Pre-production testing | Scaled-down production |
| Production | Live system | Full HA deployment |

#### Environment Isolation

```
┌─────────────────────────────────────────────────────────────────┐
│                        AWS ORGANIZATION                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  │  Dev Account     │  │ Staging Account  │  │  Prod Account    │
│  │                  │  │                  │  │                  │
│  │  VPC: 10.0.0.0   │  │  VPC: 10.1.0.0   │  │  VPC: 10.2.0.0   │
│  │                  │  │                  │  │                  │
│  │  - ECS Cluster   │  │  - ECS Cluster   │  │  - ECS Cluster   │
│  │  - Redis (single)│  │  - Redis (single)│  │  - Redis (HA)    │
│  │  - S3 Buckets    │  │  - S3 Buckets    │  │  - S3 Buckets    │
│  │                  │  │                  │  │                  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Container Architecture

#### Docker Configuration

```dockerfile
# API Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Security: non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
```

#### ECS Task Definition

```json
{
  "family": "cadencelms-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::xxx:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::xxx:role/cadencelmsTaskRole",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "xxx.dkr.ecr.us-east-1.amazonaws.com/cadencelms-api:latest",
      "portMappings": [
        { "containerPort": 3000, "protocol": "tcp" }
      ],
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "PORT", "value": "3000" }
      ],
      "secrets": [
        {
          "name": "MONGODB_URI",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:xxx:secret:cadencelms/mongodb"
        },
        {
          "name": "JWT_ACCESS_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:xxx:secret:cadencelms/jwt"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/cadencelms-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "api"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "wget -q -O - http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

### 5. Auto-Scaling

#### Scaling Configuration

```typescript
const scalingConfig = {
  api: {
    minCapacity: 2,
    maxCapacity: 20,
    targetCpuUtilization: 70,
    targetMemoryUtilization: 80,
    scaleInCooldown: 300,   // 5 minutes
    scaleOutCooldown: 60    // 1 minute
  },

  // Scale based on custom metrics
  customMetrics: [
    {
      name: 'RequestsPerTarget',
      targetValue: 1000,
      scaleInCooldown: 300,
      scaleOutCooldown: 60
    },
    {
      name: 'ActiveConnections',
      targetValue: 500,
      scaleInCooldown: 300,
      scaleOutCooldown: 60
    }
  ]
};
```

#### Scaling Events

| Trigger | Action | Threshold |
|---------|--------|-----------|
| CPU > 70% | Scale out | Add 2 tasks |
| CPU < 30% | Scale in | Remove 1 task |
| Memory > 80% | Scale out | Add 2 tasks |
| Requests > 1000/target | Scale out | Add 1 task |
| Error rate > 5% | Alert | No auto-scale |

### 6. Networking

#### VPC Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        VPC: 10.0.0.0/16                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Availability Zone A              Availability Zone B            │
│  ──────────────────              ──────────────────              │
│                                                                  │
│  ┌─────────────────┐            ┌─────────────────┐             │
│  │ Public Subnet   │            │ Public Subnet   │             │
│  │ 10.0.1.0/24     │            │ 10.0.2.0/24     │             │
│  │                 │            │                 │             │
│  │  - NAT Gateway  │            │  - NAT Gateway  │             │
│  │  - ALB          │            │  - ALB          │             │
│  └─────────────────┘            └─────────────────┘             │
│                                                                  │
│  ┌─────────────────┐            ┌─────────────────┐             │
│  │ Private Subnet  │            │ Private Subnet  │             │
│  │ 10.0.10.0/24    │            │ 10.0.20.0/24    │             │
│  │                 │            │                 │             │
│  │  - ECS Tasks    │            │  - ECS Tasks    │             │
│  │  - ElastiCache  │            │  - ElastiCache  │             │
│  └─────────────────┘            └─────────────────┘             │
│                                                                  │
│  ┌─────────────────┐            ┌─────────────────┐             │
│  │ Data Subnet     │            │ Data Subnet     │             │
│  │ 10.0.100.0/24   │            │ 10.0.200.0/24   │             │
│  │                 │            │                 │             │
│  │  - VPC Peering  │            │  - VPC Peering  │             │
│  │    to MongoDB   │            │    to MongoDB   │             │
│  └─────────────────┘            └─────────────────┘             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Security Groups

```typescript
const securityGroups = {
  alb: {
    inbound: [
      { port: 443, source: '0.0.0.0/0', description: 'HTTPS from internet' },
      { port: 80, source: '0.0.0.0/0', description: 'HTTP redirect' }
    ],
    outbound: [
      { port: 3000, destination: 'ecs-sg', description: 'To ECS tasks' }
    ]
  },

  ecs: {
    inbound: [
      { port: 3000, source: 'alb-sg', description: 'From ALB only' }
    ],
    outbound: [
      { port: 443, destination: '0.0.0.0/0', description: 'HTTPS (APIs, Atlas)' },
      { port: 6379, destination: 'redis-sg', description: 'To Redis' }
    ]
  },

  redis: {
    inbound: [
      { port: 6379, source: 'ecs-sg', description: 'From ECS only' }
    ],
    outbound: []
  }
};
```

### 7. Database Architecture

#### MongoDB Atlas Configuration

```typescript
const mongoAtlasConfig = {
  cluster: {
    name: 'cadencelms-prod',
    tier: 'M30',                    // Production tier
    provider: 'AWS',
    region: 'US_EAST_1',
    replicationFactor: 3,           // 3-node replica set

    // Auto-scaling
    autoScaling: {
      compute: {
        enabled: true,
        scaleDownEnabled: true,
        minInstanceSize: 'M30',
        maxInstanceSize: 'M60'
      },
      diskGB: {
        enabled: true
      }
    },

    // Backup
    backup: {
      enabled: true,
      frequencyInterval: 6,         // Every 6 hours
      retentionDays: 7,
      pointInTimeRecovery: true
    }
  },

  // Network peering with AWS VPC
  networkPeering: {
    awsAccountId: 'xxx',
    vpcId: 'vpc-xxx',
    vpcCidr: '10.0.0.0/16',
    region: 'us-east-1'
  },

  // Connection settings
  connection: {
    maxPoolSize: 100,
    minPoolSize: 10,
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 5000,
    retryWrites: true,
    w: 'majority'
  }
};
```

#### Redis ElastiCache Configuration

```typescript
const redisConfig = {
  production: {
    clusterMode: true,
    nodeType: 'cache.r6g.large',
    numNodeGroups: 2,               // Shards
    replicasPerNodeGroup: 1,        // 1 replica per shard
    automaticFailover: true,
    multiAZ: true,
    transitEncryption: true,
    atRestEncryption: true,

    // Maintenance
    maintenanceWindow: 'sun:05:00-sun:06:00',
    snapshotWindow: '03:00-04:00',
    snapshotRetentionLimit: 7
  },

  staging: {
    clusterMode: false,
    nodeType: 'cache.t3.small',
    numCacheClusters: 1,
    automaticFailover: false
  }
};
```

### 8. CI/CD Pipeline

#### Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CI/CD PIPELINE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐    │
│  │  GitHub  │──▶│  GitHub  │──▶│   Build  │──▶│   Test   │    │
│  │   Push   │   │ Actions  │   │  Docker  │   │  Suite   │    │
│  └──────────┘   └──────────┘   └──────────┘   └────┬─────┘    │
│                                                      │          │
│                                    ┌─────────────────┤          │
│                                    │                 │          │
│                                    ▼                 ▼          │
│                             ┌──────────┐      ┌──────────┐     │
│                             │  Push    │      │  Push    │     │
│                             │  to ECR  │      │  to ECR  │     │
│                             │ (staging)│      │  (prod)  │     │
│                             └────┬─────┘      └────┬─────┘     │
│                                  │                 │           │
│                                  ▼                 ▼           │
│                             ┌──────────┐      ┌──────────┐     │
│                             │  Deploy  │      │  Deploy  │     │
│                             │ Staging  │      │   Prod   │     │
│                             │  (auto)  │      │ (manual) │     │
│                             └──────────┘      └──────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: cadencelms-api

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run test:unit
      - run: npm run test:integration

  build:
    needs: test
    runs-on: ubuntu-latest
    outputs:
      image: ${{ steps.build.outputs.image }}
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push
        id: build
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT

  deploy-staging:
    if: github.ref == 'refs/heads/develop'
    needs: build
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Deploy to ECS Staging
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: task-definition-staging.json
          service: cadencelms-api-staging
          cluster: cadencelms-staging
          wait-for-service-stability: true

  deploy-production:
    if: github.ref == 'refs/heads/main'
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy to ECS Production
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: task-definition-prod.json
          service: cadencelms-api-prod
          cluster: cadencelms-prod
          wait-for-service-stability: true
```

### 9. Monitoring & Observability

#### Monitoring Stack

| Component | Tool | Purpose |
|-----------|------|---------|
| Metrics | CloudWatch | Infrastructure metrics |
| APM | DataDog / New Relic | Application performance |
| Logs | CloudWatch Logs | Centralized logging |
| Tracing | X-Ray | Distributed tracing |
| Alerts | CloudWatch Alarms | Incident notification |
| Dashboards | Grafana / CloudWatch | Visualization |

#### Key Metrics

```typescript
const criticalMetrics = {
  // Application
  'api.request_count': { threshold: null, alertOn: 'anomaly' },
  'api.error_rate': { threshold: 5, alertOn: 'above' },
  'api.latency_p99': { threshold: 2000, alertOn: 'above' },

  // Infrastructure
  'ecs.cpu_utilization': { threshold: 85, alertOn: 'above' },
  'ecs.memory_utilization': { threshold: 90, alertOn: 'above' },
  'ecs.running_tasks': { threshold: 2, alertOn: 'below' },

  // Database
  'mongodb.connections': { threshold: 500, alertOn: 'above' },
  'mongodb.query_time_p99': { threshold: 100, alertOn: 'above' },
  'mongodb.disk_usage': { threshold: 80, alertOn: 'above' },

  // Cache
  'redis.memory_usage': { threshold: 80, alertOn: 'above' },
  'redis.cache_hit_rate': { threshold: 70, alertOn: 'below' },
  'redis.evictions': { threshold: 1000, alertOn: 'above' }
};
```

#### Alert Escalation

| Severity | Response Time | Notification |
|----------|---------------|--------------|
| Critical | 5 minutes | PagerDuty + Slack |
| High | 15 minutes | Slack + Email |
| Medium | 1 hour | Email |
| Low | Next business day | Dashboard only |

### 10. Disaster Recovery

#### Backup Strategy

| Component | Backup Frequency | Retention | Recovery Time |
|-----------|-----------------|-----------|---------------|
| MongoDB | Continuous (PITR) | 7 days | < 1 hour |
| Redis | Daily snapshot | 7 days | < 30 minutes |
| S3 Content | Cross-region replication | Indefinite | < 1 hour |
| Secrets | Versioned | 30 days | < 5 minutes |

#### Recovery Procedures

```typescript
const disasterRecoveryPlan = {
  // RTO: Recovery Time Objective
  // RPO: Recovery Point Objective

  scenarios: {
    singleInstanceFailure: {
      rto: '5 minutes',
      rpo: '0',
      procedure: 'Auto-healed by ECS service'
    },

    availabilityZoneFailure: {
      rto: '15 minutes',
      rpo: '0',
      procedure: 'Auto-failover to healthy AZ'
    },

    regionFailure: {
      rto: '4 hours',
      rpo: '1 hour',
      procedure: [
        '1. Promote MongoDB secondary in DR region',
        '2. Update DNS to DR region ALB',
        '3. Deploy ECS services in DR region',
        '4. Restore S3 from cross-region replica'
      ]
    },

    databaseCorruption: {
      rto: '2 hours',
      rpo: '6 hours',
      procedure: [
        '1. Identify corruption timestamp',
        '2. Restore from point-in-time backup',
        '3. Replay operations from audit log if needed'
      ]
    }
  }
};
```

#### Multi-Region Architecture (Future)

```
┌─────────────────────────────────────────────────────────────────┐
│                    MULTI-REGION (FUTURE)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│     US-EAST-1 (Primary)              US-WEST-2 (DR)             │
│     ─────────────────                ────────────────            │
│                                                                  │
│     ┌─────────────┐                  ┌─────────────┐            │
│     │ ECS Cluster │                  │ ECS Cluster │            │
│     │   (Active)  │                  │  (Standby)  │            │
│     └─────────────┘                  └─────────────┘            │
│                                                                  │
│     ┌─────────────┐    Replication   ┌─────────────┐            │
│     │  MongoDB    │─────────────────▶│  MongoDB    │            │
│     │  (Primary)  │                  │ (Secondary) │            │
│     └─────────────┘                  └─────────────┘            │
│                                                                  │
│     ┌─────────────┐    Replication   ┌─────────────┐            │
│     │     S3      │─────────────────▶│     S3      │            │
│     │  (Source)   │                  │  (Replica)  │            │
│     └─────────────┘                  └─────────────┘            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 11. Cost Optimization

#### Cost Breakdown (Estimated Monthly)

| Service | Staging | Production | Notes |
|---------|---------|------------|-------|
| ECS Fargate | $50 | $300 | 2-10 tasks |
| MongoDB Atlas | $60 | $300 | M10 / M30 |
| ElastiCache | $30 | $150 | t3.small / r6g.large |
| S3 | $20 | $100 | Storage + transfer |
| CloudFront | $10 | $100 | Bandwidth |
| ALB | $20 | $40 | Fixed + LCU |
| CloudWatch | $20 | $50 | Logs + metrics |
| **Total** | **~$210** | **~$1,040** | |

#### Cost Optimization Strategies

1. **Reserved Capacity**: Commit to 1-year reserved instances for predictable workloads
2. **Spot Instances**: Use for non-critical batch processing
3. **Right-sizing**: Monitor and adjust instance sizes quarterly
4. **S3 Lifecycle**: Move old content to Glacier
5. **Log Retention**: Limit CloudWatch log retention (30 days default)

## Consequences

### Positive
- High availability with multi-AZ deployment
- Automatic scaling handles traffic spikes
- Managed services reduce operational burden
- Clear separation of environments
- Comprehensive monitoring and alerting

### Negative
- AWS vendor lock-in
- Monthly costs scale with usage
- Complex networking configuration
- Learning curve for team

### Neutral
- Container-based deployment is industry standard
- MongoDB Atlas vs self-managed trade-off
- CI/CD requires initial setup effort

## Alternatives Considered

### Kubernetes (EKS)
- **Deferred**: ECS Fargate is simpler for current team size; may revisit at scale.

### Google Cloud Platform
- **Rejected**: Team has more AWS experience; no compelling GCP advantage.

### Self-Managed MongoDB
- **Rejected**: Atlas provides better reliability and reduces operational burden.

### Heroku
- **Rejected**: Less control, higher costs at scale, limited customization.

## Implementation Notes

### Terraform Modules

```hcl
# Infrastructure as Code structure
terraform/
├── modules/
│   ├── vpc/
│   ├── ecs/
│   ├── alb/
│   ├── elasticache/
│   └── s3/
├── environments/
│   ├── staging/
│   │   └── main.tf
│   └── production/
│       └── main.tf
└── shared/
    └── ecr.tf
```

### Required AWS Permissions

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecs:*",
        "ecr:*",
        "elasticache:*",
        "s3:*",
        "cloudwatch:*",
        "logs:*",
        "secretsmanager:GetSecretValue",
        "iam:PassRole"
      ],
      "Resource": "*"
    }
  ]
}
```

## Links

- Decision log: [[../decision-log]]
- Related ADRs:
  - [[ADR-CONTENT-001-CONTENT-DELIVERY-ARCHITECTURE]] (S3, CDN)
  - [[ADR-API-002-API-CACHING-STRATEGY]] (Redis configuration)
  - [[ADR-SEC-001-SECURITY-ARCHITECTURE]] (security groups, secrets)
  - [[ADR-DATA-001-DATA-ARCHITECTURE]] (MongoDB configuration)
- References:
  - [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
  - [ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
  - [MongoDB Atlas on AWS](https://www.mongodb.com/cloud/atlas/aws)
