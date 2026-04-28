#!/usr/bin/env bash
set -euo pipefail

echo "🚀 JalSaathi CDK Deployment Started"
echo "===================================="
echo ""

# -------------------------------
# Locate .env file (priority order)
# -------------------------------
ENV_FILE=""

if [ -f ".env" ]; then
  ENV_FILE=".env"
elif [ -f "../backend/.env" ]; then
  ENV_FILE="../backend/.env"
else
  echo "❌ ERROR: No .env file found (checked cdk/.env and backend/.env)"
  exit 1
fi

echo "📂 Using ENV file: $ENV_FILE"

# -------------------------------
# Fix CRLF (Windows issue)
# -------------------------------
if command -v dos2unix >/dev/null 2>&1; then
  dos2unix "$ENV_FILE" >/dev/null 2>&1 || true
fi

# -------------------------------
# Load environment variables safely
# -------------------------------
set -a
source "$ENV_FILE"
set +a

echo "✅ Environment variables loaded"

# -------------------------------
# Debug (important)
# -------------------------------
echo ""
echo "🔍 Debug check:"
echo "MONGODB_URI=${MONGODB_URI:-NOT SET}"
echo "JWT_SECRET=${JWT_SECRET:+SET}"
echo "EMAIL_USER=${EMAIL_USER:-NOT SET}"
echo ""

# -------------------------------
# Validate required variables
# -------------------------------
echo "Validating environment variables..."

REQUIRED_VARS=(
  "MONGODB_URI"
  "JWT_SECRET"
  "EMAIL_USER"
  "EMAIL_PASS"
  "CASHFREE_APP_ID"
  "CASHFREE_SECRET_KEY"
)

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var:-}" ]; then
    MISSING_VARS+=("$var")
  fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo "❌ ERROR: Missing required environment variables:"
  for var in "${MISSING_VARS[@]}"; do
    echo "  - $var"
  done
  exit 1
fi

echo "✅ All required environment variables are set"

# -------------------------------
# Retry helper
# -------------------------------
MAX_RETRIES=3
RETRY_DELAY=5

retry_command() {
  local attempt=1
  local command="$@"

  while [ $attempt -le $MAX_RETRIES ]; do
    echo "🔄 Attempt $attempt/$MAX_RETRIES: $command"
    if eval "$command"; then
      return 0
    fi

    if [ $attempt -lt $MAX_RETRIES ]; then
      echo "❌ Attempt $attempt failed. Retrying in ${RETRY_DELAY}s..."
      sleep $RETRY_DELAY
    fi

    attempt=$((attempt + 1))
  done

  echo "❌ Command failed after $MAX_RETRIES attempts"
  exit 1
}

# -------------------------------
# Move to script directory
# -------------------------------
cd "$(dirname "$0")"

# -------------------------------
# Build frontend
# -------------------------------
echo ""
echo "📦 Building frontend..."
cd ../frontend

npm ci --include=dev

if ! npm run build; then
  echo "❌ Frontend build failed"
  exit 1
fi

echo "✅ Frontend built successfully"

cd ../cdk

# -------------------------------
# Install CDK dependencies
# -------------------------------
echo ""
echo "📦 Installing CDK dependencies..."
npm ci --include=dev

# -------------------------------
# Bootstrap & Deploy
# -------------------------------
echo ""
echo "🚀 Bootstrapping..."
retry_command "npx cdk bootstrap"

echo ""
echo "🚀 Deploying stacks..."
retry_command "npx cdk deploy --all --require-approval never"

echo ""
echo "🎉 Deployment completed successfully!"