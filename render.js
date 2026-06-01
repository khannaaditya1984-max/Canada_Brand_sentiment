// render.js — builds results UI from agent data

let sentChartInstance = null;

function renderResults(brand, allMentions, analysis, report, region) {
  document.getElementById('emptyState').classList.add('hidden');
  document.getElementById('results').classList.remove('hidden');

  // header
  const dateStr = new Date().toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });
  document.getElementById('resultRegion').textContent   = region + ' · ' + dateStr;
  document.getElementById('resultHeadline').textContent = report.headline || '';
  document.getElementById('execSummary').textContent    = report.executive_summary || '';

  const insightText = [report.regional_insight, report.platform_insight].filter(Boolean).join(' ');
  document.getElementById('regionalInsight').textContent = insightText;

  // metrics
  const bd    = (analysis.sentiment_breakdown || {})[brand] || { positive: 0, neutral: 0, negative: 0, net_sentiment: 0 };
  const total = (bd.positive || 0) + (bd.neutral || 0) + (bd.negative || 0) || 1;
  const sov   = (analysis.share_of_voice || []).find(s => s.brand.toLowerCase() === brand.toLowerCase());
  const net   = (bd.net_sentiment || 0) * 100;
  const netColor = net > 20 ? 'var(--green)' : net < -20 ? 'var(--red)' : 'var(--text2)';
  const uniquePlats = [...new Set(allMentions.map(m => m.platform))];

  document.getElementById('metricsRow').innerHTML = `
    <div class="metric">
      <div class="metric-label">Total mentions</div>
      <div class="metric-value">${allMentions.length}</div>
      <div class="metric-sub">across ${uniquePlats.length} platform${uniquePlats.length !== 1 ? 's' : ''}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Share of voice</div>
      <div class="metric-value">${sov ? Math.round(sov.percent) + '%' : '—'}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Net sentiment</div>
      <div class="metric-value" style="color:${netColor}">${net > 0 ? '+' : ''}${Math.round(net)}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Positive rate</div>
      <div class="metric-value">${Math.round((bd.positive || 0) / total * 100)}%</div>
      <div class="metric-sub">${bd.positive || 0} of ${total} mentions</div>
    </div>
  `;

  // share of voice
  document.getElementById('sovSection').innerHTML = (analysis.share_of_voice || []).slice(0, 5).map(s => {
    const isPrimary = s.brand.toLowerCase() === brand.toLowerCase();
    const fill = isPrimary ? 'background:var(--blue)' : 'background:var(--bg3);border:0.5px solid var(--border2)';
    return `
      <div class="sov-row">
        <div class="sov-top">
          <span style="color:var(--text2)">${s.brand}</span>
          <span style="font-weight:500">${Math.round(s.percent)}%</span>
        </div>
        <div class="sov-bar-wrap"><div class="sov-bar-fill" style="width:${Math.round(s.percent)}%;${fill}"></div></div>
      </div>`;
  }).join('');

  // region breakdown
  document.getElementById('regionSection').innerHTML = Object.entries(analysis.region_breakdown || {}).slice(0, 6).map(([reg, c]) => {
    const t   = (c.positive || 0) + (c.neutral || 0) + (c.negative || 0) || 1;
    const pct = Math.round((c.positive || 0) / t * 100);
    return `
      <div class="sent-row">
        <span class="sent-name">${reg}</span>
        <div class="sent-bar-wrap"><div class="sent-bar-fill" style="width:${pct}%"></div></div>
        <span class="sent-pct">${pct}%</span>
      </div>`;
  }).join('');

  // platform breakdown
  document.getElementById('platformSection').innerHTML = Object.entries(analysis.platform_breakdown || {}).map(([plat, c]) => {
    const t   = (c.positive || 0) + (c.neutral || 0) + (c.negative || 0) || 1;
    const pct = Math.round((c.positive || 0) / t * 100);
    const col = PLATFORM_COLOURS[plat] || 'var(--blue)';
    return `
      <div class="plat-row">
        <span class="plat-name">${plat}</span>
        <div class="plat-bar-wrap"><div class="plat-bar-fill" style="width:${pct}%;background:${col}"></div></div>
        <span class="plat-pct">${pct}%</span>
      </div>`;
  }).join('');

  // themes
  document.getElementById('themesSection').innerHTML = (analysis.themes || []).slice(0, 6).map(t => {
    const cls = t.sentiment === 'positive' ? 'pos' : t.sentiment === 'negative' ? 'neg' : 'neu';
    return `<span class="tag ${cls}">${t.theme} ×${t.frequency}</span>`;
  }).join('');

  // stacked bar chart
  if (sentChartInstance) { sentChartInstance.destroy(); sentChartInstance = null; }
  const pb = analysis.platform_breakdown || {};
  const platKeys = Object.keys(pb);
  if (platKeys.length) {
    const ctx = document.getElementById('sentChart').getContext('2d');
    sentChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: platKeys,
        datasets: [
          { label: 'Positive', data: platKeys.map(p => pb[p].positive  || 0), backgroundColor: '#1D9E75', borderWidth: 0 },
          { label: 'Neutral',  data: platKeys.map(p => pb[p].neutral   || 0), backgroundColor: '#B4B2A9', borderWidth: 0 },
          { label: 'Negative', data: platKeys.map(p => pb[p].negative  || 0), backgroundColor: '#E24B4A', borderWidth: 0 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { stacked: true, ticks: { color: '#9a9a94', font: { size: 11 } }, grid: { display: false } },
          y: { stacked: true, ticks: { color: '#9a9a94', font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.06)' } },
        },
      },
    });
  }

  // lists
  const toList = (items, id) => {
    document.getElementById(id).innerHTML = (items || []).map(f => `<li>${f}</li>`).join('');
  };
  toList(report.key_findings,    'findingsList');
  toList(report.risks,           'riskList');
  toList(report.opportunities,   'oppList');
  document.getElementById('recList').innerHTML = (report.recommendations || []).map(r => `<li>${r}</li>`).join('');
}
