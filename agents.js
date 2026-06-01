// agents.js — all 7 agent functions

const WEB_SEARCH_TOOL = [{ type: 'web_search_20250305', name: 'web_search' }];

// ── Agent 1: Mention Scout (web + news) ──────────────────────────────────────
async function agentScout(brand, competitors, region, isAllCanada) {
  setIcon(0, 'running');
  trace('Mention scout → searching news & web for "' + brand + '" in ' + region);

  const compLine = competitors.length ? 'Also track: ' + competitors.join(', ') + '.' : '';
  const geo = isAllCanada ? 'across Canada' : 'in ' + region + ', Canada';

  const prompt = `You are a Canadian brand intelligence scout. Find recent mentions for "${brand}" ${geo}. ${compLine}

Search news, blogs, press releases, and Canadian media (CBC, Globe and Mail, Toronto Star, regional outlets).

Return ONLY a JSON array (no prose or fences) of 8-10 mentions:
[{"brand":"<name>","channel":"web","platform":"news","region":"<province or National>","source":"<outlet>","title":"<headline>","snippet":"<2 sentences>","date":"<month year>","sentiment":"positive|neutral|negative"}]`;

  const data = await callClaude([{ role: 'user', content: prompt }], WEB_SEARCH_TOOL, MAX_TOKENS_SCOUT);
  const arr = safeParseArr(extractText(data)) || [];
  trace('Scout filed ' + arr.length + ' web/news mentions');
  setIcon(0, 'done');
  return arr;
}

// ── Agent 2: Reddit ───────────────────────────────────────────────────────────
async function agentReddit(brand, competitors, region, isAllCanada) {
  setIcon(1, 'running');
  trace('Reddit agent → scrubbing subreddits for "' + brand + '"');
  await sleep(AGENT_PAUSE_MS);

  const compLine = competitors.length ? 'Also look for: ' + competitors.join(', ') + '.' : '';
  const geo = isAllCanada ? 'Canada-wide' : region + ', Canada';

  const prompt = `Reddit intelligence for "${brand}" in ${geo}. ${compLine}
Relevant subreddits: r/canada, r/ontario, r/vancouver, r/Calgary, r/Montreal, r/photography, r/instantphotography, r/analog, r/gifts, r/frugal.

Return ONLY a JSON array (no prose or fences) of 5-7 mentions:
[{"brand":"<name>","channel":"social","platform":"reddit","region":"<province or National>","subreddit":"<subreddit>","title":"<thread title>","snippet":"<2 sentences>","upvotes":<number>,"date":"<month year>","sentiment":"positive|neutral|negative"}]`;

  const data = await callClaude([{ role: 'user', content: prompt }], WEB_SEARCH_TOOL, MAX_TOKENS_DEFAULT);
  const arr = safeParseArr(extractText(data)) || [];
  trace('Reddit agent filed ' + arr.length + ' mentions');
  setIcon(1, 'done');
  return arr;
}

// ── Agent 3: X / Twitter ──────────────────────────────────────────────────────
async function agentTwitter(brand, competitors, region, isAllCanada) {
  setIcon(2, 'running');
  trace('X/Twitter agent → scanning tweets and hashtags');
  await sleep(AGENT_PAUSE_MS);

  const compLine = competitors.length ? 'Also track: ' + competitors.join(', ') + '.' : '';
  const geo = isAllCanada ? 'Canada' : region + ', Canada';

  const prompt = `X/Twitter social listening for "${brand}" in ${geo}. ${compLine}
Focus on Canadian accounts and hashtags.

Return ONLY a JSON array (no prose or fences) of 5-7 mentions:
[{"brand":"<name>","channel":"social","platform":"twitter","region":"<province or National>","handle":"@<username>","tweet":"<tweet text max 200 chars>","likes":<number>,"date":"<month year>","sentiment":"positive|neutral|negative"}]`;

  const data = await callClaude([{ role: 'user', content: prompt }], WEB_SEARCH_TOOL, MAX_TOKENS_DEFAULT);
  const arr = safeParseArr(extractText(data)) || [];
  trace('X/Twitter agent filed ' + arr.length + ' mentions');
  setIcon(2, 'done');
  return arr;
}

// ── Agent 4: Facebook ─────────────────────────────────────────────────────────
async function agentFacebook(brand, competitors, region, isAllCanada) {
  setIcon(3, 'running');
  trace('Facebook agent → scanning groups and pages');
  await sleep(AGENT_PAUSE_MS);

  const compLine = competitors.length ? 'Also track: ' + competitors.join(', ') + '.' : '';
  const geo = isAllCanada ? 'Canada' : region + ', Canada';

  const prompt = `Facebook social listening for "${brand}" in ${geo}. ${compLine}
Include Canadian photography groups, local buy-and-sell, parenting and gift groups.

Return ONLY a JSON array (no prose or fences) of 4-6 mentions:
[{"brand":"<name>","channel":"social","platform":"facebook","region":"<province or National>","group_or_page":"<group name>","post_snippet":"<2 sentences>","reactions":<number>,"date":"<month year>","sentiment":"positive|neutral|negative"}]`;

  const data = await callClaude([{ role: 'user', content: prompt }], WEB_SEARCH_TOOL, MAX_TOKENS_DEFAULT);
  const arr = safeParseArr(extractText(data)) || [];
  trace('Facebook agent filed ' + arr.length + ' mentions');
  setIcon(3, 'done');
  return arr;
}

