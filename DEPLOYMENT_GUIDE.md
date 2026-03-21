# JalSaathi Deployment Guide

## Overview

Your project uses **AWS CDK** to deploy:
- **Frontend**: S3 + CloudFront (CDN)
- **Backend**: Lambda + API Gateway
- **Database**: MongoDB (external)
- **Payments**: Cashfree integration

## Pre-Deployment Checklist

### 1. AWS Credentials Setup
```powershell
# Verify AWS credentials are configured
aws sts get-caller-identity
```

### 2. Required Environment Variables
Copy `.env.example` to `.env` and fill in all required values:

```powershell
# Power Shell - Set environment variables
$env:MONGODB_URI = "mongodb+srv://..."
$env:JWT_SECRET = "your-secret-key"
$env:EMAIL_USER = "your-email@gmail.com"
$env:EMAIL_PASS = "your-app-specific-password"
$env:CASHFREE_APP_ID = "your-app-id"
$env:CASHFREE_SECRET_KEY = "your-secret-key"
```

Or for **Bash/WSL**:
```bash
export MONGODB_URI="mongodb+srv://..."
export JWT_SECRET="your-secret-key"
export EMAIL_USER="your-email@gmail.com"
export EMAIL_PASS="your-app-specific-password"
export CASHFREE_APP_ID="your-app-id"
export CASHFREE_SECRET_KEY="your-secret-key"
```

### 3. Prerequisites
- Node.js 18+ installed
- AWS CLI configured
- Docker installed (for backend packaging)

## Deployment Steps

### Option A: Using PowerShell (Windows)

```powershell
cd .\cdk
.\deploy.ps1
```

### Option B: Using Bash (Linux/macOS/WSL)

```bash
cd cdk
chmod +x deploy.sh
./deploy.sh
```

### Option C: Manual CDK Commands

```bash
cd cdk
npm install
npm run build
npx cdk bootstrap
npx cdk deploy --all --require-approval never
```

## What Gets Deployed

### On First Deployment
✅ S3 bucket for frontend
✅ CloudFront distribution
✅ Lambda function for backend
✅ API Gateway
✅ All IAM roles and policies

### On Subsequent Deployments
- **Code updates**: Lambda and frontend automatically update
- **Existing resources**: **RETAINED** (not deleted)
- **Safe updates**: No data loss to S3

## Troubleshooting

### Issue: Missing Environment Variables
```
ERROR: Missing required environment variables:
  - MONGODB_URI
  - JWT_SECRET
```
**Solution**: Set all environment variables as shown above.

### Issue: Frontend Build Fails
```
ERROR: Frontend build not found at ...frontend/dist
```
**Solution**: Frontend build is auto-generated. If it fails:
```bash
cd frontend
npm install
npm run build
```

### Issue: Stack Already Exists
**No problem!** CDK will **UPDATE** the stack instead of creating new one.
All existing resources will be retained and updated in-place.

### Issue: Lambda Timeout
If backend takes > 30 seconds per request:
- Increase timeout in [jalsaathi-stack.ts](lib/jalsaathi-stack.ts#L51)
- Edit `timeout: cdk.Duration.seconds(30)` to higher value

## Post-Deployment

After successful deployment, you'll see outputs:

```
CloudFrontURL: https://<distribution-id>.cloudfront.net
ApiUrl: https://<api-id>.execute-api.ap-south-1.amazonaws.com/prod/
BucketName: jalsaathi-bucket-<random-id>
```

### Update Application URLs
If these URLs are hardcoded elsewhere, update them in:
- Frontend API calls: [src/services/api.js](../frontend/src/services/api.js)
- Environment variables in production

## Important Security Notes

❌ **Never commit secrets to Git**
- Credentials are read from environment variables only
- `.env` file should be in `.gitignore`

✅ **Better: Use AWS Secrets Manager**
Consider migrating to AWS Secrets Manager for production:
```typescript
// Future enhancement
const secret = secretsmanager.Secret.fromSecretNameV2(this, 'Secrets', 'JalSaathi-Secrets');
```

## Rollback

If deployment fails:
```bash
# View deployment history
npx cdk list

# See what will be changed
npx cdk diff

# Cancel deployment (ctrl+c during deploy)
```

## Cleanup (Delete All Resources)

⚠️ **Warning**: This deletes everything except S3 bucket (retained for safety)

```bash
npx cdk destroy --all
```

## Next Steps

1. ✅ Set up environment variables
2. ✅ Run deployment script
3. ✅ Test API: `curl https://<api-url>/health`
4. ✅ Test Frontend: Open CloudFront URL in browser
5. ✅ Monitor logs: Check CloudWatch for errors

## Support

For issues:
- Check AWS CloudWatch logs
- Verify IAM permissions
- Ensure all environment variables are set correctly
