#!/usr/bin/env bash
# Build the frontend and deploy to S3 + invalidate CloudFront.
# Run from project root. Requires AWS CLI and a deployed SAM stack.
# Usage: ./scripts/deploy-website.sh [stack-name]   (default: scholarship-finder)
# Uses AWS_PROFILE from environment if set (e.g. AWS_PROFILE=personal).

set -e
STACK_NAME="${1:-scholarship-finder}"
# Use us-east-1 if no region set (stack is deployed there)
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

echo "Getting stack outputs..."
BUCKET=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='WebsiteBucket'].OutputValue" --output text ${AWS_PROFILE:+--profile $AWS_PROFILE})
DIST_ID=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text ${AWS_PROFILE:+--profile $AWS_PROFILE})
API_URL=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text ${AWS_PROFILE:+--profile $AWS_PROFILE})
COGNITO_DOMAIN=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='CognitoOAuthDomain'].OutputValue" --output text ${AWS_PROFILE:+--profile $AWS_PROFILE})
USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" --output text ${AWS_PROFILE:+--profile $AWS_PROFILE})
# Use first (default) app client for Hosted UI to avoid unauthorized_client (Managed Hosted UI only assigns style to default client)
HOSTED_UI_CLIENT_ID=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" --output text ${AWS_PROFILE:+--profile $AWS_PROFILE})
SPA_CLIENT_ID=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientSpaId'].OutputValue" --output text ${AWS_PROFILE:+--profile $AWS_PROFILE})
# Strip trailing slash for Vite
API_URL="${API_URL%/}"

echo "Building frontend for production (VITE_API_URL=$API_URL, Hosted UI client=$HOSTED_UI_CLIENT_ID)..."
export VITE_API_URL="$API_URL"
export VITE_COGNITO_USER_POOL_ID="${USER_POOL_ID:-}"
export VITE_COGNITO_CLIENT_ID="${HOSTED_UI_CLIENT_ID:-$SPA_CLIENT_ID}"
export VITE_COGNITO_OAUTH_DOMAIN="${COGNITO_DOMAIN:-}"
npm run build

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

CLOUDFRONT_DOMAIN=$(aws cloudfront get-distribution --id "$DIST_ID" ${AWS_PROFILE:+--profile $AWS_PROFILE} --query 'Distribution.DomainName' --output text)
CALLBACK_URL="https://${CLOUDFRONT_DOMAIN}/callback"
LOGOUT_URL="https://${CLOUDFRONT_DOMAIN}"

echo "Updating Cognito app clients (callback + default redirect)..."
for CLIENT_ID in "$HOSTED_UI_CLIENT_ID" "$SPA_CLIENT_ID"; do
  if [ -n "$USER_POOL_ID" ] && [ "$USER_POOL_ID" != "None" ] && [ -n "$CLIENT_ID" ] && [ "$CLIENT_ID" != "None" ]; then
    aws cognito-idp update-user-pool-client \
      --user-pool-id "$USER_POOL_ID" \
      --client-id "$CLIENT_ID" \
      --callback-urls "$CALLBACK_URL" "http://localhost:3000/callback" \
      --logout-urls "$LOGOUT_URL" "http://localhost:3000" \
      --default-redirect-uri "$CALLBACK_URL" \
      --allowed-o-auth-flows "code" \
      --allowed-o-auth-flows-user-pool-client \
      --allowed-o-auth-scopes "openid" "email" "profile" \
      --supported-identity-providers "COGNITO" \
      ${AWS_PROFILE:+--profile $AWS_PROFILE} --region "${AWS_DEFAULT_REGION:-us-east-1}" > /dev/null 2>&1 && echo "  Client $CLIENT_ID: $CALLBACK_URL" || echo "  Warning: Could not update client $CLIENT_ID."
  fi
done
if [ -z "$USER_POOL_ID" ] || [ "$USER_POOL_ID" == "None" ]; then
  echo "  Warning: Add this callback URL in Cognito → App client → Hosted UI: $CALLBACK_URL"
fi

echo ""
echo "Done. Website URL: https://$CLOUDFRONT_DOMAIN"
echo "Allow a minute for invalidation to propagate."
