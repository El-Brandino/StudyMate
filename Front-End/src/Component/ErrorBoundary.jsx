import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Terjadi error pada aplikasi:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-error-fallback">
          <h2>Terjadi kesalahan saat memuat halaman.</h2>
          <p>Coba muat ulang halaman. Detail error ada di console.</p>
          <button type="button" onClick={() => window.location.reload()}>
            Muat Ulang
          </button>
          <pre>{String(this.state.error?.message || this.state.error)}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}
