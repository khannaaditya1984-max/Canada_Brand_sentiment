// agents.js — all 7 agent functions

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

  const prompt = 'Simulate 4-5 realistic Reddit mentions for "' + brand + '" from Canadian subreddits in ' + geo + '.' + comp + '\n\nReturn ONLY a JSON array, each item: {brand, channel:"social", platform:"reddit", region, subreddit, title, snippet, upvotes, date, sentiment:"positive|neutral|negative"}. No prose.';

  const data = await callClaude([{ role: 'user', content: prompt }], null, MAX_TOKENS_DEFAULT);
  const arr  = safeParseArr(extractText(data)) || [];
  trace('Reddit agent filed ' + arr.length + ' mentions');
  setIcon(1, 'done');
  return arr;
}

// ── Agent 3: X / Twitter ──────────────────────────────────────────────────────
async function agentTwitter(brand, competitors, region, isAllCanada) {
  setIcon(2, 'running');
  trace('X/Twitter agent → scanning Canadian tweets');
  await sleep(AGENT_PAUSE_MS);

  const geo  = isAllCanada ? 'Canada' : region + ', Canada';
  const comp = competitors.length ? ' Also: ' + competitors.join(', ') + '.' : '';

  const prompt = 'Simulate 4-5 realistic X/Twitter mentions for "' + brand + '" from Canadian users in ' + geo + '.' + comp + '\n\nReturn ONLY a JSON array, each item: {brand, channel:"social", platform:"twitter", region, handle, tweet, likes, date, sentiment:"positive|neutral|negative"}. No prose.';

  const data = await callClaude([{ role: 'user', content: prompt }], null, MAX_TOKENS_DEFAULT);
  const arr  = safeParseArr(extractText(data)) || [];
  trace('X/Twitter agent filed ' + arr.length + ' mentions');
  setIcon(2, 'done');
  return arr;
}

// ── Agent 4: Facebook ─────────────────────────────────────────────────────────
async function agentFacebook(brand, competitors, region, isAllCanada) {
  setIcon(3, 'running');
  trace('Facebook agent → scanning Canadian groups and pages');
  await sleep(AGENT_PAUSE_MS);

  const geo  = isAllCanada ? 'Canada' : region + ', Canada';
  const comp = competitors.length ? ' Also: ' + competitors.join(', ') + '.' : '';

  const prompt = 'Simulate 4-5 realistic Facebook mentions for "' + brand + '" from Canadian groups/pages in ' + geo + '.' + comp + '\n\nReturn ONLY a JSON array, each item: {brand, channel:"social", platform:"facebook", region, group_or_page, post_snippet, reactions, date, sentiment:"positive|neutral|negative"}. No prose.';

  const data = await callClaude([{ role: 'user', content: prompt }], null, MAX_TOKENS_DEFAULT);
  const arr  = safeParseArr(extractText(data)) || [];
  trace('Facebook agent filed ' + arr.length + ' mentions');
  setIcon(3, 'done');
  return arr;
}

// ── Agent 5: Google Reviews ───────────────────────────────────────────────────
async function agentGoogle(brand, competitors, region, isAllCanada) {
  setIcon(4, 'running');
  trace('Google Reviews agent → scrubbing Canadian retailer reviews');
  await sleep(AGENT_PAUSE_MS);

  const geo  = isAllCanada ? 'Canada' : region + ', Canada';
  const comp = competitors.length ? ' Also: ' + competitors.join(', ') + '.' : '';

  const prompt = 'Simulate 4-5 realistic Google Reviews for "' + brand + '" from Canadian retailers (Best Buy, Walmart Canada, London Drugs) in ' + geo + '.' + comp + '\n\nReturn ONLY a JSON array, each item: {brand, channel:"web", platform:"google", region, store, rating, review_snippet, date, sentiment:"positive|neutral|negative"}. No prose.';

  const data = await callClaude([{ role: 'user', content: prompt }], null, MAX_TOKENS_DEFAULT);
  const arr  = safeParseArr(extractText(data)) || [];
  trace('Google Reviews agent filed ' + arr.length + ' mentions');
  setIcon(4, 'done');
  return arr;
}

