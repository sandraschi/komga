# Game Projects

This directory contains documentation for game-related projects in the CascadeProjects folder.

## Table of Contents
- [Board Games](#board-games)
- [Arcade Games](#arcade-games)
- [Word Games](#word-games)
- [Game Engine](#game-engine)
- [Common Libraries](#common-libraries)
- [Development Guidelines](#development-guidelines)

## Board Games

### Kyoyu Chess Series

#### kyoyu-chess-clean
- **Status**: Base version
- **Features**:
  - Basic chess implementation
  - Clean architecture
  - Unit tested
- **Tech Stack**:
  - Language: TypeScript
  - Framework: React/Next.js

#### kyoyu-chess-next
- **Status**: Enhanced version
- **New Features**:
  - Improved AI
  - Better UI/UX
  - Online multiplayer
- **Tech Stack**:
  - Language: TypeScript
  - Framework: Next.js 13+
  - State: Redux Toolkit

#### kyoyu-chess-ultra
- **Status**: Experimental
- **Advanced Features**:
  - 3D graphics
  - VR support
  - Advanced AI
- **Tech Stack**:
  - Language: TypeScript
  - Framework: Three.js
  - Physics: Cannon.js

### Japanese Games (kyoyu-games)

#### Shogi Variants
- Standard Shogi
- Mini Shogi
- Chu Shogi

#### Go Variants
- 9x9 Go
- 13x13 Go
- 19x19 Go
- Capture Go

## Arcade Games

### 2048
- **Status**: Complete
- **Features**:
  - Classic gameplay
  - Score tracking
  - Responsive design
- **Tech**: Pure JavaScript

### Pinpon Series

#### pinpon
- **Status**: Active
- **Features**:
  - Classic pong
  - Local multiplayer
  - Power-ups

#### PinponBuildParty
- **Status**: In Development
- **New Features**:
  - Battle royale mode
  - Customizable paddles
  - Online multiplayer

## Word Games

### tech-latin-archive
- **Status**: Experimental
- **Concept**:
  - Educational word game
  - Focus on technical Latin terms
  - Quiz and challenge modes

## Game Engine

### Shared Components
- **Physics Engine**
- **Rendering System**
- **Input Handling**
- **Audio System**

## Common Libraries

### Core
- **Game State Management**
- **Asset Loading**
- **Save System**

### Utilities
- **Math Library**
- **Collision Detection**
- **Pathfinding**

## Development Guidelines

### Code Style
- Follow TypeScript strict mode
- Use functional programming patterns
- Document public APIs

### Testing
- Unit tests for game logic
- Integration tests for game flow
- E2E tests for critical paths

### Performance
- Target 60 FPS
- Optimize draw calls
- Use object pooling

### Asset Guidelines
- **Sprites**: PNG with transparency
- **Audio**: OGG format
- **3D Models**: glTF format

## Getting Started

### Prerequisites
- Node.js 16+
- npm/yarn
- Git

### Setup
```bash
# Clone the repository
git clone [repo-url]

# Install dependencies
npm install

# Start development server
npm run dev
```

## Contributing
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License
[Specify License]
