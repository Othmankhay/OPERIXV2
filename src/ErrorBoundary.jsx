import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] Erreur interceptée:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          height: "100%", padding: 40, background: "#f8fafc", fontFamily: "'DM Sans','Segoe UI',sans-serif",
        }}>
          <div style={{
            background: "#fff", borderRadius: 14, padding: "36px 40px", maxWidth: 520, width: "100%",
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)", border: "1px solid #fca5a5",
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a2744", margin: "0 0 8px" }}>
              Une erreur est survenue
            </h2>
            <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 20px", lineHeight: 1.6 }}>
              L'application a rencontré une erreur inattendue. Vos données ne sont pas perdues.
            </p>
            {this.state.error && (
              <pre style={{
                background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8,
                padding: "10px 14px", fontSize: 12, color: "#dc2626",
                overflowX: "auto", marginBottom: 20, whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                background: "#1a2744", color: "#fff", border: "none", borderRadius: 8,
                padding: "10px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
            >
              Réessayer
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
