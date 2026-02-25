# Quick Start Guide

Get the Scholarship Finder application up and running in minutes!

## Prerequisites

- Node.js 20.x or higher
- npm or yarn

## Installation Steps

1. **Install dependencies:**
```bash
npm install
```

2. **Start the development server:**
```bash
npm run dev:server
```

This will start the local API server on `http://localhost:3001`

3. **In a new terminal, start the frontend:**
```bash
npm run dev
```

Or run both together:
```bash
npm run dev:all
```

4. **Open your browser:**
Navigate to `http://localhost:3000`

## Using the Application

1. **Search for Scholarships:**
   - Go to the "Search" page
   - Enter keywords (e.g., "engineering", "computer science", "minority")
   - Use filters to narrow down results by amount, deadline, or type
   - Click "Search" to find matching scholarships

2. **Apply to Scholarships:**
   - Click "Apply Now" on any scholarship
   - Fill in the application form
   - Track your application status

3. **Manage Applications:**
   - View all your applications on the "My Applications" page
   - Edit or delete applications as needed
   - Track deadlines and status

## Development vs Production

### Development (Current Setup)
- Uses local Express server (`server.js`)
- Mock scholarship data
- In-memory application storage

### Production (AWS Deployment)
- Deploy backend to AWS Lambda
- Real scholarship search from multiple sources
- DynamoDB for persistent storage

To deploy to AWS:
```bash
cd backend
sam build
sam deploy --guided
```

Then update `VITE_API_URL` in your `.env` file to point to your API Gateway URL.

## Troubleshooting

**Port already in use:**
- Change the port in `server.js` (line 4) and `vite.config.js` (proxy target)

**CORS errors:**
- Make sure the API server is running on port 3001
- Check that the proxy configuration in `vite.config.js` matches

**No search results:**
- The development server uses mock data
- For real searches, deploy the AWS Lambda functions

## Next Steps

- Customize the UI in `src/views/`
- Add more scholarship sources in `backend/src/handlers/searchScholarships.js`
- Configure AWS credentials for deployment
- Set up environment variables for production
