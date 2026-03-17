import Link from "next/link"

export const dynamic = "force-static"

export default function RuntimesPage() {
  return (
    <div>
      <section className="section">
        <div className="section-header">
          <h1 className="section-title">Runtimes</h1>
          <p className="section-description">
            Effect platform adapters for embedded and mainstream JavaScript engines.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="grid grid-2">
          {/* QuickJS */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">QuickJS</h3>
              <p className="card-subtitle">@effect-experimental/platform-quickjs</p>
            </div>
            <div className="card-content">
              <p style={{marginBottom: '1rem'}}>
                Native host adapter for QuickJS with expanded file-handle, watch, 
                upload, redirect-follow, and keep-alive coverage.
              </p>
              <ul className="feature-list">
                <li>FileSystem (CRUD, temp, copy, handles, watch)</li>
                <li>HttpClient (timeouts, redirects, uploads)</li>
                <li>Path, Stdio, Console, Logger</li>
                <li>RuntimeMain with keep-alive</li>
              </ul>
            </div>
            <div className="card-footer">
              <Link href="/runtime/quickjs">View details →</Link>
            </div>
          </div>

          {/* txiki */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">txiki.js</h3>
              <p className="card-subtitle">@effect-experimental/platform-txiki</p>
            </div>
            <div className="card-content">
              <p style={{marginBottom: '1rem'}}>
                Adapter for txiki.js — QuickJS with additional system APIs. 
                Same coverage as QuickJS adapter.
              </p>
              <ul className="feature-list">
                <li>FileSystem (CRUD, temp, copy, handles, watch)</li>
                <li>HttpClient (timeouts, redirects, uploads)</li>
                <li>Path, Stdio, Console, Logger</li>
                <li>RuntimeMain with keep-alive</li>
              </ul>
            </div>
            <div className="card-footer">
              <Link href="/runtime/txiki">View details →</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">About these runtimes</h2>
        </div>

        <div className="info-box">
          <div className="info-box-content">
            <p style={{marginBottom: '1rem'}}>
              <strong>QuickJS</strong> is a small, embeddable JavaScript engine by Fabrice Bellard. 
              It implements ES2020 with a focus on size (~1MB) and startup speed. 
              Ideal for plugins, extensions, and sandboxed scripting.
            </p>
            <p>
              <strong>txiki.js</strong> builds on QuickJS, adding system APIs 
              (networking, filesystem, child processes) similar to Node but retaining 
              the small footprint.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">When to use</h2>
        </div>

        <div className="grid grid-2">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Use embedded runtimes when</h3>
            </div>
            <ul className="feature-list">
              <li>Bundle size matters (&lt; 10MB)</li>
              <li>Fast startup is critical (&lt; 50ms)</li>
              <li>Memory is constrained</li>
              <li>Sandboxed execution needed</li>
              <li>Embedding in native apps</li>
              <li>Edge functions with limits</li>
            </ul>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Stick with Node/Bun when</h3>
            </div>
            <ul className="feature-list">
              <li>Full npm ecosystem needed</li>
              <li>Native addons required</li>
              <li>Mature debugging tools</li>
              <li>Large existing codebase</li>
              <li>Production stability priority</li>
              <li>Team expertise</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
