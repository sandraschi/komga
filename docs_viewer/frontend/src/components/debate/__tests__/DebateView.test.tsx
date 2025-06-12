import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import DebateView from '../DebateView';
import { defaultPersonas } from '../types';

// Mock child components
jest.mock('../components/DebateHeader', () => ({
  __esModule: true,
  default: jest.fn(({ topic, onClose }) => (
    <div data-testid="debate-header" onClick={onClose}>
      {topic}
    </div>
  )),
}));

jest.mock('../components/DebateChat', () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid="debate-chat" />),
}));

jest.mock('../components/DebateControls', () => ({
  __esModule: true,
  default: jest.fn(({ onStartStop, onPauseResume, onAddParticipant }) => (
    <div>
      <button data-testid="start-stop" onClick={onStartStop} />
      <button data-testid="pause-resume" onClick={onPauseResume} />
      <button data-testid="add-participant" onClick={onAddParticipant} />
    </div>
  )),
}));

describe('DebateView', () => {
  const mockOnClose = jest.fn();
  const mockOnAddToChat = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default props', () => {
    render(<DebateView onClose={mockOnClose} />);
    
    expect(screen.getByTestId('debate-header')).toBeInTheDocument();
    expect(screen.getByTestId('debate-chat')).toBeInTheDocument();
    expect(screen.getByTestId('start-stop')).toBeInTheDocument();
  });

  it('calls onClose when header close button is clicked', () => {
    render(<DebateView onClose={mockOnClose} />);
    
    fireEvent.click(screen.getByTestId('debate-header'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('starts and stops the debate', () => {
    render(<DebateView onClose={mockOnClose} />);
    
    // Start the debate
    fireEvent.click(screen.getByTestId('start-stop'));
    // TODO: Add assertions for debate state changes
    
    // Stop the debate
    fireEvent.click(screen.getByTestId('start-stop'));
    // TODO: Add assertions for debate state changes
  });

  it('pauses and resumes the debate', () => {
    render(<DebateView onClose={mockOnClose} />);
    
    // Start the debate first
    fireEvent.click(screen.getByTestId('start-stop'));
    
    // Pause the debate
    fireEvent.click(screen.getByTestId('pause-resume'));
    // TODO: Add assertions for pause state
    
    // Resume the debate
    fireEvent.click(screen.getByTestId('pause-resume'));
    // TODO: Add assertions for resume state
  });

  it('adds a participant', () => {
    render(
      <DebateView
        onClose={mockOnClose}
        initialParticipants={defaultPersonas}
      />
    );
    
    // Click add participant button
    fireEvent.click(screen.getByTestId('add-participant'));
    // TODO: Add assertions for participant addition
  });

  // Add more test cases as needed
});
