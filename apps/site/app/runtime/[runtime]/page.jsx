import { loadSupportMatrix, loadScorecard, loadRuntimeReadme } from "../../../lib/data.js";

export const dynamic = "force-static";

export const generateStaticParams = () => [{ runtime: "quickjs" }, { runtime: "txiki" }];

const titleMap = {
  quickjs: "QuickJS Runtime",
  txiki: "txiki Runtime",
};

export default function RuntimeDetailPage({ params }) {
  const runtime = params?.runtime ?? "quickjs";
  const supportMatrix = loadSupportMatrix(runtime) ?? "Support matrix not found.";
  const scorecard = loadScorecard(runtime) ?? "Scorecard not found.";
  const readme = loadRuntimeReadme(runtime) ?? "README not found.";

  return (
    <div className="section">
      <div className="kicker">Runtime detail</div>
      <h2>{titleMap[runtime] ?? runtime}</h2>

      <div className="section card">
        <div className="kicker">Support Matrix</div>
        <pre>{supportMatrix}</pre>
      </div>

      <div className="section card">
        <div className="kicker">Scorecard</div>
        <pre>{scorecard}</pre>
      </div>

      <div className="section card">
        <div className="kicker">Package README</div>
        <pre>{readme}</pre>
      </div>
    </div>
  );
}
