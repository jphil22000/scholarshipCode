# Scholarship Finder Backend

AWS Lambda backend for the Scholarship Finder application.

## Prerequisites

- Node.js 20.x
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) installed and configured
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) installed

## Connect to your AWS account

1. **Configure the AWS CLI**  
   To keep work and personal separate, use a **named profile** (e.g. `personal`):
   ```bash
   aws configure --profile personal
   ```
   Enter your **personal** Access Key ID, Secret Access Key, and default region (e.g. `us-east-1`).  
   Your work credentials stay in the default profile or another named profile.

   To deploy with the personal profile, use:
   ```bash
   sam deploy --profile personal
   ```
   Or set it for the session: `export AWS_PROFILE=personal` then run `sam deploy`.

2. **Install backend dependencies**:
   ```bash
   cd backend
   npm install
   ```

3. **Build the SAM application**:
   ```bash
   sam build
   ```

4. **Deploy to AWS** (first time use `--guided` to set stack name, region, and S3 bucket):
   ```bash
   sam deploy --guided --profile personal
   ```
   - Stack name: e.g. `scholarship-finder`
   - Region: your preferred region (e.g. `us-east-1`)
   - Confirm changeset: `y`
   - Allow SAM CLI IAM role creation: `y`
   - Save arguments to config: `y`

   Later deploys (with personal profile):
   ```bash
   sam deploy --profile personal
   ```

   **First-time only:** Populate the scholarships table by invoking the sync Lambda once (it also runs daily):
   ```bash
   aws lambda invoke --function-name scholarship-finder-SyncScholarshipsFunction-xxx --profile personal out.json && cat out.json
   ```
   Replace the function name with the one from your stack (e.g. from AWS Console → Lambda, or `aws lambda list-functions --profile personal`).

5. **Point the frontend at your API and Cognito**  
   After deploy, SAM prints **ApiUrl**, **UserPoolId**, and **UserPoolClientId**. In the **project root** (not `backend`), create a `.env` file:
   ```bash
   cd ..   # back to project root
   cp .env.example .env
   ```
   Edit `.env` and set:
   ```
   VITE_API_URL=https://YOUR-API-ID.execute-api.YOUR-REGION.amazonaws.com/prod
   VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
   VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
   Use the exact **ApiUrl** from the deploy output (no trailing slash). Get Cognito values from the same stack’s CloudFormation Outputs.

   To get the URL again later:
   ```bash
   aws cloudformation describe-stacks --stack-name scholarship-finder --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text --profile personal
   ```

6. **Rebuild and run the frontend** so it uses the new API:
   ```bash
   npm run build
   npm run preview
   ```
   Or for local dev with the deployed API, just run `npm run dev` (it will use `VITE_API_URL` from `.env`).

## Static website (S3 + CloudFront)

The stack includes an S3 bucket and a CloudFront distribution for hosting the frontend. After deploying the backend:

1. **Build and deploy the website** (from project root):
   ```bash
   npm run deploy:website:personal
   ```
   Or with a specific stack name: `./scripts/deploy-website.sh scholarship-finder` (and set `AWS_PROFILE` if needed).

   This builds the frontend, syncs `dist/` to S3, and invalidates the CloudFront cache.

2. **Production `.env`**: For the deployed site, set `VITE_API_URL` to your API Gateway URL (stack output **ApiUrl**) and, for the "Sign in with Cognito" (Hosted UI) button, set `VITE_COGNITO_OAUTH_DOMAIN` to the **CognitoOAuthDomain** output (e.g. `scholarship-finder-ui.auth.us-east-1.amazoncognito.com`). Then run `npm run deploy:website`.

3. **Website URL**: After deploy, get the CloudFront URL from the stack outputs:
   ```bash
   aws cloudformation describe-stacks --stack-name scholarship-finder --query "Stacks[0].Outputs[?OutputKey=='WebsiteURL'].OutputValue" --output text --profile personal
   ```

## Setup (summary)

1. Install dependencies: `npm install`
2. Build: `sam build`
3. Deploy: `sam deploy --guided --profile personal` (first time), then `sam deploy --profile personal`

## Local Development

Run the API locally with SAM:
```bash
sam local start-api
```
The API will be available at `http://localhost:3000` (paths like `/scholarships/search`, no `/api` prefix).

Or run the root dev server for a mock API at `http://localhost:3001/api`:
```bash
# from project root
npm run dev:server
```

## Scholarship data sources

The sync Lambda loads scholarships from **multiple locations**:

