const REPO = "https://github.com/kevisc/empiria";

interface WelcomeProps {
  onClose: () => void;
  onStartTour: () => void;
}

/** First-visit landing / quick tour, reopenable from the toolbar "?" button. */
export default function Welcome({ onClose, onStartTour }: WelcomeProps) {
  return (
    <div className="welcome-overlay" onClick={onClose}>
      <div
        className="welcome-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to Empiria"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="welcome-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="welcome-eyebrow">Simulation-based statistics, on a canvas</div>
        <h1 className="welcome-title">Empiria</h1>
        <p className="welcome-lead">
          Learn statistics by <em>building</em> it. Wire small modules together —
          data-generating processes, estimators, hypothesis tests, the bootstrap,
          diagnostics — and watch every result update live as the clock runs.
        </p>

        <div className="welcome-cols">
          <div>
            <h3>Quick start</h3>
            <ul>
              <li><b>▶ Run</b> (top-left) starts the clock.</li>
              <li>Drag from a node's right <b>●</b> port to another's left <b>●</b> to wire them.</li>
              <li><b>📚 Lessons</b> are ready-made guided activities.</li>
              <li><b>ⓘ</b> on any node explains it, with the live formula.</li>
              <li><b>Save · 🔗 Share · 🖼 Figure</b> export your work.</li>
            </ul>
          </div>
          <div>
            <h3>Info &amp; help</h3>
            <ul className="welcome-links">
              <li><a href={`${REPO}/blob/main/GUIDE.md`} target="_blank" rel="noopener">User guide / manual ↗</a></li>
              <li><a href={`${REPO}/blob/main/VERIFICATION.md`} target="_blank" rel="noopener">How the math is verified ↗</a></li>
              <li><a href={`${REPO}/blob/main/paper.md`} target="_blank" rel="noopener">Design &amp; background ↗</a></li>
              <li><a href={REPO} target="_blank" rel="noopener">Source code (GitHub) ↗</a></li>
            </ul>
          </div>
        </div>

        <div className="welcome-actions">
          <button className="welcome-primary" onClick={onStartTour}>
            ★ Take the 4-step tour
          </button>
          <button onClick={onClose}>Start exploring →</button>
        </div>

        <p className="welcome-foot">
          Reopen this any time with the <b>?</b> button in the toolbar.
        </p>
      </div>
    </div>
  );
}
