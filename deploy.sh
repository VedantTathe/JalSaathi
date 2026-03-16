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
# CloudFront distribution IDs (comma or space separated). Default set to primary distribution.
CLOUDFRONT_DISTRIBUTION_IDS="${CLOUDFRONT_DISTRIBUTION_IDS:-ERZRKXB6JJ9QD}"

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
echo "==> 5) Ensure index.html is uploaded with no-cache headers"
# Replace index.html metadata without ACL (some buckets enforce 'Bucket owner enforced' and don't allow ACLs)
aws s3 cp "$FRONTEND_DIR/dist/index.html" "s3://$S3_BUCKET/index.html" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html" \
  --metadata-directive REPLACE || echo "Warning: failed to update index.html cache-control"

if [ -z "$CLOUDFRONT_DISTRIBUTION_IDS" ]; then
  echo
  echo "No CLOUDFRONT_DISTRIBUTION_IDS set — attempting to auto-detect CloudFront distributions for bucket: $S3_BUCKET"
  if command -v aws >/dev/null 2>&1; then
    # List distribution IDs and inspect each distribution's origins for the bucket name
    DIST_IDS=$(aws cloudfront list-distributions --query "DistributionList.Items[].Id" --output text 2>/dev/null || true)
    DETECTED_IDS=""
    for DID in $DIST_IDS; do
      ORIGINS=$(aws cloudfront get-distribution --id "$DID" --query "Distribution.DistributionConfig.Origins.Items[].DomainName" --output text 2>/dev/null || true)
      for ORIGIN in $ORIGINS; do
        if echo "$ORIGIN" | grep -F -q "$S3_BUCKET"; then
          DETECTED_IDS="$DETECTED_IDS $DID"
          break
        fi
      done
    done
    DETECTED_IDS=$(echo $DETECTED_IDS)
    if [ -n "$DETECTED_IDS" ]; then
      CLOUDFRONT_DISTRIBUTION_IDS="$DETECTED_IDS"
      echo "Auto-detected CloudFront distribution IDs: $CLOUDFRONT_DISTRIBUTION_IDS"
    else
      echo "Could not auto-detect CloudFront distributions for bucket $S3_BUCKET; skipping invalidation."
    fi
  else
    echo "AWS CLI not found; skipping CloudFront invalidation."
  fi
fi

if [ -n "$CLOUDFRONT_DISTRIBUTION_IDS" ]; then
  echo
  echo "==> 6) Creating CloudFront invalidation for distribution(s): $CLOUDFRONT_DISTRIBUTION_IDS"
  # normalize comma-separated into space-separated
  IDS=$(echo "$CLOUDFRONT_DISTRIBUTION_IDS" | tr ',' ' ')
  for ID in $IDS; do
    echo "Invalidating CloudFront distribution: $ID"
    aws cloudfront create-invalidation --distribution-id "$ID" --paths "/*" || echo "Warning: CloudFront invalidation failed for $ID"
  done
else
  echo "No CloudFront distribution IDs found — skipping invalidation."
fi

echo
echo "Deployment completed successfully."
