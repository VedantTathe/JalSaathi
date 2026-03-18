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

cd "$(dirname "$0")"

echo "Building frontend..."
cd ../frontend
npm install
npm run build
cd ../cdk

echo "Installing CDK dependencies..."
npm install

echo "Bootstrapping (if required)..."
retry_command "npx cdk bootstrap"

echo "Deploying all stacks (no approval)..."
retry_command "npx cdk deploy --all --require-approval never"

echo "✅ Deployment completed successfully!"
