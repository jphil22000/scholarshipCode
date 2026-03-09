#!/usr/bin/env bash
# After sam deploy, Cognito app client Hosted UI settings can be wrong. This re-applies them.
# Run from backend/: ./scripts/fix-cognito-after-deploy.sh
# Uses AWS_DEFAULT_REGION and AWS_PROFILE from environment.

set -e
STACK_NAME="${1:-scholarship-finder}"
REGION="${AWS_DEFAULT_REGION:-us-east-1}"
PROFILE_ARGS=""
[ -n "$AWS_PROFILE" ] && PROFILE_ARGS="--profile $AWS_PROFILE"

USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" $PROFILE_ARGS \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" --output text)
HOSTED_UI_CLIENT_ID=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" $PROFILE_ARGS \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" --output text)
SPA_CLIENT_ID=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" $PROFILE_ARGS \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientSpaId'].OutputValue" --output text)
WEBSITE_URL=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" $PROFILE_ARGS \
  --query "Stacks[0].Outputs[?OutputKey=='WebsiteURL'].OutputValue" --output text | tr -d '\r\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

if [ -z "$USER_POOL_ID" ] || [ "$USER_POOL_ID" == "None" ]; then
  echo "Could not get UserPoolId from stack $STACK_NAME. Skip Cognito fix."
  exit 0
fi
if [ -z "$HOSTED_UI_CLIENT_ID" ] || [ "$HOSTED_UI_CLIENT_ID" == "None" ] ; then
  HOSTED_UI_CLIENT_ID=""
fi
if [ -z "$SPA_CLIENT_ID" ] || [ "$SPA_CLIENT_ID" == "None" ]; then
  SPA_CLIENT_ID=""
fi
if [ -z "$HOSTED_UI_CLIENT_ID" ] && [ -z "$SPA_CLIENT_ID" ]; then
  echo "Could not get any app client ID from stack $STACK_NAME. Skip Cognito fix."
  exit 0
fi

# Normalize website URL and derive callback/logout
if [ -z "$WEBSITE_URL" ] || [ "$WEBSITE_URL" == "None" ]; then
  echo "Could not get WebsiteURL from stack. Skip Cognito fix."
  exit 0
fi
case "$WEBSITE_URL" in
  http://*|https://*) ;;
  *) WEBSITE_URL="https://$WEBSITE_URL" ;;
esac
CLOUDFRONT_DOMAIN=$(echo "$WEBSITE_URL" | sed -E 's|^https?://||;s|/.*||')
CALLBACK="https://${CLOUDFRONT_DOMAIN}/callback"
LOGOUT="https://${CLOUDFRONT_DOMAIN}"

echo "Setting Cognito app client(s) Hosted UI: callback=$CALLBACK defaultRedirectUri=$CALLBACK"
for CLIENT_ID in $HOSTED_UI_CLIENT_ID $SPA_CLIENT_ID; do
  [ -z "$CLIENT_ID" ] && continue
  aws cognito-idp update-user-pool-client \
    --user-pool-id "$USER_POOL_ID" \
    --client-id "$CLIENT_ID" \
    --callback-urls "$CALLBACK" "http://localhost:3000/callback" \
    --logout-urls "$LOGOUT" "http://localhost:3000" \
    --default-redirect-uri "$CALLBACK" \
    --allowed-o-auth-flows "code" \
    --allowed-o-auth-flows-user-pool-client \
    --allowed-o-auth-scopes "openid" "email" "profile" \
    --supported-identity-providers "COGNITO" \
    --region "$REGION" $PROFILE_ARGS --output text > /dev/null && echo "  Updated client $CLIENT_ID" || echo "  Failed client $CLIENT_ID"
done
echo "Cognito app client(s) updated."
