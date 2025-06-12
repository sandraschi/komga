import { renderHook, act } from '@testing-library/react-hooks';
import { useDebate } from '../useDebate';
import { defaultDebateSettings } from '../../types';

// Mock the uuid module
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

describe('useDebate', () => {
  const mockParticipants = [
    { id: '1', name: 'AI 1', role: 'AI', isActive: true },
    { id: '2', name: 'AI 2', role: 'AI', isActive: true },
  ];

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() =>
      useDebate({
        participants: mockParticipants,
        settings: defaultDebateSettings,
      })
    );

    expect(result.current.isDebateActive).toBe(false);
    expect(result.current.isPaused).toBe(false);
    expect(result.current.messages).toEqual([]);
  });

  it('should start and stop the debate', () => {
    const { result } = renderHook(() =>
      useDebate({
        participants: mockParticipants,
        settings: defaultDebateSettings,
      })
    );

    // Start the debate
    act(() => {
      result.current.startDebate();
    });

    expect(result.current.isDebateActive).toBe(true);
    expect(result.current.messages.length).toBe(1); // Welcome message

    // Stop the debate
    act(() => {
      result.current.stopDebate();
    });

    expect(result.current.isDebateActive).toBe(false);
    expect(result.current.messages.length).toBe(2); // Welcome + end message
  });

  it('should pause and resume the debate', () => {
    const { result } = renderHook(() =>
      useDebate({
        participants: mockParticipants,
        settings: defaultDebateSettings,
      })
    );

    // Start the debate
    act(() => {
      result.current.startDebate();
    });


    // Pause the debate
    act(() => {
      result.current.togglePause();
    });

    expect(result.current.isPaused).toBe(true);
    expect(result.current.messages.length).toBe(2); // Welcome + pause message

    // Resume the debate
    act(() => {
      result.current.togglePause();
    });

    expect(result.current.isPaused).toBe(false);
    expect(result.current.messages.length).toBe(3); // Welcome + pause + resume messages
  });

  it('should handle sending messages', () => {
    const { result } = renderHook(() =>
      useDebate({
        participants: mockParticipants,
        settings: defaultDebateSettings,
      })
    );

    const testMessage = 'Test message';
    
    act(() => {
      result.current.sendMessage(testMessage, 'user');
    });

    expect(result.current.messages.length).toBe(1);
    expect(result.current.messages[0].content).toBe(testMessage);
    expect(result.current.messages[0].role).toBe('user');
  });

  it('should clean up timers on unmount', () => {
    const { result, unmount } = renderHook(() =>
      useDebate({
        participants: mockParticipants,
        settings: defaultDebateSettings,
      })
    );

    // Start the debate to set up timers
    act(() => {
      result.current.startDebate();
    });

    // Spy on clearTimeout
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    
    // Unmount the component
    unmount();
    
    // Check if clearTimeout was called
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
