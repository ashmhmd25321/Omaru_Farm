import { Component, type ErrorInfo, type ReactNode } from 'react'

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Public site render error', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-surface px-5 text-center">
          <div className="max-w-md rounded-xl border border-parchment bg-white p-8 shadow-[0_16px_56px_rgba(26,18,8,0.08)]">
            <p className="font-heading text-2xl font-semibold text-charcoal">Something went wrong</p>
            <p className="mt-3 text-sm leading-relaxed text-stone">
              Please refresh the page. If the problem continues, contact Omaru Farm and we&apos;ll help you directly.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 rounded-md bg-gold px-5 py-2 text-sm font-semibold text-charcoal transition hover:bg-[#dfb55f]"
            >
              Refresh page
            </button>
          </div>
        </main>
      )
    }

    return this.props.children
  }
}
