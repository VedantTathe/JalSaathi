#!/usr/bin/env bash
set -euo pipefail

# deploy.sh — Deploy backend (Serverless) and frontend (S3)
# Usage:
#   S3_BUCKET=your-bucket STAGE=dev ./deploy.sh

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

# Defaults (can be overridden via env vars or command-line flags)
# Default bucket updated to the full bucket name provided by user
S3_BUCKET="${S3_BUCKET:-jalsaathi-frontend-552109717221-ap-south-1-an}"
STAGE="${STAGE:-dev}"

usage() {
  cat <<EOF
Usage: $0 [-b BUCKET] [-s STAGE]

Defaults:
  BUCKET=jalsaathi-frontend-552109717221-ap-south-1-an
  STAGE=dev

Examples:
  ./deploy.sh
  ./deploy.sh -b my-bucket -s prod
  S3_BUCKET=my-bucket STAGE=prod ./deploy.sh
EOF
}

# Parse optional command-line args
while [[ $# -gt 0 ]]; do
  case "$1" in
    -b|--bucket)
      S3_BUCKET="$2"; shift 2;;
    -s|--stage)
      STAGE="$2"; shift 2;;
    -h|--help)
      usage; exit 0;;
    *)
      echo "Unknown option: $1"; usage; exit 1;;
  esac
done

echo "Deploying JalSaathi (stage: $STAGE)"
echo "S3 bucket: $S3_BUCKET"

echo
echo "==> 1) Install backend dependencies"
cd "$BACKEND_DIR"
npm install
echo
echo "==> 2) Deploy backend with Serverless Framework (using npx)"
# Use npx so global serverless install is not required.
npx --yes serverless@3 deploy --stage "$STAGE" --config serverless.yml

echo
echo "==> 3) Install frontend dependencies and build"
cd "$FRONTEND_DIR"
npm install
npm run build

echo
echo "==> 4) Sync frontend 'dist' to S3"
aws s3 sync dist/ "s3://$S3_BUCKET" --delete

echo
echo "Deployment completed successfully."
