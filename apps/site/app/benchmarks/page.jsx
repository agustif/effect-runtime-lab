import { loadRuntimeBench } from "../../lib/data.js"
import { formatBytes, formatMs, formatRssKb } from "../../lib/format.js"

export const dynamic = "force-static"

export default function BenchmarksPage() {
  const bench = loadRuntimeBench()
  const artifacts = bench?.artifacts ?? []
  const startup = bench?.startup ?? []

  // Group by runtime category
  const embedded = startup.filter(s => ["quickjs-host", "txiki-runtime", "txiki-compiled"].includes(s.name))
  const mainstream = startup.filter(s => ["node", "deno", "bun"].includes(s.name))

  // Find fastest mainstream for comparison
  const fastestMainstream = mainstream.length > 0 
    ? mainstream.reduce((fastest, current) => current.wallTimeMs < fastest.wallTimeMs ? current : fastest)
    : null

  return (
    <div>
      <section className="section">
        <div className="section-header">
          <h1 className="section-title">Benchmarks</h1>
          <p className="section-description">
            Startup performance comparison between embedded runtimes (QuickJS, txiki) 
            and mainstream runtimes (Node, Deno, Bun).
          </p>
        </div>

        <div className="info-box">
          <div className="info-box-content">
            <p>
              <strong>Platform:</strong> {bench?.platform?.os ?? "n/a"} / {bench?.platform?.arch ?? "n/a"} · Node {bench?.platform?.node ?? "n/a"}
            </p>
            <p>
              <strong>Generated:</strong> {bench?.generatedAt ? new Date(bench.generatedAt).toLocaleString() : "not generated"}
            </p>
          </div>
        </div>
      </section>

      {/* Comparative Summary */}
      {startup.length > 0 && (
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Startup comparison</h2>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Runtime</th>
                  <th>Category</th>
                  <th>Wall time</th>
                  <th>RSS</th>
                  <th>vs fastest</th>
                </tr>
              </thead>
              <tbody>
                {startup
                  .sort((a, b) => a.wallTimeMs - b.wallTimeMs)
                  .map((record, index) => {
                    const isMainstream = ["node", "deno", "bun"].includes(record.name)
                    const multiplier = fastestMainstream && fastestMainstream.wallTimeMs > 0
                      ? (record.wallTimeMs / fastestMainstream.wallTimeMs).toFixed(1)
                      : "—"
                    
                    return (
                      <tr key={record.name} className={index === 0 ? "highlight-row" : ""}>
                        <td>
                          <strong>{record.name}</strong>
                        </td>
                        <td>
                          <span className={`badge ${isMainstream ? 'badge-neutral' : 'badge-pass'}`}>
                            {isMainstream ? 'Mainstream' : 'Embedded'}
                          </span>
                        </td>
                        <td>{formatMs(record.wallTimeMs)}</td>
                        <td>{formatRssKb(record.maxResidentSetKb)}</td>
                        <td>{index === 0 ? 'baseline' : `${multiplier}×`}</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Embedded runtimes detail */}
      {embedded.length > 0 && (
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Embedded runtimes</h2>
            <p className="section-description">QuickJS and txiki.js — small, embeddable engines</p>
          </div>

          <div className="grid grid-2">
            {embedded.map((record) => (
              <div key={record.name} className="card">
                <div className="card-header">
                  <h3 className="card-title">{record.name}</h3>
                </div>
                <div className="card-content">
                  <div className="stat-row">
                    <span className="stat-label-sm">Startup time</span>
                    <span className="stat-value-sm">{formatMs(record.wallTimeMs)}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label-sm">Memory (RSS)</span>
                    <span className="stat-value-sm">{formatRssKb(record.maxResidentSetKb)}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label-sm">Exit code</span>
                    <span className="stat-value-sm">{record.exitCode}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Mainstream runtimes detail */}
      {mainstream.length > 0 && (
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Mainstream runtimes</h2>
            <p className="section-description">Node.js, Deno, Bun — reference baselines</p>
          </div>

          <div className="grid grid-2">
            {mainstream.map((record) => (
              <div key={record.name} className="card">
                <div className="card-header">
                  <h3 className="card-title">{record.name}</h3>
                </div>
                <div className="card-content">
                  <div className="stat-row">
                    <span className="stat-label-sm">Startup time</span>
                    <span className="stat-value-sm">{formatMs(record.wallTimeMs)}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label-sm">Memory (RSS)</span>
                    <span className="stat-value-sm">{formatRssKb(record.maxResidentSetKb)}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label-sm">Exit code</span>
                    <span className="stat-value-sm">{record.exitCode}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Artifacts */}
      {artifacts.length > 0 && (
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Binary artifacts</h2>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Artifact</th>
                  <th>Size</th>
                  <th>Deps</th>
                </tr>
              </thead>
              <tbody>
                {artifacts.map((artifact) => (
                  <tr key={artifact.path}>
                    <td>
                      <code className="inline-code">{artifact.path.split('/').pop()}</code>
                      <br />
                      <span className="text-muted" style={{fontSize: '0.75rem'}}>
                        {artifact.path}
                      </span>
                    </td>
                    <td>{formatBytes(artifact.size)}</td>
                    <td>{artifact.deps.length} deps</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {startup.length === 0 && (
        <div className="empty-state">
          <p className="empty-state-title">No benchmark data</p>
          <p className="empty-state-description">
            Run <code className="inline-code">pnpm bench:startup</code> to generate benchmark data.
          </p>
        </div>
      )}
    </div>
  )
}
