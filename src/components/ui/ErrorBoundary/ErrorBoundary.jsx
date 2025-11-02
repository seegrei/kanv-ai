import React from 'react';
import { createLogger } from '../../../utils/logger';
import './ErrorBoundary.css';

const logger = createLogger('ErrorBoundary');

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({
            error: error,
            errorInfo: errorInfo
        });

        // Log error for debugging
        logger.error('Error caught by ErrorBoundary:', { error, errorInfo });

        // Here you can send error to external service (Sentry, etc.)
        // logErrorToService(error, errorInfo);
    }

    handleReload = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    };

    handleFullReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            const { fallback } = this.props;

            // Use custom fallback if provided
            if (fallback) {
                return fallback;
            }

            // Default fallback UI
            return (
                <div className='error-boundary'>
                    <div className='error-boundary__content'>
                        <h2 className='error-boundary__title'>
                            Oops! Something went wrong
                        </h2>
                        <p className='error-boundary__description'>
                            We're sorry for the inconvenience. The application encountered an unexpected error.
                        </p>
                        <div className='error-boundary__actions'>
                            <button
                                className='error-boundary__button error-boundary__button--primary'
                                onClick={this.handleReload}
                            >
                                Try Again
                            </button>
                            <button
                                className='error-boundary__button error-boundary__button--secondary'
                                onClick={this.handleFullReload}
                            >
                                Reload Page
                            </button>
                        </div>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className='error-boundary__details'>
                                <summary className='error-boundary__summary'>
                                    Error Details (Development Only)
                                </summary>
                                <div className='error-boundary__error'>
                                    <strong>Error:</strong>
                                    <pre>{this.state.error.toString()}</pre>
                                    <strong>Stack Trace:</strong>
                                    <pre>{this.state.errorInfo?.componentStack}</pre>
                                </div>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
