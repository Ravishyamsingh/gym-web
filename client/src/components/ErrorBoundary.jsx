import { Component } from "react";
import { AlertCircle } from "lucide-react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onReset={this.reset} />;
    }

    return this.props.children;
  }
}

function ErrorFallback({ error, onReset }) {
  return (
    <div className="h-screen w-full bg-void flex items-center justify-center p-4">
      <div className="bg-surface border border-white/10 rounded-lg p-8 max-w-md space-y-4 text-center">
        <div className="flex justify-center">
          <div className="bg-blood/10 p-3 rounded-lg">
            <AlertCircle size={32} className="text-blood" />
          </div>
        </div>
        <h1 className="font-display text-xl font-bold text-light">Something went wrong</h1>
        <p className="text-sm text-white/60">{error?.message || "An unexpected error occurred"}</p>
        <button
          onClick={onReset}
          className="bg-blood text-white px-4 py-2 rounded-lg hover:bg-blood/90 transition-colors text-sm font-medium"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