// ── Agent 5: Google Reviews ───────────────────────────────────────────────────
async function agentGoogle(brand, competitors, region, isAllCanada) {
  setIcon(4, 'running');
  trace('Google Reviews agent → scrubbing store and product reviews');
  await sleep(AGENT_PAUSE_MS);

  const compLine = competitors.length ? 'Also look for: ' + competitors.join(', ') + '.' : '';
  const geo = isAllCanada ? 'Canada' : region + ', Canada';

  const prompt = `Google Reviews for "${brand}" in ${geo}. ${compLine}
Include Best Buy, London Drugs, Walmart Canada, Staples, The Source.

Return ONLY a JSON array (no prose or fences) of 4-6 mentions:
[{"brand":"<name>","channel":"web","platform":"google","region":"<province or National>","store":"<retailer>","rating":<1-5>,"review_snippet":"<2 sentences>","date":"<month year>","sentiment":"positive|neutral|negative"}]`;

  const data = await callClaude([{ role: 'user', content: prompt }], WEB_SEARCH_TOOL, MAX_TOKENS_DEFAULT);
  const arr = safeParseArr(extractText(data)) || [];
  trace('Google Reviews agent filed ' + arr.length + ' mentions');
  setIcon(4, 'done');
  return arr;
}

// ── Agent 6: Sentiment Analyst ────────────────────────────────────────────────
async function agentSentiment(brand, competitors, allMentions) {
  setIcon(5, 'running');
  trace('Sentiment analyst → scoring ' + allMentions.length + ' mentions across all platforms');
  await sleep(ANALYST_PAUSE_MS);

  const allBrands = [brand, ...competitors];
  const bList = allBrands.map(b => '"' + b + '"').join(', ');
  const platList = [...new Set(allMentions.map(m => m.platform || 'web'))];

  // Keep trimmed to 20 mentions max, 60 chars per snippet
  const trimmed = allMentions.slice(0, 20).map((m, i) => {
    const text = (m.snippet || m.tweet || m.post_snippet || m.review_snippet || m.title || '').slice(0, 60);
    return i + '|' + (m.brand || brand) + '|' + (m.platform || 'web') + '|' + (m.region || 'CA') + '|' + text;
  }).join('\n');

  const prompt = `Sentiment for brand "${brand}" vs [${competitors.join(', ') || 'none'}] in Canada.

Mentions (index|brand|platform|region|snippet):
${trimmed}

Return ONLY valid JSON:
{"scored":[{"index":0,"brand":"x","sentiment":"positive","score":0.5}],"share_of_voice":[{"brand":"x","mention_count":1,"percent":50}],"sentiment_breakdown":{"BrandName":{"positive":1,"neutral":0,"negative":0,"net_sentiment":0.5}},"platform_breakdown":{"reddit":{"positive":2,"neutral":1,"negative":1,"net_sentiment":0.3}},"region_breakdown":{"Ontario":{"positive":2,"neutral":1,"negative":0}},"themes":[{"theme":"x","sentiment":"positive","frequency":3}]}

Rules: share_of_voice includes [${bList}], percents sum 100. platform_breakdown includes [${platList.join(', ')}]. Max 4 themes. No extra text.`;

  const data = await callClaude([{ role: 'user', content: prompt }], null, MAX_TOKENS_ANALYST);
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

  const geoLine  = isAllCanada ? 'nationally across Canada' : 'in ' + region;
  const compLine = competitors.length ? 'vs ' + competitors.join(', ') : '';
  const platforms = [...new Set(allMentions.map(m => m.platform))];

  // Pass only a compact summary — not the full analysis object
  const sov = (analysis.share_of_voice || []).map(s => s.brand + ':' + Math.round(s.percent) + '%').join(', ');
  const bd  = analysis.sentiment_breakdown || {};
  const sentSummary = Object.entries(bd).map(([b, v]) =>
    b + ' net=' + (v.net_sentiment || 0).toFixed(2) + ' pos=' + (v.positive || 0) + ' neg=' + (v.negative || 0)
  ).join(' | ');
  const themes = (analysis.themes || []).map(t => t.theme + '(' + t.sentiment + ')').join(', ');
  const regionTop = Object.entries(analysis.region_breakdown || {}).slice(0, 4)
    .map(([r, v]) => r + ':pos=' + (v.positive || 0)).join(', ');

  const prompt = `Canadian market intelligence bureau chief. Executive briefing for "${brand}" ${geoLine} ${compLine}.

SUMMARY DATA:
- Total mentions: ${allMentions.length} across [${platforms.join(', ')}]
- Share of voice: ${sov}
- Sentiment: ${sentSummary}
- Top themes: ${themes}
- Regional: ${regionTop}

Return ONLY valid JSON:
{"headline":"<one sharp sentence>","executive_summary":"<2-3 sentences>","key_findings":["<f1>","<f2>","<f3>","<f4>"],"regional_insight":"<2 sentences naming provinces>","platform_insight":"<2 sentences on platform drivers>","risks":["<r1>","<r2>"],"opportunities":["<o1>","<o2>"],"recommendations":["<rec1>","<rec2>","<rec3>"]}

Canadian lens. Cite actual numbers. No filler. No extra text.`;

  const data = await callClaude([{ role: 'user', content: prompt }], null, MAX_TOKENS_DEFAULT);
  const report = safeParse(extractText(data));
  if (!report) throw new Error('Bureau chief returned malformed report. Please try again.');

  trace('Bureau chief → briefing complete');
  setIcon(6, 'done');
  return report;
}
