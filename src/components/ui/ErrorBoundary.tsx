import { Component, type ReactNode } from 'react'
export class ErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode; onError?: (e: Error) => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(e: Error) {
    console.error('[OurUniverse] 3D layer failed, switching to 2D:', e)
    this.props.onError?.(e)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
