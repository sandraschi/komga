// Main components
export { default as DebateView } from './DebateView';

// Subcomponents
export { default as DebateHeader } from './components/DebateHeader';
export { default as DebateChat } from './components/DebateChat';
export { default as DebateControls } from './components/DebateControls';
export { default as DebateSettingsDialog } from './components/DebateSettingsDialog';

// Hooks
export { useDebate } from './hooks/useDebate';

// Types
export type {
  DebateSettings,
  DebateParticipant,
  DebateMessage,
  DebateViewProps,
  DebateHeaderProps,
  DebateChatProps,
  DebateControlsProps,
  DebateParticipantsProps,
  DebateSettingsDialogProps,
} from './types';

export { defaultDebateSettings, defaultPersonas } from './types';
