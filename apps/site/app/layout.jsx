import "./globals.css"

export const metadata = {
  title: "Effect Runtime Lab",
  description: "Experimental Effect platform adapters for QuickJS and txiki.js",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="header">
          <div className="container">
            <div className="header-content">
              <div className="brand">
                <span className="brand-title">Effect Runtime Lab</span>
                <span className="brand-tagline">Experimental</span>
              </div>
              <nav className="nav" aria-label="Main navigation">
                <a href="/">Overview</a>
                <a href="/runtimes">Runtimes</a>
                <a href="/conformance">Conformance</a>
                <a href="/benchmarks">Benchmarks</a>
                <a href="/roadmap">Roadmap</a>
              </nav>
            </div>
          </div>
        </header>
        <main>
          <div className="container">
            {children}
          </div>
        </main>
        <footer className="footer">
          <div className="container">
            <div className="footer-content">
              <span>Effect Runtime Lab — Platform adapters for embedded JS engines</span>
              <div className="footer-links">
                <a href="https://effect.website" target="_blank" rel="noopener noreferrer">Effect</a>
                <a href="https://bellard.org/quickjs/" target="_blank" rel="noopener noreferrer">QuickJS</a>
                <a href="https://github.com/saghul/txiki.js" target="_blank" rel="noopener noreferrer">txiki.js</a>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
