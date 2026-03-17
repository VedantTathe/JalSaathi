#!/usr/bin/env bash
set -euo pipefail

# One-click: build a Lambda container image for the backend, push to ECR,
# and update the existing Lambda function to use the new image.
# Edit the hardcoded defaults below if needed.

# Defaults (edit as needed)
AWS_REGION="ap-south-1"
STAGE="dev"
BACKEND_DIR="./backend"
BACKEND_REPO="jalsaathi-backend"
IMAGE_TAG="${1:-latest}"

# Lambda function name created by Serverless is typically: <service>-<stage>-<function>
# Our service is `jalsaathi-backend` and function key is `api` in serverless.yml,
# so default name becomes `jalsaathi-backend-<stage>-api`.
LAMBDA_FUNCTION_NAME="${LAMBDA_FUNCTION_NAME:-jalsaathi-backend-$STAGE-api}"

echo "→ Building Lambda container image for backend"
echo "Region: $AWS_REGION  Stage: $STAGE  Image tag: $IMAGE_TAG"
echo "Lambda function name: $LAMBDA_FUNCTION_NAME"

command -v aws >/dev/null 2>&1 || { echo "Please install and configure the AWS CLI."; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Please install Docker."; exit 1; }

# Resolve AWS account id
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-}"
if [ -z "$AWS_ACCOUNT_ID" ]; then
  AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || true)
fi
if [ -z "$AWS_ACCOUNT_ID" ]; then
  echo "AWS_ACCOUNT_ID not set and could not be determined from AWS CLI. Set AWS_ACCOUNT_ID env var or configure aws cli.";
  exit 1
fi

ECR_REGISTRY="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
BACKEND_IMAGE="$ECR_REGISTRY/$BACKEND_REPO:$IMAGE_TAG"

echo "ECR registry: $ECR_REGISTRY"

echo "Logging into ECR..."
if ! aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY"; then
  echo "Failed to login to ECR. Ensure your IAM user has ecr:GetAuthorizationToken and related permissions.";
  exit 1
fi

echo "Creating ECR repository if missing..."
if ! aws ecr describe-repositories --repository-names "$BACKEND_REPO" --region "$AWS_REGION" >/dev/null 2>&1; then
  aws ecr create-repository --repository-name "$BACKEND_REPO" --region "$AWS_REGION" >/dev/null || true
fi

echo "Building Docker image (this may take a minute)..."
docker build -t "$BACKEND_REPO:$IMAGE_TAG" -f "$BACKEND_DIR/Dockerfile" "$BACKEND_DIR"

echo "Tagging and pushing image to ECR: $BACKEND_IMAGE"
docker tag "$BACKEND_REPO:$IMAGE_TAG" "$BACKEND_IMAGE"
docker push "$BACKEND_IMAGE"

echo "Updating Lambda function ($LAMBDA_FUNCTION_NAME) to use image: $BACKEND_IMAGE"
if aws lambda update-function-code --function-name "$LAMBDA_FUNCTION_NAME" --image-uri "$BACKEND_IMAGE" --publish >/dev/null 2>&1; then
  echo "Lambda function updated successfully."
else
  echo "Failed to update Lambda function."
  echo "If the function does not exist, create it first (requires a role ARN). Example:"
  echo "  aws lambda create-function --function-name $LAMBDA_FUNCTION_NAME --package-type Image --code ImageUri=$BACKEND_IMAGE --role arn:aws:iam::<ACCOUNT_ID>:role/<ROLE_NAME>"
  exit 1
fi

echo "Done. Backend image pushed: $BACKEND_IMAGE"
echo "Lambda function: $LAMBDA_FUNCTION_NAME should be pulling the new image shortly."
