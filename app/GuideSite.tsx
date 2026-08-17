"use client";

import {
  createElement,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MermaidDiagram } from "./MermaidDiagram";

type TocItem = {
  depth: number;
  id: string;
  title: string;
};

function plainText(value: ReactNode): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) return value.map(plainText).join("");
  if (value && typeof value === "object" && "props" in value) {
    return plainText((value as { props?: { children?: ReactNode } }).props?.children);
  }
  return "";
}

function cleanMarkdownTitle(value: string) {
  return value
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_~]/g, "")
    .trim();
}

function slugify(value: string) {
  return cleanMarkdownTitle(value)
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function heading(level: 1 | 2 | 3 | 4) {
  return function MarkdownHeading({ children }: { children?: ReactNode }) {
    const title = plainText(children);
    const id = slugify(title);
    return createElement(
      `h${level}`,
      { id },
      children,
      createElement(
        "a",
        {
          className: "heading-anchor",
          href: `#${id}`,
          "aria-label": `链接到：${title}`,
        },
        "#",
      ),
    );
  };
}

function MarkdownPre({ children }: { children?: ReactNode }) {
  const child = Array.isArray(children) ? children[0] : children;
  if (
    child &&
    typeof child === "object" &&
    "props" in child &&
    String((child as { props?: { className?: string } }).props?.className).includes("language-mermaid")
  ) {
    return <>{children}</>;
  }
  return <pre>{children}</pre>;
}

function MarkdownCode({ className, children }: { className?: string; children?: ReactNode }) {
  if (className?.includes("language-mermaid")) {
    return <MermaidDiagram chart={String(children).trim()} />;
  }
  return <code className={className}>{children}</code>;
}

export function GuideSite() {
  const [markdown, setMarkdown] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState("top");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch("flutter-guide.md", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("教程加载失败");
        return response.text();
      })
      .then(setMarkdown)
      .catch((reason: unknown) => {
        if ((reason as { name?: string })?.name !== "AbortError") {
          setError("教程暂时没有加载成功，请刷新页面重试。");
        }
      });
    return () => controller.abort();
  }, []);

  const toc = useMemo<TocItem[]>(() => {
    if (!markdown) return [];
    return [...markdown.matchAll(/^(##|###)\s+(.+)$/gm)].map((match) => {
      const title = cleanMarkdownTitle(match[2]);
      return { depth: match[1].length, id: slugify(title), title };
    });
  }, [markdown]);

  const searchResults = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return toc
      .filter((item) => item.title.toLowerCase().includes(normalized))
      .slice(0, 12);
  }, [query, toc]);

  useEffect(() => {
    const updateProgress = () => {
      const available = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(available > 0 ? Math.min(100, (window.scrollY / available) * 100) : 0);
    };
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, [markdown]);

  useEffect(() => {
    if (!markdown) return;
    const sections = document.querySelectorAll<HTMLElement>(
      "#top, #bridge-map, .markdown-body h2, .markdown-body h3",
    );
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target.id) setActiveId(visible.target.id);
      },
      { rootMargin: "-88px 0px -72% 0px", threshold: [0, 1] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [markdown]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="site-shell">
      <div className="reading-progress" style={{ width: `${progress}%` }} />

      <header className="topbar">
        <a className="brand" href="#top" aria-label="回到首页" onClick={closeMenu}>
          <span className="brand-mark">F</span>
          <span>
            <strong>Flutter Bridge</strong>
            <small>uni-app 开发者速通课</small>
          </span>
        </a>

        <div className="topbar-actions">
          <div className="search-wrap">
            <label className="sr-only" htmlFor="guide-search">
              搜索教程章节
            </label>
            <input
              id="guide-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索章节…"
              autoComplete="off"
            />
            {query && (
              <div className="search-results" role="listbox" aria-label="搜索结果">
                {searchResults.length ? (
                  searchResults.map((item) => (
                    <a
                      key={`${item.depth}-${item.id}`}
                      href={`#${item.id}`}
                      onClick={() => {
                        setQuery("");
                        closeMenu();
                      }}
                    >
                      <span>{item.depth === 2 ? "章节" : "小节"}</span>
                      {item.title}
                    </a>
                  ))
                ) : (
                  <p>没有匹配的章节</p>
                )}
              </div>
            )}
          </div>
          <button
            className="menu-button"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="guide-sidebar"
            onClick={() => setMenuOpen((value) => !value)}
          >
            {menuOpen ? "关闭" : "目录"}
          </button>
        </div>
      </header>

      <div className="docs-layout">
        <aside id="guide-sidebar" className={`sidebar ${menuOpen ? "is-open" : ""}`}>
          <nav aria-label="教程目录">
            <p className="nav-label">开始</p>
            <a className={activeId === "top" ? "active" : ""} href="#top" onClick={closeMenu}>
              课程首页
            </a>
            <a
              className={activeId === "bridge-map" ? "active" : ""}
              href="#bridge-map"
              onClick={closeMenu}
            >
              交互心智图
            </a>
            <p className="nav-label nav-label-chapters">完整教程</p>
            {toc
              .filter((item) => item.depth === 2)
              .map((item) => (
                <a
                  key={item.id}
                  className={activeId === item.id ? "active" : ""}
                  href={`#${item.id}`}
                  onClick={closeMenu}
                >
                  {item.title}
                </a>
              ))}
          </nav>
        </aside>

        {menuOpen && <button className="menu-backdrop" type="button" onClick={closeMenu} aria-label="关闭目录" />}

        <main className="content">
          <section id="top" className="hero">
            <p className="eyebrow">HTML · CSS · JavaScript → Flutter</p>
            <h1>别把 Flutter 当成<br />“没有 HTML 的 Vue”</h1>
            <p className="hero-copy">
              用你熟悉的 <code>uniapp-match-driver</code>，读懂真实的 <code>flutter_match_driver</code>。
              从心智模型、业务页面到架构、测试和性能，一条路走到底。
            </p>
            <div className="hero-actions">
              <a className="primary-action" href="#bridge-map">先看交互对照图 <span>↓</span></a>
              <a className="secondary-action" href="#给-uniapp-match-driver-开发者的-flutter-项目速通课">
                开始完整教程
              </a>
            </div>
            <dl className="hero-stats">
              <div><dt>23</dt><dd>核心章节</dd></div>
              <div><dt>2</dt><dd>真实项目对照</dd></div>
              <div><dt>30</dt><dd>天进阶路线</dd></div>
            </dl>
          </section>

          <section id="bridge-map" className="visual-section" aria-labelledby="visual-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Interactive map</p>
                <h2 id="visual-title">先建立翻译器，再开始写代码</h2>
              </div>
              <span className="section-chip">结构 · 布局 · 状态 · 异步 · 路由</span>
            </div>
            <iframe
              className="bridge-frame"
              src="flutter-bridge-map.html"
              title="uni-app 到 Flutter 交互心智模型"
              sandbox="allow-scripts"
              referrerPolicy="no-referrer"
            />
          </section>

          <section className="article-intro">
            <p className="eyebrow">The complete guide</p>
            <h2>完整对照教程</h2>
            <p>不用从头背 Widget。沿着真实业务，把你已有的前端能力逐步翻译过去。</p>
          </section>

          {error ? (
            <div className="status-card error-card" role="alert">{error}</div>
          ) : !markdown ? (
            <div className="status-card loading-card" role="status">
              <span />正在展开完整教程…
            </div>
          ) : (
            <article className="markdown-body">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: heading(1),
                  h2: heading(2),
                  h3: heading(3),
                  h4: heading(4),
                  a: ({ href, children }) => {
                    const external = href?.startsWith("http");
                    return (
                      <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>
                        {children}{external ? <span className="external-mark">↗</span> : null}
                      </a>
                    );
                  },
                  table: ({ children }) => <div className="table-scroll"><table>{children}</table></div>,
                  pre: MarkdownPre,
                  code: MarkdownCode,
                  blockquote: ({ children }) => <blockquote>{children}</blockquote>,
                }}
              >
                {markdown}
              </ReactMarkdown>
            </article>
          )}

          <footer className="site-footer">
            <strong>Flutter Bridge</strong>
            <span>从熟悉的前端世界，走到真正可维护的 Flutter 工程。</span>
            <a href="#top">回到顶部 ↑</a>
          </footer>
        </main>
      </div>
    </div>
  );
}

