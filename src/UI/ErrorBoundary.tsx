import React from "react";

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: "system-ui", color: "white" }}>
          <h2 style={{ marginTop: 0 }}>💥 The app is down</h2>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              padding: 12,
              borderRadius: 12,
              maxWidth: 900,
              overflowX: "auto",
            }}
          >
            {String(this.state.error.stack || this.state.error.message)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}