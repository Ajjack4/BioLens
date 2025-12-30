# BioLens - AI Health Symptom Checker

BioLens is a privacy-focused healthcare accessibility application that combines natural language processing and computer vision to provide preliminary health assessments. The system processes user-submitted symptom descriptions and medical images to generate risk assessments and provide guidance toward appropriate medical care.

## 🏗️ Architecture

The system follows a microservices architecture with clean separation between:

- **Frontend (Next.js)**: Conversational chat interface with image upload
- **Backend (FastAPI)**: API gateway and orchestration layer
- **BioMed Clip Service**: Medical Image extraction and symptom analysis
- **Fusion Classifier**: Classify on embedded image and text
- **Image Analysis Service**: Computer vision for medical image analysis
- **Redis**: Session management and caching

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local frontend development)
- Python 3.11+ (for local backend development)
- Poetry (for Python dependency management)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd biolens-symptom-checker
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env.local
   ```

3. **Start development environment**
   ```bash
   # Using Docker Compose (recommended)
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
   
   # Or using the setup script (Linux/macOS)
   ./scripts/dev-setup.sh
   ```

4. **Access the services**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - BioMed & Fusion Classifier Service: http://localhost:8001
   - Image Analysis Service: http://localhost:8002
   - API Documentation: http://localhost:8000/docs

### Manual Development Setup

If you prefer to run services individually:

1. **Start Redis**
   ```bash
   docker run -d -p 6379:6379 redis:7-alpine
   ```

2. **Backend**
   ```bash
   cd backend
   poetry install
   poetry run uvicorn app.main:app --reload --port 8000
   ```

3. **BioBERT Service**
   ```bash
   cd ml-services/biobert-service
   poetry install
   poetry run uvicorn app.main:app --reload --port 8001
   ```

4. **Image Analysis Service**
   ```bash
   cd ml-services/image-analysis-service
   poetry install
   poetry run uvicorn app.main:app --reload --port 8002
   ```

5. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## 📁 Project Structure

```
biolens-symptom-checker/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # Next.js app router
│   │   └── components/      # React components
│   ├── Dockerfile
│   └── package.json
├── backend/                  # FastAPI backend service
│   ├── app/
│   │   ├── main.py         # FastAPI application
│   │   └── config.py       # Configuration settings
│   ├── Dockerfile
│   └── pyproject.toml
├── ml-services/             # ML microservices
│   ├── biobert-service/     # BioBERT NLP service
│   └── image-analysis-service/ # Computer vision service
├── scripts/                 # Development scripts
├── .github/workflows/       # CI/CD pipelines
├── docker-compose.yml       # Production Docker Compose
├── docker-compose.dev.yml   # Development overrides
└── README.md
```

## 🧪 Testing

### Running Tests

```bash
# Backend tests
cd backend
poetry run pytest

# BioBERT service tests
cd ml-services/biobert-service
poetry run pytest

# Image analysis service tests
cd ml-services/image-analysis-service
poetry run pytest

# Frontend tests (when implemented)
cd frontend
npm test
```

### Property-Based Testing

The project uses property-based testing with Hypothesis for Python services to ensure correctness across a wide range of inputs. Tests are designed to validate the correctness properties defined in the design document.

## 🔧 Development Commands

### Docker Commands

```bash
# Start all services
docker-compose up -d

# Start with development overrides
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# View logs
docker-compose logs -f [service-name]

# Stop services
docker-compose down

# Rebuild services
docker-compose build

# Clean up everything
docker-compose down -v --rmi all
```

### Service-Specific Commands

```bash
# Backend
cd backend
poetry install                    # Install dependencies
poetry run uvicorn app.main:app --reload  # Start development server
poetry run pytest                # Run tests
poetry run black .               # Format code
poetry run isort .               # Sort imports

# Frontend
cd frontend
npm install                      # Install dependencies
npm run dev                     # Start development server
npm run build                   # Build for production
npm run lint                    # Run linting
npm run type-check              # Type checking
```

## 🌍 Environment Variables

### Backend (.env)
- `DEBUG`: Enable debug mode
- `SECRET_KEY`: JWT secret key
- `REDIS_URL`: Redis connection URL
- `FIREBASE_CREDENTIALS_PATH`: Path to Firebase credentials
- `GEMINI_API_KEY`: Google Gemini API key

### Frontend (.env.local)
- `NEXT_PUBLIC_API_URL`: Backend API URL

## 🚀 Deployment

### Production Build

```bash
# Build all services for production
docker-compose build

# Start production environment
docker-compose up -d
```

### Environment-Specific Configurations

- **Development**: Uses `docker-compose.dev.yml` with hot reloading
- **Production**: Uses base `docker-compose.yml` with optimized builds

## 🔒 Privacy and Security

BioLens prioritizes user privacy and data protection:

- **On-device processing** where technically feasible
- **Automatic data cleanup** within 24 hours
- **Encrypted data transmission** for cloud processing
- **No PII storage** without explicit consent
- **Medical disclaimers** on all health assessments

## 📋 Requirements Validation

The implementation addresses the following key requirements:

- **Requirement 7.1**: Clean separation between frontend, backend, and ML components
- **Requirement 8.3**: Proper configuration management for different environments
- **Performance**: Response times under 10s for text, 30s for images
- **Privacy**: Automatic data cleanup and encryption
- **Medical Ethics**: Comprehensive disclaimers and escalation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and ensure they pass
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

1. Check the API documentation at `/docs` endpoints
2. Review the requirements and design documents in `.kiro/specs/`
3. Check Docker logs: `docker-compose logs -f [service-name]`
4. Ensure all environment variables are properly configured
