#!/bin/bash

# AWS Builder Hub - ECR Push and Deploy Script

set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check required variables
if [ -z "$AWS_ACCOUNT_ID" ] || [ -z "$AWS_REGION" ]; then
    echo "Error: AWS_ACCOUNT_ID and AWS_REGION must be set in .env file"
    exit 1
fi

BACKEND_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/sre/aws-builder-hub-backend"
FRONTEND_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/sre/aws-builder-hub-frontend"
BACKEND_TAG="${BACKEND_TAG:-latest}"
FRONTEND_TAG="${FRONTEND_TAG:-latest}"

echo "=== AWS Builder Hub Deployment ==="
echo "AWS Account: $AWS_ACCOUNT_ID"
echo "Region: $AWS_REGION"
echo "Backend Tag: $BACKEND_TAG"
echo "Frontend Tag: $FRONTEND_TAG"
echo ""

# ECR Login
echo "Logging in to ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Build and push backend
echo ""
echo "=== Building Backend ==="
cd $(dirname $0)
./gradlew clean build -x test

echo "Building backend Docker image..."
docker build --platform linux/amd64 -t aws-builder-hub-backend:$BACKEND_TAG .
docker tag aws-builder-hub-backend:$BACKEND_TAG $BACKEND_REPO:$BACKEND_TAG

echo "Pushing backend to ECR..."
docker push $BACKEND_REPO:$BACKEND_TAG

# Build and push frontend
echo ""
echo "=== Building Frontend ==="
cd ../aws-builder-hub

echo "Building frontend Docker image..."
docker build --platform linux/amd64 -t aws-builder-hub-frontend:$FRONTEND_TAG .
docker tag aws-builder-hub-frontend:$FRONTEND_TAG $FRONTEND_REPO:$FRONTEND_TAG

echo "Pushing frontend to ECR..."
docker push $FRONTEND_REPO:$FRONTEND_TAG

echo ""
echo "=== Deployment Complete ==="
echo "Backend image: $BACKEND_REPO:$BACKEND_TAG"
echo "Frontend image: $FRONTEND_REPO:$FRONTEND_TAG"
echo ""
echo "To run on server:"
echo "1. Copy docker-compose.yml and .env to server"
echo "2. Run: docker-compose pull"
echo "3. Run: docker-compose up -d"
