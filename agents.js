// agents.js — all 7 agent functions (X/Twitter removed)

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
// Step A: Claude scores each mention (one API call, simple array output)
// Step B: aggregates computed in JS client-side — no second API call needed
async function agentSentiment(brand, competitors, allMentions) {
  setIcon(4, 'running');
  trace('Sentiment analyst → scoring ' + allMentions.length + ' mentions');
  await sleep(ANALYST_PAUSE_MS);

  const allBrands = [brand, ...competitors];

  // Step A — score mentions via API
  const lines = allMentions.map((m, i) =>
    i + '|' + (m.brand || brand) + '|' + (m.platform || 'web') + '|' + (m.region || 'CA') + '|' +
    (m.snippet || m.post_snippet || m.review_snippet || m.title || '').slice(0, 60)
  ).join('\n');

  const scorePrompt = 'Score each mention for brand "' + brand + '" in Canada.\n\nMentions (index|brand|platform|region|text):\n' + lines + '\n\nReturn ONLY a JSON array: [{index, brand, platform, region, sentiment:"positive|neutral|negative", score}]. No wrapper, no prose.';

  const scoreData = await callClaude([{ role: 'user', content: scorePrompt }], null, MAX_TOKENS_ANALYST);
  const scored    = safeParseArr(extractText(scoreData)) || [];
  trace('Sentiment analyst → scored ' + scored.length + ' mentions, computing aggregates');

  // Step B — compute all aggregates in JS (no extra API call)
  const platList = [...new Set(allMentions.map(m => m.platform || 'web'))];

  // share of voice
  const mentionCounts = {};
  allBrands.forEach(b => mentionCounts[b] = 0);
  scored.forEach(s => {
    const b = s.brand || brand;
    if (mentionCounts[b] !== undefined) mentionCounts[b]++;
    else mentionCounts[b] = 1;
  });
  const totalMentions = Object.values(mentionCounts).reduce((a, b) => a + b, 0) || 1;
  const share_of_voice = Object.entries(mentionCounts).map(([b, c]) => ({
    brand: b, mention_count: c, percent: Math.round(c / totalMentions * 100)
  }));

  // sentiment breakdown per brand
  const sentiment_breakdown = {};
  allBrands.forEach(b => sentiment_breakdown[b] = { positive: 0, neutral: 0, negative: 0, net_sentiment: 0 });
  scored.forEach(s => {
    const b   = s.brand || brand;
    const key = s.sentiment === 'positive' ? 'positive' : s.sentiment === 'negative' ? 'negative' : 'neutral';
    if (!sentiment_breakdown[b]) sentiment_breakdown[b] = { positive: 0, neutral: 0, negative: 0, net_sentiment: 0 };
    sentiment_breakdown[b][key]++;
  });
  Object.keys(sentiment_breakdown).forEach(b => {
    const v = sentiment_breakdown[b];
    const t = (v.positive + v.neutral + v.negative) || 1;
    v.net_sentiment = parseFloat(((v.positive - v.negative) / t).toFixed(2));
  });

  // platform breakdown
  const platform_breakdown = {};
  platList.forEach(p => platform_breakdown[p] = { positive: 0, neutral: 0, negative: 0, net_sentiment: 0 });
  scored.forEach(s => {
    const p   = s.platform || 'web';
    const key = s.sentiment === 'positive' ? 'positive' : s.sentiment === 'negative' ? 'negative' : 'neutral';
    if (!platform_breakdown[p]) platform_breakdown[p] = { positive: 0, neutral: 0, negative: 0, net_sentiment: 0 };
    platform_breakdown[p][key]++;
  });
  Object.keys(platform_breakdown).forEach(p => {
    const v = platform_breakdown[p];
    const t = (v.positive + v.neutral + v.negative) || 1;
    v.net_sentiment = parseFloat(((v.positive - v.negative) / t).toFixed(2));
  });

  // region breakdown
  const region_breakdown = {};
  scored.forEach(s => {
    const r   = s.region || 'National';
    const key = s.sentiment === 'positive' ? 'positive' : s.sentiment === 'negative' ? 'negative' : 'neutral';
    if (!region_breakdown[r]) region_breakdown[r] = { positive: 0, neutral: 0, negative: 0 };
    region_breakdown[r][key]++;
  });

  // themes — derive top recurring words from snippets grouped by sentiment
  const themeMap = {};
  allMentions.forEach((m, i) => {
    const sc   = scored[i];
    const sent = sc ? sc.sentiment : (m.sentiment || 'neutral');
    const text = (m.snippet || m.post_snippet || m.review_snippet || m.title || '').toLowerCase();
    const words = text.match(/\b[a-z]{5,}\b/g) || [];
    const stopWords = new Set(['which','their','there','about','would','could','should','after','before','these','those','other','brand','canada','canadian']);
    words.filter(w => !stopWords.has(w)).forEach(w => {
      if (!themeMap[w]) themeMap[w] = { positive: 0, neutral: 0, negative: 0 };
      themeMap[w][sent]++;
    });
  });
  const themes = Object.entries(themeMap)
    .map(([w, counts]) => ({ theme: w, frequency: counts.positive + counts.neutral + counts.negative, sentiment: counts.positive >= counts.negative ? (counts.positive > 0 ? 'positive' : 'neutral') : 'negative' }))
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

  const geo      = isAllCanada ? 'nationally across Canada' : 'in ' + region;
  const comp     = competitors.length ? ' vs ' + competitors.join(', ') : '';
  const platforms = [...new Set(allMentions.map(m => m.platform))];

  const sov     = (analysis.share_of_voice || []).map(s => s.brand + ':' + s.percent + '%').join(', ');
  const bd      = analysis.sentiment_breakdown || {};
  const sent    = Object.entries(bd).map(([b, v]) => b + ' net=' + v.net_sentiment + ' (+' + v.positive + '/-' + v.negative + ')').join(' | ');
  const themes  = (analysis.themes || []).slice(0, 5).map(t => t.theme + '(' + t.sentiment + ')').join(', ');
  const regions = Object.entries(analysis.region_breakdown || {}).slice(0, 5).map(([r, v]) => r + ':+' + v.positive + '/-' + v.negative).join(', ');

  const prompt = 'Write a Canadian brand intelligence briefing for "' + brand + '" ' + geo + comp + '.\n\nDATA: mentions=' + allMentions.length + ' platforms=[' + platforms.join(',') + '] SoV=[' + sov + '] sentiment=[' + sent + '] themes=[' + themes + '] regions=[' + regions + ']\n\nReturn ONLY JSON: {headline, executive_summary, key_findings:[4 items], regional_insight, platform_insight, risks:[2], opportunities:[2], recommendations:[3]}. Canadian market lens. Cite numbers. No prose outside JSON.';

  const data   = await callClaude([{ role: 'user', content: prompt }], null, MAX_TOKENS_DEFAULT);
  const report = safeParse(extractText(data));
  if (!report) throw new Error('Bureau chief returned malformed report. Please try again.');

  trace('Bureau chief → briefing complete');
  setIcon(5, 'done');
  return report;
}
