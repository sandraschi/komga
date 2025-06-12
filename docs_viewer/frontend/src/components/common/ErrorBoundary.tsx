import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Button, Typography } from '@mui/material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo);
    this.setState({ errorInfo });
    // You can also log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || this.renderDefaultFallback();
    }

    return this.props.children;
  }

  private renderDefaultFallback() {
    return (
      <Box
        sx={{
          p: 3,
          border: '1px solid',
          borderColor: 'error.main',
          borderRadius: 1,
          bgcolor: 'error.50',
        }}
      >
        <Typography variant="h6" color="error" gutterBottom>
          Something went wrong
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          {this.state.error?.message || 'An unexpected error occurred'}
        </Typography>
        <Typography variant="caption" component="pre" sx={{ overflowX: 'auto', mb: 2 }}>
          {this.state.error?.stack}
        </Typography>
        <Button
          variant="outlined"
          color="error"
          onClick={() => window.location.reload()}
        >
          Reload
        </Button>
      </Box>
    );
  }
}

export default ErrorBoundary;
