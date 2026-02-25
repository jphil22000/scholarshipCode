# Scholarship Finder 🎓

A modern web application to search for college scholarships and help students apply to them. Built with Vue.js, Node.js, and AWS.

## Features

- 🔍 **Smart Scholarship Search** - Search thousands of scholarships from multiple sources
- 📝 **Application Tracker** - Keep track of all your scholarship applications
- ⚡ **Quick Apply** - Get personalized help and reminders for applications
- 🎨 **Modern UI** - Beautiful, responsive design

## Tech Stack

- **Frontend**: Vue.js 3, Vite, Vue Router, Pinia
- **Backend**: AWS Lambda, API Gateway, DynamoDB
- **Deployment**: AWS SAM (Serverless Application Model)

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm or yarn
- AWS CLI configured (for backend deployment)
- AWS SAM CLI (for backend deployment)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Scholarship
```

2. Install frontend dependencies:
```bash
npm install
```

3. Install backend dependencies:
```bash
cd backend
npm install
cd ..
```

### Development

1. Start the frontend development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

2. For backend development, you can run the API locally:
```bash
cd backend
sam local start-api
```

### Environment Variables

Create a `.env` file in the root directory:
```
VITE_API_URL=http://localhost:3000
```

For production, update this to your deployed API Gateway URL.

### Building for Production

1. Build the frontend:
```bash
npm run build
```

2. Deploy the backend:
```bash
cd backend
sam build
sam deploy --guided
```

## Project Structure

```
Scholarship/
├── src/                    # Vue.js frontend source
│   ├── views/             # Page components
│   ├── stores/            # Pinia state management
│   ├── router/            # Vue Router configuration
│   └── App.vue           # Root component
├── backend/               # AWS Lambda backend
│   ├── src/handlers/     # Lambda function handlers
│   └── template.yaml     # SAM template
├── package.json          # Frontend dependencies
└── vite.config.js        # Vite configuration
```

## API Endpoints

### Scholarships
- `POST /api/scholarships/search` - Search for scholarships
- `GET /api/scholarships/{id}` - Get scholarship details

### Applications
- `GET /api/applications` - Get all applications
- `POST /api/applications` - Create new application
- `PUT /api/applications/{id}` - Update application
- `DELETE /api/applications/{id}` - Delete application

## Features in Detail

### Scholarship Search
The application searches multiple scholarship databases including:
- FastWeb
- Scholarships.com
- College Board BigFuture

Search results can be filtered by:
- Amount range
- Deadline
- Scholarship type (merit-based, need-based, athletic, etc.)

### Application Management
- Track application status (pending, submitted, approved, rejected)
- Store application notes and deadlines
- View application history

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License

## Support

For issues and questions, please open an issue on GitHub.
