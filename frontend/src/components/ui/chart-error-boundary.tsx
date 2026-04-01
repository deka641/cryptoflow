"use client";

import { Component, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  compact?: boolean;
}

interface State {
  hasError: boolean;
}

export class ChartErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("Chart render error:", error);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className={`flex flex-col items-center justify-center gap-3 text-center ${
            this.props.compact ? "py-8" : "py-16"
          }`}
        >
          <div className="flex size-10 items-center justify-center rounded-full bg-red-500/10">
            <AlertCircle className="size-5 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-300">
              Chart could not be rendered
            </p>
            <p className="text-xs text-slate-400 mt-1">
              An error occurred while rendering this chart.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleRetry}
            className="border-slate-700 text-slate-300 hover:text-white"
          >
            <RefreshCw className="size-3.5 mr-1.5" />
            Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