| Source | API? | How we use it | Env / config |
|--------|------|----------------|-------------|
| **Local JSON** | — | Curated lists in the repo | `src/data/curatedScholarships.json` + `src/data/sources/*.json` |
| **ScholarshipAPI** (AU, NZ, then CA, US, EU) | ✅ REST | Generic REST fetcher | `SCHOLARSHIP_API_URL` (required), `SCHOLARSHIP_API_KEY` (optional) |
| **ScholarshipOwl** | ✅ REST | Published scholarships from their platform | `SCHOLARSHIPOWL_API_KEY` ([get key](https://docs.business.scholarshipowl.com/profile#api-keys)) |
| **Data.gov** (US) | ✅ API | College Scorecard → school-level federal/state aid | `DATA_GOV_API_KEY` ([get key](https://api.data.gov/signup)) |
| **IEFA** (worldwide) | ❌ No public API | — | Cannot ingest; use IEFA site search only |

### How to get the API keys

You don’t need any of these to run the app. The sync already uses your **local JSON** files (40+ scholarships). Add keys only if you want to pull from these external APIs.

- **DATA_GOV_API_KEY (easiest, free)**  
  1. Go to [api.data.gov/signup](https://api.data.gov/signup/).  
  2. Complete the short form (first name, last name, email, organization can be “Personal” or your app name).  
  3. Submit; you’ll get an email with your API key (long string).  
  4. In Lambda → **SyncScholarshipsFunction** → Configuration → Environment variables, add `DATA_GOV_API_KEY` and paste that key.  
  This key works for the College Scorecard and other Data.gov APIs (1,000 requests/hour on the free tier).

- **SCHOLARSHIPOWL_API_KEY**  
  1. Sign up at [ScholarshipOwl For Business](https://app.business.scholarshipowl.com/registration).  
  2. After logging in, go to **Profile** (or account/settings) and find **API Keys**.  
  3. Create an API key and copy it.  
  4. In Lambda, add env var `SCHOLARSHIPOWL_API_KEY` with that value.  
  Note: ScholarshipOwl For Business may be a paid product; check their pricing if you don’t see an API key section.

- **SCHOLARSHIP_API_URL and SCHOLARSHIP_API_KEY (optional, AU/NZ-style APIs)**  
  There isn’t one single “ScholarshipAPI” signup. If you have a provider that gives you a REST API URL (and sometimes a key) for scholarship data:  
  1. Set Lambda env `SCHOLARSHIP_API_URL` to that API’s base URL (e.g. `https://api.example.com/scholarships`).  
  2. If the provider gave you an API key or token, set `SCHOLARSHIP_API_KEY` as well.  
  If you don’t have such a provider, you can skip these; your app still works with local JSON and, if you add it, Data.gov.

**Local:** Add more JSON files under `backend/src/data/sources/` (any `*.json` array).

**Remote feeds:** Set Lambda env `SCHOLARSHIP_FEED_URL` to one or more URLs (comma-separated) that return a JSON array of scholarship objects (`id`, `title`, `description`, `amount`, `deadline`, `source`, `type`, `eligibility`, `applicationUrl`).

**External APIs:** In the AWS Lambda console, open **SyncScholarshipsFunction** → Configuration → Environment variables, and set the keys above. Redeploy or run the sync once to pull from those sources.

## Amazon AI web search (optional)

The **Search web with Amazon AI** button uses **Tavily** (web search) plus **Amazon Bedrock** (Claude) to find scholarships on the web and extract structured results.

1. **Tavily API key** (free tier at [tavily.com](https://tavily.com))  
   In AWS Lambda → **AISearchScholarshipsFunction** → Configuration → Environment variables, add `TAVILY_API_KEY` with your key.

2. **Bedrock**  
   The function uses `anthropic.claude-3-haiku-20240307-v1:0` by default. Ensure Bedrock is available in your region and the Lambda role has `bedrock:InvokeModel`. You can set `BEDROCK_MODEL_ID` to another model if needed.

If `TAVILY_API_KEY` is not set, the AI search button returns a friendly error and no results.

## API Endpoints

- `POST /scholarships/search` - Search for scholarships (database)
- `POST /scholarships/ai-search` - Search the web for scholarships (Tavily + Bedrock)
- `GET /scholarships/{id}` - Get scholarship details
- `GET /applications` - Get all applications
- `POST /applications` - Create new application
- `PUT /applications/{id}` - Update application
- `DELETE /applications/{id}` - Delete application
