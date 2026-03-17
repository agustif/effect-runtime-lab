import { loadEffectCoreConformance } from "../../lib/data.js"
import { formatNumber } from "../../lib/format.js"

export const dynamic = "force-static"

export default function ConformancePage() {
  const conformance = loadEffectCoreConformance()
  const curated = conformance?.curated
  const inventory = conformance?.inventory

  return (
    <div className="section">
      <h2>Effect Core Conformance</h2>
      <p>Generated: {conformance?.generatedAt ?? "not generated"}</p>

      <div className="section card">
        <div className="kicker">Curated Lane</div>
        <p>Total: {formatNumber(curated?.total)}</p>
        <p>Passed: {formatNumber(curated?.passed)}</p>
        <p>Failed: {formatNumber(curated?.failed)}</p>
        <div className="badge">taxonomy {curated?.taxonomy ? "ready" : "n/a"}</div>
      </div>

      <div className="section card">
        <div className="kicker">Failure Taxonomy</div>
        {curated?.taxonomy ? (
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(curated.taxonomy).map(([key, value]) => (
                <tr key={key}>
                  <td>{key}</td>
                  <td>{formatNumber(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Taxonomy not available.</p>
        )}
      </div>

      <div className="section card">
        <div className="kicker">Inventory</div>
        <table className="table">
          <thead>
            <tr>
              <th>Suite</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>effect/test</td>
              <td>{formatNumber(inventory?.effect?.total)}</td>
            </tr>
            <tr>
              <td>platform-node-shared</td>
              <td>{formatNumber(inventory?.platformNodeShared?.total)}</td>
            </tr>
            <tr>
              <td>platform-node</td>
              <td>{formatNumber(inventory?.platformNode?.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="section card">
        <div className="kicker">Curated Results</div>
        <table className="table">
          <thead>
            <tr>
              <th>Case</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Failure</th>
            </tr>
          </thead>
          <tbody>
            {(curated?.results ?? []).map((entry) => (
              <tr key={entry.name}>
                <td>{entry.name}</td>
                <td>{entry.status}</td>
                <td>{entry.durationMs} ms</td>
                <td>{entry.failureType ?? entry.error ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
