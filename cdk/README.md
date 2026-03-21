# AWS CDK Infrastructure - JalSaathi

This folder contains the AWS CDK TypeScript code that deploys:
- **Frontend**: S3 + CloudFront CDN
- **Backend**: Lambda + API Gateway
- **Database**: MongoDB (external)

## 🚀 Quick Start

### 1. Set Environment Variables

Copy and fill `.env.example`:
```bash
cp .env.example .env
# Edit .env with your actual values
```

**Required variables:**
- `MONGODB_URI` - Your MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `EMAIL_USER` & `EMAIL_PASS` - Gmail SMTP credentials
- `CASHFREE_APP_ID` & `CASHFREE_SECRET_KEY` - Payment gateway

### 2. Deploy

**Windows (PowerShell):**
```powershell
.\deploy.ps1
```

**Linux/macOS (Bash):**
```bash
chmod +x deploy.sh
./deploy.sh
```

**Manual:**
```bash
npm install
npx cdk bootstrap            # once per account/region
npx cdk deploy --all --require-approval never
```

## 📋 What's Inside

```
lib/
  └── jalsaathi-stack.ts     # Main infrastructure definition
bin/
  └── jalsaathi.ts           # CDK app entry point
deploy.sh                     # Bash deployment script (Linux/macOS)
deploy.ps1                    # PowerShell script (Windows)
.env.example                  # Environment variables template
```

## ✅ Key Improvements

- ✅ **Safe Updates**: S3 bucket uses `RETAIN` policy (no data loss)
- ✅ **Secure Secrets**: All credentials from environment variables only
- ✅ **Validation**: Checks env vars and frontend build before deployment
- ✅ **Error Handling**: Better error messages and retry logic
- ✅ **Auto-Updates**: Existing resources safely update on redeploy

## ⚠️ Important Notes

### First Deployment Only
- Takes 10-15 minutes
- Creates all AWS resources
- Requires active AWS credentials

### Subsequent Deployments
- Updates existing resources (no recreation)
- ~2-3 minutes deployment time
-No data loss (S3 objects retained)

### Secrets Management
❌ **NEVER** commit credentials to Git
✅ Use environment variables for local development
✅ Consider AWS Secrets Manager for production

## 📊 Outputs

After deployment, you'll get:
```
CloudFrontURL: https://<id>.cloudfront.net      (Frontend)
ApiUrl: https://<id>.execute-api.../prod        (Backend)
BucketName: jalsaathi-bucket-<random>           (Storage)
```

## 🔧 Troubleshooting

| Error | Solution |
|-------|----------|
| Missing env vars | Run `.env.example` check and set all variables |
| Frontend build failed | Run `npm run build` in frontend/ folder |
| Stack already exists | CDK will update it automatically (safe) |
| Lambda timeout | Increase timeout in `jalsaathi-stack.ts` line 51 |

## 📚 Full Documentation

See [../DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) for complete deployment guide.

## 🧹 Cleanup

```bash
npx cdk destroy --all       # Delete all AWS resources (except S3)
```
