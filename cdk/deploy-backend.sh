#!/usr/bin/env bash
set -euo pipefail

# Defaults (can be overridden via environment variables)
AWS_REGION=${AWS_REGION:-ap-south-1}
ACCOUNT_ID=${ACCOUNT_ID:-552109717221}
REPO_NAME=${REPO_NAME:-jalsaathi-backend}
IMAGE_TAG=${IMAGE_TAG:-latest}
FUNCTION_NAME=${FUNCTION_NAME:-jalsaathi-backend-dev-api}
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO_NAME}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${SCRIPT_DIR}/../backend"

# Set deployment target to AWS
export DEPLOYMENT_TARGET=aws

# Git Bash on Windows may fail to execute the Python aws shim directly.
# Prefer aws.cmd on Windows-like shells.
AWS_BIN="aws"
case "${OSTYPE:-}" in
  msys*|mingw*|cygwin*)
    AWS_BIN="aws.cmd"
    ;;
esac

echo "🚀 Deploying Backend to AWS Lambda..."
echo "📦 Deployment Target: $DEPLOYMENT_TARGET"
echo "Using AWS region: ${AWS_REGION}"
echo "ECR URI: ${ECR_URI}"

echo "Logging in to ECR..."
"${AWS_BIN}" ecr get-login-password --region "${AWS_REGION}" | \
  docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "Building Docker image..."
docker build -t "${REPO_NAME}:${IMAGE_TAG}" -f "${BACKEND_DIR}/Dockerfile" "${BACKEND_DIR}"

echo "Tagging image for ECR..."
docker tag "${REPO_NAME}:${IMAGE_TAG}" "${ECR_URI}:${IMAGE_TAG}"

echo "Pushing image to ECR..."
docker push "${ECR_URI}:${IMAGE_TAG}"

echo "Updating Lambda function to use image ${ECR_URI}:${IMAGE_TAG}..."
"${AWS_BIN}" lambda update-function-code --function-name "${FUNCTION_NAME}" --image-uri "${ECR_URI}:${IMAGE_TAG}" --region "${AWS_REGION}"

echo "✅ Deployment complete. Lambda updated to ${ECR_URI}:${IMAGE_TAG}"
