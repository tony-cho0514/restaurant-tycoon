import { Component, type ReactNode } from 'react';

export interface RecoveryActions {
  restoreBackup: () => void;
  exportRaw: () => void;
  reset: () => void;
}

/** 화면을 그리다 오류가 나면 하얀 화면 대신 한국어 복구 안내를 보여 준다. */
export class ErrorBoundary extends Component<{ children: ReactNode; actions: RecoveryActions }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const { restoreBackup, exportRaw, reset } = this.props.actions;
    return (
      <main className="recovery">
        <div className="card">
          <h2>화면을 그리다 문제가 생겼어요</h2>
          <p>저장된 가게 정보가 망가졌을 수 있어요. 아래 순서대로 해 보세요.</p>
          <div className="recovery-actions">
            <button className="btn primary" onClick={restoreBackup}>백업으로 되돌리기</button>
            <button className="btn" onClick={exportRaw}>저장 원본 내보내기</button>
            <button className="btn danger" onClick={reset}>처음부터 다시</button>
          </div>
        </div>
      </main>
    );
  }
}
