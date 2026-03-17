import { loadEffectCoreConformance, loadRuntimeBench } from "../../lib/data.js"
import { formatBytes, formatMs, formatNumber, formatRssKb } from "../../lib/format.js"

export const dynamic = "force-static"

export default function TruthSurfacePage() {
  const bench = loadRuntimeBench()
  const conformance = loadEffectCoreConformance()

  const quickjs = bench?.startup?.find((entry) => entry.name === "quickjs-host")
  const txiki = bench?.startup?.find((entry) => entry.name === "txiki-runtime")
  const node = bench?.startup?.find((entry) => entry.name === "node")
  const bun = bench?.startup?.find((entry) => entry.name === "bun")

  const quickjsArtifact = bench?.artifacts?.find((entry) => entry.path.includes("effect-quickjs-host"))
  const txikiArtifact = bench?.artifacts?.find((entry) => entry.path.includes("txikijs"))

  return (
    <div>
      <section className="section">
        <div className="section-header">
          <h1 className="section-title">Status at a glance</h1>
          <p className="section-description">
            Aggregated evidence from generated snapshots. Runtime metrics and conformance status.
          </p>
        </div>
      </section>

      {/* Runtime metrics */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Runtime metrics</h2>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Runtime</th>
                <th>Startup</th>
                <th>Memory (RSS)</th>
                <th>Artifact size</th>
              </tr>
            </thead>
            <tbody>
              {quickjs && (
                <tr>
                  <td><strong>QuickJS</strong></td>
                  <td>{formatMs(quickjs.wallTimeMs)}</td>
                  <td>{formatRssKb(quickjs.maxResidentSetKb)}</td>
                  <td>{formatBytes(quickjsArtifact?.size)}</td>
                </tr>
              )}
              {txiki && (
                <tr>
                  <td><strong>txiki.js</strong></td>
                  <td>{formatMs(txiki.wallTimeMs)}</td>
                  <td>{formatRssKb(txiki.maxResidentSetKb)}</td>
                  <td>{formatBytes(txikiArtifact?.size)}</td>
                </tr>
              )}
              {node && (
                <tr>
                  <td>Node.js (reference)</td>
                  <td>{formatMs(node.wallTimeMs)}</td>
                  <td>{formatRssKb(node.maxResidentSetKb)}</td>
                  <td>—</td>
                </tr>
              )}
              {bun && (
                <tr>
                  <td>Bun (reference)</td>
                  <td>{formatMs(bun.wallTimeMs)}</td>
                  <td>{formatRssKb(bun.maxResidentSetKb)}</td>
                  <td>—</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Conformance */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Conformance status</h2>
        </div>

        <div className="summary-grid">
          <div className="summary-card">
            <span className="summary-card-label">Total cases</span>
            <span className="summary-card-value">{formatNumber(conformance?.curated?.total)}</span>
          </div>
          <div className="summary-card">
            <span className="summary-card-label">Passed</span>
            <span className="summary-card-value" style={{color: 'var(--pass)'}}>{formatNumber(conformance?.curated?.passed)}</span>
          </div>
          <div className="summary-card">
            <span className="summary-card-label">Failed</span>
            <span className="summary-card-value" style={{color: 'var(--fail)'}}>{formatNumber(conformance?.curated?.failed)}</span>
          </div>
          <div className="summary-card">
            <span className="summary-card-label">Pass rate</span>
            <span className="summary-card-value">
              {conformance?.curated?.total > 0 
                ? Math.round((conformance.curated.passed / conformance.curated.total) * 100) + '%'
                : '—'}
            </span>
          </div>
        </div>

        <div style={{marginTop: '1.5rem'}}>
          <a href="/conformance">View full conformance details →</a>
        </div>
      </section>

      {/* Links */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Quick links</h2>
        </div>

        <div className="grid grid-2">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Documentation</h3>
            </div>
            <div className="card-content">
              <p><a href="/runtime/quickjs">QuickJS runtime details</a></p>
              <p><a href="/runtime/txiki">txiki.js runtime details</a></p>
              <p><a href="/benchmarks">Benchmarks</a></p>
              <p><a href="/conformance">Conformance</a></p>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">External</h3>
            </div>
            <div className="card-content">
              <p><a href="https://effect.website" target="_blank" rel="noopener noreferrer">Effect documentation →</a></p>
              <p><a href="https://bellard.org/quickjs/" target="_blank" rel="noopener noreferrer">QuickJS →</a></p>
              <p><a href="https://github.com/saghul/txiki.js" target="_blank" rel="noopener noreferrer">txiki.js →</a></p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
