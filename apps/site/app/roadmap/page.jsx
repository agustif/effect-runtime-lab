import { loadRoadmap } from "../../lib/data.js"

export const dynamic = "force-static"

export default function RoadmapPage() {
  return (
    <div>
      <section className="section">
        <div className="section-header">
          <h1 className="section-title">Roadmap</h1>
          <p className="section-description">
            Working plan for the next implementation batches. Adjusted as evidence changes.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Current focus</h2>
        </div>

        <div className="grid grid-2">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">FileSystem depth</h3>
              <span className="badge badge-pass">In progress</span>
            </div>
            <ul className="feature-list">
              <li>Watch semantics (create/update/remove)</li>
              <li>File handle append/truncate</li>
              <li>Cursor behavior</li>
              <li>Sync/fsync policy</li>
            </ul>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">HTTP coverage</h3>
              <span className="badge badge-pass">In progress</span>
            </div>
            <ul className="feature-list">
              <li>Redirect following</li>
              <li>Timeout/abort behavior</li>
              <li>Upload streaming</li>
              <li>Multipart forms</li>
            </ul>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Conformance expansion</h3>
              <span className="badge badge-pass">Active</span>
            </div>
            <ul className="feature-list">
              <li>FiberSet coverage</li>
              <li>Queue semantics</li>
              <li>Stream interruption</li>
              <li>Request batching</li>
            </ul>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Release readiness</h3>
              <span className="badge badge-neutral">Pending</span>
            </div>
            <ul className="feature-list">
              <li>Support matrix reconciliation</li>
              <li>Scorecard updates</li>
              <li>Blocker classification</li>
              <li>v1 claim checkpoint</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">10 batch plan</h2>
          <p className="section-description">
            Implementation batches from current state. Exit criteria for each.
          </p>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Batch</th>
                <th>Focus</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>QuickJS watch design and host policy</td>
                <td><span className="badge badge-pass">Done</span></td>
              </tr>
              <tr>
                <td>2</td>
                <td>Shared richer watch conformance</td>
                <td><span className="badge badge-pass">Done</span></td>
              </tr>
              <tr>
                <td>3</td>
                <td>QuickJS real-host file-handle depth</td>
                <td><span className="badge badge-pass">Done</span></td>
              </tr>
              <tr>
                <td>4</td>
                <td>Txiki richer file-handle semantics</td>
                <td><span className="badge badge-pass">Done</span></td>
              </tr>
              <tr>
                <td>5</td>
                <td>Shared HTTP richer error coverage</td>
                <td><span className="badge badge-pass">Done</span></td>
              </tr>
              <tr>
                <td>6</td>
                <td>Upload and multipart groundwork</td>
                <td><span className="badge badge-pass">Done</span></td>
              </tr>
              <tr>
                <td>7</td>
                <td>QuickJS upload or explicit defer</td>
                <td><span className="badge badge-pass">Done</span></td>
              </tr>
              <tr>
                <td>8</td>
                <td>Txiki artifact and dependency proofing</td>
                <td><span className="badge badge-pass">Done</span></td>
              </tr>
              <tr>
                <td>9</td>
                <td>Effect-core curated expansion</td>
                <td><span className="badge badge-pass">Active</span></td>
              </tr>
              <tr>
                <td>10</td>
                <td>Release-readiness checkpoint</td>
                <td><span className="badge badge-neutral">Pending</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <div className="info-box">
          <div className="info-box-title">About this roadmap</div>
          <div className="info-box-content">
            <p>
              This is a working document, not a commitment. Batches are adjusted as implementation 
              evidence changes. Check the repo for current status.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