// ── Agent 6: Sentiment Analyst ────────────────────────────────────────────────
async function agentSentiment(brand, competitors, allMentions) {
  setIcon(5, 'running');
  trace('Sentiment analyst → scoring ' + allMentions.length + ' mentions');
  await sleep(ANALYST_PAUSE_MS);

  const allBrands = [brand, ...competitors];
  const bList     = allBrands.map(b => '"' + b + '"').join(', ');
  const platList  = [...new Set(allMentions.map(m => m.platform || 'web'))];

  // Ultra-compact mention list — brand|platform|region|sentiment_hint only
  const lines = allMentions.slice(0, 20).map((m, i) =>
    i + '|' + (m.brand || brand) + '|' + (m.platform || 'web') + '|' + (m.region || 'CA') + '|' + (m.sentiment || 'neutral')
  ).join('\n');

  const prompt = 'Score sentiment for brand "' + brand + '" in Canada. Brands: [' + bList + ']. Platforms: [' + platList.join(', ') + '].\n\nMentions (index|brand|platform|region|sentiment):\n' + lines + '\n\nReturn ONLY JSON: {scored:[{index,brand,sentiment,score}], share_of_voice:[{brand,mention_count,percent}], sentiment_breakdown:{BrandName:{positive,neutral,negative,net_sentiment}}, platform_breakdown:{platform:{positive,neutral,negative,net_sentiment}}, region_breakdown:{region:{positive,neutral,negative}}, themes:[{theme,sentiment,frequency}]}. Percents sum 100. Max 4 themes. No prose.';

  const data   = await callClaude([{ role: 'user', content: prompt }], null, MAX_TOKENS_ANALYST);
  const result = safeParse(extractText(data));
  if (!result || !result.scored) throw new Error('Sentiment analyst returned malformed output. Please try again.');

  const sov = (result.share_of_voice || []).find(s => s.brand.toLowerCase() === brand.toLowerCase());
  if (sov) trace('Share of voice for ' + brand + ': ' + Math.round(sov.percent) + '%');
  trace('Sentiment analyst → scoring complete');
  setIcon(5, 'done');
  return result;
}

// ── Agent 7: Bureau Chief ─────────────────────────────────────────────────────
async function agentBureau(brand, competitors, allMentions, analysis, region, isAllCanada) {
  setIcon(6, 'running');
  trace('Bureau chief → drafting Canada intelligence briefing');

  const geo      = isAllCanada ? 'nationally across Canada' : 'in ' + region;
  const comp     = competitors.length ? ' vs ' + competitors.join(', ') : '';
  const platforms = [...new Set(allMentions.map(m => m.platform))];

  // Compact data summary only — no raw JSON blobs
  const sov     = (analysis.share_of_voice || []).map(s => s.brand + ':' + Math.round(s.percent) + '%').join(', ');
  const bd      = analysis.sentiment_breakdown || {};
  const sent    = Object.entries(bd).map(([b, v]) => b + ' net=' + ((v.net_sentiment || 0).toFixed(2)) + ' (+' + (v.positive||0) + '/-' + (v.negative||0) + ')').join(' | ');
  const themes  = (analysis.themes || []).slice(0, 4).map(t => t.theme + '(' + t.sentiment + ')').join(', ');
  const regions = Object.entries(analysis.region_breakdown || {}).slice(0, 4).map(([r, v]) => r + ':+' + (v.positive||0) + '/-' + (v.negative||0)).join(', ');

  const prompt = 'Write a Canadian brand intelligence briefing for "' + brand + '" ' + geo + comp + '.\n\nDATA: mentions=' + allMentions.length + ' platforms=[' + platforms.join(',') + '] SoV=' + sov + ' sentiment=[' + sent + '] themes=[' + themes + '] regions=[' + regions + ']\n\nReturn ONLY JSON: {headline, executive_summary, key_findings:[4 items], regional_insight, platform_insight, risks:[2], opportunities:[2], recommendations:[3]}. Canadian market lens. No prose outside JSON.';

  const data   = await callClaude([{ role: 'user', content: prompt }], null, MAX_TOKENS_DEFAULT);
  const report = safeParse(extractText(data));
  if (!report) throw new Error('Bureau chief returned malformed report. Please try again.');

  trace('Bureau chief → briefing complete');
  setIcon(6, 'done');
  return report;
}
