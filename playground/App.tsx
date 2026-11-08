import { useEffect, useMemo, useState } from 'react';
import { CHARTS, readConfig, type RenderStatus, type ThemeName } from 'gptvis-vchart';
import { GPTVisChart } from 'gptvis-vchart/react';
import { EXAMPLES, type Renderer } from './examples';

const THEMES: { id: ThemeName; label: string }[] = [
  { id: 'default', label: '纸感' },
  { id: 'light', label: '浅色' },
  { id: 'academy', label: '学院' },
  { id: 'dark', label: '深色' },
];

const RENDERER_LABEL: Record<Renderer, string> = {
  VChart: 'VChart 原生',
  SVG: 'SVG 布局',
  HTML: '安全 HTML',
};

const RENDERER_BY_TYPE = Object.fromEntries(EXAMPLES.map((example) => [example.type, example.renderer])) as Record<
  string,
  Renderer | undefined
>;

export function App() {
  const [source, setSource] = useState(EXAMPLES[0].source);
  const [activeId, setActiveId] = useState(EXAMPLES[0].id);
  const [theme, setTheme] = useState<ThemeName>('default');
  const [streaming, setStreaming] = useState(false);
  const [status, setStatus] = useState<RenderStatus | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [layoutMode, setLayoutMode] = useState('hero');

  useEffect(() => {
    if (!streaming) return;
    const full = source;
    let count = 0;
    setSource('');
    const timer = window.setInterval(() => {
      count += Math.max(3, Math.round(full.length / 110));
      setSource(full.slice(0, count));
      if (count >= full.length) {
        window.clearInterval(timer);
        setStreaming(false);
      }
    }, 28);
    return () => window.clearInterval(timer);
    // Freeze the source that playback started with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streaming]);

  const parsed = useMemo(() => {
    try {
      return JSON.stringify(readConfig(source, { streaming }), null, 2);
    } catch (error) {
      return error instanceof Error ? error.message : '无法解析';
    }
  }, [source, streaming]);

  const active = EXAMPLES.find((example) => example.id === activeId);
  const config = readConfig(source, { streaming });
  const renderer = RENDERER_BY_TYPE[config.type] ?? active?.renderer ?? 'VChart';
  const lineCount = source ? source.split('\n').length : 0;

  function choose(id: string) {
    const example = EXAMPLES.find((item) => item.id === id);
    if (!example) return;
    setStreaming(false);
    setActiveId(id);
    setSource(example.source);
    setStatus(null);
  }

  function play() {
    if (streaming) {
      setStreaming(false);
      return;
    }
    const example = EXAMPLES.find((item) => item.id === activeId);
    if (example) setSource(example.source);
    setStreaming(true);
  }

  function updateSource(value: string) {
    setSource(value);
    setStreaming(false);
    setActiveId('');
  }

  return (
    <main className="studio">
      <header className="masthead">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div>
            <p className="eyebrow">VisActor × GPT-Vis</p>
            <h1>GPTVis <em>VChart</em></h1>
          </div>
        </div>
        <p className="lede">
          模型继续输出 vis 语法。解析、容错与流式更新保持 GPT-Vis 的体验，统计图交给 VChart 原生绘制，
          关系结构则用可预测的 SVG 布局。
        </p>
        <div className="headline-stats" aria-label="渲染覆盖">
          <span><strong>26</strong> 图表类型</span>
          <span><strong>17</strong> 原生 VChart</span>
          <span><strong>9</strong> 回退布局</span>
        </div>
      </header>

      <div className="workspace">
        <aside className="source-pane">
          <div className="pane-head">
            <div>
              <p className="section-kicker">Input</p>
              <h2>vis 语法</h2>
            </div>
            <span className="line-count">{lineCount} 行</span>
          </div>

          <div className="example-picker" role="tablist" aria-label="图表示例">
            {EXAMPLES.map((example) => (
              <button
                key={example.id}
                type="button"
                role="tab"
                aria-selected={example.id === activeId}
                className={example.id === activeId ? 'example on' : 'example'}
                onClick={() => choose(example.id)}
              >
                <span>{example.label}</span>
                <small>{example.renderer}</small>
              </button>
            ))}
          </div>

          <label className="editor-label" htmlFor="vis-source">
            <span>SOURCE</span>
            <span>{config.type || 'waiting'}</span>
          </label>
          <div className="editor-shell">
            <div className="editor-gutter" aria-hidden="true">
              {Array.from({ length: Math.max(12, lineCount) }, (_, index) => (
                <span key={index}>{index + 1}</span>
              ))}
            </div>
            <textarea
              id="vis-source"
              spellCheck={false}
              value={source}
              onChange={(event) => updateSource(event.target.value)}
              aria-label="vis 语法编辑器"
            />
          </div>

          <div className="source-toolbar">
            <button type="button" className="primary" onClick={play}>
              <span className={streaming ? 'play-icon stop' : 'play-icon'} aria-hidden="true" />
              {streaming ? '停止播放' : '流式播放'}
            </button>
            <button
              type="button"
              className={showConfig ? 'ghost on' : 'ghost'}
              onClick={() => setShowConfig((value) => !value)}
            >
              解析结果
            </button>
          </div>
          {showConfig ? <pre className="config">{parsed}</pre> : null}
        </aside>

        <section className="stage-pane">
          <div className="stage-toolbar">
            <div className="stage-meta">
              <span className={status ? `state-dot ${status.state}` : 'state-dot'} />
              <div>
                <p>{status?.message ?? '等待渲染'}</p>
                <span>{active?.label ?? config.type ?? '自定义配置'}</span>
              </div>
            </div>
            <div className="stage-controls">
              <span className={`render-badge ${renderer.toLowerCase()}`}>{RENDERER_LABEL[renderer]}</span>
              <div className="theme-switch" role="group" aria-label="主题">
                {THEMES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={theme === item.id ? 'theme on' : 'theme'}
                    onClick={() => setTheme(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className={`stage theme-${theme}`}>
            <GPTVisChart
              content={source}
              theme={theme}
              streaming={streaming}
              onStatus={setStatus}
            />
          </div>
          <div className="stage-footer">
            <span>流式模式会丢弃未完成的末行</span>
            <span>所有模型文本均已转义</span>
          </div>
        </section>
      </div>

      <section className="coverage">
        <div className="coverage-head">
          <div>
            <p className="section-kicker">Coverage</p>
            <h2>一张语法，三种渲染层</h2>
          </div>
          <div className="coverage-legend">
            <span><i className="legend vchart" />VChart 原生</span>
            <span><i className="legend svg" />SVG 布局</span>
            <span><i className="legend html" />HTML</span>
          </div>
        </div>
        <div className="coverage-grid">
          {CHARTS.map((chart) => {
            const mode = RENDERER_BY_TYPE[chart.type] ?? 'HTML';
            return (
              <article key={chart.type} className="coverage-card" data-renderer={mode}>
                <header>
                  <strong>{chart.label}</strong>
                  <code>{chart.type}</code>
                </header>
                <p>{chart.note}</p>
                <span className={`render-line ${mode.toLowerCase()}`}>{RENDERER_LABEL[mode]}</span>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="footer">
        <span>GPT-Vis grammar · VisActor VChart renderer</span>
        <a
          className="repo-link"
          href="https://github.com/wzc520pyfm/GPT-Vis-VChart"
          target="_blank"
          rel="noreferrer"
        >
          GitHub · wzc520pyfm/GPT-Vis-VChart ↗
        </a>
        <span>流式解析 · ThemeSpec · React / DOM · 安全回退</span>
      </footer>
    </main>
  );
}
