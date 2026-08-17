"use client";

import { useEffect, useId, useState } from "react";

let renderQueue: Promise<unknown> = Promise.resolve();

async function renderChart(id: string, chart: string) {
  const { default: mermaid } = await import("mermaid");
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: dark ? "dark" : "neutral",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    flowchart: {
      htmlLabels: true,
      useMaxWidth: false,
      curve: "basis",
    },
  });

  const result = await mermaid.render(id, chart);
  return result.svg;
}

export function MermaidDiagram({ chart }: { chart: string }) {
  const reactId = useId();
  const [svg, setSvg] = useState("");
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let cancelled = false;
    const diagramId = `mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
    const task = renderQueue.then(() => renderChart(diagramId, chart));
    renderQueue = task.catch(() => undefined);

    task
      .then((rendered) => {
        if (!cancelled) {
          setSvg(rendered);
          setError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [chart, reactId]);

  if (error) {
    return (
      <figure className="mermaid-figure mermaid-error">
        <figcaption>流程图暂时无法渲染，下面保留原始定义</figcaption>
        <pre><code>{chart}</code></pre>
      </figure>
    );
  }

  return (
    <figure className="mermaid-figure">
      <header className="mermaid-toolbar">
        <figcaption>
          <strong>流程图</strong>
          <span>可缩放，内容较宽时可左右滑动</span>
        </figcaption>
        <div className="mermaid-controls" aria-label="流程图缩放控制">
          <button
            type="button"
            onClick={() => setZoom((value) => Math.max(0.75, value - 0.25))}
            aria-label="缩小流程图"
          >
            −
          </button>
          <button type="button" onClick={() => setZoom(1)} aria-label="恢复流程图原始大小">
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setZoom((value) => Math.min(2, value + 0.25))}
            aria-label="放大流程图"
          >
            +
          </button>
        </div>
      </header>
      <div className="mermaid-viewport" role="img" aria-label="教程流程图">
        {svg ? (
          <div
            className="mermaid-canvas"
            style={{ width: `${zoom * 100}%` }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div className="mermaid-loading" role="status"><span />正在绘制流程图…</div>
        )}
      </div>
    </figure>
  );
}

