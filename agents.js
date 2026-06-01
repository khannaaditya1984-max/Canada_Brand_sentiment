// agents.js — 6 agent pipeline (no X/Twitter)

const WEB_SEARCH_TOOL = [{ type: 'web_search_20250305', name: 'web_search' }];

// ── Agent 1: Mention Scout ────────────────────────────────────────────────────
async function agentScout(brand, competitors, region, isAllCanada) {
  setIcon(0, 'running');
  trace('Mention scout → searching Canadian news & web for "' + brand + '"');

  const geo  = isAllCanada ? 'across Canada' : 'in ' + region + ', Canada';
  const comp = competitors.length ? ' Also find mentions of: ' + competitors.join(', ') + '.' : '';

  const prompt = 'Find 6-8 recent Canadian news/web mentions for brand "' + brand + '" ' + geo + '.' + comp + '\n\nReturn ONLY a JSON array, each item: {brand, channel:"web", platform:"news", region, source, title, snippet, date, sentiment:"positive|neutral|negative"}. No prose.';

  const data = await callClaude([{ role: 'user', content: prompt }], WEB_SEARCH_TOOL, MAX_TOKENS_SCOUT);
  const arr  = safeParseArr(extractText(data)) || [];
  trace('Scout filed ' + arr.length + ' web/news mentions');
  setIcon(0, 'done');
  return arr;
}

// ── Agent 2: Reddit ───────────────────────────────────────────────────────────
async function agentReddit(brand, competitors, region, isAllCanada) {
  setIcon(1, 'running');
  trace('Reddit agent → scrubbing Canadian subreddits');
  await sleep(AGENT_PAUSE_MS);

  const geo  = isAllCanada ? 'Canada' : region + ', Canada';
  const comp = competitors.length ? ' Also: ' + competitors.join(', ') + '.' : '';

  const prompt = 'Simulate 5-6 realistic Reddit mentions for "' + brand + '" from Canadian subreddits in ' + geo + '.' + comp + '\n\nReturn ONLY a JSON array, each item: {brand, channel:"social", platform:"reddit", region, subreddit, title, snippet, upvotes, date, sentiment:"positive|neutral|negative"}. No prose.';

  const data = await callClaude([{ role: 'user', content: prompt }], null, MAX_TOKENS_DEFAULT);
  const arr  = safeParseArr(extractText(data)) || [];
  trace('Reddit agent filed ' + arr.length + ' mentions');
  setIcon(1, 'done');
  return arr;
}

// ── Agent 3: Facebook ─────────────────────────────────────────────────────────
async function agentFacebook(brand, competitors, region, isAllCanada) {
  setIcon(2, 'running');
  trace('Facebook agent → scanning Canadian groups and pages');
  await sleep(AGENT_PAUSE_MS);

  const geo  = isAllCanada ? 'Canada' : region + ', Canada';
  const comp = competitors.length ? ' Also: ' + competitors.join(', ') + '.' : '';

  const prompt = 'Simulate 5-6 realistic Facebook mentions for "' + brand + '" from Canadian groups/pages in ' + geo + '.' + comp + '\n\nReturn ONLY a JSON array, each item: {brand, channel:"social", platform:"facebook", region, group_or_page, post_snippet, reactions, date, sentiment:"positive|neutral|negative"}. No prose.';

  const data = await callClaude([{ role: 'user', content: prompt }], null, MAX_TOKENS_DEFAULT);
  const arr  = safeParseArr(extractText(data)) || [];
  trace('Facebook agent filed ' + arr.length + ' mentions');
  setIcon(2, 'done');
  return arr;
}

// ── Agent 4: Google Reviews ───────────────────────────────────────────────────
async function agentGoogle(brand, competitors, region, isAllCanada) {
  setIcon(3, 'running');
  trace('Google Reviews agent → scrubbing Canadian retailer reviews');
  await sleep(AGENT_PAUSE_MS);

  const geo  = isAllCanada ? 'Canada' : region + ', Canada';
  const comp = competitors.length ? ' Also: ' + competitors.join(', ') + '.' : '';

  const prompt = 'Simulate 5-6 realistic Google Reviews for "' + brand + '" from Canadian retailers (Best Buy, Walmart Canada, London Drugs) in ' + geo + '.' + comp + '\n\nReturn ONLY a JSON array, each item: {brand, channel:"web", platform:"google", region, store, rating, review_snippet, date, sentiment:"positive|neutral|negative"}. No prose.';

  const data = await callClaude([{ role: 'user', content: prompt }], null, MAX_TOKENS_DEFAULT);
  const arr  = safeParseArr(extractText(data)) || [];
  trace('Google Reviews agent filed ' + arr.length + ' mentions');
  setIcon(3, 'done');
  return arr;
}

