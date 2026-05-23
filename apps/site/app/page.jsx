import { loadEffectCoreConformance, loadRuntimeBench } from "../lib/data.js";
import { formatBytes, formatMs, formatNumber } from "../lib/format.js";

export const dynamic = "force-static";

export default function HomePage() {
  const bench = loadRuntimeBench();
  const conformance = loadEffectCoreConformance();

  const quickjsPassed = conformance?.curated?.passed ?? 0;
  const quickjsTotal = conformance?.curated?.total ?? 0;
  const quickjsRate = quickjsTotal > 0 ? Math.round((quickjsPassed / quickjsTotal) * 100) : 0;

  return (
    <div>
      {/* Hero - Clear explanation */}
      <section className="hero">
        <h1 className="hero-title">Effect for embedded JavaScript engines</h1>
        <p className="hero-description">
          Platform adapters that run Effect programs on QuickJS and txiki.js. For sandboxed plugins,
          edge functions, and resource-constrained environments where Node.js is too heavy.
        </p>
        <div className="hero-meta">
          <span>Effect v4</span>
          <span>·</span>
          <span>QuickJS</span>
          <span>·</span>
          <span>txiki.js</span>
        </div>
      </section>

      {/* What this is */}
      <section className="section">
        <div className="info-box">
          <div className="info-box-title">What this project does</div>
          <div className="info-box-content">
            <p>
              <a href="https://effect.website" target="_blank" rel="noopener noreferrer">
                Effect
              </a>{" "}
              is a functional effect system for TypeScript. This project provides platform adapters
              that implement Effect&apos;s runtime services (FileSystem, HttpClient, Path, etc.) for
              embedded JS engines.
            </p>
            <p>
              <a href="https://bellard.org/quickjs/" target="_blank" rel="noopener noreferrer">
                QuickJS
              </a>{" "}
              is a small embeddable JS engine (~1MB).
              <a
                href="https://github.com/saghul/txiki.js"
                target="_blank"
                rel="noopener noreferrer"
              >
                txiki.js
              </a>{" "}
              builds on QuickJS with additional system APIs.
            </p>
          </div>
        </div>
      </section>

      {/* Current status */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Current status</h2>
          <p className="section-description">
            Experimental. Core services work. Not full upstream parity.
          </p>
        </div>

        <div className="summary-grid">
          <div className="summary-card">
            <span className="summary-card-label">Conformance</span>
            <span className="summary-card-value">{quickjsRate}%</span>
            <span className="summary-card-meta">
              {formatNumber(quickjsPassed)} of {formatNumber(quickjsTotal)} tests passing
            </span>
          </div>

          <div className="summary-card">
            <span className="summary-card-label">QuickJS artifact</span>
            <span className="summary-card-value">
              {formatBytes(bench?.artifacts?.find((a) => a.path.includes("quickjs"))?.size)}
            </span>
            <span className="summary-card-meta">Native host binary</span>
          </div>

          <div className="summary-card">
            <span className="summary-card-label">Startup time</span>
            <span className="summary-card-value">
              {formatMs(bench?.startup?.find((s) => s.name === "quickjs-host")?.wallTimeMs)}
            </span>
            <span className="summary-card-meta">Cold start</span>
          </div>
        </div>
      </section>

      {/* What's implemented */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">What&apos;s working</h2>
        </div>

        <div className="grid grid-2">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">FileSystem</h3>
            </div>
            <ul className="feature-list">
              <li>Basic CRUD operations</li>
              <li>Temp file primitives</li>
              <li>Copy semantics</li>
              <li>Basic file handles</li>
              <li>Watch (create/update/remove)</li>
            </ul>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">HttpClient</h3>
            </div>
            <ul className="feature-list">
              <li>Basic request/response</li>
              <li>Timeout and abort</li>
              <li>Redirect following</li>
              <li>Byte upload</li>
              <li>Stream body upload</li>
              <li>Multipart form</li>
            </ul>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Runtime</h3>
            </div>
            <ul className="feature-list">
              <li>Path operations</li>
              <li>Stdio streams</li>
              <li>Console/Logger</li>
              <li>RuntimeMain</li>
              <li>Keep-alive semantics</li>
            </ul>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Not yet complete</h3>
            </div>
            <ul className="feature-list disabled">
              <li>Richer watch semantics</li>
              <li>Advanced file handles</li>
              <li>Deep multipart streaming</li>
              <li>Cross-platform deployability</li>
              <li>Full upstream parity</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Packages</h2>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Package</th>
                <th>Description</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code className="inline-code">@effect-experimental/platform-quickjs</code>
                </td>
                <td>QuickJS host adapter with native bindings</td>
                <td>
                  <span className="badge badge-pass">Active</span>
                </td>
              </tr>
              <tr>
                <td>
                  <code className="inline-code">@effect-experimental/platform-txiki</code>
                </td>
                <td>txiki.js adapter</td>
                <td>
                  <span className="badge badge-pass">Active</span>
                </td>
              </tr>
              <tr>
                <td>
                  <code className="inline-code">@effect-experimental/platform-quickjs-shared</code>
                </td>
                <td>Shared QuickJS-family core</td>
                <td>
                  <span className="badge badge-pass">Active</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Usage */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Usage</h2>
        </div>

        <div className="code-block">
          <pre>{`import { Effect } from "effect"
import { QuickJSServices } from "@effect-experimental/platform-quickjs"

// Your Effect program
const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const content = yield* fs.readFileString("config.json")
  return JSON.parse(content)
})

// Run on QuickJS
const runnable = program.pipe(
  Effect.provide(QuickJSServices.layer)
)
`}</pre>
        </div>
      </section>
    </div>
  );
}
