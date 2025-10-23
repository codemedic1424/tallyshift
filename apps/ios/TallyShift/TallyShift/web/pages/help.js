// pages/help
import Link from 'next/link'

export default function CalendarSyncHelp() {
  return (
    <div className="support-page">
      <div className="support-container">
        <header className="support-header">
          <h1>How to Link Your Schedule</h1>
          <p>
            Follow these quick steps to connect your scheduling app so
            TallyShift can automatically import your shifts.
          </p>
        </header>

        {/* -------- Steps Section -------- */}
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <div className="step-body">
              <h2>Find your schedule link</h2>
              <p>
                In your scheduling app, look for an option such as{' '}
                <strong>“Add to Calendar”</strong> or{' '}
                <strong>“Sync Calendar.”</strong> Then copy the link provided —
                it should end with <code>.ics</code>.
              </p>

              <ul className="app-list">
                <li>
                  <strong>HotSchedules:</strong> My Schedule → Add to Calendar →
                  Copy Link
                </li>
                <li>
                  <strong>7Shifts:</strong> Profile → Sync Calendar → Copy iCal
                  Link
                </li>
                <li>
                  <strong>Restaurant365:</strong> My Schedule → Add to Calendar
                  → Copy iCal Link
                </li>
              </ul>
            </div>
          </div>

          <div className="step-card">
            <div className="step-number">2</div>
            <div className="step-body">
              <h2>Paste it into TallyShift</h2>
              <ol>
                <li>
                  Open{' '}
                  <strong>Settings → Pro Features → Link Your Schedule</strong>
                </li>
                <li>
                  Turn on <strong>Import shifts automatically</strong>
                </li>
                <li>Paste your copied link into the field</li>
                <li>
                  Press <strong>Save Settings</strong>
                </li>
              </ol>
            </div>
          </div>

          <div className="step-card">
            <div className="step-number">3</div>
            <div className="step-body">
              <h2>Sync your shifts</h2>
              <p>
                Your shifts will now appear automatically. To refresh manually,
                tap <strong>“Sync with Schedule(s)”</strong> at the top of your
                calendar.
              </p>
            </div>
          </div>
        </div>

        {/* -------- Troubleshooting Section -------- */}
        <div className="support-section">
          <h2>Troubleshooting</h2>
          <div className="troubleshoot-grid">
            <div className="tip">
              <strong>⚠️ Could not sync?</strong>
              <p>
                Double-check that your link ends with <code>.ics</code>.
              </p>
            </div>
            <div className="tip">
              <strong>📅 No shifts showing?</strong>
              <p>
                Ensure your link is public or accessible without logging in to
                your schedule app.
              </p>
            </div>
            <div className="tip">
              <strong>🔁 Wrong link?</strong>
              <p>Just replace it in Settings and press Save again.</p>
            </div>
          </div>
        </div>

        {/* -------- Privacy Section -------- */}
        <div className="support-section privacy">
          <h2>Privacy</h2>
          <p>
            TallyShift only <strong>reads</strong> your shift times. It never
            edits, shares, or accesses private calendar details.
          </p>
        </div>

        {/* -------- Styles -------- */}
        <style jsx>{`
          .support-page {
            width: 100%;
            display: flex;
            justify-content: center;
            background: #f9fafb;
            min-height: 100vh;
            padding: 16px;
            box-sizing: border-box;
          }

          .support-container {
            background: #fff;
            border-radius: 20px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
            padding: 28px 24px 40px;
            max-width: 780px;
            width: 100%;
            box-sizing: border-box;
            overflow-y: auto;
            max-height: 85vh;
          }

          .support-header {
            text-align: center;
            margin-bottom: 24px;
          }

          .support-header h1 {
            font-size: 1.8rem;
            font-weight: 800;
            color: #111827;
            margin-bottom: 6px;
          }

          .support-header p {
            color: #6b7280;
            font-size: 0.95rem;
            line-height: 1.5;
          }

          .steps-grid {
            display: grid;
            gap: 18px;
            margin-bottom: 28px;
          }

          .step-card {
            display: flex;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 14px;
            padding: 16px;
            align-items: flex-start;
            gap: 12px;
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
          }

          .step-number {
            flex-shrink: 0;
            width: 36px;
            height: 36px;
            border-radius: 999px;
            background: #2563eb;
            color: #fff;
            font-weight: 700;
            font-size: 1.1rem;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-top: 2px;
            box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
          }

          .step-body h2 {
            font-size: 1.05rem;
            font-weight: 700;
            margin: 0 0 6px;
            color: #111827;
          }

          .step-body p,
          .step-body li {
            font-size: 0.93rem;
            color: #374151;
          }

          .step-body ol,
          .step-body ul {
            margin: 8px 0 0 18px;
            line-height: 1.5;
          }

          .app-list {
            margin-top: 8px;
            color: #374151;
          }

          code {
            background: #f3f4f6;
            padding: 1px 5px;
            border-radius: 6px;
            font-family: monospace;
            font-size: 0.85rem;
          }

          .support-section {
            margin-bottom: 20px;
            background: #f9fafb;
            border-radius: 14px;
            border: 1px solid #e5e7eb;
            padding: 16px;
          }

          .support-section h2 {
            font-size: 1.05rem;
            font-weight: 700;
            margin-bottom: 8px;
          }

          .troubleshoot-grid {
            display: grid;
            gap: 12px;
          }

          .tip {
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 10px 12px;
          }

          .tip strong {
            display: block;
            font-weight: 700;
            margin-bottom: 3px;
          }

          .privacy p {
            color: #374151;
            font-size: 0.9rem;
          }

          .support-footer {
            text-align: center;
            margin-top: 20px;
          }

          .back-link {
            font-weight: 700;
            color: #2563eb;
            text-decoration: none;
            transition: color 0.2s ease;
          }

          .back-link:hover {
            color: #1d4ed8;
          }

          @media (max-width: 600px) {
            .support-container {
              padding: 20px 16px;
              border-radius: 16px;
            }
            .step-card {
              flex-direction: column;
              align-items: flex-start;
            }
            .step-number {
              margin-bottom: 6px;
            }
          }
        `}</style>
      </div>

      {/* -------- Footer -------- */}
      <footer className="support-footer">
        <Link href="/profile" className="back-link">
          ← Back to Profile & Settings
        </Link>
      </footer>
    </div>
  )
}
