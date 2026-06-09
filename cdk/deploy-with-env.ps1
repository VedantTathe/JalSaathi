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
$env:RAZORPAY_KEY_ID="<REDACTED - SET IN DEPLOYMENT ENV>"
$env:RAZORPAY_KEY_SECRET="<REDACTED - SET IN DEPLOYMENT ENV>"
$env:RAZORPAY_ENV="production"
$env:BACKEND_URL="https://w3ko27ats7.execute-api.ap-south-1.amazonaws.com/prod"
$env:RAZORPAY_RETURN_URL="http://jalsaathistack-jalsaathibucketcdea0c72-zt1kesivxa1a.s3-website.ap-south-1.amazonaws.com/dashboard/"
$env:RAZORPAY_WEBHOOK_SECRET="https://w3ko27ats7.execute-api.ap-south-1.amazonaws.com/prod/api/webhook/razorpay"

Write-Host "Environment variables set. Starting deployment..." -ForegroundColor Green
Write-Host "JWT_SECRET set: $(if ($env:JWT_SECRET) { 'YES' } else { 'NO' })"
Write-Host "MONGODB_URI set: $(if ($env:MONGODB_URI) { 'YES' } else { 'NO' })"

# Run deployment
npx cdk deploy --all --require-approval never
