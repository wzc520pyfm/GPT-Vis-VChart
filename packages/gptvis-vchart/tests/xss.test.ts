import { describe, expect, it } from 'vitest';
import { buildView } from '../src/build';
import { safeColor } from '../src/theme';

const IMG = '<img src=x onerror=alert(1)>';
const SCRIPT = '<script>alert(1)</script>';

function expectEscaped(html: string) {
  expect(html).toContain('&lt;');
  expect(html).not.toContain('<img');
  expect(html).not.toContain('<script');
}

describe('HTML escaping', () => {
  it('escapes table titles, headers and cells', () => {
    const view = buildView(`vis table
title ${IMG}
data
  - 名称 ${IMG}
    备注 ${SCRIPT}
`);
    expect(view.kind).toBe('html');
    if (view.kind === 'html') expectEscaped(view.html);
  });

  it('escapes summary content and entity labels', () => {
    const view = buildView({
      type: 'summary',
      title: IMG,
      content: `${SCRIPT}\n\n[${IMG}](metric_value)`,
    });
    expect(view.kind).toBe('html');
    if (view.kind === 'html') expectEscaped(view.html);
  });

  it('escapes network, flow, tree and fishbone labels', () => {
    const network = buildView(`vis network-graph
title ${IMG}
data
  nodes
    - name ${IMG}
    - name 乙
  edges
    - source ${IMG}
      target 乙
      name ${SCRIPT}
`);
    expect(network.kind).toBe('html');
    if (network.kind === 'html') expectEscaped(network.html);

    const fishbone = buildView(`vis fishbone-diagram
title ${IMG}
data
  - name ${IMG}
    children
      - name ${SCRIPT}
`);
    expect(fishbone.kind).toBe('html');
    if (fishbone.kind === 'html') expectEscaped(fishbone.html);

    const org = buildView(`vis organization-chart
data
  name ${IMG}
  children
    - name ${SCRIPT}
      description ${IMG}
`);
    expect(org.kind).toBe('html');
    if (org.kind === 'html') expectEscaped(org.html);
  });

  it('escapes violin titles and categories', () => {
    const view = buildView(`vis violin
title ${IMG}
data
  - category ${IMG}
    value 1
  - category ${IMG}
    value 2
`);
    expect(view.kind).toBe('html');
    if (view.kind === 'html') expectEscaped(view.html);
  });

  it('rejects unsafe colors and falls back to theme values', () => {
    expect(safeColor('url(javascript:alert(1))')).toBeUndefined();
    expect(safeColor('expression(alert(1))')).toBeUndefined();
    expect(safeColor('red;background:url(x)')).toBeUndefined();
    expect(safeColor('#0f6e6b')).toBe('#0f6e6b');

    const view = buildView(`vis column
style
  backgroundColor url(javascript:alert(1))
  palette
    - url(javascript:alert(1))
data
  - category A
    value 1
`);
    expect(view.kind).toBe('vchart');
    if (view.kind === 'vchart') {
      expect(view.background).toBe('#fbf9f6');
      expect((view.spec.color as string[])[0]).toBe('#0f6e6b');
    }
  });
});
