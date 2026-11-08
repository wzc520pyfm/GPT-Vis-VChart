import { useEffect, useRef, type CSSProperties } from 'react';
import { GPTVis, type GPTVisOptions, type RenderStatus } from './runtime.js';
import type { VisualizationTheme } from './theme.js';

export interface GPTVisChartProps {
  content: string | Record<string, unknown>;
  theme?: VisualizationTheme;
  streaming?: boolean;
  wrapper?: boolean;
  locale?: string;
  className?: string;
  style?: CSSProperties;
  onStatus?: (status: RenderStatus) => void;
}

export function GPTVisChart({
  content,
  theme = 'default',
  streaming = false,
  wrapper = false,
  locale,
  className,
  style,
  onStatus,
}: GPTVisChartProps) {
  const host = useRef<HTMLDivElement>(null);
  const chart = useRef<GPTVis | null>(null);
  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;

  useEffect(() => {
    if (!host.current) return;
    const options: GPTVisOptions = {
      container: host.current,
      theme,
      streaming,
      wrapper,
      locale,
      onStatus: (status) => statusRef.current?.(status),
    };
    const instance = new GPTVis(options);
    chart.current = instance;
    instance.render(content);
    return () => {
      instance.destroy();
      chart.current = null;
    };
    // Content updates are deliberately handled by the second effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, streaming, wrapper, locale]);

  useEffect(() => {
    chart.current?.render(content);
  }, [content]);

  return (
    <div
      ref={host}
      className={className}
      style={{ width: '100%', height: '100%', minHeight: 280, ...style }}
    />
  );
}
