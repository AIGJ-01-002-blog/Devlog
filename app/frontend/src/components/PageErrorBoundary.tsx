import { Component, type ReactNode } from 'react'

/**
 * 나뉜 화면을 받지 못했을 때(새로 고친 뒤에도 실패) 앱 전체가 비지 않게 이 자리에만 안내를 띄운다.
 * 주소(`path`)가 바뀌면 안내를 걷고 새 화면을 다시 시도한다. 화면을 새로 만들지는 않아 탭 전환 같은 상태는 그대로다.
 */
type Props = { path: string; children: ReactNode }
type State = { failed: boolean; path: string }

export class PageErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, path: this.props.path }

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true }
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.path === state.path ? null : { failed: false, path: props.path }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="container">
        <p className="muted center" role="alert">화면을 불러오지 못했어요. 연결을 확인하고 다시 시도해 주세요.</p>
        <p className="center"><button type="button" className="btn" onClick={() => window.location.reload()}>다시 시도</button></p>
      </main>
    )
  }
}