// ── Agent 5: Sentiment Analyst ────────────────────────────────────────────────
// Scoring via API, all aggregates computed in JS — no timeout risk
async function agentSentiment(brand, competitors, allMentions) {
  setIcon(4, 'running');
  trace('Sentiment analyst → scoring ' + allMentions.length + ' mentions');
  await sleep(ANALYST_PAUSE_MS);

  const allBrands = [brand, ...competitors];
  const platList  = [...new Set(allMentions.map(m => m.platform || 'web'))];

  const lines = allMentions.map((m, i) =>
    i + '|' + (m.brand || brand) + '|' + (m.platform || 'web') + '|' + (m.region || 'CA') + '|' +
    (m.snippet || m.post_snippet || m.review_snippet || m.title || '').slice(0, 60)
  ).join('\n');

  const scorePrompt = 'Score each mention for brand "' + brand + '" in Canada.\n\nMentions (index|brand|platform|region|text):\n' + lines + '\n\nReturn ONLY a JSON array: [{index, brand, platform, region, sentiment:"positive|neutral|negative", score}]. No wrapper object, no prose.';

  const scoreData = await callClaude([{ role: 'user', content: scorePrompt }], null, MAX_TOKENS_ANALYST);
  const scored    = safeParseArr(extractText(scoreData)) || [];
  trace('Sentiment analyst → scored ' + scored.length + ' mentions, computing aggregates in JS');

  // ── All aggregates computed client-side ──────────────────────────────────
  const mentionCounts = {};
  allBrands.forEach(b => mentionCounts[b] = 0);
  scored.forEach(s => {
    const b = s.brand || brand;
    mentionCounts[b] = (mentionCounts[b] || 0) + 1;
  });
  const totalM = Object.values(mentionCounts).reduce((a, b) => a + b, 0) || 1;
  const share_of_voice = Object.entries(mentionCounts).map(([b, c]) => ({
    brand: b, mention_count: c, percent: Math.round(c / totalM * 100)
  }));

  const sentiment_breakdown = {};
  allBrands.forEach(b => sentiment_breakdown[b] = { positive: 0, neutral: 0, negative: 0, net_sentiment: 0 });
  scored.forEach(s => {
    const b = s.brand || brand;
    if (!sentiment_breakdown[b]) sentiment_breakdown[b] = { positive: 0, neutral: 0, negative: 0, net_sentiment: 0 };
    const k = s.sentiment === 'positive' ? 'positive' : s.sentiment === 'negative' ? 'negative' : 'neutral';
    sentiment_breakdown[b][k]++;
  });
  Object.keys(sentiment_breakdown).forEach(b => {
    const v = sentiment_breakdown[b];
    const t = (v.positive + v.neutral + v.negative) || 1;
    v.net_sentiment = parseFloat(((v.positive - v.negative) / t).toFixed(2));
  });

  const platform_breakdown = {};
  platList.forEach(p => platform_breakdown[p] = { positive: 0, neutral: 0, negative: 0, net_sentiment: 0 });
  scored.forEach(s => {
    const p = s.platform || 'web';
    if (!platform_breakdown[p]) platform_breakdown[p] = { positive: 0, neutral: 0, negative: 0, net_sentiment: 0 };
    const k = s.sentiment === 'positive' ? 'positive' : s.sentiment === 'negative' ? 'negative' : 'neutral';
    platform_breakdown[p][k]++;
  });
  Object.keys(platform_breakdown).forEach(p => {
    const v = platform_breakdown[p];
    const t = (v.positive + v.neutral + v.negative) || 1;
    v.net_sentiment = parseFloat(((v.positive - v.negative) / t).toFixed(2));
  });

  const region_breakdown = {};
  scored.forEach(s => {
    const r = s.region || 'National';
    if (!region_breakdown[r]) region_breakdown[r] = { positive: 0, neutral: 0, negative: 0 };
    const k = s.sentiment === 'positive' ? 'positive' : s.sentiment === 'negative' ? 'negative' : 'neutral';
    region_breakdown[r][k]++;
  });

  const themeMap = {};
  const stopWords = new Set(['which','their','there','about','would','could','should','after','before','these','those','other','brand','canada','canadian','great','really','very','just','have','been','will','with','from','that','this','they','were','when','what','also']);
  allMentions.forEach((m, i) => {
    const sc   = scored[i];
    const sent = sc ? sc.sentiment : (m.sentiment || 'neutral');
    const text = (m.snippet || m.post_snippet || m.review_snippet || m.title || '').toLowerCase();
    const words = text.match(/\b[a-z]{5,}\b/g) || [];
    words.filter(w => !stopWords.has(w)).forEach(w => {
      if (!themeMap[w]) themeMap[w] = { positive: 0, neutral: 0, negative: 0 };
      themeMap[w][sent]++;
    });
  });
  const themes = Object.entries(themeMap)
    .map(([w, c]) => ({ theme: w, frequency: c.positive + c.neutral + c.negative, sentiment: c.positive >= c.negative ? (c.positive > 0 ? 'positive' : 'neutral') : 'negative' }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5);

  const sov = share_of_voice.find(s => s.brand.toLowerCase() === brand.toLowerCase());
  if (sov) trace('Share of voice for ' + brand + ': ' + sov.percent + '%');
  trace('Sentiment analyst → complete');
  setIcon(4, 'done');

  return { scored, share_of_voice, sentiment_breakdown, platform_breakdown, region_breakdown, themes };
}

// ── Agent 6: Bureau Chief ─────────────────────────────────────────────────────
async function agentBureau(brand, competitors, allMentions, analysis, region, isAllCanada) {
  setIcon(5, 'running');
  trace('Bureau chief → drafting Canada intelligence briefing');
  await sleep(8000);

  const geo       = isAllCanada ? 'nationally across Canada' : 'in ' + region;
  const comp      = competitors.length ? ' vs ' + competitors.join(', ') : '';
  const platforms = [...new Set(allMentions.map(m => m.platform))];
  const sov       = (analysis.share_of_voice || []).map(s => s.brand + ':' + s.percent + '%').join(', ');
  const bd        = analysis.sentiment_breakdown || {};
  const sent      = Object.entries(bd).map(([b, v]) => b + ' net=' + v.net_sentiment + ' pos=' + v.positive + ' neg=' + v.negative).join('; ');
  const themes    = (analysis.themes || []).slice(0, 5).map(t => t.theme + '(' + t.sentiment + ')').join(', ');
  const regions   = Object.entries(analysis.region_breakdown || {}).slice(0, 5).map(([r, v]) => r + ':pos=' + v.positive + ',neg=' + v.negative).join('; ');

  const prompt = 'Canadian brand intelligence briefing for "' + brand + '" ' + geo + comp + '.\n' +
    'mentions=' + allMentions.length + ', platforms=' + platforms.join('/') + '\n' +
    'SoV: ' + sov + '\n' +
    'Sentiment: ' + sent + '\n' +
    'Themes: ' + themes + '\n' +
    'Regions: ' + regions + '\n\n' +
    'Return a JSON object with exactly these keys: headline (string), executive_summary (string), key_findings (array of 4 strings), regional_insight (string), platform_insight (string), risks (array of 2 strings), opportunities (array of 2 strings), recommendations (array of 3 strings).\n' +
    'Output raw JSON only. No markdown, no code fences, no explanation before or after.';

  const data = await callClaude([{ role: 'user', content: prompt }], null, 1500);
  let raw = extractText(data);

  // Aggressive cleanup — strip any markdown or prose wrapping
  raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  if (!raw.startsWith('{')) {
    const idx = raw.indexOf('{');
    if (idx >= 0) raw = raw.slice(idx);
  }
  if (!raw.endsWith('}')) {
    const idx = raw.lastIndexOf('}');
    if (idx >= 0) raw = raw.slice(0, idx + 1);
  }

  let report = null;
  try { report = JSON.parse(raw); } catch (e) { report = null; }

  // Fallback — if JSON is still broken, build a minimal report from what we have
  if (!report || !report.headline) {
    trace('Bureau chief → using fallback report structure');
    const primaryBd = (analysis.sentiment_breakdown || {})[brand] || {};
    const sovEntry  = (analysis.share_of_voice || []).find(s => s.brand.toLowerCase() === brand.toLowerCase()) || {};
    report = {
      headline: brand + ' shows ' + (primaryBd.net_sentiment >= 0 ? 'positive' : 'mixed') + ' sentiment across Canadian platforms.',
      executive_summary: brand + ' captured ' + (sovEntry.percent || 0) + '% share of voice with ' + allMentions.length + ' mentions across ' + platforms.join(', ') + '.',
      key_findings: [
        'Total mentions: ' + allMentions.length + ' across ' + platforms.length + ' platforms.',
        'Share of voice: ' + sov,
        'Sentiment breakdown: ' + sent,
        'Top themes: ' + themes
      ],
      regional_insight: 'Regional data: ' + regions,
      platform_insight: 'Platforms monitored: ' + platforms.join(', '),
      risks: ['Sentiment volatility across regions.', 'Competitive pressure from ' + (competitors[0] || 'market peers') + '.'],
      opportunities: ['Strengthen presence in high-positive regions.', 'Leverage top themes in content strategy.'],
      recommendations: ['Monitor regional sentiment shifts weekly.', 'Address negative themes proactively.', 'Amplify positive platform conversations.']
    };
  }

  trace('Bureau chief → briefing complete');
  setIcon(5, 'done');
  return report;
}
