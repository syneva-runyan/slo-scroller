const SVG_NS = 'http://www.w3.org/2000/svg';
const WIDTH = 260;
const HEIGHT = 110;
const MARGIN_X = 10;
const MARGIN_TOP = 22;
const MARGIN_BOTTOM = 18;
const BIN_COUNT = 18;

function el(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

/**
 * Floating "telemetry cloud" that visualises the rolling latency
 * distribution: a histogram with a smoothed density curve, a vertical SLO
 * marker (baseline) and a vertical measured-percentile marker.
 */
export class LatencyDistributionView {
  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'latency-cloud';

    this.title = document.createElement('p');
    this.title.className = 'latency-cloud-title';
    this.title.textContent = 'Latency distribution';

    this.legend = document.createElement('p');
    this.legend.className = 'latency-cloud-legend';

    this.svg = document.createElementNS(SVG_NS, 'svg');
    this.svg.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);
    this.svg.setAttribute('class', 'latency-cloud-svg');
    this.svg.setAttribute('preserveAspectRatio', 'none');

    this.root.append(this.title, this.svg, this.legend);
  }

  hide() {
    this.root.hidden = true;
  }

  /**
   * Re-render the chart.
   * @param {object} opts
   * @param {number[]} opts.samples
   * @param {number} opts.baselineMs SLO baseline
   * @param {number} opts.targetPercentile e.g. 0.95
   * @param {number|null} opts.measuredMs measured target-percentile latency, or null
   */
  update({ samples, baselineMs, targetPercentile, measuredMs }) {
    this.root.hidden = false;
    const pLabel = `p${Math.round(targetPercentile * 100)}`;
    const measuredTxt = measuredMs == null ? '—' : `${Math.round(measuredMs)} ms`;
    this.legend.textContent = `${pLabel}: ${measuredTxt}  •  SLO: ${baselineMs} ms`;

    // X domain: a bit past the larger of baseline and observed max.
    const maxSample = samples.length ? Math.max(...samples) : baselineMs;
    const xMax = Math.max(baselineMs * 1.4, maxSample * 1.05, baselineMs + 50);
    const innerW = WIDTH - MARGIN_X * 2;
    const innerH = HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;
    const xPx = (ms) => MARGIN_X + (Math.min(ms, xMax) / xMax) * innerW;

    // Histogram bins.
    const bins = new Array(BIN_COUNT).fill(0);
    const binWidthMs = xMax / BIN_COUNT;
    for (const s of samples) {
      const idx = Math.min(BIN_COUNT - 1, Math.floor(s / binWidthMs));
      bins[idx] += 1;
    }
    const maxCount = Math.max(1, ...bins);

    // Smoothed density (3-tap moving average) for the bell-curve overlay.
    const smoothed = bins.map((_, i) => {
      const left = bins[i - 1] ?? 0;
      const mid = bins[i];
      const right = bins[i + 1] ?? 0;
      return (left + 2 * mid + right) / 4;
    });
    const maxSmoothed = Math.max(1, ...smoothed);

    // Clear and redraw.
    while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild);

    // Soft background fill.
    this.svg.append(el('rect', {
      x: 0, y: 0, width: WIDTH, height: HEIGHT, rx: 14, ry: 14,
      fill: 'rgba(244, 249, 255, 0.92)',
    }));

    // Baseline (SLO) shaded "in-budget" region.
    const sloX = xPx(baselineMs);
    this.svg.append(el('rect', {
      x: MARGIN_X, y: MARGIN_TOP,
      width: Math.max(0, sloX - MARGIN_X), height: innerH,
      fill: 'rgba(59, 194, 174, 0.12)',
    }));

    // Histogram bars.
    const binW = innerW / BIN_COUNT;
    for (let i = 0; i < BIN_COUNT; i += 1) {
      const h = (bins[i] / maxCount) * innerH;
      const x = MARGIN_X + i * binW;
      this.svg.append(el('rect', {
        x: x + 0.5, y: MARGIN_TOP + (innerH - h),
        width: Math.max(0, binW - 1), height: h,
        fill: 'rgba(23, 48, 74, 0.35)',
        rx: 1.5,
      }));
    }

    // Smoothed density bell curve.
    if (samples.length >= 3) {
      const points = smoothed.map((v, i) => {
        const x = MARGIN_X + (i + 0.5) * binW;
        const y = MARGIN_TOP + innerH - (v / maxSmoothed) * innerH;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
      this.svg.append(el('polyline', {
        points,
        fill: 'none',
        stroke: '#1c6e98',
        'stroke-width': '1.8',
        'stroke-linejoin': 'round',
        'stroke-linecap': 'round',
        opacity: '0.9',
      }));
    }

    // SLO baseline marker.
    this.svg.append(el('line', {
      x1: sloX, x2: sloX,
      y1: MARGIN_TOP - 4, y2: HEIGHT - MARGIN_BOTTOM + 2,
      stroke: '#0f9d6b', 'stroke-width': '1.8', 'stroke-dasharray': '4 3',
    }));
    const sloLbl = el('text', {
      x: sloX, y: MARGIN_TOP - 6,
      'text-anchor': 'middle', 'font-size': '10', 'font-weight': '700',
      fill: '#0f9d6b',
    });
    sloLbl.textContent = 'SLO';
    this.svg.append(sloLbl);

    // Measured percentile marker.
    if (measuredMs != null) {
      const pX = xPx(measuredMs);
      const overBudget = measuredMs > baselineMs;
      const color = overBudget ? '#c43d4f' : '#1c6e98';
      this.svg.append(el('line', {
        x1: pX, x2: pX,
        y1: MARGIN_TOP - 4, y2: HEIGHT - MARGIN_BOTTOM + 2,
        stroke: color, 'stroke-width': '2',
      }));
      const pLbl = el('text', {
        x: pX, y: HEIGHT - 4,
        'text-anchor': 'middle', 'font-size': '10', 'font-weight': '700',
        fill: color,
      });
      pLbl.textContent = pLabel;
      this.svg.append(pLbl);
    }

    // X-axis ticks (0, xMax).
    const axis = (ms, label) => {
      const x = xPx(ms);
      const tick = el('line', {
        x1: x, x2: x,
        y1: HEIGHT - MARGIN_BOTTOM, y2: HEIGHT - MARGIN_BOTTOM + 3,
        stroke: 'rgba(23, 48, 74, 0.4)',
      });
      this.svg.append(tick);
      const t = el('text', {
        x, y: HEIGHT - MARGIN_BOTTOM + 12,
        'text-anchor': 'middle', 'font-size': '9',
        fill: 'rgba(23, 48, 74, 0.6)',
      });
      t.textContent = label;
      this.svg.append(t);
    };
    axis(0, '0');
    axis(xMax, `${Math.round(xMax)}ms`);
  }
}
