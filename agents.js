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

Return ONLY a JSON array (no prose or fences) of 8-12 mentions:
[{"brand":"<name>","channel":"web","platform":"news","region":"<province or National>","source":"<outlet>","title":"<headline>","snippet":"<2-3 sentences>","date":"<month year>","sentiment":"positive|neutral|negative"}]`;

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

  const prompt = `You are a Reddit intelligence agent specializing in the Canadian market. Find or simulate realistic Reddit mentions for "${brand}" in ${geo}. ${compLine}

Consider relevant subreddits: r/canada, r/ontario, r/vancouver, r/Calgary, r/Montreal, r/Edmonton, r/Halifax, r/photography, r/instantphotography, r/analog, r/filmphoto, r/gifts, r/frugal — whichever are most relevant.

Return ONLY a JSON array (no prose or fences) of 6-10 mentions:
[{"brand":"<name>","channel":"social","platform":"reddit","region":"<province or National>","subreddit":"<subreddit>","title":"<thread title>","snippet":"<realistic post or comment, 2-3 sentences>","upvotes":<number>,"comments":<number>,"date":"<month year>","sentiment":"positive|neutral|negative"}]`;

  const data = await callClaude([{ role: 'user', content: prompt }], WEB_SEARCH_TOOL, MAX_TOKENS_DEFAULT);
  const arr = safeParseArr(extractText(data)) || [];
  trace('Reddit agent filed ' + arr.length + ' thread mentions');
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

  const prompt = `You are an X/Twitter social listening agent for the Canadian market. Find or simulate realistic X/Twitter mentions for "${brand}" in ${geo}. ${compLine}

Focus on Canadian accounts, Canadian hashtags (#Canada, provincial tags), and local conversations. Include a mix of consumer posts, influencer content, and brand account activity.

Return ONLY a JSON array (no prose or fences) of 6-10 mentions:
[{"brand":"<name>","channel":"social","platform":"twitter","region":"<province or National>","handle":"@<username>","tweet":"<realistic tweet, max 280 chars>","likes":<number>,"retweets":<number>,"date":"<month year>","sentiment":"positive|neutral|negative","hashtags":["<tag>"]}]`;

  const data = await callClaude([{ role: 'user', content: prompt }], WEB_SEARCH_TOOL, MAX_TOKENS_DEFAULT);
  const arr = safeParseArr(extractText(data)) || [];
  trace('X/Twitter agent filed ' + arr.length + ' tweet mentions');
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

  const prompt = `You are a Facebook social listening agent for the Canadian market. Find or simulate realistic Facebook mentions for "${brand}" in ${geo}. ${compLine}

Include posts from brand pages, Canadian photography/hobby groups, local buy-and-sell groups, parenting groups, gift recommendation groups — whichever are most relevant.

Return ONLY a JSON array (no prose or fences) of 5-8 mentions:
[{"brand":"<name>","channel":"social","platform":"facebook","region":"<province or National>","group_or_page":"<group name>","post_snippet":"<realistic post, 2-3 sentences>","reactions":<number>,"comments":<number>,"date":"<month year>","sentiment":"positive|neutral|negative"}]`;

  const data = await callClaude([{ role: 'user', content: prompt }], WEB_SEARCH_TOOL, MAX_TOKENS_DEFAULT);
  const arr = safeParseArr(extractText(data)) || [];
  trace('Facebook agent filed ' + arr.length + ' group/page mentions');
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

  const prompt = `You are a Google Reviews intelligence agent for the Canadian market. Find or simulate realistic Google Reviews and product reviews for "${brand}" in ${geo}. ${compLine}

Include reviews from physical retail locations (Best Buy, London Drugs, Walmart Canada, Staples, The Source), Google Shopping, and app stores if applicable.

Return ONLY a JSON array (no prose or fences) of 5-8 mentions:
[{"brand":"<name>","channel":"web","platform":"google","region":"<province or National>","store":"<retailer or listing>","rating":<1-5>,"review_snippet":"<realistic review, 2-3 sentences>","helpful_votes":<number>,"date":"<month year>","sentiment":"positive|neutral|negative"}]`;

  const data = await callClaude([{ role: 'user', content: prompt }], WEB_SEARCH_TOOL, MAX_TOKENS_DEFAULT);
  const arr = safeParseArr(extractText(data)) || [];
  trace('Google Reviews agent filed ' + arr.length + ' review mentions');
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

  const trimmed = allMentions.slice(0, 30).map((m, i) => {
    const text = (m.snippet || m.tweet || m.post_snippet || m.review_snippet || m.title || '').slice(0, 80);
    return i + '|' + (m.brand || brand) + '|' + (m.platform || 'web') + '|' + (m.region || 'CA') + '|' + text;
  }).join('\n');

  const prompt = `Sentiment analysis for brand "${brand}" in Canadian market. Competitors: ${competitors.join(', ') || 'none'}.

Mentions (index|brand|platform|region|snippet):
${trimmed}

Return ONLY valid JSON (no prose, no fences):
{
  "scored": [{"index":0,"brand":"x","sentiment":"positive","score":0.5,"rationale":"brief"}],
  "share_of_voice": [{"brand":"x","mention_count":1,"percent":50}],
  "sentiment_breakdown": {"BrandName":{"positive":1,"neutral":0,"negative":0,"net_sentiment":0.5}},
  "platform_breakdown": {"reddit":{"positive":2,"neutral":1,"negative":1,"net_sentiment":0.3}},
  "region_breakdown": {"Ontario":{"positive":2,"neutral":1,"negative":0}},
  "themes": [{"theme":"x","sentiment":"positive","frequency":3,"platforms":["reddit","twitter"]}]
}

Rules:
- share_of_voice must include [${bList}]. Percents sum to 100.
- platform_breakdown must include every platform in [${platList.join(', ')}].
- Max 5 themes.
- No extra text.`;

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

  const geoLine = isAllCanada ? 'nationally across Canada' : 'in ' + region;
  const compLine = competitors.length ? 'Benchmarked against: ' + competitors.join(', ') + '.' : '';
  const platforms = [...new Set(allMentions.map(m => m.platform))];

  const prompt = `You are a Canadian market intelligence bureau chief. Prepare an executive brand briefing for "${brand}" ${geoLine}. ${compLine}

DATA:
${JSON.stringify({ totalMentions: allMentions.length, platforms, analysis }, null, 2)}

Return ONLY valid JSON (no prose, no fences):
{
  "headline": "<one sharp sentence on brand health>",
  "executive_summary": "<2-3 sentences for executives>",
  "key_findings": ["<finding 1>","<finding 2>","<finding 3>","<finding 4>"],
  "regional_insight": "<2-3 sentences on regional dynamics — reference provinces by name>",
  "platform_insight": "<2-3 sentences on which platforms are driving sentiment and why>",
  "share_of_voice_analysis": "<2-3 sentences citing numbers>",
  "risks": ["<risk 1>","<risk 2>"],
  "opportunities": ["<opp 1>","<opp 2>"],
  "recommendations": ["<rec 1>","<rec 2>","<rec 3>"]
}

Canadian market lens. Reference actual data. No filler.`;

  const data = await callClaude([{ role: 'user', content: prompt }], null, MAX_TOKENS_DEFAULT);
  const report = safeParse(extractText(data));
  if (!report) throw new Error('Bureau chief returned malformed report. Please try again.');

  trace('Bureau chief → briefing complete');
  setIcon(6, 'done');
  return report;
}
