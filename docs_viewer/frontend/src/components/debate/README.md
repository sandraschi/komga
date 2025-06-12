# Debate Component

A reusable React component for managing AI-powered debates with multiple participants.

## Features

- 🎤 Real-time debate simulation with multiple AI participants
- ⏯️ Play, pause, and stop controls
- ⚙️ Configurable debate settings
- 💬 Message history and display
- 🎭 Support for different AI personas
- 📱 Responsive design

## Installation

```bash
# If not already installed
npm install @mui/material @emotion/react @emotion/styled uuid
```

## Usage

```tsx
import { DebateView } from './components/debate';

function App() {
  return (
    <div style={{ height: '100vh' }}>
      <DebateView 
        onClose={() => console.log('Closed')}
        initialTopic="The future of AI"
        initialParticipants={[
          {
            id: '1',
            name: 'AI 1',
            role: 'AI Assistant',
            avatar: '/avatars/ai1.png',
            description: 'Helpful AI',
            isActive: true,
            isMuted: false,
            isSpeaking: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          // Add more participants as needed
        ]}
      />
    </div>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onClose` | `() => void` | `() => {}` | Callback when the debate is closed |
| `documentId` | `string` | `undefined` | Optional document ID for context |
| `onAddToChat` | `(message: ChatMessage) => void` | `undefined` | Callback when a message should be added to chat |
| `initialMessages` | `ChatMessage[]` | `[]` | Initial chat messages |
| `initialParticipants` | `DebateParticipant[]` | `defaultPersonas` | Initial debate participants |
| `initialTopic` | `string` | `'The impact of AI on society'` | Debate topic |
| `initialSettings` | `Partial<DebateSettings>` | `defaultDebateSettings` | Debate settings |

## Components

### `DebateView`
The main container component that orchestrates the debate.

### `DebateHeader`
Displays the debate topic and control buttons.

### `DebateChat`
Renders the message history.

### `DebateControls`
Provides controls for starting, pausing, and stopping the debate.

### `DebateSettingsDialog`
Modal for configuring debate settings.

## Hooks

### `useDebate`
Custom hook that manages the debate state and logic.

## Types

See `types/index.ts` for detailed type definitions.

## Styling

Components are styled using Material-UI's `styled` API. You can override styles using the `sx` prop or by using the `styled` API.

## Testing

Run tests with:

```bash
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT
