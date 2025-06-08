# Komga++ Monorepo Technical Design

## Table of Contents
1. [Monorepo Structure](#monorepo-structure)
2. [Build System](#build-system)
3. [Development Workflow](#development-workflow)
4. [Component Architecture](#component-architecture)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Local Development](#local-development)
7. [Testing Strategy](#testing-strategy)
8. [Documentation](#documentation)

## Monorepo Structure

```
komga-plus-plus/
├── .github/                  # GitHub workflows
├── apps/
│   ├── web/                  # Main web application
│   │   ├── public/            # Static assets
│   │   └── src/               # Source code
│   ├── mobile/                # Mobile app (future)
│   └── desktop/              # Desktop app (future)
│
├── packages/
│   ├── ui/                   # Shared UI components
│   │   ├── src/
│   │   └── package.json
│   │
│   ├── documents/           # Document tool
│   │   ├── src/
│   │   │   ├── core/       # Core document logic
│   │   │   ├── tree-view/    # Tree view component
│   │   │   ├── list-view/    # List view component
│   │   │   └── rag/          # RAG integration
│   │   └── package.json
│   │
│   ├── ai/                  # AI components
│   │   ├── src/
│   │   │   ├── bob/        # Code generation
│   │   │   └── alice/       # Analysis
│   │   └── package.json
│   │
│   └── shared/             # Shared utilities
│       ├── src/
│       └── package.json
│
├── services/
│   ├── api/                # Backend API
│   │   ├── src/
│   │   └── package.json
│   │
│   └── worker/             # Background jobs
│       ├── src/
│       └── package.json
│
├── scripts/                # Build and utility scripts
├── docs/                    # Documentation
└── package.json             # Root package.json
```

## Build System

### Tools
- **Yarn Workspaces** for package management
- **Turborepo** for task orchestration
- **TypeScript** for type safety
- **ESLint** and **Prettier** for code quality

### Root `package.json`
```json
{
  "name": "komga-plus-plus",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*",
    "services/*"
  ],
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev --parallel",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "format": "prettier --write \"**/*.{ts,tsx,md}\""
  },
  "devDependencies": {
    "turbo": "latest",
    "typescript": "^5.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

## Development Workflow

### Prerequisites
- Node.js 18+
- Yarn 1.22+
- Docker (for local services)

### Getting Started
```bash
# Install dependencies
yarn install

# Start development servers
yarn dev

# Run tests
yarn test

# Build for production
yarn build
```

### Branch Strategy
1. `main` - Production-ready code
2. `develop` - Integration branch
3. `feature/*` - Feature branches
4. `fix/*` - Bug fixes

## Component Architecture

### Document Tool
```mermaid
classDiagram
    class DocumentService {
        +createDocument()
        +updateDocument()
        +deleteDocument()
        +searchDocuments()
    }
    
    class TreeView {
        +renderTree()
        +handleNodeClick()
        +handleDrop()
    }
    
    class ListView {
        +renderList()
        +handleSort()
        +handleFilter()
    }
    
    class RAGService {
        +indexDocument()
        +search()
        +getContext()
    }
    
    DocumentService --> RAGService
    TreeView --> DocumentService
    ListView --> DocumentService
```

## CI/CD Pipeline

### Build Stage
1. Install dependencies
2. Lint code
3. Run tests
4. Build packages

### Test Stage
1. Unit tests
2. Integration tests
3. E2E tests

### Deploy Stage
1. Build Docker images
2. Push to registry
3. Deploy to staging/production

## Local Development

### Services
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: example
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

### Environment Variables
```env
# .env.local
DATABASE_URL=postgresql://postgres:example@localhost:5432/komga
REDIS_URL=redis://localhost:6379
NODE_ENV=development
```

## Testing Strategy

### Unit Tests
- **Jest** for JavaScript/TypeScript
- **React Testing Library** for components
- **Mock Service Worker** for API mocking

### Integration Tests
- **Cypress** for E2E testing
- **TestContainers** for service testing

### Performance Tests
- **k6** for load testing
- **Lighthouse** for web vitals

## Documentation

### Living Documentation
- **Storybook** for UI components
- **Swagger** for API documentation
- **Docusaurus** for project docs

### Code Documentation
- JSDoc for functions and components
- Architecture Decision Records (ADRs)
- Changelog and release notes
