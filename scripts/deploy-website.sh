#!/usr/bin/env bash
# Build the frontend and deploy to S3 + invalidate CloudFront.
# Run from project root. Requires AWS CLI and a deployed SAM stack.
# Usage: ./scripts/deploy-website.sh [stack-name]   (default: scholarship-finder)
# Uses AWS_PROFILE from environment if set (e.g. AWS_PROFILE=personal).

set -e
STACK_NAME="${1:-scholarship-finder}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

echo "Building frontend..."
npm run build

echo "Getting stack outputs..."
BUCKET=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='WebsiteBucket'].OutputValue" --output text ${AWS_PROFILE:+--profile $AWS_PROFILE})
DIST_ID=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text ${AWS_PROFILE:+--profile $AWS_PROFILE})

if [ -z "$BUCKET" ] || [ "$BUCKET" == "None" ]; then
  echo "Error: Could not get WebsiteBucket from stack $STACK_NAME. Deploy the backend first: cd backend && sam build && sam deploy"
  exit 1
fi
if [ -z "$DIST_ID" ] || [ "$DIST_ID" == "None" ]; then
  echo "Error: Could not get CloudFrontDistributionId from stack $STACK_NAME."
  exit 1
fi

echo "Syncing dist/ to s3://$BUCKET ..."
aws s3 sync dist/ "s3://$BUCKET" --delete ${AWS_PROFILE:+--profile $AWS_PROFILE}

echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*" ${AWS_PROFILE:+--profile $AWS_PROFILE} > /dev/null

echo "Done. Website URL: https://$(aws cloudfront get-distribution --id "$DIST_ID" ${AWS_PROFILE:+--profile $AWS_PROFILE} --query 'Distribution.DomainName' --output text)"
echo "Allow a minute for invalidation to propagate."
