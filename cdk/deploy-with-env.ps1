# Load environment from .env
$env:MONGODB_URI="<REDACTED - SET IN DEPLOYMENT ENV>"
$env:JWT_SECRET="<REDACTED - SET IN DEPLOYMENT ENV>"
$env:JWT_EXPIRES_IN="7d"
$env:FRONTEND_URL="http://jalsaathistack-jalsaathibucketcdea0c72-zt1kesivxa1a.s3-website.ap-south-1.amazonaws.com"
$env:ADMIN_EMAIL="vedanttathe30@gmail.com"
$env:EMAIL_HOST="smtp.gmail.com"
$env:EMAIL_PORT="587"
$env:EMAIL_SECURE="false"
$env:EMAIL_USER="withnocheatssfs@gmail.com"
$env:EMAIL_PASS="<REDACTED - SET IN DEPLOYMENT ENV>"
$env:EMAIL_FROM="JalSaathi <withnocheatssfs@gmail.com>"
$env:PLATFORM_COMMISSION_PERCENT="1.5"
$env:IS_WEBSITE_ON="true"
$env:CASHFREE_APP_ID="<REDACTED - SET IN DEPLOYMENT ENV>"
$env:CASHFREE_SECRET_KEY="<REDACTED - SET IN DEPLOYMENT ENV>"
$env:CASHFREE_ENV="production"
$env:BACKEND_URL="https://w3ko27ats7.execute-api.ap-south-1.amazonaws.com/prod"
$env:CASHFREE_RETURN_URL="http://jalsaathistack-jalsaathibucketcdea0c72-zt1kesivxa1a.s3-website.ap-south-1.amazonaws.com/dashboard/"
$env:CASHFREE_WEBHOOK_URL="https://w3ko27ats7.execute-api.ap-south-1.amazonaws.com/prod/api/webhook/cashfree"

Write-Host "Environment variables set. Starting deployment..." -ForegroundColor Green
Write-Host "JWT_SECRET set: $(if ($env:JWT_SECRET) { 'YES' } else { 'NO' })"
Write-Host "MONGODB_URI set: $(if ($env:MONGODB_URI) { 'YES' } else { 'NO' })"

# Run deployment
npx cdk deploy --all --require-approval never
