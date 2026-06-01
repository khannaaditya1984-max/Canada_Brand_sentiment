// app.js — UI state, controls, region/platform selectors, main runner

let selectedRegions = [];
let allSelected     = true;
let selectedPlats   = ['reddit', 'facebook', 'google'];

// ── Build region grid ─────────────────────────────────────────────────────────
(function buildRegionGrid() {
  const grid = document.getElementById('regionGrid');
  REGIONS.forEach(r => {
    const b = document.createElement('button');
    b.className  = 'rbtn';
    b.id         = 'r_' + r.abbr;
    b.innerHTML  = '<span class="abbr">' + r.abbr + '</span>' + r.name;
    b.onclick    = () => toggleRegion(r.abbr, b);
    grid.appendChild(b);
  });
})();

// ── Region controls ───────────────────────────────────────────────────────────
function toggleAll() {
  allSelected     = true;
  selectedRegions = [];
  document.querySelectorAll('.rbtn').forEach(b => b.classList.remove('sel'));
  document.getElementById('allBtn').classList.add('sel');
}

function toggleRegion(abbr, btn) {
  allSelected = false;
  document.getElementById('allBtn').classList.remove('sel');

  if (selectedRegions.includes(abbr)) {
    selectedRegions = selectedRegions.filter(r => r !== abbr);
    btn.classList.remove('sel');
  } else {
    selectedRegions.push(abbr);
    btn.classList.add('sel');
  }

  if (selectedRegions.length === 0) toggleAll();
}

function regionStr() {
  if (allSelected) return 'All Canada';
  return selectedRegions.map(a => {
    const r = REGIONS.find(x => x.abbr === a);
    return r ? r.name : a;
  }).join(', ');
}

// ── Platform controls ─────────────────────────────────────────────────────────
function togglePlat(btn) {
  const p = btn.dataset.p;
  if (selectedPlats.includes(p)) {
    if (selectedPlats.length === 1) return;
    selectedPlats = selectedPlats.filter(x => x !== p);
    btn.classList.remove('sel');
  } else {
    selectedPlats.push(p);
    btn.classList.add('sel');
  }
}

// ── Trace helpers ─────────────────────────────────────────────────────────────
function trace(msg, isErr) {
  const box = document.getElementById('traceBox');
  box.classList.remove('hidden');
  const line = document.createElement('div');
  line.className = 'tline';
  const dot = document.createElement('span');
  dot.className = 'tdot' + (isErr ? ' err' : '');
  const txt = document.createElement('span');
  txt.textContent = msg;
  line.appendChild(dot);
  line.appendChild(txt);
  box.appendChild(line);
  box.scrollTop = box.scrollHeight;
}

function setIcon(idx, state) {
  const el = document.getElementById('icon' + idx);
  if (el) el.className = 'agent-icon' + (state ? ' ' + state : '');
}

// ── Reset UI ──────────────────────────────────────────────────────────────────
function resetUI(brand, region) {
  document.getElementById('runBtn').disabled = true;
  document.getElementById('pageSubtitle').textContent = 'Running analysis for "' + brand + '" · ' + region;
  document.getElementById('traceBox').innerHTML = '';
  document.getElementById('traceBox').classList.remove('hidden');
  document.getElementById('errMsg').classList.add('hidden');
  document.getElementById('results').classList.add('hidden');
  document.getElementById('emptyState').classList.add('hidden');
  [0, 1, 2, 3, 4, 5].forEach(i => setIcon(i, ''));
}

// ── Main runner ───────────────────────────────────────────────────────────────
async function runAgents() {
  const brand = document.getElementById('brandInput').value.trim();
  if (!brand) { alert('Please enter a brand name.'); return; }

  const key = document.getElementById('apiKey').value.trim();
  if (!key)  { alert('Please enter your Anthropic API key.'); return; }

  const competitors = document.getElementById('compInput').value.trim()
    .split(',').map(s => s.trim()).filter(Boolean);

  const region = regionStr();
  resetUI(brand, region);

  try {
    const allMentions = [];

    // Agent 1 — always runs
    allMentions.push(...await agentScout(brand, competitors, region, allSelected));

    // Agents 2–4 — conditional on platform selection
    if (selectedPlats.includes('reddit')) {
      allMentions.push(...await agentReddit(brand, competitors, region, allSelected));
    } else { setIcon(1, ''); }

    if (selectedPlats.includes('facebook')) {
      allMentions.push(...await agentFacebook(brand, competitors, region, allSelected));
    } else { setIcon(2, ''); }

    if (selectedPlats.includes('google')) {
      allMentions.push(...await agentGoogle(brand, competitors, region, allSelected));
    } else { setIcon(3, ''); }

    trace('All platform agents complete — ' + allMentions.length + ' total mentions collected');

    // Agent 5 — sentiment scoring + JS aggregates
    const analysis = await agentSentiment(brand, competitors, allMentions);

    // Agent 6 — bureau chief briefing
    const report = await agentBureau(brand, competitors, allMentions, analysis, region, allSelected);

    renderResults(brand, allMentions, analysis, report, region);

  } catch (err) {
    const errEl = document.getElementById('errMsg');
    errEl.textContent = err.message || 'Something went wrong. Please try again.';
    errEl.classList.remove('hidden');
    trace('Error: ' + (err.message || 'unknown error'), true);
    document.getElementById('emptyState').classList.remove('hidden');
  } finally {
    document.getElementById('runBtn').disabled = false;
  }
}
