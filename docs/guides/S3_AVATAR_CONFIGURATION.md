# S3/Spaces/CDN Avatar Configuration

> **Purpose:** Configuration guide for avatar storage in test/production environments  
> **Created:** 2026-01-12  
> **Status:** Configuration required before profile feature deployment

---

## Overview

Avatar storage uses different backends based on environment:

| Environment | Storage | Notes |
|-------------|---------|-------|
| Development | localStorage | Browser-side only, no server storage |
| Test | S3/Spaces | Same infrastructure as system assets |
| Production | S3/Spaces + CDN | Same infrastructure, CDN for delivery |

---

## Directory Structure

Avatars are stored in the same bucket as system assets but in a separate directory:

```
{bucket}/
├── system/           # Existing system assets
│   ├── logos/
│   ├── images/
│   └── ...
└── avatars/          # NEW: User avatars
    └── {userId}/
        ├── original.{ext}    # Original upload
        ├── thumb_64.webp     # 64x64 thumbnail
        ├── thumb_128.webp    # 128x128 thumbnail
        └── avatar_256.webp   # 256x256 display size
```

---

## Environment Variables

Add these to `.env` files for test/production:

```bash
# Avatar Storage Configuration
AVATAR_STORAGE_ENABLED=true
AVATAR_STORAGE_TYPE=s3              # 's3' | 'spaces' | 'local'
AVATAR_BUCKET_NAME=your-bucket-name
AVATAR_DIRECTORY=avatars            # Directory within bucket
AVATAR_MAX_SIZE_MB=5                # Maximum upload size
AVATAR_ALLOWED_TYPES=image/jpeg,image/png,image/webp,image/gif

# S3/Spaces Connection (use existing system credentials)
# These should already exist for system asset storage:
# AWS_ACCESS_KEY_ID=xxx
# AWS_SECRET_ACCESS_KEY=xxx
# AWS_REGION=us-east-1
# AWS_S3_BUCKET=your-bucket-name

# For DigitalOcean Spaces:
# SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
# SPACES_ACCESS_KEY=xxx
# SPACES_SECRET_KEY=xxx

# CDN Configuration (Production only)
AVATAR_CDN_ENABLED=true
AVATAR_CDN_URL=https://cdn.yourdomain.com/avatars
```

---

## S3 Bucket Policy

Add avatar directory to existing bucket policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AvatarPublicRead",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/avatars/*"
    }
  ]
}
```

---

## CORS Configuration

Ensure CORS allows avatar uploads from your domains:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "https://yourdomain.com",
        "https://test.yourdomain.com",
        "http://localhost:3000"
      ],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

---

## IAM Policy for API Server

The API server needs these permissions on the avatar directory:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name/avatars/*",
        "arn:aws:s3:::your-bucket-name"
      ]
    }
  ]
}
```

---

## Image Processing

Avatars are processed server-side before storage:

1. **Validation:**
   - File type check (MIME type)
   - File size check (max 5MB default)
   - Image dimensions check (min 64x64, max 4096x4096)

2. **Processing:**
   - Convert to WebP format (better compression)
   - Generate thumbnails: 64x64, 128x128, 256x256
   - Strip EXIF metadata (privacy)
   - Optimize quality (80% for display, 60% for thumbnails)

3. **Storage:**
   - Upload all sizes to S3
   - Store URLs in user profile
   - Delete old avatars on update

---

## API Endpoints (To Be Implemented)

```typescript
// Upload avatar
POST /api/v2/users/me/avatar
Content-Type: multipart/form-data
Body: { avatar: File }
Response: { 
  success: true, 
  data: { 
    urls: { 
      original: string,
      thumb64: string,
      thumb128: string,
      avatar256: string 
    }
  }
}

// Delete avatar
DELETE /api/v2/users/me/avatar
Response: { success: true }

// Get avatar URL (optional, usually from profile)
GET /api/v2/users/me/avatar
Response: { success: true, data: { url: string } }
```

---

## Development Mode (localStorage)

In development, avatars are stored client-side:

```typescript
// UI stores avatar as base64 in localStorage
localStorage.setItem('dev_avatar', base64ImageData);

// API endpoint returns mock response
POST /api/v2/users/me/avatar → { success: true, data: { urls: { avatar256: 'data:image/...' } } }
```

This allows UI development without S3 configuration.

---

## Deployment Checklist

Before deploying profile feature:

- [ ] S3/Spaces bucket configured
- [ ] Avatar directory created
- [ ] Bucket policy updated
- [ ] CORS configured
- [ ] IAM permissions granted
- [ ] Environment variables set
- [ ] CDN configured (production)
- [ ] Test upload/download from API server
- [ ] Verify public read access to avatars
- [ ] Image processing library installed (sharp)

---

## Dependencies

```bash
# Image processing
npm install sharp

# S3 SDK (should already exist)
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

---

## Related Files

- `src/services/avatar/avatar.service.ts` - Avatar upload/processing (to be created)
- `src/controllers/avatar.controller.ts` - Avatar endpoints (to be created)
- `src/config/storage.config.ts` - Storage configuration (to be created)
- `.env.example` - Environment variable templates

---

## Security Notes

1. **File Validation:** Always validate file type server-side, not just client-side
2. **Size Limits:** Enforce max file size to prevent DoS
3. **Virus Scanning:** Consider adding virus scanning for uploads in production
4. **Rate Limiting:** Limit avatar upload frequency per user
5. **Signed URLs:** Consider using signed URLs for upload (presigned POST)
6. **Content-Type:** Set proper Content-Type headers on stored files
