#!/usr/bin/env bash
set -uo pipefail

MAX_RETRIES=3
RETRY_DELAY=5

# Function to retry commands on network failures
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
  
  echo "❌ Command failed after $MAX_RETRIES attempts: $command"
  return 1
}

# Validate required environment variables
echo "Validating environment variables..."
REQUIRED_VARS=("MONGODB_URI" "JWT_SECRET" "EMAIL_USER" "EMAIL_PASS" "CASHFREE_APP_ID" "CASHFREE_SECRET_KEY")
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
  echo ""
  echo "ℹ️  Please set these variables before deployment (e.g., export VARIABLE_NAME='value')"
  exit 1
fi
echo "✅ All required environment variables are set"

cd "$(dirname "$0")"

echo ""
echo "Building frontend..."
cd ../frontend
npm install
if ! npm run build; then
  echo "❌ Frontend build failed"
  exit 1
fi
echo "✅ Frontend built successfully"
cd ../cdk

echo ""
echo "Installing CDK dependencies..."
npm install

echo ""
echo "Bootstrapping (if required)..."
retry_command "npx cdk bootstrap"

echo ""
echo "Deploying all stacks (no approval)..."
retry_command "npx cdk deploy --all --require-approval never"

echo ""
echo "✅ Deployment completed successfully!"
