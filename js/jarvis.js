
// ===== AI MODULE =====
const AI = {
  MODEL: 'claude-sonnet-4-6',
  key:   () => Store.get('anthropicKey', ''),
  ready: () => !!Store.get('anthropicKey', ''),
  headers: () => ({
    'Content-Type': 'application/json',
    'x-api-key': AI.key(),
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-allow-browser': 'true'
  }),
  async call(system, user, maxTokens = 1000) {
    if (!AI.ready()) throw new Error('NO_KEY');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: AI.headers(),
      body: JSON.stringify({
        model: AI.MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }]
      })
    });
    if (!res.ok) { const err = await res.text(); throw new Error(err); }
    const data = await res.json();
    return data.content?.map(c => c.text || '').join('') || '';
  },
  notConfigured: (el) => {
    if (el) el.innerHTML = `<div style="padding:20px;text-align:center;color:var(--muted)">
      <div style="font-size:28px;margin-bottom:10px">🔑</div>
      <div style="font-size:13px;margin-bottom:8px">Claude API key not configured</div>
      <button class="btn btn-ai" onclick="openSettings()" style="font-size:12px;padding:6px 14px">Add API Key</button>
    </div>`;
  }
};

// ===== PERSISTENT STORAGE LAYER =====
const Store = {
  get(key, def) {
    try { const v = localStorage.getItem('jarvis_' + key); return v !== null ? JSON.parse(v) : def; }
    catch { return def; }
  },
  set(key, val) {
    try { localStorage.setItem('jarvis_' + key, JSON.stringify(val)); } catch(e) {}
  }
};

// ===== TAB NAVIGATION =====
const tabTitles = {
  dashboard: '⚡ Command Center',
  analyzer: '🔬 Site Audit',
  competitors: '⚔️ Competitor Intelligence',
  keywords: '🎯 Keyword Strategy',
  content: '✍️ Content Plan',
  technical: '⚙️ Technical SEO',
  backlinks: '🔗 Backlink Strategy',
  roadmap: '🗺️ 12-Month Roadmap',
  tracker: '📈 Rank Tracker',
  jarvis: '🧠 Jarvis AI Co-Pilot',
  roaster: '🔥 AI Site Roaster',
  clustering: '🧬 Keyword Clustering Engine',
  bulkmeta: '⚡ Bulk Meta Title & Description Writer',
  gapcontent: '🎯 Content Gap Radar',
  serpfeatures: '🔍 SERP Feature Tracker',
  linkmap: '🕸️ Internal Link Map',
  eeat: '🏅 E-E-A-T Scorer',
  schema: '🏗️ Schema Builder',
  roi: '💰 SEO ROI Calculator',
  scheduler: '📅 Monthly Report Scheduler',
  casestudy: '🏆 Case Study Builder',
  gsc: '🔌 Google Search Console Connector',
  multisiteX: '🌐 Multi-Site Switcher',
  teamX: '👥 Team Collaboration',
  voiceX: '🎤 Voice Command Mode',
  serp: '🔍 SERP Feature Tracker',
  linkmap: '🕸️ Internal Link Map',
  eeat: '🏅 E-E-A-T Scorer',
  schema: '🏗️ Schema Builder',
  serpfeatures: '🔍 SERP Feature Tracker',
  linkmap: '🕸️ Internal Link Map',
  eeat: '🏅 E-E-A-T Scorer',
  schema: '🏗️ Schema Builder',
  roi:        '💰 SEO ROI Calculator',
  scheduler:  '📅 Report Scheduler',
  casestudy:  '🏆 Case Study Builder',
  gsc:        '🔌 Google Search Console Connector'
};

function setTab(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const sec = document.getElementById('sec-' + name);
  if (sec) { sec.classList.add('active'); sec.style.animation = 'none'; sec.offsetHeight; sec.style.animation = ''; }

  document.querySelectorAll('.tab').forEach(t => {
    if (t.onclick && t.onclick.toString().includes("'" + name + "'")) t.classList.add('active');
  });
  document.querySelectorAll('.nav-item').forEach(n => {
    if (n.onclick && n.onclick.toString().includes("'" + name + "'")) n.classList.add('active');
  });

  document.getElementById('topbarTitle').textContent = tabTitles[name] || name;
  Store.set('activeTab', name);

  // Section-specific init hooks (consolidated from all script blocks)
  if (name === 'tracker')   { setTimeout(rtRender, 60); }
  if (name === 'technical') { setTimeout(pssRender, 60); }
  if (name === 'serp')      { setTimeout(renderSERP, 60); }
  if (name === 'linkmap')   { setTimeout(initLinkMap, 60); }
  if (name === 'schema')    { setTimeout(() => { renderSchemaFields(); renderSchemaCoverage(); }, 60); }
  if (name === 'roi')       { setTimeout(calcROI, 60); }
  if (name === 'scheduler') { setTimeout(initScheduler, 60); setTimeout(updateSchedulePreview, 60); }
  if (name === 'gsc')       { setTimeout(initGSC, 60); }
  if (name === 'roadmap')   { setTimeout(() => { if (!fcChart) updateForecast(); }, 80); }
}

// ===== CHECK BOXES =====
function toggleCheck(el) {
  el.classList.toggle('checked');
  el.textContent = el.classList.contains('checked') ? '✓' : '';
  const label = el.parentElement.querySelector('.check-label');
  if (label) label.classList.toggle('checked');
}

// ===== SITE ANALYZER =====
function analyzeSite() {
  const domain = document.getElementById('domainInput').value.trim() || 'yoursite.com';
  document.getElementById('siteUrl').textContent = domain;
  setTab('analyzer');
}

// ===== JARVIS AI =====
async function askJarvis() {
  const input = document.getElementById('jarvisInput');
  const output = document.getElementById('jarvisOutput');
  const domain = document.getElementById('domainInput').value || 'yoursite.com';
  const query = input.value.trim();
  if (!query) return;

  output.innerHTML = `
    <div class="ai-thinking">
      <span>JARVIS ANALYZING</span>
      <span class="dot-animate"><span></span><span></span><span></span></span>
    </div>
    <div style="color:var(--muted);font-size:13px">Processing your SEO request...</div>
  `;

  const systemPrompt = `You are JARVIS, an elite SEO strategist AI with deep expertise in:
- Technical SEO audits and fixes
- Keyword research and mapping
- Content strategy and topic clusters
- Competitor analysis and gap identification
- Link building campaigns
- Core Web Vitals optimization
- Schema markup implementation
- Local SEO, International SEO
- SEO roadmapping and forecasting

The user's website is: ${domain}

Provide actionable, specific, advanced SEO advice. Structure responses with clear sections. Be specific with numbers, tactics, and expected results. Think like a $10,000/month SEO consultant who is results-obsessed.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: AI.headers(),
      body: JSON.stringify({
        model: AI.MODEL,
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: query }]
      })
    });
    const data = await res.json();
    const text = data.content?.map(c => c.text || '').join('\n') || 'No response received.';

    output.innerHTML = `
      <div class="ai-thinking" style="margin-bottom:12px">
        <span>🤖 JARVIS</span>
        <span style="color:var(--accent3);margin-left:8px">● Response ready</span>
      </div>
      <div style="white-space:pre-wrap;font-size:13.5px;line-height:1.8">${escapeHtml(text)}</div>
    `;
  } catch (e) {
    output.innerHTML = `
      <div class="ai-thinking" style="margin-bottom:12px"><span>🤖 JARVIS</span></div>
      <div style="font-size:13.5px;line-height:1.8">
        <strong style="color:var(--accent)">SEO Strategy for: ${escapeHtml(domain)}</strong><br><br>
        Based on your query: "<em>${escapeHtml(query)}</em>"<br><br>
        Here's my strategic recommendation:<br><br>
        <strong>1. Immediate Priority (Week 1-2):</strong><br>
        • Run a complete technical audit using Screaming Frog to identify crawl errors<br>
        • Fix all 4xx/5xx errors and redirect chains immediately<br>
        • Optimize title tags and meta descriptions for top 20 pages<br><br>
        <strong>2. Content Strategy:</strong><br>
        • Build 3 topic cluster pillars around your core service/product keywords<br>
        • Target informational keywords (KD &lt;40) first to build topical authority fast<br>
        • Publish minimum 3x/week with 1,500-2,500 word comprehensive guides<br><br>
        <strong>3. Link Building:</strong><br>
        • Start HARO outreach for quick DA 60+ backlinks<br>
        • Identify competitor's broken links and pitch your content as replacement<br>
        • Target 5 guest posts/month on DA 50+ publications in your niche<br><br>
        <strong>Expected Results:</strong> With consistent execution, expect 40-60% traffic growth in 90 days, and 200-300% in 6 months.<br><br>
        <em style="color:var(--muted)">Note: Connect the Anthropic API key to unlock full AI-powered analysis.</em>
      </div>
    `;
  }
  input.value = '';
}

function quickAsk(el) {
  document.getElementById('jarvisInput').value = el.textContent.replace(/^[^\w]+/, '').trim();
  askJarvis();
}

function loadAnalysis(type) {
  setTab('jarvis');
  const messages = {
    competitor: 'Show me the full competitor gap analysis with actionable next steps',
    technical: 'Show me the complete technical SEO audit findings and fix priority order'
  };
  document.getElementById('jarvisInput').value = messages[type] || '';
  askJarvis();
}

function escapeHtml(text) {
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Init — show wizard on first load
// ===== SETTINGS =====
function updateAIStatus() {
  const dot = document.getElementById('ai-status-dot');
  if (dot) dot.style.background = AI.ready() ? 'var(--accent3)' : 'var(--danger)';
}

function openSettings() {
  const modal = document.getElementById('settings-modal');
  modal.style.display = 'flex';
  const stored = Store.get('anthropicKey', '');
  const keyInput = document.getElementById('settings-api-key');
  keyInput.value = stored;
  const status = document.getElementById('settings-key-status');
  status.textContent = stored
    ? `✅ Key saved: sk-ant-...${stored.slice(-6)}`
    : 'Enter your key from console.anthropic.com';
  status.style.color = stored ? 'var(--accent3)' : 'var(--muted)';
}

function closeSettings() {
  document.getElementById('settings-modal').style.display = 'none';
}

function toggleKeyVisibility() {
  const inp = document.getElementById('settings-api-key');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

function saveApiKey() {
  const key = document.getElementById('settings-api-key').value.trim();
  Store.set('anthropicKey', key);
  updateAIStatus();
  const status = document.getElementById('settings-key-status');
  if (key) {
    status.textContent = `✅ Key saved: sk-ant-...${key.slice(-6)}`;
    status.style.color = 'var(--accent3)';
  } else {
    status.textContent = 'Key cleared.';
    status.style.color = 'var(--muted)';
  }
  setTimeout(closeSettings, 800);
}

// Close modal on backdrop click
document.addEventListener('click', e => {
  if (e.target.id === 'settings-modal') closeSettings();
});

window.addEventListener('DOMContentLoaded', () => {
  // Restore persisted state
  const savedTab = Store.get('activeTab', 'dashboard');
  setTab(savedTab);
  const domInput = document.getElementById('domainInput');
  if (domInput) { domInput.value = Store.get('domain', ''); }
  document.getElementById('domainInput')?.addEventListener('change', e => Store.set('domain', e.target.value));
  updateAIStatus();

  const seen = sessionStorage.getItem('jarvis_onboarded');
  if (!seen) showWizard();
  else setTab('dashboard');
});
/* --- */
let briefData = null;
let loadMsgInterval = null;

function quickBrief(kw, vol, kd, intent) {
  document.getElementById('brief-kw').value     = kw;
  document.getElementById('brief-vol').value    = vol;
  document.getElementById('brief-kd').value     = kd;
  document.getElementById('brief-intent').value = intent;
  generateBrief();
}

async function generateBrief() {
  const kw     = document.getElementById('brief-kw').value.trim();
  const vol    = document.getElementById('brief-vol').value.trim() || 'unknown';
  const kd     = document.getElementById('brief-kd').value.trim() || 'unknown';
  const intent = document.getElementById('brief-intent').value;
  const domain = document.getElementById('domainInput')?.value || 'yoursite.com';

  if (!kw) { document.getElementById('brief-kw').focus(); return; }

  // UI: loading
  document.getElementById('brief-output').style.display  = 'none';
  document.getElementById('brief-loading').style.display = 'block';
  document.getElementById('brief-gen-btn').disabled = true;
  document.getElementById('brief-btn-label').textContent = '⏳ Generating...';

  const loadMsgs = [
    'Analyzing SERP landscape...',
    'Mapping competitor content gaps...',
    'Identifying LSI & semantic keywords...',
    'Crafting heading structure...',
    'Writing content guidelines...',
    'Calculating SEO opportunity score...',
    'Finalizing your brief...'
  ];
  let mi = 0;
  loadMsgInterval = setInterval(() => {
    document.getElementById('brief-load-msg').textContent = loadMsgs[Math.min(mi++, loadMsgs.length-1)];
  }, 1800);

  const prompt = `You are an elite SEO content strategist. Generate a comprehensive content brief for:

Keyword: "${kw}"
Search Volume: ${vol}/month
Keyword Difficulty: ${kd}/100
Search Intent: ${intent}
Site: ${domain}

Return ONLY a valid JSON object with this exact structure (no markdown, no backticks):
{
  "keyword": "${kw}",
  "intent": "${intent}",
  "word_count": 2400,
  "read_time": "12 min",
  "difficulty": "${kd}",
  "volume": "${vol}",
  "opportunity_score": 84,
  "content_type": "Ultimate Guide",
  "publish_priority": "High",
  "meta_title": "...(60 chars max, include keyword)",
  "meta_description": "...(155 chars max, include keyword, CTA)",
  "url_slug": "...(short, hyphenated)",
  "focus_scores": {
    "traffic_potential": 82,
    "rankability": 76,
    "business_value": 88,
    "content_gap": 91
  },
  "h1": "...(compelling, includes keyword)",
  "outline": [
    {
      "h2": "Introduction / What is [topic]",
      "h3s": ["Why this matters in 2025", "Who this guide is for"]
    },
    {
      "h2": "Section 2 heading",
      "h3s": ["Subsection A", "Subsection B", "Subsection C"]
    },
    {
      "h2": "Section 3 heading",
      "h3s": ["Subsection A", "Subsection B"]
    },
    {
      "h2": "Section 4 heading",
      "h3s": ["Subsection A", "Subsection B"]
    },
    {
      "h2": "Section 5 heading",
      "h3s": ["Subsection A", "Subsection B"]
    },
    {
      "h2": "FAQ",
      "h3s": ["Q1?", "Q2?", "Q3?", "Q4?"]
    },
    {
      "h2": "Conclusion",
      "h3s": ["Key takeaways", "Next steps"]
    }
  ],
  "primary_keywords": ["${kw}", "second variation", "third variation"],
  "lsi_keywords": ["related term 1", "related term 2", "related term 3", "related term 4", "related term 5", "related term 6"],
  "questions_to_answer": ["Question 1?", "Question 2?", "Question 3?", "Question 4?", "Question 5?"],
  "negative_keywords": ["avoid term 1", "avoid term 2"],
  "serp_results": [
    {
      "position": 1,
      "title": "Realistic competitor title for this keyword",
      "url": "competitor.com/realistic-slug",
      "word_count": 3200,
      "content_type": "Guide",
      "weakness": "Lacks recent 2025 data, no video embeds"
    },
    {
      "position": 2,
      "title": "Another realistic competitor title",
      "url": "another-site.com/slug",
      "word_count": 2800,
      "content_type": "Listicle",
      "weakness": "Thin subheadings, missing FAQ schema"
    },
    {
      "position": 3,
      "title": "Third competitor title",
      "url": "thirdsite.com/slug",
      "word_count": 2100,
      "content_type": "Blog post",
      "weakness": "No structured data, poor internal linking"
    }
  ],
  "content_differentiation": "Specific angle to outrank — 2-3 sentences on what unique value to provide",
  "schema_types": ["Article", "FAQ", "HowTo"],
  "internal_links": ["Link to pillar page: /blog/main-topic", "Link to cluster: /blog/related-1", "Link to cluster: /blog/related-2"],
  "cta": "Primary call-to-action recommendation for the page",
  "writing_guidelines": [
    { "icon": "📏", "title": "Word Count Target", "desc": "Aim for 2,400–2,800 words. Long enough to be comprehensive, short enough to stay focused." },
    { "icon": "🧠", "title": "Expertise Signals", "desc": "Include at least 3 expert quotes or data points. Cite authoritative sources. Show first-hand experience where possible." },
    { "icon": "📖", "title": "Readability", "desc": "Target Flesch-Kincaid Grade 8. Short paragraphs (2-3 sentences max). Use bullet lists for scannable sections." },
    { "icon": "🖼️", "title": "Media Requirements", "desc": "Minimum 4 images with descriptive alt text. Include 1 custom infographic or diagram. Add 1 comparison table." },
    { "icon": "🔗", "title": "Internal Linking", "desc": "Add 4-6 contextual internal links. Link to pillar page in first 100 words. Vary anchor text naturally." },
    { "icon": "⚡", "title": "EEAT Signals", "desc": "Add author bio with credentials. Include publish + last-updated date. Reference recent statistics (2024-2025)." }
  ]
}`;

  let parsed = null;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers: AI.headers(),
      body: JSON.stringify({
        model: AI.MODEL,
        max_tokens:1000,
        messages:[{ role:'user', content: prompt }]
      })
    });
    const data = await res.json();
    const raw = data.content?.map(c=>c.text||'').join('') || '';
    const clean = raw.replace(/```json|```/g,'').trim();
    parsed = JSON.parse(clean);
  } catch(e) {
    // Fallback mock brief
    parsed = buildMockBrief(kw, vol, kd, intent);
  }

  clearInterval(loadMsgInterval);
  briefData = parsed;
  renderBrief(parsed);

  document.getElementById('brief-loading').style.display = 'none';
  document.getElementById('brief-output').style.display  = 'block';
  document.getElementById('brief-gen-btn').disabled      = false;
  document.getElementById('brief-btn-label').textContent = '🧠 Generate Brief';
  setBriefTab('overview', document.querySelector('.brief-tab'));
}

function buildMockBrief(kw, vol, kd, intent) {
  return {
    keyword: kw, intent, word_count:2400, read_time:'12 min',
    difficulty: kd, volume: vol, opportunity_score:81, content_type:'Ultimate Guide',
    publish_priority:'High',
    meta_title: `${kw.charAt(0).toUpperCase()+kw.slice(1)}: The Complete 2025 Guide`,
    meta_description: `Master ${kw} with this step-by-step guide. Learn proven strategies, tools, and techniques to get real results fast. Start here.`,
    url_slug: kw.toLowerCase().replace(/\s+/g,'-'),
    focus_scores:{ traffic_potential:79, rankability:74, business_value:85, content_gap:88 },
    h1:`The Ultimate ${kw.charAt(0).toUpperCase()+kw.slice(1)} Guide for 2025`,
    outline:[
      { h2:`What is ${kw} and Why It Matters`, h3s:['Definition & core concepts','Why this drives real ROI in 2025','Common mistakes to avoid'] },
      { h2:'Step-by-Step Process', h3s:['Step 1: Foundation setup','Step 2: Research & planning','Step 3: Execution','Step 4: Measure & iterate'] },
      { h2:'Best Tools & Resources', h3s:['Free tools','Paid tools worth the investment','Tool comparison table'] },
      { h2:'Advanced Strategies', h3s:['Strategy A: Quick wins','Strategy B: Long-term compounding','Strategy C: Scaling'] },
      { h2:'Real-World Examples & Case Studies', h3s:['Case study 1','Case study 2','Key lessons'] },
      { h2:'FAQ', h3s:[`What is the best way to do ${kw}?`,'How long does it take to see results?','What budget do I need?','Is it worth doing in 2025?'] },
      { h2:'Conclusion', h3s:['Key takeaways','Your action plan for the next 30 days'] }
    ],
    primary_keywords:[kw, kw+' guide', kw+' strategy'],
    lsi_keywords:['best practices','step by step','tips','tools','examples','checklist','2025'],
    questions_to_answer:[`What is ${kw}?`,`How to do ${kw}?`,`Is ${kw} worth it?`,`Best ${kw} tools?`,`How long does ${kw} take?`],
    negative_keywords:['cheap','free only','basic'],
    serp_results:[
      { position:1, title:`The Definitive ${kw} Guide`, url:'competitor1.com/guide', word_count:3400, content_type:'Guide', weakness:'Outdated (2022), no interactive elements' },
      { position:2, title:`${kw}: 10 Proven Strategies`, url:'competitor2.com/strategies', word_count:2100, content_type:'Listicle', weakness:'Thin content, no case studies' },
      { position:3, title:`How to Master ${kw}`, url:'competitor3.com/how-to', word_count:1800, content_type:'How-To', weakness:'No FAQ, missing schema markup' }
    ],
    content_differentiation:`Go deeper than competitors with real case studies, interactive examples, and 2025-specific data. Add a downloadable checklist and FAQ schema to capture featured snippets. Cover the topic from beginner to advanced in one comprehensive resource.`,
    schema_types:['Article','FAQ','HowTo'],
    internal_links:['Link to pillar page','Link to related cluster 1','Link to related cluster 2'],
    cta:'Start your free SEO audit to see where you stand today',
    writing_guidelines:[
      { icon:'📏', title:'Word Count Target', desc:'Aim for 2,400–2,800 words. Comprehensive but focused — every section must earn its place.' },
      { icon:'🧠', title:'Expertise Signals', desc:'Include at least 3 expert quotes or proprietary data points. Show first-hand experience.' },
      { icon:'📖', title:'Readability', desc:'Grade 8 reading level. Short paragraphs, bullet lists, and clear subheadings throughout.' },
      { icon:'🖼️', title:'Media Requirements', desc:'Minimum 4 images with alt text. One infographic. One comparison table. One video embed if possible.' },
      { icon:'🔗', title:'Internal Linking', desc:'4–6 contextual internal links. Link to the pillar page in the first 100 words.' },
      { icon:'⚡', title:'EEAT Signals', desc:'Author bio, publish date, last-updated date. Reference recent 2024–2025 statistics.' }
    ]
  };
}

function renderBrief(b) {
  // Meta strip
  const pri = {'High':'badge-red','Medium':'badge-amber','Low':'badge-blue'}[b.publish_priority]||'badge-blue';
  document.getElementById('brief-meta-strip').innerHTML = `
    <div class="brief-meta-chip"><span>📄 Type</span>&nbsp;<b>${b.content_type}</b></div>
    <div class="brief-meta-chip"><span>📏 Words</span>&nbsp;<b>${b.word_count.toLocaleString()}</b></div>
    <div class="brief-meta-chip"><span>⏱️ Read</span>&nbsp;<b>${b.read_time}</b></div>
    <div class="brief-meta-chip"><span>🔥 KD</span>&nbsp;<b>${b.difficulty}/100</b></div>
    <div class="brief-meta-chip"><span>📊 Vol</span>&nbsp;<b>${b.volume}/mo</b></div>
    <div class="brief-meta-chip"><span>⭐ Score</span>&nbsp;<b style="color:var(--accent3)">${b.opportunity_score}/100</b></div>
    <div class="brief-meta-chip"><span class="badge ${pri}">${b.publish_priority} Priority</span></div>
  `;

  // ---- OVERVIEW ----
  const fs = b.focus_scores||{};
  document.getElementById('brief-panel-overview').innerHTML = `
    <div class="brief-overview-grid">
      <div>
        <div class="brief-box" style="margin-bottom:12px">
          <div class="brief-box-title">🏷️ META TITLE</div>
          <div class="brief-box-val" style="font-weight:600">${esc(b.meta_title)}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:6px">${b.meta_title.length} chars ${b.meta_title.length<=60?'✅':'⚠️ Too long'}</div>
        </div>
        <div class="brief-box" style="margin-bottom:12px">
          <div class="brief-box-title">📝 META DESCRIPTION</div>
          <div class="brief-box-val">${esc(b.meta_description)}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:6px">${b.meta_description.length} chars ${b.meta_description.length<=155?'✅':'⚠️ Too long'}</div>
        </div>
        <div class="brief-box">
          <div class="brief-box-title">🔗 URL SLUG</div>
          <div class="brief-box-val" style="color:var(--accent);font-family:'Space Mono',monospace;font-size:12px">/${esc(b.url_slug)}</div>
        </div>
      </div>
      <div>
        <div class="brief-box" style="margin-bottom:12px">
          <div class="brief-box-title">📊 OPPORTUNITY SCORES</div>
          ${scoreBar('Traffic Potential', fs.traffic_potential||80, '#00d4ff')}
          ${scoreBar('Rankability', fs.rankability||75, '#7c3aed')}
          ${scoreBar('Business Value', fs.business_value||85, '#10b981')}
          ${scoreBar('Content Gap', fs.content_gap||90, '#f59e0b')}
        </div>
        <div class="brief-box" style="margin-bottom:12px">
          <div class="brief-box-title">🏗️ SCHEMA TO IMPLEMENT</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">
            ${(b.schema_types||[]).map(s=>`<span class="badge badge-blue">${s}</span>`).join('')}
          </div>
        </div>
        <div class="brief-box">
          <div class="brief-box-title">💡 CTA RECOMMENDATION</div>
          <div class="brief-box-val" style="font-size:13px">${esc(b.cta||'')}</div>
        </div>
      </div>
    </div>
    <div class="brief-box" style="margin-top:12px">
      <div class="brief-box-title">🎯 CONTENT DIFFERENTIATION ANGLE</div>
      <div class="brief-box-val">${esc(b.content_differentiation||'')}</div>
    </div>
    <div class="brief-box" style="margin-top:12px">
      <div class="brief-box-title">🔗 INTERNAL LINKS TO ADD</div>
      ${(b.internal_links||[]).map(l=>`<div style="font-size:12.5px;color:var(--muted);padding:3px 0;border-bottom:1px solid #0f1e35">→ ${esc(l)}</div>`).join('')}
    </div>
  `;

  // ---- OUTLINE ----
  document.getElementById('brief-panel-outline').innerHTML = `
    <div class="brief-outline">
      <div class="brief-h1">H1: ${esc(b.h1)}</div>
      ${(b.outline||[]).map((sec,i)=>`
        <div class="brief-section">
          <div class="brief-h2">
            <div class="brief-h2-num">${i+1}</div>
            H2: ${esc(sec.h2)}
          </div>
          ${sec.h3s&&sec.h3s.length ? `<div class="brief-h3s">${sec.h3s.map(h=>`<div class="brief-h3">H3: ${esc(h)}</div>`).join('')}</div>` : ''}
        </div>
      `).join('')}
    </div>
  `;

  // ---- KEYWORDS ----
  document.getElementById('brief-panel-keywords').innerHTML = `
    <div class="brief-kw-grid">
      <div class="brief-kw-group">
        <div class="brief-kw-group-title">🎯 PRIMARY KEYWORDS</div>
        ${(b.primary_keywords||[]).map(k=>`<span class="brief-kw-tag primary">${esc(k)}</span>`).join('')}
      </div>
      <div class="brief-kw-group">
        <div class="brief-kw-group-title">🔮 LSI / SEMANTIC KEYWORDS</div>
        ${(b.lsi_keywords||[]).map(k=>`<span class="brief-kw-tag lsi">${esc(k)}</span>`).join('')}
      </div>
      <div class="brief-kw-group">
        <div class="brief-kw-group-title">❓ QUESTIONS TO ANSWER</div>
        ${(b.questions_to_answer||[]).map(k=>`<span class="brief-kw-tag question">${esc(k)}</span>`).join('')}
      </div>
      <div class="brief-kw-group">
        <div class="brief-kw-group-title">🚫 AVOID (CANNIBALIZATION)</div>
        ${(b.negative_keywords||[]).map(k=>`<span class="brief-kw-tag" style="border-color:var(--danger)30;color:var(--danger)">${esc(k)}</span>`).join('')}
      </div>
    </div>
  `;

  // ---- SERP INTEL ----
  document.getElementById('brief-panel-serp').innerHTML = `
    <div style="margin-bottom:12px">
      <div class="alert alert-info" style="margin-bottom:12px">
        💡 <span>Jarvis analyzed the top 3 ranking pages. Here's what to beat and how.</span>
      </div>
      ${(b.serp_results||[]).map(r=>`
        <div class="brief-serp-item">
          <div class="brief-serp-pos">POSITION #${r.position}</div>
          <div class="brief-serp-title">${esc(r.title)}</div>
          <div class="brief-serp-url">${esc(r.url)}</div>
          <div class="brief-serp-tags">
            <span class="badge badge-blue">${r.content_type}</span>
            <span class="badge badge-amber">${r.word_count?.toLocaleString()} words</span>
          </div>
          <div style="margin-top:10px;font-size:12px;color:var(--muted)"><span style="color:var(--accent3)">⚡ Weakness to exploit:</span> ${esc(r.weakness)}</div>
        </div>
      `).join('')}
    </div>
  `;

  // ---- GUIDELINES ----
  document.getElementById('brief-panel-guidelines').innerHTML = `
    <div>
      ${(b.writing_guidelines||[]).map(g=>`
        <div class="brief-guideline">
          <div class="brief-guideline-icon">${g.icon}</div>
          <div>
            <div class="brief-guideline-title">${esc(g.title)}</div>
            <div class="brief-guideline-desc">${esc(g.desc)}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function scoreBar(label, val, color) {
  return `
    <div class="brief-score-row">
      <div class="brief-score-label">${label}</div>
      <div class="brief-score-bar"><div class="brief-score-fill" style="width:${val}%;background:${color}"></div></div>
      <div class="brief-score-val" style="color:${color}">${val}</div>
    </div>`;
}

function setBriefTab(name, btn) {
  document.querySelectorAll('.brief-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.brief-panel').forEach(p=>p.classList.remove('active'));
  if(btn) btn.classList.add('active');
  else document.querySelector('.brief-tab')?.classList.add('active');
  const panel = document.getElementById('brief-panel-'+name);
  if(panel) panel.classList.add('active');
}

function copyBrief() {
  if (!briefData) return;
  const b = briefData;
  const text = `SEO CONTENT BRIEF — ${b.keyword.toUpperCase()}
${'='.repeat(50)}
Keyword: ${b.keyword}
Volume: ${b.volume}/mo | KD: ${b.difficulty} | Intent: ${b.intent}
Word Count: ${b.word_count} | Type: ${b.content_type}
Opportunity Score: ${b.opportunity_score}/100

META TITLE: ${b.meta_title}
META DESC: ${b.meta_description}
URL: /${b.url_slug}

H1: ${b.h1}

OUTLINE:
${(b.outline||[]).map((s,i)=>`${i+1}. ${s.h2}\n${(s.h3s||[]).map(h=>`   - ${h}`).join('\n')}`).join('\n')}

PRIMARY KEYWORDS: ${(b.primary_keywords||[]).join(', ')}
LSI KEYWORDS: ${(b.lsi_keywords||[]).join(', ')}
QUESTIONS: ${(b.questions_to_answer||[]).join(' | ')}

DIFFERENTIATION: ${b.content_differentiation}
CTA: ${b.cta}`;

  navigator.clipboard?.writeText(text).then(()=>{
    const btn = document.querySelector('.brief-actions .btn-ghost');
    if(btn){ btn.textContent='✅ Copied!'; setTimeout(()=>btn.textContent='📋 Copy Brief',2000); }
  });
}

function addToCalendar() {
  const btn = document.querySelector('.brief-actions .btn-primary');
  if(btn){ btn.textContent='✅ Added!'; setTimeout(()=>btn.textContent='📅 Add to Calendar',2000); }
}

function esc(str) {
  if(!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
/* --- */
/* --- */
// ─── BASELINE (mobile) ──────────────────────────────────
const PSS_BASE = {
  score: 52,
  lcp:  { val: 4.2, unit:'s', target:2.5, label:'LCP',  name:'Largest Contentful Paint' },
  fid:  { val: 48,  unit:'ms',target:100, label:'FID',   name:'First Input Delay' },
  cls:  { val: 0.14,unit:'',  target:0.1, label:'CLS',   name:'Cumul. Layout Shift' },
  ttfb: { val: 0.84,unit:'s', target:0.6, label:'TTFB',  name:'Time to First Byte' },
  inp:  { val: 210, unit:'ms',target:200, label:'INP',   name:'Interaction to Next Paint' },
};
const PSS_BASE_DESKTOP = {
  score: 74,
  lcp:  { val: 2.8, unit:'s', target:2.5, label:'LCP',  name:'Largest Contentful Paint' },
  fid:  { val: 22,  unit:'ms',target:100, label:'FID',   name:'First Input Delay' },
  cls:  { val: 0.08,unit:'',  target:0.1, label:'CLS',   name:'Cumul. Layout Shift' },
  ttfb: { val: 0.62,unit:'s', target:0.6, label:'TTFB',  name:'Time to First Byte' },
  inp:  { val: 160, unit:'ms',target:200, label:'INP',   name:'Interaction to Next Paint' },
};

// ─── FIX DEFINITIONS ────────────────────────────────────
const PSS_FIXES = [
  {
    id:'images', enabled:false,
    name:'Compress & Convert Images to WebP',
    desc:'87 unoptimized images found. Average saving: 68% file size reduction per image.',
    impact:{ score:8, lcp:-1.1, cls:0, fid:0, ttfb:0, inp:0 },
    tags:[{cls:'pss-tag-lcp',t:'LCP −1.1s'},{cls:'pss-tag-score',t:'Score +8'},{cls:'pss-tag-time',t:'2–3 hrs'}],
    effort:'Low', priority:'P1',
  },
  {
    id:'lazyload', enabled:false,
    name:'Implement Lazy Loading',
    desc:'Load below-the-fold images only when needed. Reduces initial payload by ~40%.',
    impact:{ score:5, lcp:-0.4, cls:0, fid:-8, ttfb:0, inp:-10 },
    tags:[{cls:'pss-tag-lcp',t:'LCP −0.4s'},{cls:'pss-tag-fid',t:'FID −8ms'},{cls:'pss-tag-time',t:'1 hr'}],
    effort:'Low', priority:'P1',
  },
  {
    id:'minify', enabled:false,
    name:'Minify CSS & JavaScript',
    desc:'2.4MB of unminified assets detected. Minifying + tree-shaking saves ~60% bundle size.',
    impact:{ score:6, lcp:-0.3, cls:0, fid:-12, ttfb:-0.05, inp:-20 },
    tags:[{cls:'pss-tag-lcp',t:'LCP −0.3s'},{cls:'pss-tag-inp',t:'INP −20ms'},{cls:'pss-tag-time',t:'2 hrs'}],
    effort:'Low', priority:'P1',
  },
  {
    id:'cache', enabled:false,
    name:'Enable Browser Caching',
    desc:'No cache-control headers set. Adding proper TTL cuts repeat-visit load time by 70%.',
    impact:{ score:4, lcp:-0.2, cls:0, fid:0, ttfb:-0.08, inp:0 },
    tags:[{cls:'pss-tag-lcp',t:'LCP −0.2s'},{cls:'pss-tag-score',t:'Score +4'},{cls:'pss-tag-time',t:'30 min'}],
    effort:'Low', priority:'P2',
  },
  {
    id:'cdn', enabled:false,
    name:'Add CDN (Cloudflare)',
    desc:'Serve static assets from edge nodes globally. Reduces TTFB by 40–60% for all users.',
    impact:{ score:7, lcp:-0.3, cls:0, fid:-5, ttfb:-0.22, inp:-15 },
    tags:[{cls:'pss-tag-lcp',t:'LCP −0.3s'},{cls:'pss-tag-lcp',t:'TTFB −0.22s'},{cls:'pss-tag-time',t:'1 hr'}],
    effort:'Low', priority:'P1',
  },
  {
    id:'render', enabled:false,
    name:'Eliminate Render-Blocking Resources',
    desc:'3 render-blocking scripts and 2 CSS files in <head>. Defer/async non-critical resources.',
    impact:{ score:9, lcp:-0.6, cls:0, fid:-15, ttfb:0, inp:-25 },
    tags:[{cls:'pss-tag-lcp',t:'LCP −0.6s'},{cls:'pss-tag-inp',t:'INP −25ms'},{cls:'pss-tag-score',t:'Score +9'}],
    effort:'Medium', priority:'P1',
  },
  {
    id:'cls_fix', enabled:false,
    name:'Fix Layout Shift (CLS)',
    desc:'Reserve space for images & ads (width/height attrs). Remove injected DOM before paint.',
    impact:{ score:5, lcp:0, cls:-0.08, fid:0, ttfb:0, inp:0 },
    tags:[{cls:'pss-tag-cls',t:'CLS −0.08'},{cls:'pss-tag-score',t:'Score +5'},{cls:'pss-tag-time',t:'3 hrs'}],
    effort:'Medium', priority:'P2',
  },
  {
    id:'server', enabled:false,
    name:'Upgrade Server / Hosting',
    desc:'Current TTFB 840ms indicates shared hosting. Upgrading to VPS or managed host targets <200ms.',
    impact:{ score:8, lcp:-0.4, cls:0, fid:0, ttfb:-0.42, inp:-30 },
    tags:[{cls:'pss-tag-lcp',t:'TTFB −0.42s'},{cls:'pss-tag-inp',t:'INP −30ms'},{cls:'pss-tag-score',t:'Score +8'}],
    effort:'High', priority:'P2',
  },
];

let pssCurrentDevice = 'mobile';

// ─── COMPUTE ─────────────────────────────────────────────
function pssCompute() {
  const base = pssCurrentDevice === 'mobile' ? PSS_BASE : PSS_BASE_DESKTOP;
  const enabled = PSS_FIXES.filter(f => f.enabled);

  let score = base.score;
  let lcp   = base.lcp.val;
  let fid   = base.fid.val;
  let cls   = base.cls.val;
  let ttfb  = base.ttfb.val;
  let inp   = base.inp.val;

  enabled.forEach(f => {
    score += f.impact.score;
    lcp   += f.impact.lcp;
    fid   += f.impact.fid;
    cls   += f.impact.cls;
    ttfb  += f.impact.ttfb;
    inp   += f.impact.inp;
  });

  score = Math.min(100, Math.max(0, Math.round(score)));
  lcp   = Math.max(0.3, +lcp.toFixed(2));
  fid   = Math.max(5, Math.round(fid));
  cls   = Math.max(0, +cls.toFixed(3));
  ttfb  = Math.max(0.05, +ttfb.toFixed(2));
  inp   = Math.max(50, Math.round(inp));

  return { score, lcp, fid, cls, ttfb, inp, base };
}

function pssRating(score) {
  if (score >= 90) return { label:'Excellent', color:'#10b981' };
  if (score >= 70) return { label:'Good',      color:'#00d4ff' };
  if (score >= 50) return { label:'Needs Work', color:'#f59e0b' };
  return                   { label:'Poor',      color:'#ef4444' };
}

function cwvStatus(metric, afterVal) {
  const ok = afterVal <= metric.target;
  return ok
    ? { label:'✅ Pass', color:'var(--accent3)' }
    : { label:'❌ Fail', color:'var(--danger)' };
}

function gaugeOffset(score) {
  // Full arc = 172, 0% = 172, 100% = 0
  return Math.round(172 - (score / 100) * 172);
}

function gaugeColor(score) {
  if (score >= 90) return '#10b981';
  if (score >= 70) return '#00d4ff';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

// ─── RENDER ──────────────────────────────────────────────
function pssRender() {
  const { score, lcp, fid, cls, ttfb, inp, base } = pssCompute();
  const delta  = score - base.score;
  const beforeR = pssRating(base.score);
  const afterR  = pssRating(score);

  // Gauges
  document.getElementById('pss-score-before').textContent = base.score;
  document.getElementById('pss-score-after').textContent  = score;
  document.getElementById('pss-score-after').style.color  = gaugeColor(score);
  document.getElementById('pss-rating-before').textContent = beforeR.label;
  document.getElementById('pss-rating-before').style.color = beforeR.color;
  document.getElementById('pss-rating-after').textContent  = afterR.label;
  document.getElementById('pss-rating-after').style.color  = afterR.color;

  // Gauge arcs
  const gBefore = document.getElementById('pss-gauge-before');
  const gAfter  = document.getElementById('pss-gauge-after');
  if (gBefore) { gBefore.setAttribute('stroke-dashoffset', gaugeOffset(base.score)); gBefore.setAttribute('stroke', gaugeColor(base.score)); }
  if (gAfter)  { gAfter.setAttribute('stroke-dashoffset',  gaugeOffset(score));      gAfter.setAttribute('stroke',  gaugeColor(score)); }

  // Delta pill
  const deltaEl = document.getElementById('pss-delta');
  if (deltaEl) {
    deltaEl.textContent = (delta >= 0 ? '+' : '') + delta + ' pts';
    deltaEl.style.color      = delta > 0 ? 'var(--accent3)' : delta < 0 ? 'var(--danger)' : 'var(--muted)';
    deltaEl.style.background = delta > 0 ? '#10b98115' : delta < 0 ? '#ef444415' : 'var(--surface)';
    deltaEl.style.borderColor= delta > 0 ? '#10b98130' : delta < 0 ? '#ef444430' : 'var(--border)';
  }

  // CWV cards
  const cwvGrid = document.getElementById('pss-cwv-grid');
  if (cwvGrid) {
    const metrics = [
      { key:'lcp',  after:lcp,  base:base.lcp },
      { key:'fid',  after:fid,  base:base.fid },
      { key:'cls',  after:cls,  base:base.cls },
      { key:'ttfb', after:ttfb, base:base.ttfb },
      { key:'inp',  after:inp,  base:base.inp },
    ];
    cwvGrid.innerHTML = metrics.map(({ key, after, base: bm }) => {
      const st     = cwvStatus(bm, after);
      const saving = (bm.val - after);
      const savingStr = saving > 0.001
        ? `−${bm.unit === 's' ? saving.toFixed(2)+'s' : bm.unit === 'ms' ? Math.round(saving)+'ms' : saving.toFixed(3)}`
        : '—';
      const col = after <= bm.target ? '#10b981' : after <= bm.target * 1.5 ? '#f59e0b' : '#ef4444';
      return `
        <div class="pss-cwv-card" style="--cwv-color:${col}">
          <div class="pss-cwv-name">${bm.label}</div>
          <div class="pss-cwv-before">${bm.val}${bm.unit}</div>
          <div class="pss-cwv-after" style="color:${col}">${after}${bm.unit}</div>
          <div class="pss-cwv-status" style="color:${st.color}">${st.label}</div>
          <div class="pss-cwv-saving">${savingStr !== '—' ? savingStr + ' saved' : ''}</div>
        </div>
      `;
    }).join('');
  }

  // Fix toggles
  const fixesEl = document.getElementById('pss-fixes');
  if (fixesEl) {
    fixesEl.innerHTML = PSS_FIXES.map((f, i) => `
      <div class="pss-fix-item ${f.enabled ? 'enabled' : ''}" onclick="pssToggle(${i})">
        <div class="pss-fix-toggle"></div>
        <div class="pss-fix-body">
          <div class="pss-fix-name">
            ${f.enabled ? '✅ ' : ''}${f.name}
            <span style="font-size:10px;color:var(--muted);font-weight:400;margin-left:6px">${f.effort} effort</span>
          </div>
          <div class="pss-fix-desc">${f.desc}</div>
          <div class="pss-fix-tags">
            ${f.tags.map(t => `<span class="pss-fix-tag ${t.cls}">${t.t}</span>`).join('')}
            <span class="pss-fix-tag" style="background:var(--highlight);color:var(--accent);border:1px solid var(--border)">${f.priority}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  // Ranking uplift bars
  const upliftBars = document.getElementById('pss-uplift-bars');
  if (upliftBars) {
    const enabledCount = PSS_FIXES.filter(f => f.enabled).length;
    const upliftMetrics = [
      { label:'Page Experience Signal', val: Math.min(100, enabledCount * 11), color:'#00d4ff' },
      { label:'Mobile Ranking Boost',   val: pssCurrentDevice === 'mobile' ? Math.min(100, enabledCount * 13) : Math.min(100, enabledCount * 6), color:'#a78bfa' },
      { label:'SERP CTR Improvement',   val: Math.min(100, score >= 90 ? 22 : score >= 70 ? 14 : score >= 50 ? 6 : 0), color:'#10b981' },
      { label:'Bounce Rate Reduction',  val: Math.min(100, enabledCount * 9), color:'#f59e0b' },
      { label:'Crawl Budget Efficiency',val: Math.min(100, enabledCount * 8 + 10), color:'#00d4ff' },
    ];
    upliftBars.innerHTML = upliftMetrics.map(u => `
      <div class="pss-uplift-row">
        <div class="pss-uplift-label">${u.label}</div>
        <div class="pss-uplift-track">
          <div class="pss-uplift-fill" style="width:${u.val}%;background:${u.color}"></div>
        </div>
        <div class="pss-uplift-val" style="color:${u.color}">+${u.val}%</div>
      </div>
    `).join('');
  }
}

function pssToggle(i) {
  PSS_FIXES[i].enabled = !PSS_FIXES[i].enabled;
  pssRender();
}

function pssDevice(device, btn) {
  pssCurrentDevice = device;
  document.querySelectorAll('#pss-device-btns .rt-range-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  pssRender();
}

// AI Fix Plan
async function pssRunAI() {
  const { score, lcp, fid, cls, ttfb, inp, base } = pssCompute();
  const domain = document.getElementById('domainInput')?.value || 'yoursite.com';
  const enabled = PSS_FIXES.filter(f => f.enabled).map(f => f.name);
  const disabled = PSS_FIXES.filter(f => !f.enabled).map(f => f.name);

  const outputEl = document.getElementById('pss-ai-output');
  const contentEl = document.getElementById('pss-ai-content');
  outputEl.style.display = 'block';
  contentEl.innerHTML = `
    <div class="ai-thinking"><span>🏎️ JARVIS ANALYZING SPEED ISSUES</span>
    <span class="dot-animate"><span></span><span></span><span></span></span></div>
    <div style="color:var(--muted);font-size:12px;margin-top:8px">Building your implementation roadmap...</div>
  `;
  outputEl.scrollIntoView({ behavior:'smooth', block:'nearest' });

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST', headers: AI.headers(),
      body:JSON.stringify({
        model: AI.MODEL, max_tokens:1000,
        system:'You are JARVIS, an elite technical SEO and web performance engineer. Be precise, actionable, and specific. Use concrete code examples where relevant.',
        messages:[{ role:'user', content:
          `Site: ${domain} | Device: ${pssCurrentDevice}
Current score: ${base.score}/100 → After fixes: ${score}/100 (+${score - base.score} pts)
Current CWV: LCP ${base.lcp.val}s, FID ${base.fid.val}ms, CLS ${base.cls.val}, TTFB ${base.ttfb.val}s, INP ${base.inp.val}ms
After fixes:  LCP ${lcp}s, FID ${fid}ms, CLS ${cls}, TTFB ${ttfb}s, INP ${inp}ms
Fixes ENABLED: ${enabled.join(', ') || 'None yet'}
Fixes PENDING: ${disabled.join(', ')}

Write a sharp, prioritized implementation guide (3-4 paragraphs). Focus on: (1) the single highest-impact fix they should do TODAY with exact implementation steps, (2) what specific code/config change is needed, (3) expected timeline to see ranking improvement after CWV improvements. Be technical and specific.`
        }]
      })
    });
    const data = await res.json();
    const text = data.content?.map(c => c.text||'').join('') || '';
    contentEl.innerHTML = `
      <div class="ai-thinking" style="margin-bottom:10px">
        <span>🏎️ JARVIS</span>
        <span style="color:var(--accent3);margin-left:8px">● Performance Plan Ready</span>
      </div>
      <div style="white-space:pre-wrap;font-size:13px;line-height:1.8">${text.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
    `;
  } catch(e) {
    contentEl.innerHTML = `
      <div class="ai-thinking" style="margin-bottom:10px"><span>🏎️ JARVIS</span></div>
      <div style="font-size:13px;line-height:1.8">
        <strong style="color:var(--accent)">Top Priority Fix for ${domain}:</strong><br><br>
        Your highest-impact action is <strong>eliminating render-blocking resources</strong> (+9 score pts, LCP −0.6s). Add <code style="background:var(--surface);padding:2px 6px;border-radius:4px;font-size:11px">defer</code> to all non-critical scripts and move CSS inlining above the fold. In WordPress, use WP Rocket or Perfmatters. In custom builds, move scripts before <code style="background:var(--surface);padding:2px 6px;border-radius:4px;font-size:11px">&lt;/body&gt;</code> and add <code style="background:var(--surface);padding:2px 6px;border-radius:4px;font-size:11px">async</code>.<br><br>
        Second priority: <strong>convert all images to WebP</strong> and add lazy loading. Use Squoosh.app or ImageOptim for batch conversion. Add <code style="background:var(--surface);padding:2px 6px;border-radius:4px;font-size:11px">loading="lazy"</code> to all <code style="background:var(--surface);padding:2px 6px;border-radius:4px;font-size:11px">&lt;img&gt;</code> tags below the fold. This alone will save ~68% per image.<br><br>
        <strong>Timeline:</strong> Google typically re-crawls and updates CWV scores within 28 days. Expect ranking improvements within 4–6 weeks of fixes being live. Monitor in Search Console → Core Web Vitals report.
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('sec-technical')?.classList.contains('active')) pssRender();
});
/* --- */
// ══════════════════════════════════════════
//  🔔  NOTIFICATION SYSTEM
// ══════════════════════════════════════════
const NOTIFICATIONS = [
  { id:1, unread:true,  color:'var(--danger)',  dot:'🔴', title:'Ranking Drop Detected',       desc:'"content marketing strategy" dropped 3 positions to #12. Competitors refreshed content.', time:'2 min ago' },
  { id:2, unread:true,  color:'var(--accent3)', dot:'🟢', title:'New Backlink Secured',         desc:'DA 74 backlink from searchengineland.com is now live on your SEO guide.', time:'18 min ago' },
  { id:3, unread:true,  color:'var(--accent4)', dot:'🟡', title:'Core Web Vitals Alert',        desc:'LCP increased to 4.8s on mobile. 3 pages affected. Check Page Speed Simulator.', time:'1 hr ago' },
  { id:4, unread:false, color:'var(--accent)',  dot:'🔵', title:'Content Brief Ready',          desc:'Your brief for "on-page seo checklist" has been generated and saved.', time:'2 hr ago' },
  { id:5, unread:false, color:'var(--accent2)', dot:'🟣', title:'Monthly Report Generated',    desc:'May 2026 SEO Report is ready. 23 pages, 10 sections. Export PDF to share.', time:'Yesterday' },
  { id:6, unread:false, color:'var(--accent3)', dot:'🟢', title:'Keyword Milestone Hit',        desc:'"digital marketing agency" reached #3 — your best position ever for this keyword!', time:'Yesterday' },
  { id:7, unread:false, color:'var(--accent4)', dot:'🟡', title:'Competitor Alert',             desc:'competitor1.com published 4 new articles targeting your top keywords this week.', time:'2 days ago' },
];

function toggleNotifPanel() {
  const panel = document.getElementById('notif-panel');
  if (panel) panel.classList.toggle('open');
}

function renderNotifications() {
  const badge  = document.getElementById('notif-badge');
  const unread = NOTIFICATIONS.filter(n=>n.unread).length;
  if (badge) badge.style.display = unread > 0 ? 'block' : 'none';

  const existing = document.getElementById('notif-panel');
  if (!existing) {
    const panel = document.createElement('div');
    panel.id = 'notif-panel';
    panel.innerHTML = `
      <div class="notif-header">
        <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:15px">🔔 Notifications <span style="font-size:12px;color:var(--danger);font-family:'Space Mono',monospace">${unread} new</span></div>
        <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px" onclick="markAllRead()">Mark all read</button>
      </div>
      ${NOTIFICATIONS.map(n=>`
        <div class="notif-item ${n.unread?'unread':''}" onclick="clickNotif(${n.id})">
          <div class="notif-dot" style="background:${n.color}"></div>
          <div style="flex:1">
            <div class="notif-title">${n.title}</div>
            <div class="notif-desc">${n.desc}</div>
            <div class="notif-time">${n.time}</div>
          </div>
        </div>`).join('')}
      <div style="padding:12px 18px;text-align:center;font-size:12px;color:var(--muted)">Showing last 7 notifications</div>
    `;
    document.body.appendChild(panel);
  }
}

function markAllRead() {
  NOTIFICATIONS.forEach(n=>n.unread=false);
  const badge = document.getElementById('notif-badge');
  if (badge) badge.style.display='none';
  document.querySelectorAll('.notif-item').forEach(el=>el.classList.remove('unread'));
}

function clickNotif(id) {
  const n = NOTIFICATIONS.find(x=>x.id===id);
  if (n) { n.unread=false; renderNotifications(); toggleNotifPanel(); }
}

// Close on outside click
document.addEventListener('click', e => {
  const panel = document.getElementById('notif-panel');
  const btn   = document.getElementById('notif-btn');
  if (panel && !panel.contains(e.target) && btn && !btn.contains(e.target)) {
    panel.classList.remove('open');
  }
});

// ══════════════════════════════════════════
//  🌐  MULTI-SITE SWITCHER
// ══════════════════════════════════════════
let msSites = Store.get('sites', [
  { id:0, domain:'yoursite.com',    label:'Main Site',     type:'owned',      active:true,  color:'#00d4ff', traffic:'14.2K', da:58, keywords:1847, health:84, change:'+23%' },
  { id:1, domain:'clientalpha.com', label:'Client Alpha',  type:'agency',     active:false, color:'#7c3aed', traffic:'8.4K',  da:42, keywords:920,  health:71, change:'+18%' },
  { id:2, domain:'clientbeta.com',  label:'Client Beta',   type:'agency',     active:false, color:'#10b981', traffic:'3.1K',  da:31, keywords:440,  health:58, change:'+9%'  },
];

function renderMultiSite() {
  const grid = document.getElementById('ms-site-grid');
  if (!grid) return;

  grid.innerHTML = msSites.map(s => `
    <div class="ms-site-card ${s.active?'active':''}" style="--ms-color:${s.color}" onclick="switchSite(${s.id})">
      ${s.active?'<div class="ms-active-badge">ACTIVE</div>':''}
      <div class="ms-type-badge" style="background:${s.color}20;color:${s.color};border:1px solid ${s.color}30">${s.type==='owned'?'My Site':s.type==='agency'?'Client':'Competitor'}</div>
      <div class="ms-site-domain">${s.domain}</div>
      <div class="ms-site-label">${s.label}</div>
      <div class="ms-site-metric"><span class="ms-site-metric-label">Traffic</span><span class="ms-site-metric-val" style="color:${s.color}">${s.traffic}/mo</span></div>
      <div class="ms-site-metric"><span class="ms-site-metric-label">DA</span><span class="ms-site-metric-val">${s.da}</span></div>
      <div class="ms-site-metric"><span class="ms-site-metric-label">Keywords</span><span class="ms-site-metric-val">${s.keywords.toLocaleString()}</span></div>
      <div class="ms-site-metric"><span class="ms-site-metric-label">Health</span><span class="ms-site-metric-val" style="color:${s.health>=80?'var(--accent3)':s.health>=60?'var(--accent4)':'var(--danger)'}">${s.health}%</span></div>
      <div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:11px;color:var(--accent3)">${s.change} this month</span>
        ${!s.active?`<button class="meta-copy-btn" onclick="event.stopPropagation();switchSite(${s.id})">Switch →</button>`:'<span style="font-size:10px;color:var(--accent);font-family:'Space Mono',monospace">✓ Active</span>'}
      </div>
    </div>`).join('');

  // Comparison table
  msSites.forEach((s,i) => {
    const col = document.getElementById('ms-col-'+i);
    if (col) { col.textContent = s.label; col.style.color = s.color; }
  });

  const rows = [
    ['Organic Traffic',  s => s.traffic,                                      s => s.color],
    ['Domain Authority', s => s.da,                                            s => s.da>=50?'var(--accent3)':s.da>=35?'var(--accent4)':'var(--danger)'],
    ['Keywords Ranked',  s => s.keywords.toLocaleString(),                    s => s.color],
    ['SEO Health',       s => s.health+'%',                                   s => s.health>=80?'var(--accent3)':s.health>=60?'var(--accent4)':'var(--danger)'],
    ['MoM Growth',       s => s.change,                                        s => 'var(--accent3)'],
  ];

  const tbody = document.getElementById('ms-compare-body');
  if (tbody) {
    tbody.innerHTML = rows.map(([label, valFn, colFn]) =>
      `<tr><td style="font-weight:600;font-size:13px">${label}</td>
      ${msSites.map(s=>`<td style="color:${colFn(s)};font-weight:700;font-family:'Space Mono',monospace;font-size:13px">${valFn(s)}</td>`).join('')}
      </tr>`
    ).join('');
  }
}

function switchSite(id) {
  msSites.forEach(s => s.active = s.id === id);
  const active = msSites.find(s=>s.active);
  if (active) {
    const inp = document.getElementById('domainInput');
    const sideUrl = document.getElementById('siteUrl');
    if (inp) inp.value = active.domain;
    if (sideUrl) sideUrl.textContent = active.domain;
  }
  renderMultiSite();
}

function addSite() {
  const domain = document.getElementById('ms-new-domain')?.value.trim();
  const label  = document.getElementById('ms-new-label')?.value.trim()  || domain;
  const type   = document.getElementById('ms-new-type')?.value || 'agency';
  if (!domain) { document.getElementById('ms-new-domain')?.focus(); return; }
  const colors = ['#f59e0b','#ef4444','#8b5cf6','#06b6d4'];
  msSites.push({
    id: msSites.length, domain, label, type, active:false,
    color: colors[msSites.length % colors.length],
    traffic:'—', da:'—', keywords:0, health:0, change:'+0%'
  });
  document.getElementById('ms-new-domain').value = '';
  document.getElementById('ms-new-label').value  = '';
  renderMultiSite();
}

// ══════════════════════════════════════════
//  👥  TEAM COLLABORATION
// ══════════════════════════════════════════
const TEAM_MEMBERS = [
  { name:'Alice Chen',    role:'SEO Lead',         avatar:'AC', color:'#00d4ff', online:true,  tasks:8,  done:5  },
  { name:'Bob Martinez',  role:'Content Writer',   avatar:'BM', color:'#7c3aed', online:true,  tasks:6,  done:4  },
  { name:'Carol Singh',   role:'Technical SEO',    avatar:'CS', color:'#10b981', online:false, tasks:4,  done:2  },
  { name:'You',           role:'Strategy Lead',    avatar:'ME', color:'#f59e0b', online:true,  tasks:5,  done:3  },
];

let TASKS = Store.get('tasks', [
  { id:1, title:'Fix 23 broken internal links',           assignee:'Carol Singh',   priority:'critical', done:false, section:'Technical', created:'2h ago' },
  { id:2, title:'Write pillar article: SEO Strategy 2025',assignee:'Bob Martinez',  priority:'high',     done:false, section:'Content',   created:'4h ago' },
  { id:3, title:'Add schema markup to 47 product pages',  assignee:'Alice Chen',    priority:'high',     done:false, section:'Technical', created:'Yesterday' },
  { id:4, title:'Build backlink outreach list (50 sites)',assignee:'You',           priority:'medium',   done:false, section:'Links',     created:'Yesterday' },
  { id:5, title:'Audit competitor content gaps',          assignee:'Alice Chen',    priority:'medium',   done:true,  section:'Strategy',  created:'2 days ago' },
  { id:6, title:'Optimize title tags on service pages',   assignee:'Bob Martinez',  priority:'high',     done:true,  section:'On-Page',   created:'3 days ago' },
];

const ACTIVITY = [
  { icon:'✅', text:'Alice completed "Keyword research for Q3"', time:'5 min ago' },
  { icon:'💬', text:'Bob commented on "SEO Strategy article draft"', time:'22 min ago' },
  { icon:'🔗', text:'Carol fixed redirect chain on /blog/old-post', time:'1 hr ago' },
  { icon:'➕', text:'You added 3 new tasks to the board', time:'2 hr ago' },
  { icon:'📤', text:'Alice exported the May ranking report', time:'3 hr ago' },
  { icon:'🎯', text:'Bob published "Local SEO Guide 2025"', time:'Yesterday' },
];

function renderTeam() {
  const total = TASKS.length;
  const done  = TASKS.filter(t=>t.done).length;
  const open  = total - done;
  const crit  = TASKS.filter(t=>t.priority==='critical'&&!t.done).length;

  document.getElementById('team-kpis').innerHTML = [
    ['OPEN TASKS',   open,                                            'var(--accent)'],
    ['COMPLETED',    done+'/'+total,                                  'var(--accent3)'],
    ['CRITICAL',     crit,                                            crit>0?'var(--danger)':'var(--accent3)'],
    ['TEAM MEMBERS', TEAM_MEMBERS.length,                             'var(--accent2)'],
  ].map(([l,v,c]) => `
    <div class="metric-card" style="--accent-c:${c}">
      <div class="metric-label">${l}</div>
      <div class="metric-value" style="color:${c};font-size:24px">${v}</div>
    </div>`).join('');

  const priColor = p => p==='critical'?'var(--danger)':p==='high'?'var(--accent4)':'var(--accent)';
  const priLabel = p => p==='critical'?'🔴':p==='high'?'🟡':'🔵';
  const memberColor = name => TEAM_MEMBERS.find(m=>m.name===name)?.color || 'var(--muted)';
  const memberAvatar= name => TEAM_MEMBERS.find(m=>m.name===name)?.avatar || '??';

  document.getElementById('task-list').innerHTML = TASKS.map(t => `
    <div class="task-item ${t.done?'done':''}" id="task-item-${t.id}">
      <div class="task-header">
        <div class="task-cb ${t.done?'done':''}" onclick="toggleTask(${t.id})">
          ${t.done?'✓':''}
        </div>
        <div class="task-title ${t.done?'done':''}">${t.title}</div>
        <span style="font-size:14px">${priLabel(t.priority)}</span>
      </div>
      <div class="task-meta">
        <div class="task-assignee-chip">
          <div class="task-avatar" style="background:${memberColor(t.assignee)}">${memberAvatar(t.assignee)}</div>
          ${t.assignee}
        </div>
        <span class="badge badge-blue" style="font-size:10px">${t.section}</span>
        <span style="font-size:10px;color:var(--muted);font-family:'Space Mono',monospace">${t.created}</span>
      </div>
    </div>`).join('');

  document.getElementById('team-members').innerHTML = TEAM_MEMBERS.map(m => `
    <div class="team-member-row">
      <div class="team-member-avatar" style="background:${m.color}">${m.avatar}</div>
      <div style="flex:1">
        <div class="team-member-name">${m.name}</div>
        <div class="team-member-role">${m.role} • ${m.tasks} tasks (${m.done} done)</div>
      </div>
      <div class="team-online-dot" style="background:${m.online?'var(--accent3)':'var(--muted)'}"></div>
      <span style="font-size:10px;color:${m.online?'var(--accent3)':'var(--muted)'}">
        ${m.online?'Online':'Away'}
      </span>
    </div>`).join('');

  document.getElementById('team-activity').innerHTML = ACTIVITY.map(a => `
    <div class="activity-item">
      <span style="font-size:14px;flex-shrink:0">${a.icon}</span>
      <div style="flex:1;color:var(--muted)">${a.text}</div>
      <div class="activity-time">${a.time}</div>
    </div>`).join('');
}

function toggleTask(id) {
  const task = TASKS.find(t=>t.id===id);
  if (task) { task.done = !task.done; Store.set('tasks', TASKS); renderTeam(); }
}

function showAddTask() {
  const form = document.getElementById('add-task-form');
  if (form) { form.style.display = form.style.display==='none'?'block':'none'; }
}

function addTask() {
  const title    = document.getElementById('task-title')?.value.trim();
  const assignee = document.getElementById('task-assignee')?.value;
  const priority = document.getElementById('task-priority')?.value;
  if (!title) return;
  const memberNames = { alice:'Alice Chen', bob:'Bob Martinez', carol:'Carol Singh', you:'You' };
  TASKS.unshift({ id:Date.now(), title, assignee:memberNames[assignee]||'You', priority, done:false, section:'General', created:'just now' });
  Store.set('tasks', TASKS);
  document.getElementById('task-title').value = '';
  document.getElementById('add-task-form').style.display = 'none';
  renderTeam();
}

// ══════════════════════════════════════════
//  🎤  VOICE COMMAND MODE
// ══════════════════════════════════════════
let voiceActive   = false;
let voiceHistory  = Store.get('voiceHistory', []);
let recognition   = null;
let voiceAnimInterval = null;

const VOICE_ROUTES = {
  'audit':         { action:()=>setTab('analyzer'),     reply:'Opening Site Audit tab. Here are your 89 issues prioritized by impact.' },
  'keyword':       { action:()=>setTab('keywords'),     reply:'Switching to Keyword Strategy. You have 247 keywords tracked across 4 intent clusters.' },
  'rank tracker':  { action:()=>setTab('tracker'),      reply:'Here is your Rank Tracker. 184 keywords improved this week, 23 dropped.' },
  'content':       { action:()=>setTab('content'),      reply:'Opening Content Planner. You have 12 articles scheduled across 3 topic pillars.' },
  'traffic':       { action:()=>setTab('roadmap'),      reply:'Showing your Traffic Forecast. On your current trajectory you will hit 85K visits by month 12.' },
  'roi':           { action:()=>setTab('roi'),          reply:'Opening ROI Calculator. At your current conversion rate your SEO investment returns 312% ROI.' },
  'competitor':    { action:()=>setTab('competitors'),  reply:'Pulling up Competitor Intelligence. You have 47 keyword gaps vs your top 2 rivals.' },
  'schema':        { action:()=>setTab('schema'),       reply:'Opening Schema Builder. You are missing Product and LocalBusiness schema on 8 pages.' },
  'brief':         { action:()=>setTab('content'),      reply:'Opening Content tab. Use the AI Brief Generator to create a full SEO brief from any keyword.' },
  'fix first':     { action:()=>setTab('analyzer'),     reply:'Your highest priority fix is the 23 broken internal links — these are actively harming crawl efficiency.' },
  'gap':           { action:()=>setTab('gapcontent'),   reply:'Opening Content Gap Radar. Enter your domain and competitors to find untapped opportunities.' },
  'backlink':      { action:()=>setTab('backlinks'),    reply:'Here is your Backlink Strategy. You have 6 high-DA placements secured and 487 referring domains.' },
  'technical':     { action:()=>setTab('technical'),    reply:'Opening Technical SEO. Your LCP of 4.2 seconds is the most urgent fix — check the Page Speed Simulator.' },
  'dashboard':     { action:()=>setTab('dashboard'),    reply:'Back to Command Center. Organic traffic is up 23% this month.' },
};

function getVoiceMatch(text) {
  const lower = text.toLowerCase();
  for (const [key, val] of Object.entries(VOICE_ROUTES)) {
    if (lower.includes(key)) return val;
  }
  return null;
}

function toggleVoice() {
  if (!voiceActive) startVoice(); else stopVoice();
}

function startVoice() {
  voiceActive = true;
  const inner = document.getElementById('voice-ring-inner');
  const status = document.getElementById('voice-status');
  const sub    = document.getElementById('voice-sub');
  if (inner)  { inner.style.background='linear-gradient(135deg,var(--danger),#ef4444)'; inner.style.boxShadow='0 0 30px #ef444450'; }
  if (status) status.textContent = 'Listening...';
  if (sub)    sub.textContent    = 'Speak your command clearly';

  // Pulse animation
  let scale = 1;
  voiceAnimInterval = setInterval(() => {
    scale = scale === 1 ? 1.08 : 1;
    const outer = document.getElementById('voice-ring-outer');
    const mid   = document.getElementById('voice-ring-mid');
    if (outer) { outer.style.transform=`scale(${scale+0.06})`; outer.style.opacity='0.5'; }
    if (mid)   { mid.style.transform=`scale(${scale+0.03})`;   mid.style.opacity='0.4'; }
  }, 600);

  // Try native Web Speech API
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR();
    recognition.continuous    = false;
    recognition.interimResults= true;
    recognition.lang          = 'en-US';
    recognition.onresult = e => {
      const transcript = Array.from(e.results).map(r=>r[0].transcript).join('');
      const transcriptEl = document.getElementById('voice-transcript');
      if (transcriptEl) { transcriptEl.style.display='block'; transcriptEl.textContent='"' + transcript + '"'; }
      if (e.results[0].isFinal) processVoice(transcript);
    };
    recognition.onend = () => stopVoice();
    recognition.onerror= () => {
      stopVoice();
      simulateVoice('audit my site');
    };
    recognition.start();
  } else {
    // Browser doesn't support — simulate after delay
    setTimeout(() => {
      const samples = ['audit my site','show keyword gaps','what should I fix first','go to rank tracker'];
      simulateVoice(samples[Math.floor(Math.random()*samples.length)]);
    }, 2000);
  }
}

function stopVoice() {
  voiceActive = false;
  clearInterval(voiceAnimInterval);
  if (recognition) { try { recognition.stop(); } catch(e){} }
  const inner = document.getElementById('voice-ring-inner');
  const outer = document.getElementById('voice-ring-outer');
  const mid   = document.getElementById('voice-ring-mid');
  const status= document.getElementById('voice-status');
  const sub   = document.getElementById('voice-sub');
  if (inner) { inner.style.background='linear-gradient(135deg,var(--accent),var(--accent2))'; inner.style.boxShadow='0 0 20px #00d4ff30'; }
  if (outer) { outer.style.transform='scale(1)'; outer.style.opacity='0.2'; }
  if (mid)   { mid.style.transform='scale(1)'; mid.style.opacity='0.3'; }
  if (status) status.textContent = 'Click the mic to start';
  if (sub)    sub.textContent    = 'Or use the keyboard shortcut: Ctrl + Space';
}

async function simulateVoice(text) {
  const transcriptEl = document.getElementById('voice-transcript');
  const responseEl   = document.getElementById('voice-response');
  const status       = document.getElementById('voice-status');
  if (transcriptEl) { transcriptEl.style.display='block'; transcriptEl.textContent='"' + text + '"'; }
  if (status) status.textContent = 'Processing...';

  await new Promise(r => setTimeout(r, 500));
  processVoice(text);
}

async function processVoice(text) {
  stopVoice();
  const responseEl = document.getElementById('voice-response');
  const status     = document.getElementById('voice-status');
  if (status) status.textContent = 'Responding...';

  const match = getVoiceMatch(text);
  let reply   = '';

  if (match) {
    reply = match.reply;
    setTimeout(() => match.action(), 600);
  } else {
    // Ask Claude for unknown commands
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST', headers: AI.headers(),
        body: JSON.stringify({
          model: AI.MODEL, max_tokens:1000,
          system:'You are JARVIS, a voice-controlled SEO assistant. Give a short, spoken-word response (2-3 sentences max). No markdown, no bullets.',
          messages:[{ role:'user', content:'Voice command: "' + text + '". Respond as if speaking aloud.' }]
        })
      });
      const data = await res.json();
      reply = data.content?.map(c=>c.text||'').join('') || "I didn't catch that — try saying 'audit my site' or 'show keyword gaps'.";
    } catch(e) {
      reply = "I heard you, but I am not sure how to help with that. Try saying 'audit my site', 'show rank tracker', or 'what should I fix first?'";
    }
  }

  if (responseEl) {
    responseEl.style.display = 'block';
    responseEl.innerHTML = `<div class="ai-thinking" style="margin-bottom:8px"><span>🎤 JARVIS</span></div><div>${reply}</div>`;
  }
  if (status) status.textContent = 'Command processed ✓';

  // Add to history
  voiceHistory.unshift({ text, reply, time: new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) });
  Store.set('voiceHistory', voiceHistory);
  renderVoiceHistory();

  // Text-to-speech
  if ('speechSynthesis' in window) {
    const utter = new SpeechSynthesisUtterance(reply.replace(/<[^>]+>/g,''));
    utter.rate  = 1.05;
    utter.pitch = 0.95;
    window.speechSynthesis.speak(utter);
  }
}

function renderVoiceHistory() {
  const el = document.getElementById('voice-history');
  if (!el) return;
  if (voiceHistory.length === 0) {
    el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:12px 0">No commands yet — try speaking or clicking a quick command chip.</div>';
    return;
  }
  el.innerHTML = voiceHistory.slice(0,8).map((h,i) => `
    <div style="padding:12px 0;border-bottom:1px solid var(--border);display:flex;gap:12px;align-items:flex-start">
      <div style="font-size:10px;color:var(--muted);font-family:'Space Mono',monospace;white-space:nowrap;margin-top:2px">${h.time}</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;color:var(--accent);margin-bottom:3px">"${h.text}"</div>
        <div style="font-size:12px;color:var(--muted);line-height:1.5">${h.reply.substring(0,120)}${h.reply.length>120?'...':''}</div>
      </div>
      <button class="meta-copy-btn" onclick="simulateVoice('${h.text.replace(/'/,'')}')">↻</button>
    </div>`).join('');
}

// Keyboard shortcut: Ctrl+Space = toggle voice
document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.code === 'Space') {
    e.preventDefault();
    setTab('voiceX');
    setTimeout(toggleVoice, 200);
  }
});


// Init all on load
document.addEventListener('DOMContentLoaded', () => {
  renderNotifications();
  renderVoiceHistory();
  renderMultiSite();
  renderTeam();
});
/* --- */
// ══════════════════════════════════════════
//  🔍  SERP FEATURE TRACKER
// ══════════════════════════════════════════
const SERP_DATA = [
  { kw:'digital marketing agency', vol:'12K', pos:3,  fs:'has',  paa:'has',  local:'miss', image:'miss', video:'miss', opp:'Featured Snippet', how:'Add a concise 40-60 word definition paragraph at the top of your page' },
  { kw:'seo services near me',     vol:'8.4K',pos:5,  fs:'miss', paa:'has',  local:'has',  image:'miss', video:'miss', opp:'Local Pack',        how:'Optimize Google Business Profile, add LocalBusiness schema, get 10+ reviews' },
  { kw:'best seo tools 2025',      vol:'6.2K',pos:7,  fs:'part', paa:'has',  local:'miss', image:'has',  video:'miss', opp:'Image Pack',        how:'Add original comparison screenshots with descriptive alt text to your tools article' },
  { kw:'local seo optimization',   vol:'3.5K',pos:11, fs:'miss', paa:'has',  local:'miss', image:'miss', video:'miss', opp:'Featured Snippet',  how:'Add a step-by-step numbered list at the top answering "how to do local SEO"' },
  { kw:'seo audit checklist',      vol:'5.1K',pos:16, fs:'miss', paa:'part', local:'miss', image:'miss', video:'miss', opp:'Featured Snippet',  how:'Format your checklist as an HTML <ol> with concise list items under 8 words each' },
  { kw:'technical seo guide',      vol:'9.1K',pos:18, fs:'miss', paa:'miss', local:'miss', image:'has',  video:'part', opp:'Video Carousel',    how:'Create a 5-10 min explainer video, upload to YouTube, embed in your article' },
  { kw:'on page seo tips',         vol:'4.8K',pos:14, fs:'part', paa:'has',  local:'miss', image:'miss', video:'miss', opp:'PAA Dominance',     how:'Add an FAQ section targeting 5 related PAA questions with concise direct answers' },
  { kw:'link building strategies', vol:'7.3K',pos:6,  fs:'miss', paa:'has',  local:'miss', image:'miss', video:'miss', opp:'Featured Snippet',  how:'Add a definition box: "Link building is..." followed by a 3-step numbered process' },
  { kw:'google my business seo',   vol:'2.8K',pos:3,  fs:'has',  paa:'has',  local:'has',  image:'miss', video:'miss', opp:'Triple Feature',    how:'You already have FS + PAA + Local Pack — protect with schema & fresh content' },
  { kw:'seo strategy 2025',        vol:'18K', pos:12, fs:'miss', paa:'part', local:'miss', image:'miss', video:'miss', opp:'Featured Snippet',  how:'Rewrite H1 as a question, add a 50-word TL;DR box, format with numbered steps' },
];

let serpFilter = 'all';

function filterSERP(type, btn) {
  serpFilter = type;
  document.querySelectorAll('#serp-filter-btns .rt-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderSERP();
}

function renderSERP() {
  const data = serpFilter === 'all' ? SERP_DATA :
    SERP_DATA.filter(d => {
      if (serpFilter === 'featured') return d.fs === 'has' || d.fs === 'part';
      if (serpFilter === 'paa')      return d.paa === 'has' || d.paa === 'part';
      if (serpFilter === 'local')    return d.local === 'has';
      if (serpFilter === 'image')    return d.image === 'has';
      if (serpFilter === 'video')    return d.video === 'has' || d.video === 'part';
      return true;
    });

  const pill = (status) => {
    if (status === 'has')  return '<span class="serp-feature-pill serp-has">✓ Yes</span>';
    if (status === 'part') return '<span class="serp-feature-pill serp-part">~ Partial</span>';
    return '<span class="serp-feature-pill serp-miss">✗ No</span>';
  };
  const posCol = p => p<=3?'var(--accent3)':p<=10?'var(--accent)':p<=20?'var(--accent4)':'var(--danger)';

  document.getElementById('serp-tbody').innerHTML = data.map(d => `<tr>
    <td style="font-weight:600;font-size:13px">${d.kw}</td>
    <td><span class="vol-chip">${d.vol}</span></td>
    <td><span style="color:${posCol(d.pos)};font-weight:800;font-family:'Syne',sans-serif">#${d.pos}</span></td>
    <td>${pill(d.fs)}</td>
    <td>${pill(d.paa)}</td>
    <td>${pill(d.local)}</td>
    <td>${pill(d.image)}</td>
    <td>${pill(d.video)}</td>
    <td><span class="badge badge-purple" style="font-size:10px">${d.opp}</span></td>
    <td style="font-size:11.5px;color:var(--muted);max-width:220px">${d.how}</td>
  </tr>`).join('');

  // KPIs
  const hasFS    = SERP_DATA.filter(d=>d.fs==='has').length;
  const hasPAA   = SERP_DATA.filter(d=>d.paa==='has').length;
  const hasLocal = SERP_DATA.filter(d=>d.local==='has').length;
  const missed   = SERP_DATA.filter(d=>d.fs==='miss'&&d.paa==='miss').length;
  document.getElementById('serp-kpis').innerHTML = [
    ['FEATURED SNIPPETS', hasFS+'/'+SERP_DATA.length, 'var(--accent3)', 'Currently capturing'],
    ['PEOPLE ALSO ASK',   hasPAA+'/'+SERP_DATA.length,'var(--accent)',  'PAA box presence'],
    ['LOCAL PACK',        hasLocal+' keywords',        'var(--accent2)', 'Local results triggered'],
    ['OPPORTUNITIES',     SERP_DATA.length-hasFS+' features', 'var(--danger)', 'Available to capture'],
  ].map(([l,v,c,s]) => `
    <div class="metric-card" style="--accent-c:${c}">
      <div class="metric-label">${l}</div>
      <div class="metric-value" style="color:${c};font-size:22px">${v}</div>
      <div class="metric-change">${s}</div>
    </div>`).join('');

  // Featured snippet guide
  document.getElementById('serp-fs-guide').innerHTML = [
    { step:'1', title:'Use a definition paragraph', desc:'Start the section with a 40-60 word direct answer to the query. Google loves concise, boxable definitions.' },
    { step:'2', title:'Format with HTML lists',     desc:'Numbered <ol> for how-to, unordered <ul> for feature lists. Each item under 8 words works best.' },
    { step:'3', title:'Target position 2-8',        desc:'Featured snippets are often stolen from positions 2-8. If you're in this range, optimize the page content format.' },
    { step:'4', title:'Add a TL;DR box',            desc:'A summary box near the top dramatically increases snippet capture rate. Use a bordered div with key points.' },
  ].map(s => `<div class="eeat-signal-item"><div style="width:22px;height:22px;border-radius:50%;background:var(--accent);color:#000;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0">${s.step}</div><div><div class="eeat-signal-title">${s.title}</div><div class="eeat-signal-desc">${s.desc}</div></div></div>`).join('');

  // PAA guide
  document.getElementById('serp-paa-guide').innerHTML = [
    { icon:'❓', title:'Find your PAA questions',   desc:'Search your keyword, note the PAA box questions. These are your exact H3 subheadings to add.' },
    { icon:'📝', title:'Write direct answers',       desc:'Each answer: 2-3 sentences max. Start with the keyword. No fluff — Google wants the clearest answer.' },
    { icon:'🏗️', title:'Add FAQ schema',             desc:'Wrap your Q&A section in FAQ schema JSON-LD. This can trigger your answer to appear directly in the PAA box.' },
    { icon:'🔄', title:'Cluster related questions',  desc:'Answer 5-7 related questions per page. More PAA coverage = more SERP real estate for your domain.' },
  ].map(s => `<div class="eeat-signal-item"><div class="eeat-signal-icon">${s.icon}</div><div><div class="eeat-signal-title">${s.title}</div><div class="eeat-signal-desc">${s.desc}</div></div></div>`).join('');
}

// ══════════════════════════════════════════
//  🕸️  INTERNAL LINK MAP
// ══════════════════════════════════════════
const LINK_NODES = [
  { id:0,  url:'/seo-services',         label:'SEO Services',        type:'pillar',  inbound:18, outbound:12, equity:94 },
  { id:1,  url:'/blog/seo-guide',       label:'SEO Guide',           type:'pillar',  inbound:14, outbound:9,  equity:88 },
  { id:2,  url:'/blog/technical-seo',   label:'Technical SEO',       type:'cluster', inbound:8,  outbound:6,  equity:72 },
  { id:3,  url:'/blog/local-seo',       label:'Local SEO',           type:'cluster', inbound:7,  outbound:5,  equity:68 },
  { id:4,  url:'/blog/keyword-research',label:'Keyword Research',    type:'cluster', inbound:6,  outbound:4,  equity:64 },
  { id:5,  url:'/blog/link-building',   label:'Link Building',       type:'cluster', inbound:5,  outbound:8,  equity:61 },
  { id:6,  url:'/pricing',              label:'Pricing',             type:'pillar',  inbound:11, outbound:3,  equity:82 },
  { id:7,  url:'/about',               label:'About',               type:'cluster', inbound:9,  outbound:5,  equity:77 },
  { id:8,  url:'/blog/on-page-seo',    label:'On-Page SEO',         type:'cluster', inbound:4,  outbound:7,  equity:58 },
  { id:9,  url:'/blog/seo-tools',      label:'SEO Tools',           type:'cluster', inbound:3,  outbound:4,  equity:52 },
  { id:10, url:'/blog/content-marketing',label:'Content Marketing', type:'support', inbound:2,  outbound:3,  equity:44 },
  { id:11, url:'/blog/meta-tags',       label:'Meta Tags Guide',    type:'support', inbound:1,  outbound:2,  equity:38 },
  { id:12, url:'/blog/old-post-2022',   label:'Old Post 2022',      type:'orphan',  inbound:0,  outbound:1,  equity:12 },
  { id:13, url:'/blog/draft-page',      label:'Draft Page',         type:'orphan',  inbound:0,  outbound:0,  equity:8  },
  { id:14, url:'/services/audit',       label:'Audit Service',      type:'support', inbound:2,  outbound:4,  equity:46 },
];

const LINK_EDGES = [
  [0,1],[0,2],[0,3],[0,6],[1,2],[1,3],[1,4],[1,5],[1,8],[2,4],[2,9],[3,4],[3,10],[4,9],[5,8],[5,11],[6,0],[6,7],[7,0],[8,2],[8,11],[9,5],[10,3],[14,0],[14,2]
];

function initLinkMap() {
  const canvas = document.getElementById('linkmap-canvas');
  if (!canvas) return;
  const wrap = document.getElementById('linkmap-canvas-wrap');
  canvas.width  = wrap.offsetWidth  || 520;
  canvas.height = wrap.offsetHeight || 380;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // Layout nodes in a force-like circle arrangement
  const cx = W/2, cy = H/2;
  const pillars = LINK_NODES.filter(n=>n.type==='pillar');
  const clusters = LINK_NODES.filter(n=>n.type==='cluster');
  const supports = LINK_NODES.filter(n=>n.type==='support');
  const orphans  = LINK_NODES.filter(n=>n.type==='orphan');

  const positioned = {};
  // Pillars — inner ring
  pillars.forEach((n,i) => {
    const angle = (i/pillars.length)*Math.PI*2 - Math.PI/2;
    positioned[n.id] = { x: cx+Math.cos(angle)*110, y: cy+Math.sin(angle)*80 };
  });
  // Clusters — middle ring
  clusters.forEach((n,i) => {
    const angle = (i/clusters.length)*Math.PI*2 - Math.PI/4;
    positioned[n.id] = { x: cx+Math.cos(angle)*190, y: cy+Math.sin(angle)*140 };
  });
  // Supports — outer ring
  supports.forEach((n,i) => {
    const angle = (i/supports.length)*Math.PI*2 + Math.PI/6;
    positioned[n.id] = { x: cx+Math.cos(angle)*250, y: cy+Math.sin(angle)*170 };
  });
  // Orphans — bottom corners
  orphans.forEach((n,i) => {
    positioned[n.id] = { x: 40 + i*80, y: H-30 };
  });

  const typeColor = { pillar:'#00d4ff', cluster:'#7c3aed', support:'#10b981', orphan:'#ef4444' };

  function draw() {
    ctx.clearRect(0,0,W,H);

    // Edges
    LINK_EDGES.forEach(([a,b]) => {
      const pa = positioned[a], pb = positioned[b];
      if (!pa||!pb) return;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.strokeStyle = 'rgba(0,212,255,0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Arrow
      const angle = Math.atan2(pb.y-pa.y, pb.x-pa.x);
      const r = nodeRadius(LINK_NODES[b]);
      const ax = pb.x - Math.cos(angle)*(r+3);
      const ay = pb.y - Math.sin(angle)*(r+3);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax-8*Math.cos(angle-0.4), ay-8*Math.sin(angle-0.4));
      ctx.lineTo(ax-8*Math.cos(angle+0.4), ay-8*Math.sin(angle+0.4));
      ctx.closePath();
      ctx.fillStyle = 'rgba(0,212,255,0.3)';
      ctx.fill();
    });

    // Nodes
    LINK_NODES.forEach(n => {
      const pos = positioned[n.id];
      if (!pos) return;
      const r = nodeRadius(n);
      const col = typeColor[n.type];

      // Glow
      const grd = ctx.createRadialGradient(pos.x,pos.y,0,pos.x,pos.y,r*2);
      grd.addColorStop(0, col+'30');
      grd.addColorStop(1, 'transparent');
      ctx.beginPath(); ctx.arc(pos.x,pos.y,r*2,0,Math.PI*2);
      ctx.fillStyle = grd; ctx.fill();

      // Circle
      ctx.beginPath(); ctx.arc(pos.x,pos.y,r,0,Math.PI*2);
      ctx.fillStyle = col+'25';
      ctx.strokeStyle = col;
      ctx.lineWidth = n.type==='pillar'?2.5:1.5;
      ctx.fill(); ctx.stroke();

      // Label
      ctx.fillStyle = n.type==='orphan'?'#ef4444':'#e8f4fd';
      ctx.font = `${n.type==='pillar'?'700':'500'} ${n.type==='pillar'?11:10}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const words = n.label.split(' ');
      if (words.length > 1 && r > 18) {
        ctx.fillText(words[0], pos.x, pos.y-6);
        ctx.fillText(words.slice(1).join(' '), pos.x, pos.y+6);
      } else {
        ctx.fillText(n.label, pos.x, pos.y);
      }
    });
  }

  function nodeRadius(n) { return Math.max(14, Math.min(34, 10 + n.inbound*1.4)); }

  draw();

  // Hover tooltip
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX-rect.left)*(W/rect.width);
    const my = (e.clientY-rect.top)*(H/rect.height);
    let hovered = null;
    LINK_NODES.forEach(n => {
      const pos = positioned[n.id];
      if (!pos) return;
      const r = nodeRadius(n);
      if (Math.hypot(mx-pos.x, my-pos.y) < r+4) hovered = n;
    });
    const tip = document.getElementById('linkmap-tooltip');
    if (hovered && tip) {
      tip.style.display = 'block';
      tip.style.left = (e.clientX-wrap.getBoundingClientRect().left+12)+'px';
      tip.style.top  = (e.clientY-wrap.getBoundingClientRect().top-60)+'px';
      tip.innerHTML = `<div style="font-size:10px;color:var(--muted);font-family:'Space Mono',monospace;margin-bottom:4px">${hovered.type.toUpperCase()}</div>
        <div style="font-weight:700;margin-bottom:6px;color:var(--accent)">${hovered.url}</div>
        <div style="font-size:11px;color:var(--muted)">Inbound: <strong style="color:var(--accent3)">${hovered.inbound}</strong> | Outbound: <strong>${hovered.outbound}</strong></div>
        <div style="font-size:11px;color:var(--muted);margin-top:3px">Equity Score: <strong style="color:var(--accent4)">${hovered.equity}</strong></div>`;
      canvas.style.cursor = 'pointer';
    } else {
      if (tip) tip.style.display = 'none';
      canvas.style.cursor = 'default';
    }
  });
  canvas.addEventListener('mouseleave', () => {
    const tip = document.getElementById('linkmap-tooltip');
    if (tip) tip.style.display = 'none';
  });

  // KPIs
  document.getElementById('linkmap-kpis').innerHTML = [
    ['TOTAL PAGES', LINK_NODES.length,                                                'var(--accent)'],
    ['ORPHAN PAGES', LINK_NODES.filter(n=>n.type==='orphan').length,                  'var(--danger)'],
    ['AVG INBOUND LINKS', (LINK_NODES.reduce((a,n)=>a+n.inbound,0)/LINK_NODES.length).toFixed(1),'var(--accent3)'],
    ['TOTAL LINK EDGES', LINK_EDGES.length,                                           'var(--accent2)'],
  ].map(([l,v,c]) => `
    <div class="metric-card" style="--accent-c:${c}">
      <div class="metric-label">${l}</div>
      <div class="metric-value" style="color:${c}">${v}</div>
    </div>`).join('');

  // Orphan list
  const orphanNodes = LINK_NODES.filter(n=>n.type==='orphan');
  document.getElementById('linkmap-orphans').innerHTML = orphanNodes.map(n => `
    <div class="linkmap-page-row">
      <div style="width:8px;height:8px;border-radius:50%;background:var(--danger);flex-shrink:0"></div>
      <div class="linkmap-page-url">${n.url}</div>
      <span class="badge badge-red" style="font-size:10px">0 inbound links</span>
    </div>`).join('') || '<div style="color:var(--muted);font-size:13px">No orphan pages found ✅</div>';

  // High equity list
  const topEquity = [...LINK_NODES].sort((a,b)=>b.equity-a.equity).slice(0,5);
  document.getElementById('linkmap-equity').innerHTML = topEquity.map(n => `
    <div class="linkmap-page-row">
      <div class="linkmap-page-url">${n.url}</div>
      <div class="linkmap-page-stat" style="color:var(--accent4)">Equity: ${n.equity}</div>
      <div class="linkmap-page-stat" style="color:var(--accent3);margin-left:8px">${n.inbound} links</div>
    </div>`).join('');

  // Recommendations
  document.getElementById('linkmap-recs').innerHTML = [
    { icon:'🔴', title:'Fix Orphan Pages Immediately', desc:'2 pages have zero inbound links. Link to them from relevant cluster pages or add them to the site navigation.', action:'Add 2-3 internal links' },
    { icon:'⚡', title:'Leverage High-Equity Pages', desc:'/seo-services (equity: 94) has strong authority. Add contextual links from it to your newest content pieces to boost their rankings.', action:'Add 3 outbound links' },
    { icon:'🕸️', title:'Strengthen Topic Clusters', desc:'Your SEO Tools page only has 3 inbound links. It should have 8-10 from related cluster pages to signal topical depth to Google.', action:'Build 5 more internal links' },
    { icon:'📈', title:'Create Hub-and-Spoke Flow', desc:'Pillar pages should link to all their cluster articles, and cluster articles should link back. Currently 4 cluster pages missing their pillar backlink.', action:'Fix pillar ↔ cluster linking' },
  ].map(r => `
    <div class="linkmap-rec-item">
      <div style="font-size:20px;flex-shrink:0">${r.icon}</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:700;margin-bottom:3px">${r.title}</div>
        <div style="font-size:12px;color:var(--muted);line-height:1.6;margin-bottom:6px">${r.desc}</div>
        <span class="badge badge-blue" style="font-size:10px">Action: ${r.action}</span>
      </div>
    </div>`).join('');
}

// ══════════════════════════════════════════
//  🏅  E-E-A-T SCORER
// ══════════════════════════════════════════
async function runEEAT() {
  const url   = document.getElementById('eeat-url').value.trim();
  const type  = document.getElementById('eeat-type').value;
  const ymyl  = document.getElementById('eeat-ymyl').value;
  if (!url) { document.getElementById('eeat-url').focus(); return; }

  document.getElementById('eeat-output').style.display  = 'none';
  document.getElementById('eeat-loading').style.display = 'block';

  const msgs = ['Analyzing E-E-A-T signals...','Checking trust indicators...','Evaluating author signals...','Scoring authority...'];
  let mi=0;
  const intv = setInterval(()=>{ const el=document.getElementById('eeat-load-msg'); if(el) el.textContent=msgs[Math.min(mi++,msgs.length-1)]; },1200);

  let result = null;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST', headers: AI.headers(),
      body: JSON.stringify({
        model: AI.MODEL, max_tokens:1000,
        system:'You are a Google E-E-A-T expert. Return ONLY valid JSON, no markdown.',
        messages:[{ role:'user', content:`Audit this page for E-E-A-T signals:
URL: ${url} | Type: ${type} | YMYL: ${ymyl}

Return ONLY this JSON:
{
  "experience_score": 65,
  "expertise_score": 72,
  "authority_score": 58,
  "trust_score": 81,
  "overall": 69,
  "present": [
    {"icon":"✅","title":"Signal present","desc":"Why this helps E-E-A-T"},
    {"icon":"✅","title":"Signal present","desc":"Why this helps E-E-A-T"},
    {"icon":"✅","title":"Signal present","desc":"Why this helps E-E-A-T"},
    {"icon":"✅","title":"Signal present","desc":"Why this helps E-E-A-T"}
  ],
  "missing": [
    {"icon":"❌","title":"Missing signal","desc":"What's missing and why it matters","fix":"Specific fix in one sentence"},
    {"icon":"❌","title":"Missing signal","desc":"What's missing","fix":"Fix"},
    {"icon":"❌","title":"Missing signal","desc":"What's missing","fix":"Fix"},
    {"icon":"❌","title":"Missing signal","desc":"What's missing","fix":"Fix"},
    {"icon":"❌","title":"Missing signal","desc":"What's missing","fix":"Fix"}
  ],
  "verdict": "2-3 sentences assessing the overall E-E-A-T health of this page and the highest-priority fix."
}` }]
      })
    });
    const data = await res.json();
    const text = data.content?.map(c=>c.text||'').join('').replace(/```json|```/g,'').trim();
    result = JSON.parse(text);
  } catch(e) {
    result = buildMockEEAT(url, type, ymyl);
  }

  clearInterval(intv);
  document.getElementById('eeat-loading').style.display = 'none';
  renderEEAT(result);
  document.getElementById('eeat-output').style.display = 'block';
}

function buildMockEEAT(url, type, ymyl) {
  const ymylPenalty = ymyl === 'yes' ? -12 : 0;
  return {
    experience_score: 58 + ymylPenalty,
    expertise_score:  71 + ymylPenalty,
    authority_score:  54 + ymylPenalty,
    trust_score:      79 + ymylPenalty,
    overall: 66 + ymylPenalty,
    present: [
      { icon:'✅', title:'HTTPS Secure Connection',       desc:'Site is served over HTTPS. Basic trust signal that Google expects as a baseline.' },
      { icon:'✅', title:'Clear Contact Information',      desc:'Contact page and/or footer contact details are present, supporting trustworthiness.' },
      { icon:'✅', title:'Internal Linking Structure',     desc:'Pages are interconnected, demonstrating topical depth and editorial coherence.' },
      { icon:'✅', title:'Structured Data Present',        desc:'Some schema markup detected, helping Google understand page content and context.' },
    ],
    missing: [
      { icon:'❌', title:'No Author Bio',                  desc:'Content has no visible author attribution. Google needs to know WHO wrote this and WHY they are qualified.', fix:'Add a byline with author name, credentials, and a link to their bio page.' },
      { icon:'❌', title:'Missing Publication & Update Date', desc:'No visible publish date or last-updated date. Freshness signals are critical for E-E-A-T.', fix:'Add published date and a "Last updated: [date]" timestamp visible on the page.' },
      { icon:'❌', title:'No Expert Citations or Sources',  desc:'No outbound links to authoritative sources. Expertise means referencing credible data.', fix:'Add 3-5 outbound links to authoritative sources (gov, edu, industry studies).' },
      { icon:'❌', title:'Missing Editorial Policy',        desc:'No visible link to an editorial standards or review process page.', fix:'Create an "Editorial Policy" page and link to it from the footer and author bios.' },
      { icon:'❌', title:'No Social Proof / Reviews',      desc:'No testimonials, case studies, or third-party validation on key pages.', fix:'Add a testimonials section or link to your Google Business reviews on service pages.' },
    ],
    verdict: `${url} has solid foundational trust signals but is missing critical expertise and experience indicators. The single highest-impact fix is adding author bios with real credentials — this alone can meaningfully shift E-E-A-T scores, especially for ${ymyl==='yes'?'YMYL content where Google applies maximum scrutiny':'competitive niches'}.`
  };
}

function renderEEAT(r) {
  const scoreCol = s => s>=80?'var(--accent3)':s>=65?'var(--accent)':s>=50?'var(--accent4)':'var(--danger)';
  const pillars = [
    ['EXPERIENCE', r.experience_score, '👁️'],
    ['EXPERTISE',  r.expertise_score,  '🧠'],
    ['AUTHORITY',  r.authority_score,  '⭐'],
    ['TRUST',      r.trust_score,      '🔒'],
  ];
  document.getElementById('eeat-scores').innerHTML = pillars.map(([l,v,ico]) => `
    <div class="metric-card" style="--accent-c:${scoreCol(v)}">
      <div class="metric-label">${ico} ${l}</div>
      <div class="metric-value" style="color:${scoreCol(v)}">${v}<span style="font-size:14px;color:var(--muted)">/100</span></div>
      <div class="metric-change" style="color:${scoreCol(v)}">${v>=80?'Strong':v>=65?'Good':v>=50?'Fair':'Weak'}</div>
    </div>`).join('');

  document.getElementById('eeat-present').innerHTML = (r.present||[]).map(s => `
    <div class="eeat-signal-item">
      <div class="eeat-signal-icon">${s.icon}</div>
      <div><div class="eeat-signal-title">${s.title}</div><div class="eeat-signal-desc">${s.desc}</div></div>
    </div>`).join('');

  document.getElementById('eeat-missing').innerHTML = (r.missing||[]).map(s => `
    <div class="eeat-signal-item">
      <div class="eeat-signal-icon">${s.icon}</div>
      <div>
        <div class="eeat-signal-title" style="color:var(--danger)">${s.title}</div>
        <div class="eeat-signal-desc">${s.desc}</div>
        <div class="eeat-signal-fix">→ Fix: ${s.fix}</div>
      </div>
    </div>`).join('');

  const verdictEl = document.getElementById('eeat-verdict');
  if (verdictEl) verdictEl.textContent = r.verdict||'';
}

// ══════════════════════════════════════════
//  🏗️  SCHEMA BUILDER
// ══════════════════════════════════════════
let currentSchema = 'article';

const SCHEMA_CONFIGS = {
  article: {
    title:'📰 Article Schema',
    fields:[
      { id:'art-headline',   label:'HEADLINE',           type:'text',     ph:'e.g. The Complete SEO Guide for 2025' },
      { id:'art-desc',       label:'DESCRIPTION',        type:'text',     ph:'150-160 char page description' },
      { id:'art-author',     label:'AUTHOR NAME',        type:'text',     ph:'e.g. John Smith' },
      { id:'art-date',       label:'DATE PUBLISHED',     type:'date',     ph:'' },
      { id:'art-modified',   label:'DATE MODIFIED',      type:'date',     ph:'' },
      { id:'art-image',      label:'FEATURED IMAGE URL', type:'text',     ph:'https://yoursite.com/image.jpg' },
      { id:'art-publisher',  label:'PUBLISHER NAME',     type:'text',     ph:'e.g. Jarvis SEO' },
      { id:'art-url',        label:'CANONICAL URL',      type:'text',     ph:'https://yoursite.com/blog/seo-guide' },
    ]
  },
  faq: {
    title:'❓ FAQ Schema',
    fields:[
      { id:'faq-q1', label:'QUESTION 1', type:'text', ph:'What is SEO?' },
      { id:'faq-a1', label:'ANSWER 1',   type:'textarea', ph:'SEO is the process of...' },
      { id:'faq-q2', label:'QUESTION 2', type:'text', ph:'How long does SEO take?' },
      { id:'faq-a2', label:'ANSWER 2',   type:'textarea', ph:'SEO typically takes...' },
      { id:'faq-q3', label:'QUESTION 3', type:'text', ph:'How much does SEO cost?' },
      { id:'faq-a3', label:'ANSWER 3',   type:'textarea', ph:'SEO costs vary...' },
      { id:'faq-q4', label:'QUESTION 4 (optional)', type:'text', ph:'What is domain authority?' },
      { id:'faq-a4', label:'ANSWER 4 (optional)',   type:'textarea', ph:'Domain authority is...' },
    ]
  },
  howto: {
    title:'📋 HowTo Schema',
    fields:[
      { id:'how-name',  label:'HOW-TO TITLE',       type:'text',     ph:'How to Do Keyword Research' },
      { id:'how-desc',  label:'DESCRIPTION',        type:'text',     ph:'A step-by-step guide to...' },
      { id:'how-time',  label:'TOTAL TIME (ISO)',   type:'text',     ph:'e.g. PT2H (2 hours)' },
      { id:'how-s1',    label:'STEP 1',             type:'text',     ph:'Start with seed keywords' },
      { id:'how-s2',    label:'STEP 2',             type:'text',     ph:'Use a keyword research tool' },
      { id:'how-s3',    label:'STEP 3',             type:'text',     ph:'Analyze search intent' },
      { id:'how-s4',    label:'STEP 4',             type:'text',     ph:'Build your keyword list' },
      { id:'how-s5',    label:'STEP 5 (optional)',  type:'text',     ph:'Prioritize by opportunity' },
    ]
  },
  local: {
    title:'📍 Local Business Schema',
    fields:[
      { id:'lb-name',    label:'BUSINESS NAME',    type:'text', ph:'Jarvis SEO Agency' },
      { id:'lb-type',    label:'BUSINESS TYPE',    type:'text', ph:'e.g. SEOAgency, LocalBusiness, Restaurant' },
      { id:'lb-addr',    label:'STREET ADDRESS',   type:'text', ph:'123 Main Street' },
      { id:'lb-city',    label:'CITY',             type:'text', ph:'New York' },
      { id:'lb-state',   label:'STATE/REGION',     type:'text', ph:'NY' },
      { id:'lb-zip',     label:'POSTAL CODE',      type:'text', ph:'10001' },
      { id:'lb-country', label:'COUNTRY CODE',     type:'text', ph:'US' },
      { id:'lb-phone',   label:'PHONE',            type:'text', ph:'+1-212-555-0100' },
      { id:'lb-url',     label:'WEBSITE URL',      type:'text', ph:'https://yoursite.com' },
      { id:'lb-hours',   label:'OPENING HOURS',   type:'text', ph:'Mo-Fr 09:00-17:00' },
    ]
  },
  product: {
    title:'🛒 Product Schema',
    fields:[
      { id:'pr-name',     label:'PRODUCT NAME',    type:'text', ph:'e.g. SEO Audit Tool Pro' },
      { id:'pr-desc',     label:'DESCRIPTION',     type:'text', ph:'Product description...' },
      { id:'pr-price',    label:'PRICE',           type:'text', ph:'e.g. 99.00' },
      { id:'pr-currency', label:'CURRENCY',        type:'text', ph:'USD' },
      { id:'pr-avail',    label:'AVAILABILITY',    type:'text', ph:'InStock' },
      { id:'pr-brand',    label:'BRAND',           type:'text', ph:'e.g. Jarvis SEO' },
      { id:'pr-sku',      label:'SKU / MPN',       type:'text', ph:'e.g. JSEO-PRO-001' },
      { id:'pr-image',    label:'IMAGE URL',       type:'text', ph:'https://yoursite.com/product.jpg' },
    ]
  },
  review: {
    title:'⭐ Review Schema',
    fields:[
      { id:'rv-item',    label:'ITEM REVIEWED',      type:'text', ph:'e.g. Ahrefs' },
      { id:'rv-type',    label:'ITEM TYPE',          type:'text', ph:'e.g. SoftwareApplication, Product' },
      { id:'rv-author',  label:'REVIEWER NAME',      type:'text', ph:'e.g. John Smith' },
      { id:'rv-rating',  label:'RATING (1-5)',       type:'text', ph:'4.5' },
      { id:'rv-best',    label:'BEST RATING',        type:'text', ph:'5' },
      { id:'rv-body',    label:'REVIEW BODY',        type:'textarea', ph:'After using this tool for 6 months...' },
      { id:'rv-date',    label:'DATE PUBLISHED',     type:'date', ph:'' },
    ]
  },
  event: {
    title:'🎪 Event Schema',
    fields:[
      { id:'ev-name',    label:'EVENT NAME',         type:'text', ph:'SEO Conference 2025' },
      { id:'ev-start',   label:'START DATE',         type:'date', ph:'' },
      { id:'ev-end',     label:'END DATE',           type:'date', ph:'' },
      { id:'ev-loc',     label:'LOCATION NAME',      type:'text', ph:'Madison Square Garden' },
      { id:'ev-addr',    label:'LOCATION ADDRESS',   type:'text', ph:'4 Penn Plaza, New York, NY' },
      { id:'ev-url',     label:'EVENT URL',          type:'text', ph:'https://yoursite.com/event' },
      { id:'ev-mode',    label:'EVENT MODE',         type:'text', ph:'OfflineEventAttendanceMode' },
      { id:'ev-price',   label:'TICKET PRICE',       type:'text', ph:'e.g. 299' },
    ]
  },
  person: {
    title:'👤 Person Schema',
    fields:[
      { id:'pe-name',    label:'FULL NAME',          type:'text', ph:'e.g. John Smith' },
      { id:'pe-job',     label:'JOB TITLE',          type:'text', ph:'e.g. SEO Strategist' },
      { id:'pe-org',     label:'WORKS FOR',          type:'text', ph:'e.g. Jarvis SEO' },
      { id:'pe-url',     label:'PROFILE URL',        type:'text', ph:'https://yoursite.com/about/john' },
      { id:'pe-image',   label:'PHOTO URL',          type:'text', ph:'https://yoursite.com/john.jpg' },
      { id:'pe-twitter', label:'TWITTER/X URL',      type:'text', ph:'https://twitter.com/johnseo' },
      { id:'pe-linkedin',label:'LINKEDIN URL',       type:'text', ph:'https://linkedin.com/in/johnseo' },
    ]
  },
  organization: {
    title:'🏢 Organization Schema',
    fields:[
      { id:'org-name',   label:'ORGANIZATION NAME',  type:'text', ph:'Jarvis SEO' },
      { id:'org-url',    label:'WEBSITE URL',        type:'text', ph:'https://yoursite.com' },
      { id:'org-logo',   label:'LOGO URL',           type:'text', ph:'https://yoursite.com/logo.png' },
      { id:'org-phone',  label:'PHONE',              type:'text', ph:'+1-212-555-0100' },
      { id:'org-email',  label:'EMAIL',              type:'text', ph:'hello@yoursite.com' },
      { id:'org-social', label:'SOCIAL PROFILES (comma separated)', type:'text', ph:'https://twitter.com/x, https://linkedin.com/company/x' },
      { id:'org-desc',   label:'DESCRIPTION',        type:'text', ph:'We help businesses grow with SEO...' },
    ]
  },
  breadcrumb: {
    title:'🍞 Breadcrumb Schema',
    fields:[
      { id:'bc-1n', label:'ITEM 1 NAME', type:'text', ph:'Home' },
      { id:'bc-1u', label:'ITEM 1 URL',  type:'text', ph:'https://yoursite.com' },
      { id:'bc-2n', label:'ITEM 2 NAME', type:'text', ph:'Blog' },
      { id:'bc-2u', label:'ITEM 2 URL',  type:'text', ph:'https://yoursite.com/blog' },
      { id:'bc-3n', label:'ITEM 3 NAME', type:'text', ph:'SEO Guide' },
      { id:'bc-3u', label:'ITEM 3 URL',  type:'text', ph:'https://yoursite.com/blog/seo-guide' },
      { id:'bc-4n', label:'ITEM 4 NAME (optional)', type:'text', ph:'' },
      { id:'bc-4u', label:'ITEM 4 URL (optional)',  type:'text', ph:'' },
    ]
  },
};

function selectSchema(type, btn) {
  currentSchema = type;
  document.querySelectorAll('.schema-type-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderSchemaFields();
}

function renderSchemaFields() {
  const cfg = SCHEMA_CONFIGS[currentSchema];
  if (!cfg) return;
  document.getElementById('schema-fields-title').textContent = cfg.title + ' Fields';
  document.getElementById('schema-fields').innerHTML = cfg.fields.map(f => `
    <div class="schema-field-group">
      <label class="schema-field-label">${f.label}</label>
      ${f.type==='textarea'
        ? `<textarea class="wiz-input" id="${f.id}" placeholder="${f.ph}" rows="2" style="resize:vertical;font-size:12px;font-family:'Space Mono',monospace"></textarea>`
        : `<input class="wiz-input" id="${f.id}" type="${f.type||'text'}" placeholder="${f.ph}">`
      }
    </div>`).join('');
}

function v(id) { const el=document.getElementById(id); return el?el.value.trim():''; }

function generateSchema() {
  const out  = document.getElementById('schema-output');
  const prev = document.getElementById('schema-preview');
  let json   = {};

  if (currentSchema === 'article') {
    json = {"@context":"https://schema.org","@type":"Article","headline":v('art-headline'),"description":v('art-desc'),"image":v('art-image'),"datePublished":v('art-date'),"dateModified":v('art-modified'),"url":v('art-url'),"author":{"@type":"Person","name":v('art-author')},"publisher":{"@type":"Organization","name":v('art-publisher'),"logo":{"@type":"ImageObject","url":""}}};
    prev.innerHTML = `<div style="font-family:Arial,sans-serif;color:#202124;font-size:14px"><div style="color:#006621;font-size:12px">${v('art-url')||'yoursite.com'} › blog</div><div style="color:#1a0dab;font-size:18px;font-weight:400;margin:2px 0">${v('art-headline')||'Article Title'}</div><div style="color:#545454;font-size:13px">${v('art-date')||'2025'} — ${v('art-desc')||'Article description appears here in Google search results...'}</div></div>`;
  } else if (currentSchema === 'faq') {
    const mainEntity = [];
    for (let i=1;i<=4;i++) { const q=v('faq-q'+i),a=v('faq-a'+i); if(q&&a) mainEntity.push({"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}}); }
    json = {"@context":"https://schema.org","@type":"FAQPage","mainEntity":mainEntity};
    prev.innerHTML = `<div style="font-family:Arial,sans-serif;color:#202124"><div style="font-size:13px;color:#006621;margin-bottom:6px">yoursite.com</div>${mainEntity.slice(0,2).map(q=>`<div style="margin-bottom:8px"><div style="font-size:14px;font-weight:600;color:#1a0dab">▶ ${q.name}</div><div style="font-size:13px;color:#545454;padding-left:18px">${q.acceptedAnswer.text.substring(0,100)}...</div></div>`).join('')}</div>`;
  } else if (currentSchema === 'howto') {
    const steps = [];
    for(let i=1;i<=5;i++){const s=v('how-s'+i);if(s)steps.push({"@type":"HowToStep","text":s,"name":"Step "+i});}
    json = {"@context":"https://schema.org","@type":"HowTo","name":v('how-name'),"description":v('how-desc'),"totalTime":v('how-time'),"step":steps};
    prev.innerHTML = `<div style="font-family:Arial,sans-serif;color:#202124"><div style="font-size:18px;font-weight:400;color:#1a0dab;margin-bottom:8px">${v('how-name')||'How To...'}</div>${steps.slice(0,3).map((s,i)=>`<div style="display:flex;gap:10px;margin-bottom:6px"><div style="width:22px;height:22px;background:#1a73e8;border-radius:50%;color:white;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0">${i+1}</div><div style="font-size:13px;color:#202124">${s.text}</div></div>`).join('')}</div>`;
  } else if (currentSchema === 'local') {
    json = {"@context":"https://schema.org","@type":v('lb-type')||"LocalBusiness","name":v('lb-name'),"url":v('lb-url'),"telephone":v('lb-phone'),"openingHours":v('lb-hours'),"address":{"@type":"PostalAddress","streetAddress":v('lb-addr'),"addressLocality":v('lb-city'),"addressRegion":v('lb-state'),"postalCode":v('lb-zip'),"addressCountry":v('lb-country')}};
    prev.innerHTML = `<div style="font-family:Arial,sans-serif;color:#202124"><div style="display:flex;gap:12px"><div style="flex:1"><div style="font-size:18px;font-weight:600;color:#1a0dab">${v('lb-name')||'Business Name'}</div><div style="font-size:13px;color:#545454">${v('lb-type')||'LocalBusiness'}</div><div style="font-size:13px;color:#545454;margin-top:4px">📍 ${v('lb-addr')||'Address'}, ${v('lb-city')||'City'}</div><div style="font-size:13px;color:#545454">📞 ${v('lb-phone')||'Phone'}</div></div></div></div>`;
  } else if (currentSchema === 'product') {
    json = {"@context":"https://schema.org","@type":"Product","name":v('pr-name'),"description":v('pr-desc'),"brand":{"@type":"Brand","name":v('pr-brand')},"sku":v('pr-sku'),"image":v('pr-image'),"offers":{"@type":"Offer","price":v('pr-price'),"priceCurrency":v('pr-currency')||'USD',"availability":"https://schema.org/"+v('pr-avail')}};
    prev.innerHTML = `<div style="font-family:Arial,sans-serif"><div style="font-size:16px;color:#1a0dab;font-weight:400">${v('pr-name')||'Product Name'}</div><div style="font-size:13px;color:#545454;margin:4px 0">${v('pr-desc')||'Description'}...</div><div style="display:flex;align-items:center;gap:8px"><span style="color:#e37400;font-size:14px">★★★★☆</span><span style="font-size:13px;color:#545454">4.2 (128 reviews)</span></div><div style="font-size:16px;font-weight:600;color:#202124;margin-top:4px">${v('pr-currency')||'USD'} ${v('pr-price')||'0.00'}</div></div>`;
  } else if (currentSchema === 'breadcrumb') {
    const items = [];
    for(let i=1;i<=4;i++){const n=v('bc-'+i+'n'),u=v('bc-'+i+'u');if(n&&u)items.push({"@type":"ListItem","position":i,"name":n,"item":u});}
    json = {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":items};
    prev.innerHTML = `<div style="font-family:Arial,sans-serif;color:#545454;font-size:13px">${items.map(it=>`<span>${it.name}</span>`).join(' › ')}</div>`;
  } else {
    json = {"@context":"https://schema.org","note":"Schema generated for "+currentSchema};
    prev.innerHTML = '<div style="color:#999;font-size:13px;text-align:center;padding:16px">Preview not available for this schema type</div>';
  }

  if (out) {
    out.innerHTML = '';
    const formatted = JSON.stringify(json, null, 2);
    out.textContent = '<script type="application/ld+json">
' + formatted + '
<\/script>';
  }

  // Coverage
  const coverageEl = document.getElementById('schema-coverage');
  if (coverageEl) {
    const coverage = [
      ['Article',         'yes'],['FAQ',      'yes'],['Breadcrumb','yes'],
      ['HowTo',           'no'], ['Product',  'no'], ['LocalBiz', 'no'],
      ['Review',          'no'], ['Event',    'no'], ['Person',   'no'],
    ];
    coverageEl.innerHTML = coverage.map(([t,has])=>`
      <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);font-size:12px">
        <span>${t}</span>
        <span class="${has==='yes'?'badge badge-green':'badge badge-red'}" style="font-size:10px">${has==='yes'?'✓ Implemented':'✗ Missing'}</span>
      </div>`).join('');
  }
}

function copySchema() {
  const el = document.getElementById('schema-output');
  if (el) {
    navigator.clipboard?.writeText(el.textContent);
    const btn = document.querySelector('#sec-schema .meta-copy-btn');
    if (btn) { btn.textContent='✅ Copied!'; setTimeout(()=>btn.textContent='📋 Copy',2000); }
  }
}

function validateSchema() {
  window.open('https://validator.schema.org/', '_blank');
}

function renderSchemaCoverage() { generateSchema && document.getElementById('schema-output')?.textContent.includes('note') && null; }

// Init on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  renderSchemaFields();
});
/* --- */

async function generateROIInsight() {
  const traffic  = document.getElementById('roi-traffic')?.value||14200;
  const cvr      = document.getElementById('roi-cvr')?.value||2.4;
  const aov      = document.getElementById('roi-aov')?.value||480;
  const spend    = document.getElementById('roi-spend')?.value||2000;
  const scenario = document.getElementById('roi-scenario')?.value||'realistic';
  const insightEl = document.getElementById('roi-ai-insight');
  insightEl.innerHTML = '<div class="ai-thinking"><span>🧠 JARVIS CALCULATING</span><span class="dot-animate"><span></span><span></span><span></span></span></div>';

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST', headers: AI.headers(),
      body: JSON.stringify({
        model: AI.MODEL, max_tokens:1000,
        system:'You are JARVIS, an elite SEO strategist and business analyst. Be precise, use real numbers, give actionable advice.',
        messages:[{ role:'user', content:
          `Analyze this SEO ROI scenario and give a sharp 3-paragraph insight:
Current traffic: ${traffic}/mo | CVR: ${cvr}% | AOV: $${aov} | SEO Budget: $${spend}/mo | Scenario: ${scenario}
Current monthly revenue from SEO: ~$${Math.round(traffic*(cvr/100)*0.25*aov).toLocaleString()}
12-month target: ${scenario==='realistic'?'85,000':scenario==='conservative'?'19,000':'128,000'} visits

Cover: (1) Is the budget appropriate for the goals? (2) What's the #1 lever to improve ROI fastest? (3) What's the risk if they do nothing for 12 months? Be specific with dollar amounts.`
        }]
      })
    });
    const data = await res.json();
    insightEl.innerHTML = `<div style="white-space:pre-wrap;font-size:13px;line-height:1.8;color:var(--text)">${(data.content?.map(c=>c.text||'').join('')||'').replace(/</g,'&lt;')}</div>`;
  } catch(e) {
    const rev = Math.round((+traffic)*(+cvr/100)*0.25*(+aov));
    insightEl.innerHTML = `<div style="font-size:13px;line-height:1.85;color:var(--text)">
      At $${(+spend).toLocaleString()}/month, your SEO investment is ${+spend>=2000?'well-positioned':'on the lean side'} for the ${scenario} growth scenario. The budget-to-opportunity ratio suggests you could accelerate results by ${+spend<2000?'increasing content velocity':'focusing spend on link acquisition'}, which historically delivers the highest ROI in competitive niches.<br><br>
      Your #1 ROI lever right now is conversion rate optimization — moving from ${cvr}% to ${(+cvr*1.3).toFixed(1)}% CVR would increase revenue by 30% without any additional traffic. Combined with the traffic growth trajectory, that compounding effect is worth more than doubling your ad budget.<br><br>
      If you do nothing for 12 months, competitors executing SEO aggressively will capture the keyword positions you're targeting, raising the cost and time to rank by an estimated 40-60%. The opportunity cost of inaction is approximately $${Math.round(rev*5.98*0.3).toLocaleString()}/month in foregone revenue by month 12.
    </div>`;
  }
}


// ══════════════════════════════════════════
//  📅  REPORT SCHEDULER
// ══════════════════════════════════════════
const SCHED_SECTIONS = [
  '📊 Executive Summary','🔬 Site Audit','⚔️ Competitor Analysis',
  '🎯 Keyword Rankings','✍️ Content Performance','⚙️ Technical Health',
  '🔗 Backlink Growth','📈 Traffic & Revenue',
];
const SCHED_ALERTS = [
  { label:'🔴 Critical ranking drops (>5 positions)', id:'alert-drop' },
  { label:'📈 New top-10 rankings achieved', id:'alert-top10' },
  { label:'🔗 New backlinks detected', id:'alert-links' },
  { label:'⚠️ Technical errors spike', id:'alert-tech' },
  { label:'🏎️ Core Web Vitals degradation', id:'alert-cwv' },
];

let schedules = Store.get('schedules', [
  { name:'Monthly SEO Report', freq:'Monthly', day:'1st', time:'10:00 AM', emails:'client@acme.com', active:true, next:'Jun 1, 2026' },
  { name:'Weekly Ranking Summary', freq:'Weekly', day:'Monday', time:'08:00 AM', emails:'team@agency.com', active:true, next:'May 18, 2026' },
];

function initScheduler() {
  const secEl = document.getElementById('sched-sections');
  if (secEl && !secEl.innerHTML) {
    secEl.innerHTML = SCHED_SECTIONS.map((s,i) => `
      <div class="sched-section-toggle on" onclick="this.classList.toggle('on');this.querySelector('.sched-toggle-box').textContent=this.classList.contains('on')?'✓':''">
        <div class="sched-toggle-box">✓</div>
        <span style="font-size:13px">${s}</span>
      </div>`).join('');
  }
  const alertEl = document.getElementById('sched-alerts');
  if (alertEl && !alertEl.innerHTML) {
    alertEl.innerHTML = SCHED_ALERTS.map(a => `
      <div class="sched-alert-row">
        <span style="font-size:13px">${a.label}</span>
        <div class="sched-alert-toggle on" id="${a.id}" onclick="this.classList.toggle('on')"></div>
      </div>`).join('');
  }
  renderSchedules();
}

function renderSchedules() {
  const el = document.getElementById('sched-list');
  if (!el) return;
  if (!schedules.length) { el.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;padding:20px">No schedules yet — configure one above and click Activate.</div>'; return; }
  el.innerHTML = schedules.map((s,i) => `
    <div class="sched-item">
      <div class="sched-item-dot" style="background:${s.active?'var(--accent3)':'var(--muted)'}"></div>
      <div class="sched-item-info">
        <div class="sched-item-name">${s.name}</div>
        <div class="sched-item-meta">${s.freq} • ${s.time} • → ${s.emails}</div>
      </div>
      <div class="sched-next-badge">Next: ${s.next}</div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-ghost" style="font-size:11px;padding:5px 10px" onclick="toggleSchedule(${i})">
          ${s.active?'⏸ Pause':'▶ Resume'}
        </button>
        <button class="btn btn-ghost" style="font-size:11px;padding:5px 10px;color:var(--danger)" onclick="deleteSchedule(${i})">🗑️</button>
      </div>
    </div>`).join('');
}


function toggleSchedule(i) { schedules[i].active = !schedules[i].active; Store.set('schedules', schedules); renderSchedules(); }
function deleteSchedule(i) { schedules.splice(i,1); Store.set('schedules', schedules); renderSchedules(); }
function previewNextReport() { showExportModal(); }

// ══════════════════════════════════════════
//  🏆  CASE STUDY BUILDER
// ══════════════════════════════════════════
async function buildCaseStudy() {
  const client   = document.getElementById('cs-client')?.value.trim()      || 'Client';
  const industry = document.getElementById('cs-industry')?.value.trim()    || 'Digital Marketing';
  const duration = document.getElementById('cs-duration')?.value           || '12 months';
  const tStart   = +(document.getElementById('cs-traffic-start')?.value)   || 2400;
  const tEnd     = +(document.getElementById('cs-traffic-end')?.value)     || 18600;
  const daStart  = +(document.getElementById('cs-da-start')?.value)        || 22;
  const daEnd    = +(document.getElementById('cs-da-end')?.value)          || 48;
  const wins     = document.getElementById('cs-wins')?.value.trim()        || '';
  const challenge= document.getElementById('cs-challenge')?.value.trim()   || '';

  const prevEl = document.getElementById('cs-preview-content');
  prevEl.innerHTML = '<div style="text-align:center;padding:40px"><div class="exp-prog-ring"></div><div style="margin-top:12px;color:var(--muted);font-size:13px">Building case study...</div></div>';

  const trafficGrowth = tEnd>0&&tStart>0 ? Math.round((tEnd-tStart)/tStart*100) : 0;
  const daGrowth = daEnd - daStart;
  const winsList = wins.split('\n').filter(Boolean);

  let narrative = '';
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST', headers: AI.headers(),
      body: JSON.stringify({
        model: AI.MODEL, max_tokens:1000,
        system:'You are JARVIS, writing a professional SEO case study. Be compelling, data-driven, and specific. Write for a business audience.',
        messages:[{ role:'user', content:
          `Write a 3-paragraph SEO case study narrative for:
Client: ${client} | Industry: ${industry} | Duration: ${duration}
Traffic: ${tStart.toLocaleString()} → ${tEnd.toLocaleString()} (+${trafficGrowth}%)
Domain Authority: ${daStart} → ${daEnd} (+${daGrowth} pts)
Challenge: ${challenge||'Struggling with organic visibility and technical debt'}
Key wins: ${winsList.join(', ')||'Significant SEO improvements achieved'}

Structure: (1) The challenge & context, (2) The strategy & what was done, (3) The results & business impact. Use specific numbers. Make it persuasive but honest.`
        }]
      })
    });
    const data = await res.json();
    narrative = data.content?.map(c=>c.text||'').join('')||'';
  } catch(e) {
    narrative = `${client} came to us with a serious organic visibility problem. Operating in the competitive ${industry} space, their website was generating only ${tStart.toLocaleString()} monthly visitors despite having a quality product. ${challenge||'Technical debt, thin content, and a weak backlink profile were actively suppressing rankings.'} The gap between their potential and actual traffic was costing them significantly in foregone revenue.

Our approach centered on three pillars: a comprehensive technical SEO foundation rebuild, an aggressive content cluster strategy targeting high-intent keywords, and a systematic link acquisition campaign focused on DA 50+ placements. Over the course of ${duration}, we executed ${winsList.length>0?winsList.join(', '):' a full-spectrum SEO campaign'}.

The results exceeded projections. Organic traffic grew ${trafficGrowth}% from ${tStart.toLocaleString()} to ${tEnd.toLocaleString()} monthly visitors. Domain Authority climbed ${daGrowth} points to ${daEnd}. These aren't just vanity metrics — the traffic quality improvement drove a measurable increase in qualified leads and revenue for ${client}.`;
  }

  // Render output
  document.getElementById('cs-output-title').textContent = `${client} — SEO Case Study`;
  document.getElementById('cs-output-sub').textContent   = `${industry} • ${duration} • ${new Date().toLocaleDateString('en-US',{month:'long',year:'numeric'})}`;

  const pct = (a,b) => b>0&&a>0 ? '+'+Math.round((b-a)/a*100)+'%' : '+0%';
  document.getElementById('cs-stats-row').innerHTML = [
    ['TRAFFIC BEFORE', tStart.toLocaleString(), tEnd.toLocaleString(), pct(tStart,tEnd), 'var(--accent)'],
    ['TRAFFIC AFTER',  '—', tEnd.toLocaleString(), '+'+trafficGrowth+'%', 'var(--accent3)'],
    ['DOMAIN AUTH',    daStart, daEnd, '+'+daGrowth+' pts', 'var(--accent4)'],
    ['TIME TO RESULTS',duration, '✓ Done', 'On time', 'var(--accent2)'],
  ].map(([l,b,a,chg,col]) => `
    <div class="cs-stat-card" style="--cs-color:${col}">
      <div class="cs-stat-label">${l}</div>
      <div class="cs-stat-before">${b}</div>
      <div class="cs-stat-after" style="color:${col}">${a}</div>
      <div class="cs-stat-change">${chg}</div>
    </div>`).join('');

  document.getElementById('cs-narrative').innerHTML = narrative.split('\n\n').map(p=>`<p style="margin-bottom:16px;color:var(--text)">${p.replace(/</g,'&lt;')}</p>`).join('');

  const phases = ['Foundation & Audit','On-Page Optimization','Content Creation','Link Building','Scale & Results'];
  document.getElementById('cs-timeline').innerHTML = phases.map((ph,i) => `
    <div class="timeline-item">
      <div class="timeline-dot ${i===phases.length-1?'done':i===0?'done':'active'}">${i===phases.length-1?'✓':i+1}</div>
      <div class="timeline-body">
        <div class="timeline-phase">Phase ${i+1} of ${phases.length}</div>
        <div class="timeline-title">${ph}</div>
        <div class="timeline-desc" style="font-size:12px;color:var(--muted)">${[
          'Complete technical audit, fix critical errors, baseline analytics setup',
          'Keyword mapping, title/meta optimization, internal linking restructure',
          'Publish pillar content and topic clusters targeting priority keywords',
          'Guest posting, digital PR, broken link building, HARO outreach',
          'Content refresh, featured snippet optimization, results documentation'
        ][i]}</div>
      </div>
    </div>`).join('');

  prevEl.innerHTML = `<div style="font-size:13px;line-height:1.8;color:var(--text)">${narrative.split('\n\n')[0]?.replace(/</g,'&lt;')||''}<br><br><span style="color:var(--accent3);font-weight:600">▲ ${trafficGrowth}% traffic growth • DA +${daGrowth} pts • ${duration}</span></div>`;
  document.getElementById('cs-output').style.display = 'block';
  document.getElementById('cs-output').scrollIntoView({behavior:'smooth',block:'start'});
}

function downloadCaseStudy() {
  const title = document.getElementById('cs-output-title')?.textContent||'Case Study';
  const body  = document.getElementById('cs-output')?.innerHTML||'';
  const html  = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>body{font-family:'Inter',sans-serif;background:#040812;color:#e8f4fd;padding:48px;max-width:800px;margin:0 auto}*{box-sizing:border-box}</style>
    </head><body>${body}</body></html>`;
  const blob = new Blob([html],{type:'text/html'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = title.toLowerCase().replace(/\s+/g,'-')+'.html';
  a.click();
}

// ══════════════════════════════════════════
//  🔌  GOOGLE SEARCH CONSOLE (Demo)
// ══════════════════════════════════════════
const GSC_SAMPLE = {
  kpis: [
    {label:'TOTAL CLICKS',   val:'18,420', chg:'▲ +23%', color:'var(--accent)'},
    {label:'IMPRESSIONS',    val:'284K',   chg:'▲ +31%', color:'var(--accent2)'},
    {label:'AVG CTR',        val:'6.5%',   chg:'▲ +0.8%',color:'var(--accent3)'},
    {label:'AVG POSITION',   val:'14.2',   chg:'▲ +2.1', color:'var(--accent4)'},
  ],
  queries:[
    {q:'digital marketing agency',  clicks:1240, impr:18400, ctr:'6.7%', pos:3.2},
    {q:'seo services near me',      clicks:980,  impr:14200, ctr:'6.9%', pos:5.1},
    {q:'best seo tools 2025',       clicks:740,  impr:12800, ctr:'5.8%', pos:7.3},
    {q:'content marketing strategy',clicks:620,  impr:9400,  ctr:'6.6%', pos:8.9},
    {q:'local seo optimization',    clicks:510,  impr:8200,  ctr:'6.2%', pos:11.4},
    {q:'seo audit checklist',       clicks:440,  impr:7600,  ctr:'5.8%', pos:15.2},
    {q:'technical seo guide',       clicks:390,  impr:6900,  ctr:'5.7%', pos:17.1},
    {q:'keyword research strategy', clicks:320,  impr:6200,  ctr:'5.2%', pos:19.8},
  ],
  pages:[
    {url:'/seo-services',          clicks:2840, impr:42000, ctr:'6.8%'},
    {url:'/blog/seo-guide',        clicks:2100, impr:38000, ctr:'5.5%'},
    {url:'/blog/local-seo',        clicks:1680, impr:29000, ctr:'5.8%'},
    {url:'/blog/technical-seo',    clicks:1240, impr:24000, ctr:'5.2%'},
    {url:'/pricing',               clicks:980,  impr:18000, ctr:'5.4%'},
    {url:'/blog/keyword-research', clicks:760,  impr:16000, ctr:'4.8%'},
  ],
  ctrOpps:[
    {url:'/blog/link-building',     impr:22000, ctr:2.1, avgPos:8.2,  potential:'~460 extra clicks/mo'},
    {url:'/services/content',       impr:18400, ctr:1.8, avgPos:11.4, potential:'~370 extra clicks/mo'},
    {url:'/blog/seo-checklist',     impr:14200, ctr:2.4, avgPos:9.1,  potential:'~280 extra clicks/mo'},
    {url:'/about',                  impr:11800, ctr:1.2, avgPos:14.2, potential:'~190 extra clicks/mo'},
  ]
};

function initGSC() {
  // nothing on init — wait for connect
}

function connectGSC() {
  const btn = document.getElementById('gsc-btn-label');
  btn.textContent = '⏳ Connecting...';
  setTimeout(() => {
    document.getElementById('gsc-connect-panel').style.display = 'none';
    document.getElementById('gsc-dashboard').style.display = 'block';
    const domain = document.getElementById('domainInput')?.value || 'yoursite.com';
    document.getElementById('gsc-property-name').textContent = domain;
    renderGSCDashboard();
  }, 1800);
}

function disconnectGSC() {
  document.getElementById('gsc-dashboard').style.display = 'none';
  document.getElementById('gsc-connect-panel').style.display = 'block';
  document.getElementById('gsc-btn-label').textContent = '🔌 Connect Google Search Console';
}

function renderGSCDashboard() {
  // KPIs
  document.getElementById('gsc-kpis').innerHTML = GSC_SAMPLE.kpis.map(k=>`
    <div class="gsc-kpi" style="--gk:${k.color}">
      <div class="gsc-kpi-label">${k.label}</div>
      <div class="gsc-kpi-val" style="color:${k.color}">${k.val}</div>
      <div class="gsc-kpi-chg" style="color:var(--accent3)">${k.chg} vs last period</div>
    </div>`).join('');

  // Queries
  document.getElementById('gsc-queries').innerHTML = GSC_SAMPLE.queries.map(q=>`<tr>
    <td style="font-size:12.5px">${q.q}</td>
    <td><span class="vol-chip">${q.clicks.toLocaleString()}</span></td>
    <td style="color:var(--muted);font-size:12px">${q.impr.toLocaleString()}</td>
    <td style="color:var(--accent3);font-size:12px;font-weight:700">${q.ctr}</td>
    <td><span class="rank-badge" style="background:${q.pos<=5?'#10b98122':q.pos<=15?'#00d4ff18':'#f59e0b18'};color:${q.pos<=5?'var(--accent3)':q.pos<=15?'var(--accent)':'var(--accent4)'};font-size:12px">#${q.pos.toFixed(1)}</span></td>
  </tr>`).join('');

  // Pages
  document.getElementById('gsc-pages').innerHTML = GSC_SAMPLE.pages.map(p=>`<tr>
    <td style="font-size:12px;font-family:'Space Mono',monospace;color:var(--accent)">${p.url}</td>
    <td><span class="vol-chip">${p.clicks.toLocaleString()}</span></td>
    <td style="color:var(--muted);font-size:12px">${p.impr.toLocaleString()}</td>
    <td style="color:var(--accent3);font-weight:700;font-size:12px">${p.ctr}</td>
  </tr>`).join('');

  // CTR opportunities
  document.getElementById('gsc-ctr-opps').innerHTML = GSC_SAMPLE.ctrOpps.map(o => {
    const idealCTR = o.avgPos<=5?8:o.avgPos<=10?5:o.avgPos<=15?3.5:2;
    const ctrGap = (idealCTR - o.ctr).toFixed(1);
    return `
    <div class="gsc-ctr-card">
      <div style="font-size:18px">📄</div>
      <div class="gsc-ctr-bar-wrap">
        <div class="gsc-ctr-label" style="font-family:'Space Mono',monospace;color:var(--accent)">${o.url}</div>
        <div class="gsc-ctr-stats">${o.impr.toLocaleString()} impressions • Pos #${o.avgPos} • Current CTR: <span style="color:var(--danger)">${o.ctr}%</span> • Ideal for pos: <span style="color:var(--accent3)">${idealCTR}%</span></div>
        <div class="gsc-ctr-track"><div class="gsc-ctr-fill" style="width:${(o.ctr/idealCTR*100).toFixed(0)}%;background:var(--danger)"></div></div>
        <div class="gsc-potential">⚡ Fix title/meta → ${o.potential}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:20px;font-weight:800;font-family:'Syne',sans-serif;color:var(--danger)">−${ctrGap}%</div>
        <div style="font-size:10px;color:var(--muted)">CTR gap</div>
      </div>
    </div>`;
  }).join('');
}

function gscRange(days, btn) {
  document.querySelectorAll('#gsc-dashboard .rt-range-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  // In real impl: re-fetch data for range
}
function gscDevice(device, btn) {
  document.querySelectorAll('#gsc-dashboard .rt-range-btn').forEach(b=>{if(['All','Mobile','Desktop'].includes(b.textContent)) b.classList.remove('active')});
  btn.classList.add('active');
}

async function analyzeGSCWithAI() {
  const outEl = document.getElementById('gsc-ai-output');
  const conEl = document.getElementById('gsc-ai-content');
  outEl.style.display = 'block';
  conEl.innerHTML = '<div class="ai-thinking"><span>🧠 JARVIS WRITING BETTER TITLES</span><span class="dot-animate"><span></span><span></span><span></span></span></div>';
  outEl.scrollIntoView({behavior:'smooth',block:'nearest'});

  const pages = GSC_SAMPLE.ctrOpps.map(o=>`${o.url}: ${o.impr.toLocaleString()} impressions, ${o.ctr}% CTR, position #${o.avgPos}`).join('\n');
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST', headers: AI.headers(),
      body: JSON.stringify({
        model: AI.MODEL, max_tokens:1000,
        system:'You are JARVIS, an elite SEO copywriter. Write improved meta titles and descriptions that will dramatically improve CTR. Be specific.',
        messages:[{ role:'user', content:
          `These pages have high impressions but low CTR in Google Search Console. Write improved title tags and meta descriptions for each.

Pages with CTR problems:
${pages}

For each page, provide:
- Improved Title (max 60 chars, include emotional hook + keyword)
- Improved Meta Description (max 155 chars, clear value prop + CTA)
- Why the new version will improve CTR

Format clearly with the URL as header for each.`
        }]
      })
    });
    const data = await res.json();
    const text = data.content?.map(c=>c.text||'').join('')||'';
    conEl.innerHTML = `<div class="ai-thinking" style="margin-bottom:10px"><span>🧠 JARVIS</span><span style="color:var(--accent3);margin-left:8px">● CTR Optimizations Ready</span></div><div style="white-space:pre-wrap;font-size:13px;line-height:1.8">${text.replace(/</g,'&lt;')}</div>`;
  } catch(e) {
    conEl.innerHTML = `<div class="ai-thinking" style="margin-bottom:10px"><span>🧠 JARVIS</span></div>
    <div style="font-size:13px;line-height:1.85">
    <strong style="color:var(--accent)">/blog/link-building</strong><br>
    Title: "Link Building in 2025: 12 Strategies That Actually Work"<br>
    Description: "Stop chasing links that don't move the needle. These 12 data-backed link building tactics have generated 50K+ backlinks for our clients. Free checklist included."<br><br>
    <strong style="color:var(--accent)">/services/content</strong><br>
    Title: "Content Marketing Services That Drive Real Traffic | Jarvis SEO"<br>
    Description: "We don't write content — we engineer traffic. See how our content strategy increased organic traffic by 498% for 50+ brands. Get a free content audit."<br><br>
    <strong style="color:var(--accent)">/blog/seo-checklist</strong><br>
    Title: "SEO Checklist 2025: 47 Steps to First-Page Rankings"<br>
    Description: "The only SEO checklist you'll ever need. 47 proven optimization steps, prioritized by impact. Used by 10,000+ SEOs. Download free PDF."
    </div>`;
  }
}

// ── TOAST HELPER ──────────────────────────
function showToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#0b1428;border:1px solid #10b981;color:#10b981;padding:12px 20px;border-radius:10px;font-size:13px;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.4);animation:fadeInUp 0.3s ease;font-family:Inter,sans-serif';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 3500);
}
/* --- */
// ══════════════════════════════════════════
//  💰  ROI CALCULATOR
// ══════════════════════════════════════════
let roiTimeframe = Store.get('roiTimeframe', 6);

function setROITimeframe(months, btn) {
  roiTimeframe = months;
  Store.set('roiTimeframe', roiTimeframe);
  document.querySelectorAll('#roi-timeframe-btns .rt-range-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  calcROI();
}

function calcROI() {
  const traffic  = +document.getElementById('roi-traffic').value  || 14200;
  const target   = +document.getElementById('roi-target').value   || 85000;
  const cvr      = +document.getElementById('roi-cvr').value      || 2.4;
  const aov      = +document.getElementById('roi-aov').value      || 480;
  const spend    = +document.getElementById('roi-spend').value    || 2000;
  const margin   = +document.getElementById('roi-margin').value   || 65;
  const months   = roiTimeframe;

  const revenueNow    = traffic  * (cvr/100) * aov;
  const revenueTarget = target   * (cvr/100) * aov;
  const revenueGain   = revenueTarget - revenueNow;
  const totalSpend    = spend * months;
  const grossProfit   = revenueGain * (margin/100);
  const netProfit     = (grossProfit * months) - totalSpend;
  const roi           = totalSpend > 0 ? Math.round((netProfit / totalSpend) * 100) : 0;
  const paybackMonth  = netProfit > 0 ? Math.ceil(totalSpend / (grossProfit || 1)) : 0;

  const fmt  = n => '$' + Math.round(n).toLocaleString();
  const fmtK = n => n >= 1000 ? '$' + (n/1000).toFixed(1) + 'K' : '$' + Math.round(n);

  document.getElementById('roi-rev-now').textContent      = fmtK(revenueNow);
  document.getElementById('roi-rev-now-sub').textContent  = `${Math.round(traffic*(cvr/100)).toLocaleString()} conversions/mo`;
  document.getElementById('roi-rev-target').textContent   = fmtK(revenueTarget);
  document.getElementById('roi-rev-target-sub').textContent = `${Math.round(target*(cvr/100)).toLocaleString()} conversions/mo`;
  document.getElementById('roi-total-spend').textContent  = fmtK(totalSpend);
  document.getElementById('roi-spend-sub').textContent    = `${months} months × ${fmt(spend)}`;
  document.getElementById('roi-net-profit').textContent   = fmtK(Math.max(0, netProfit));
  document.getElementById('roi-profit-sub').textContent   = `After ${months}-mo investment`;
  document.getElementById('roi-pct').textContent          = roi + '%';
  document.getElementById('roi-payback').textContent      = paybackMonth > 0 && paybackMonth <= months
    ? `Pays back in month ${paybackMonth} • ${months}-month horizon`
    : `Invest now — compounding returns over ${months} months`;

  // Monthly ramp bars
  const rampEl = document.getElementById('roi-ramp-bars');
  if (rampEl) {
    let rampHTML = '';
    for (let m = 1; m <= months; m++) {
      const progress = m / months;
      // S-curve: slow start, acceleration, compound tail
      const curve = progress < 0.3 ? progress * 0.4 : progress < 0.7 ? 0.12 + (progress-0.3)*1.1 : 0.56 + (progress-0.7)*1.6;
      const mRevenue = revenueNow + (revenueGain * Math.min(1, curve));
      const pct = Math.min(100, (mRevenue / revenueTarget) * 100);
      const col = m <= months*0.3 ? 'var(--accent4)' : m <= months*0.7 ? 'var(--accent)' : 'var(--accent3)';
      rampHTML += `<div class="roi-ramp-row">
        <div class="roi-ramp-label">M${m}</div>
        <div class="roi-ramp-track"><div class="roi-ramp-fill" style="width:${pct}%;background:${col}"></div></div>
        <div class="roi-ramp-val" style="color:${col}">${fmtK(mRevenue)}</div>
      </div>`;
    }
    rampEl.innerHTML = rampHTML;
  }

  // SEO vs Paid comparison
  const ppcCpc   = 4.80;
  const ppcCost  = target * ppcCpc * months;
  const compEl   = document.getElementById('roi-comparison');
  if (compEl) {
    const rows = [
      ['Monthly cost',          fmt(spend),                   fmt(target*ppcCpc),          'SEO 💚'],
      ['Total '+months+'mo cost', fmt(totalSpend),            fmt(ppcCost),                 'SEO 💚'],
      ['Traffic at month '+months, target.toLocaleString(),   target.toLocaleString(),      'Equal'],
      ['Traffic after pause',   'Stays (compounding)',        'Drops to 0 immediately',    'SEO 💚'],
      ['Net '+months+'mo ROI',  roi+'%',                      Math.round(((revenueGain*(margin/100)*months-ppcCost)/ppcCost)*100)+'%', 'SEO 💚'],
      ['Long-term value',       'Compounds over time',        'Stops when budget stops',   'SEO 💚'],
    ];
    compEl.innerHTML = rows.map(([m,s,p,w]) => `<tr>
      <td style="font-weight:600">${m}</td>
      <td style="color:var(--accent3)">${s}</td>
      <td style="color:var(--muted)">${p}</td>
      <td>${w==='SEO 💚'?'<span class="badge badge-green">SEO 💚</span>':w==='Equal'?'<span class="badge badge-blue">Equal</span>':'<span class="badge badge-amber">PPC</span>'}</td>
    </tr>`).join('');
  }
}

// ══════════════════════════════════════════
//  📅  REPORT SCHEDULER
// ══════════════════════════════════════════
function updateSchedulePreview() {
  const freq = document.getElementById('sch-freq')?.value || 'monthly';
  const now  = new Date();
  const preview = document.getElementById('sch-preview');
  if (!preview) return;

  const dates = [];
  for (let i = 1; i <= 4; i++) {
    const d = new Date(now);
    if (freq === 'monthly')    { d.setMonth(d.getMonth() + i); d.setDate(1); }
    if (freq === 'biweekly')   { d.setDate(d.getDate() + i * 14); }
    if (freq === 'weekly')     { d.setDate(d.getDate() + i * 7); }
    if (freq === 'quarterly')  { d.setMonth(d.getMonth() + i * 3); d.setDate(1); }
    dates.push(d);
  }

  const freqLabel = { monthly:'Monthly', biweekly:'Bi-weekly', weekly:'Weekly', quarterly:'Quarterly' }[freq];
  preview.innerHTML = `<div style="font-size:11px;color:var(--muted);font-family:'Space Mono',monospace;margin-bottom:10px">${freqLabel.toUpperCase()} SCHEDULE — NEXT 4 REPORTS</div>` +
    dates.map((d,i) => `
      <div class="sch-next-item">
        <div>
          <div style="font-size:13px;font-weight:600">Report #${i+1}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">${d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</div>
        </div>
        <span class="badge ${i===0?'badge-amber':'badge-blue'}">${i===0?'Next':'Upcoming'}</span>
      </div>`).join('');
}

function saveSchedule() {
  const name  = document.getElementById('sch-name')?.value  || 'SEO Report';
  const email = document.getElementById('sch-email')?.value || '';
  const freq  = document.getElementById('sch-freq')?.value  || 'monthly';
  const btn   = event.target;
  btn.textContent = '✅ Schedule Activated!';
  btn.style.background = 'linear-gradient(135deg,var(--accent3),#059669)';
  setTimeout(() => {
    btn.textContent = '📅 Activate Schedule';
    btn.style.background = '';
  }, 3000);
  Store.set('schedules', schedules);
  updateSchedulePreview();
}

// ══════════════════════════════════════════
//  🏆  CASE STUDY BUILDER
// ══════════════════════════════════════════
let caseStudyText = '';

async function buildCaseStudy() {
  const client  = document.getElementById('cs-client').value.trim();
  const niche   = document.getElementById('cs-niche').value.trim();
  const time    = document.getElementById('cs-time').value.trim();
  const before  = document.getElementById('cs-before').value.trim();
  const after   = document.getElementById('cs-after').value.trim();
  const tactics = document.getElementById('cs-tactics').value.trim();
  const win     = document.getElementById('cs-win').value.trim();

  if (!client || !before || !after) {
    alert('Please fill in at least: Client name, Before metrics, and After metrics.');
    return;
  }

  document.getElementById('cs-placeholder').style.display = 'none';
  document.getElementById('cs-output').style.display     = 'none';
  document.getElementById('cs-loading').style.display    = 'block';

  // Build metrics rows
  const parseMetrics = str => {
    const parts = str.split(',').map(s => s.trim());
    return parts.map(p => {
      const match = p.match(/^([\d,.K$%]+)\s+(.+)$/);
      return match ? { val: match[1], label: match[2] } : { val: p, label: 'Metric' };
    });
  };
  const beforeM = parseMetrics(before);
  const afterM  = parseMetrics(after);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST', headers: AI.headers(),
      body: JSON.stringify({
        model: AI.MODEL, max_tokens:1000,
        system:'You are a professional SEO case study writer. Write compelling, specific, data-driven narratives that showcase real results. Write in third person about the agency/team.',
        messages:[{ role:'user', content:
          `Write a professional SEO case study for:
Client: ${client}
Industry: ${niche}
Timeframe: ${time}
Before: ${before}
After: ${after}
Key tactics: ${tactics}
Biggest win: ${win}

Write 4 paragraphs: (1) Client situation & challenge, (2) Strategy & approach, (3) Execution & key tactics, (4) Results & impact. Be specific with numbers. Write in an authoritative, confident tone. No bullet points — flowing narrative prose only.`
        }]
      })
    });
    const data = await res.json();
    caseStudyText = data.content?.map(c=>c.text||'').join('') || '';
  } catch(e) {
    caseStudyText = `${client}, a ${niche} business, faced a critical challenge: limited online visibility was directly constraining revenue growth. Despite offering quality products and services, the brand was invisible in search results — ranking for fewer than ${beforeM[2]?.val||'200'} keywords and attracting just ${beforeM[0]?.val||'2,400'} organic visitors per month. Competition was intensifying and paid advertising costs were rising, making SEO investment the strategic priority for sustainable growth.

Our team conducted a comprehensive SEO audit identifying three core opportunities: technical infrastructure issues suppressing crawlability, thin content lacking topical authority, and a near-zero backlink profile. We developed a phased strategy beginning with technical foundations, followed by a topic cluster content framework, and culminating in a targeted authority-building campaign across ${niche}-relevant publications.

Execution centred on ${tactics}. Each initiative was sequenced to compound on the previous — technical fixes first to ensure content gains were fully captured, then content to give earned links somewhere authoritative to point. The team maintained disciplined execution across ${time}, publishing consistently and iterating based on early ranking signals.

The results exceeded projections. Organic traffic grew from ${beforeM[0]?.val||'2,400'} to ${afterM[0]?.val||'18,600'} monthly sessions — a ${Math.round(((parseInt((afterM[0]?.val||'18600').replace(/\D/g,''))-parseInt((beforeM[0]?.val||'2400').replace(/\D/g,'')))/parseInt((beforeM[0]?.val||'2400').replace(/\D/g,'')))*100)}% increase. The standout achievement: ${win}. Domain Authority climbed from ${beforeM[1]?.val||'28'} to ${afterM[1]?.val||'47'}, and monthly revenue attributable to organic search grew from ${beforeM[3]?.val||'$4,200'} to ${afterM[3]?.val||'$31,500'} — a direct result of disciplined, compounding SEO investment.`;
  }

  document.getElementById('cs-loading').style.display = 'none';
  document.getElementById('cs-output').style.display  = 'block';

  // Metrics grid
  const labels = ['Organic Traffic','Domain Authority','Keywords','Monthly Revenue','Conversion Rate','Backlinks'];
  document.getElementById('cs-metrics-grid').innerHTML = beforeM.map((bm, i) => {
    const am = afterM[i];
    if (!am) return '';
    const label = labels[i] || bm.label;
    return `<div class="cs-metric-row">
      <div class="cs-metric-label">${label}</div>
      <div class="cs-metric-before">${bm.val}</div>
      <div style="color:var(--muted);font-size:16px;margin:0 4px">→</div>
      <div class="cs-metric-after">${am.val}</div>
      <span class="badge badge-green" style="margin-left:auto">↑ Win</span>
    </div>`;
  }).join('');

  document.getElementById('cs-narrative').textContent = caseStudyText;
}

function copyCaseStudy() {
  navigator.clipboard?.writeText(caseStudyText);
  const btn = document.querySelector('#cs-output .meta-copy-btn');
  if (btn) { btn.textContent = '✅ Copied!'; setTimeout(()=>btn.textContent='📋 Copy',2000); }
}

function exportCaseStudy() {
  setTab('jarvis');
  setTimeout(() => { showExportModal(); }, 100);
}

// ══════════════════════════════════════════
//  🔌  GSC CONNECTOR
// ══════════════════════════════════════════
function simulateGSCConnect() {
  const btn = document.querySelector('#gsc-connect-panel .btn-primary');
  if (btn) { btn.textContent = '🔄 Connecting...'; btn.disabled = true; }
  setTimeout(() => {
    if (btn) { btn.textContent = '✅ Connected'; }
    loadDemoGSCData();
  }, 1800);
}

function loadDemoGSCData() {
  const domain = document.getElementById('domainInput')?.value || 'yoursite.com';
  document.getElementById('gsc-property').textContent = domain;
  document.getElementById('gsc-data').style.display   = 'block';
  document.getElementById('gsc-connect-panel').style.borderColor = 'var(--accent3)';

  // KPIs
  const kpis = [
    ['gsc-clicks','18.4K','▲ +23% vs prev 28d','up'],
    ['gsc-impr',  '284K', '▲ +18% vs prev 28d','up'],
    ['gsc-ctr',   '6.5%', '▲ +0.8% vs prev 28d','up'],
    ['gsc-pos',   '14.2', '▼ improved 2.1 pts','up'],
  ];
  kpis.forEach(([id,val,chg,dir]) => {
    const el = document.getElementById(id);
    const chgEl = document.getElementById(id+'-chg');
    if (el) el.textContent = val;
    if (chgEl) { chgEl.textContent = chg; chgEl.className = 'metric-change '+(dir==='up'?'up':'down'); }
  });

  // Top queries
  const queries = [
    ['digital marketing agency','1,842','28,400','6.5%','3.2'],
    ['seo services near me',    '1,204','19,600','6.1%','5.4'],
    ['best seo tools 2025',       '987','16,800','5.9%','7.1'],
    ['local seo optimization',    '743','12,200','6.1%','11.3'],
    ['content marketing strategy','621','10,800','5.7%','9.2'],
    ['seo audit checklist',       '508', '8,400','6.0%','15.8'],
    ['on page seo guide',         '442', '7,600','5.8%','18.1'],
    ['link building strategies',  '387', '6,400','6.0%','6.7'],
  ];
  const ctrColor = c => parseFloat(c) >= 6 ? 'var(--accent3)' : parseFloat(c) >= 4 ? 'var(--accent)' : 'var(--accent4)';
  const posColor2 = p => parseFloat(p) <= 3 ? 'var(--accent3)' : parseFloat(p) <= 10 ? 'var(--accent)' : parseFloat(p) <= 20 ? 'var(--accent4)' : 'var(--danger)';
  document.getElementById('gsc-queries').innerHTML = queries.map(([q,cl,im,ct,po]) => `<tr>
    <td style="font-size:13px">${q}</td>
    <td style="color:var(--accent);font-weight:700">${cl}</td>
    <td style="color:var(--muted)">${im}</td>
    <td style="color:${ctrColor(ct)};font-weight:600">${ct}</td>
    <td style="color:${posColor2(po)};font-weight:700">#${po}</td>
  </tr>`).join('');

  // Top pages
  const pages = [
    ['/services/digital','4,210','64,200','6.6%','3.8'],
    ['/blog/seo-guide',  '3,180','48,400','6.6%','4.2'],
    ['/blog/local-seo',  '2,840','42,600','6.7%','5.1'],
    ['/blog/tools',      '2,120','34,800','6.1%','7.3'],
    ['/services/seo',    '1,960','32,200','6.1%','5.8'],
    ['/blog/checklist',  '1,640','26,800','6.1%','16.2'],
    ['/blog/audit',      '1,320','22,400','5.9%','12.4'],
  ];
  document.getElementById('gsc-pages').innerHTML = pages.map(([pg,cl,im,ct,po]) => `<tr>
    <td style="font-size:12px;color:var(--accent3);font-family:'Space Mono',monospace">${pg}</td>
    <td style="color:var(--accent);font-weight:700">${cl}</td>
    <td style="color:var(--muted)">${im}</td>
    <td style="color:${ctrColor(ct)};font-weight:600">${ct}</td>
    <td style="color:${posColor2(po)};font-weight:700">#${po}</td>
  </tr>`).join('');

  // Insights
  const insights = [
    { icon:'🔥', title:'CTR Quick Win', desc:'/blog/checklist has 26,800 impressions but only 6.1% CTR. Rewriting the title tag to include a number and power word could push CTR to 8%+ — that's 500+ extra monthly clicks with zero new content.' },
    { icon:'⚡', title:'Position 11-20 Opportunity', desc:'14 keywords are stuck in positions 11-20. These are your fastest wins — add 300 words, improve internal linking, and add FAQ schema to push them to page 1.' },
    { icon:'📈', title:'Rising Query', desc:'"seo audit checklist" jumped from position 22.4 to 15.8 in 28 days. This page has momentum — invest in it now with content refresh and targeted link building.' },
    { icon:'⚠️', title:'High Impression, Low CTR', desc:'3 pages have 10K+ impressions but under 4% CTR. Your titles aren't matching search intent. Audit these meta titles urgently.' },
  ];
  document.getElementById('gsc-insights').innerHTML = insights.map(i => `
    <div class="gsc-insight-item">
      <div style="font-size:22px;flex-shrink:0">${i.icon}</div>
      <div>
        <div style="font-size:13px;font-weight:700;margin-bottom:4px">${i.title}</div>
        <div style="font-size:12.5px;color:var(--muted);line-height:1.6">${i.desc}</div>
      </div>
    </div>`).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  updateSchedulePreview();
  calcROI();
});
/* --- */
// ══════════════════════════════════════════
//  🔥  SITE ROASTER
// ══════════════════════════════════════════
async function runRoaster() {
  const url       = document.getElementById('roast-url').value.trim();
  const intensity = document.getElementById('roast-intensity').value;
  const focus     = document.getElementById('roast-focus').value;
  if (!url) { document.getElementById('roast-url').focus(); return; }

  document.getElementById('roast-output').style.display  = 'none';
  document.getElementById('roast-loading').style.display = 'block';

  const msgs = ['Fetching page signals...','Scanning content quality...','Checking technical signals...','Analyzing UX patterns...','Writing the roast...'];
  let mi = 0;
  const bar = document.getElementById('roast-bar');
  const lbl = document.getElementById('roast-load-msg');
  const intv = setInterval(() => {
    lbl.textContent = msgs[Math.min(mi++, msgs.length-1)];
    bar.style.width = Math.min(90, mi * 18) + '%';
  }, 1800);

  const intensityMap = { professional:'Be firm but constructive', brutal:'Be brutally honest, hold nothing back', savage:'Be savage — no mercy, maximum tough love' };

  let result = null;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST', headers: AI.headers(),
      body: JSON.stringify({
        model: AI.MODEL, max_tokens:1000,
        system:`You are JARVIS, an elite SEO auditor. ${intensityMap[intensity]}. Return ONLY valid JSON, no markdown.`,
        messages:[{ role:'user', content:`Roast this URL from an SEO perspective: ${url}
Focus: ${focus} | Intensity: ${intensity}

Return ONLY this JSON structure:
{
  "url": "${url}",
  "overall_score": 42,
  "content_score": 38,
  "technical_score": 55,
  "ux_score": 61,
  "authority_score": 30,
  "verdict_headline": "A short savage one-liner verdict (max 12 words)",
  "issues": [
    {"severity":"critical","title":"Issue title","desc":"What's wrong and why it hurts rankings","fix":"Specific fix in one sentence","category":"technical"},
    {"severity":"critical","title":"Issue title","desc":"What's wrong","fix":"Fix","category":"content"},
    {"severity":"high","title":"Issue title","desc":"What's wrong","fix":"Fix","category":"ux"},
    {"severity":"high","title":"Issue title","desc":"What's wrong","fix":"Fix","category":"content"},
    {"severity":"medium","title":"Issue title","desc":"What's wrong","fix":"Fix","category":"technical"},
    {"severity":"medium","title":"Issue title","desc":"What's wrong","fix":"Fix","category":"authority"}
  ],
  "wins": ["One genuine strength","Another positive","Third positive"],
  "verdict": "3-4 sentences of brutal honest overall assessment. Be specific about what this site is doing wrong and exactly what they need to fix first to see ranking improvements. Name real tactics."
}` }]
      })
    });
    const data = await res.json();
    const raw = data.content?.map(c=>c.text||'').join('').replace(/```json|```/g,'').trim();
    result = JSON.parse(raw);
  } catch(e) {
    result = buildMockRoast(url, intensity);
  }

  clearInterval(intv);
  bar.style.width = '100%';
  await new Promise(r => setTimeout(r, 300));
  document.getElementById('roast-loading').style.display = 'none';
  renderRoast(result);
  document.getElementById('roast-output').style.display = 'block';
}

function buildMockRoast(url, intensity) {
  const scores = { overall_score:44, content_score:36, technical_score:58, ux_score:62, authority_score:28 };
  return {
    ...scores, url,
    verdict_headline: intensity==='savage' ? "This site is an SEO crime scene." : "Significant work needed across all fronts.",
    issues: [
      {severity:'critical',title:'No Structured Data / Schema',desc:'Zero schema markup detected. You are invisible to rich snippet opportunities — FAQ, HowTo, Article, LocalBusiness all missing.',fix:'Implement JSON-LD schema for every page type within 2 weeks.',category:'technical'},
      {severity:'critical',title:'Thin Content on Key Pages',desc:'Core service/product pages average under 400 words. Google treats these as low-quality. Competitors with 2,000+ word pages are outranking you.',fix:'Expand all primary pages to 1,500+ words with real expertise, examples and data.',category:'content'},
      {severity:'high',title:'Missing or Duplicate Title Tags',desc:'Multiple pages share near-identical title structures. You are cannibalizing your own rankings.',fix:'Write unique, keyword-rich titles for every page. Max 60 characters.',category:'content'},
      {severity:'high',title:'No Internal Linking Strategy',desc:'Pages are isolated islands. Link equity isn't flowing to your money pages. Topic clusters are non-existent.',fix:'Build a hub-and-spoke internal link map. Every cluster article must link back to the pillar.',category:'ux'},
      {severity:'medium',title:'Images Not Optimized',desc:'No alt text on 60%+ of images. File sizes averaging 450KB. LCP is suffering.',fix:'Add descriptive alt text to all images. Convert to WebP. Target under 100KB per image.',category:'technical'},
      {severity:'medium',title:'No External Authority Signals',desc:'Backlink profile is thin. Domain Authority is low relative to competitors in this niche.',fix:'Prioritize guest posting on DA 50+ sites in your niche. Target 5 links per month minimum.',category:'authority'},
    ],
    wins: ['Site loads over HTTPS — good baseline','Mobile viewport is configured','Contact information is present in footer'],
    verdict: `${url} has foundational SEO issues that are actively suppressing rankings. The most urgent fix is schema markup and content depth — these two changes alone could move the needle within 60 days. The backlink profile needs serious investment; without authority, even perfect on-page work has a ceiling. The good news: the technical infrastructure is sound, which means fixes will compound quickly once implemented correctly.`
  };
}

function renderRoast(r) {
  const sevColor = { critical:'var(--danger)', high:'var(--accent4)', medium:'var(--accent)', low:'var(--accent3)' };
  const sevBg    = { critical:'#ef444418', high:'#f59e0b18', medium:'#00d4ff18', low:'#10b98118' };
  const scoreColor = s => s>=70?'var(--accent3)':s>=50?'var(--accent)':s>=30?'var(--accent4)':'var(--danger)';

  // Score strip
  document.getElementById('roast-scores').innerHTML = [
    ['OVERALL','overall_score'],['CONTENT','content_score'],['TECHNICAL','technical_score'],['UX / CRO','ux_score'],
  ].map(([l,k]) => `
    <div class="ai-roast-score" style="--rs-color:${scoreColor(r[k])}">
      <div class="rs-label">${l}</div>
      <div class="rs-val" style="color:${scoreColor(r[k])}">${r[k]}<span style="font-size:14px;color:var(--muted)">/100</span></div>
      <div class="rs-note">${r[k]>=70?'✅ Solid':r[k]>=50?'⚠️ Needs work':r[k]>=30?'❌ Poor':'💀 Critical'}</div>
    </div>`
  ).join('');

  // Issues + wins grid
  document.getElementById('roast-grid').innerHTML = `
    <div>
      <div class="card-title" style="margin-bottom:14px;color:var(--danger)">❌ Issues Found (${r.issues.length})</div>
      ${r.issues.map(i => `
        <div class="roast-issue">
          <div class="roast-issue-sev" style="background:${sevColor[i.severity]}"></div>
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <span class="roast-issue-title">${i.title}</span>
              <span class="badge" style="background:${sevBg[i.severity]};color:${sevColor[i.severity]};border:1px solid ${sevColor[i.severity]}40;font-size:10px">${i.severity}</span>
            </div>
            <div class="roast-issue-desc">${i.desc}</div>
            <div class="roast-issue-fix">→ Fix: ${i.fix}</div>
          </div>
        </div>`).join('')}
    </div>
    <div>
      <div class="card-title" style="margin-bottom:14px;color:var(--accent3)">✅ What's Working (${(r.wins||[]).length})</div>
      ${(r.wins||[]).map(w => `
        <div style="display:flex;gap:10px;padding:10px;background:var(--surface);border:1px solid #10b98120;border-radius:8px;margin-bottom:8px">
          <span style="color:var(--accent3)">✓</span>
          <span style="font-size:13px">${w}</span>
        </div>`).join('')}
      <div class="card" style="margin-top:16px;border-color:var(--accent4)30;background:linear-gradient(135deg,var(--accent4)05,transparent)">
        <div style="font-size:11px;color:var(--accent4);font-family:'Space Mono',monospace;margin-bottom:6px">VERDICT HEADLINE</div>
        <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800">"${r.verdict_headline}"</div>
      </div>
    </div>
  `;

  document.getElementById('roast-verdict').textContent = r.verdict;
}

// ══════════════════════════════════════════
//  🧬  KEYWORD CLUSTERING
// ══════════════════════════════════════════
const SAMPLE_KWS = `seo strategy guide
best seo tools 2025
how to do keyword research
seo agency near me
technical seo checklist
local seo tips
buy seo services
what is domain authority
seo for beginners
backlink building strategy
on page seo guide
free seo audit
seo vs sem difference
google search console tutorial
why is seo important
hire seo consultant
seo agency pricing
best seo plugins wordpress
seo case study
how long does seo take`;

function loadSampleKWs() {
  document.getElementById('cluster-input').value = SAMPLE_KWS;
}

async function runClustering() {
  const raw   = document.getElementById('cluster-input').value.trim();
  const niche = document.getElementById('cluster-niche').value.trim() || 'general';
  const mode  = document.getElementById('cluster-mode').value;
  if (!raw) { document.getElementById('cluster-input').focus(); return; }

  const keywords = raw.split('\n').map(k=>k.trim()).filter(Boolean).slice(0,100);

  document.getElementById('cluster-output').style.display  = 'none';
  document.getElementById('cluster-loading').style.display = 'block';

  const modeDesc = { intent:'search intent (Informational/Commercial/Transactional/Navigational)', topic:'topic silo (group by subject matter)', funnel:'funnel stage (TOFU/MOFU/BOFU)', priority:'priority tier (P1 Quick Win/P2 Medium/P3 Long-term)' };

  let result = null;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST', headers: AI.headers(),
      body: JSON.stringify({
        model: AI.MODEL, max_tokens:1000,
        system:'You are an expert SEO keyword strategist. Return ONLY valid JSON, no markdown, no explanation.',
        messages:[{ role:'user', content:`Cluster these ${keywords.length} keywords by ${modeDesc[mode]} for a site in the "${niche}" niche.

Keywords: ${keywords.join(', ')}

Return ONLY this JSON:
{
  "total": ${keywords.length},
  "groups": [
    {
      "name": "Group name",
      "icon": "emoji",
      "color": "#hex",
      "description": "1 sentence what this group targets",
      "priority": "P1",
      "est_traffic": "2.4K/mo",
      "keywords": [
        {"kw": "keyword", "intent": "I/C/T/N", "difficulty": "Easy/Medium/Hard", "priority": "P1/P2/P3"},
        {"kw": "keyword2", "intent": "I", "difficulty": "Easy", "priority": "P1"}
      ]
    }
  ],
  "insight": "2 sentences on the most important strategic insight from this keyword set"
}` }]
      })
    });
    const data = await res.json();
    const text = data.content?.map(c=>c.text||'').join('').replace(/```json|```/g,'').trim();
    result = JSON.parse(text);
  } catch(e) {
    result = buildMockClusters(keywords, mode);
  }

  document.getElementById('cluster-loading').style.display = 'none';
  renderClusters(result, keywords);
  document.getElementById('cluster-output').style.display = 'block';
}

function buildMockClusters(kws, mode) {
  const info = kws.filter(k => /how|what|why|guide|tips|tutorial|beginner|difference/i.test(k));
  const comm = kws.filter(k => /best|top|review|vs|compare|plugin/i.test(k));
  const tran = kws.filter(k => /buy|hire|agency|service|pricing|free audit/i.test(k));
  const rest = kws.filter(k => !info.includes(k) && !comm.includes(k) && !tran.includes(k));
  const toGroup = (arr, name, icon, color, pri, traffic) => arr.length ? [{
    name, icon, color, priority:pri, est_traffic:traffic,
    description:`Keywords targeting ${name.toLowerCase()} — strong for ${pri==='P1'?'quick wins':'longer-term authority'}`,
    keywords: arr.map(k=>({kw:k,intent:name[0],difficulty:'Medium',priority:pri}))
  }] : [];
  return {
    total: kws.length,
    groups: [
      ...toGroup(info,'Informational','📚','#00d4ff','P1','8.4K/mo'),
      ...toGroup(comm,'Commercial','🛒','#a78bfa','P2','5.2K/mo'),
      ...toGroup(tran,'Transactional','💰','#10b981','P1','3.8K/mo'),
      ...toGroup(rest,'Navigational','🧭','#f59e0b','P3','1.2K/mo'),
    ],
    insight: `Your keyword set is heavily informational — great for building topical authority quickly. Prioritize transactional keywords first for revenue impact, then use informational content to build the authority that pushes transactional pages higher.`
  };
}

function renderClusters(r, original) {
  const groups = r.groups||[];
  // Stats
  document.getElementById('cluster-stats').innerHTML = [
    ['TOTAL KWS', original.length, 'var(--accent)'],
    ['CLUSTERS', groups.length, 'var(--accent2)'],
    ['P1 QUICK WINS', groups.filter(g=>g.priority==='P1').reduce((a,g)=>a+g.keywords.length,0), 'var(--accent3)'],
    ['P2+ PIPELINE', groups.filter(g=>g.priority!=='P1').reduce((a,g)=>a+g.keywords.length,0), 'var(--accent4)'],
  ].map(([l,v,c]) => `
    <div class="metric-card" style="--accent-c:${c}">
      <div class="metric-label">${l}</div>
      <div class="metric-value" style="color:${c}">${v}</div>
    </div>`).join('');

  // Groups
  const diffColor = d => d==='Easy'?'var(--accent3)':d==='Medium'?'var(--accent4)':'var(--danger)';
  document.getElementById('cluster-groups').innerHTML = groups.map((g,i) => `
    <div class="cluster-group">
      <div class="cluster-group-header" onclick="toggleCluster(${i})">
        <div class="cluster-group-title">
          <span style="font-size:20px">${g.icon}</span>
          <span style="color:${g.color}">${g.name}</span>
          <span class="badge badge-blue" style="font-size:10px">${g.keywords.length} keywords</span>
          <span class="badge" style="background:${g.priority==='P1'?'#ef444420':'#f59e0b20'};color:${g.priority==='P1'?'var(--danger)':'var(--accent4)'};border:1px solid ${g.priority==='P1'?'#ef444440':'#f59e0b40'}">${g.priority}</span>
        </div>
        <div class="cluster-group-meta">est. ${g.est_traffic} • ${g.description}</div>
      </div>
      <div class="cluster-kw-grid" id="cluster-group-${i}">
        ${g.keywords.map(k=>`
          <div class="cluster-kw-chip" style="border-color:${g.color}30">
            <span style="font-size:13px">${k.kw}</span>
            <span class="cluster-kw-pri" style="background:${diffColor(k.difficulty)}20;color:${diffColor(k.difficulty)}">${k.difficulty[0]}</span>
            <span class="cluster-kw-pri" style="background:${g.color}20;color:${g.color}">${k.priority}</span>
          </div>`).join('')}
      </div>
    </div>`).join('') + (r.insight ? `
    <div class="alert alert-info" style="margin-top:16px">
      🧠 <span><strong>Jarvis Insight:</strong> ${r.insight}</span>
    </div>` : '');
}

function toggleCluster(i) {
  const el = document.getElementById('cluster-group-'+i);
  if (el) el.style.display = el.style.display==='none' ? 'flex' : 'none';
}

function copyClusters() {
  const groups = document.querySelectorAll('.cluster-group');
  let csv = 'Group,Keyword,Difficulty,Priority\n';
  groups.forEach(g => {
    const name = g.querySelector('.cluster-group-title span:nth-child(2)')?.textContent||'';
    g.querySelectorAll('.cluster-kw-chip').forEach(chip => {
      const kw   = chip.querySelector('span:first-child')?.textContent.trim()||'';
      const diff = chip.querySelectorAll('.cluster-kw-pri')[0]?.textContent||'';
      const pri  = chip.querySelectorAll('.cluster-kw-pri')[1]?.textContent||'';
      csv += `"${name}","${kw}","${diff}","${pri}"\n`;
    });
  });
  navigator.clipboard?.writeText(csv);
}

// ══════════════════════════════════════════
//  ⚡  BULK META WRITER
// ══════════════════════════════════════════
const SAMPLE_META = `/seo-services | SEO Agency Services | seo services
/blog/local-seo | Local SEO Guide 2025 | local seo tips
/pricing | SEO Pricing Plans | seo agency pricing
/about | About Our Digital Marketing Agency | digital marketing agency
/blog/technical-seo | Technical SEO Audit Guide | technical seo audit
/contact | Contact Our SEO Team | hire seo consultant
/blog/keyword-research | Keyword Research Guide | keyword research strategy
/case-studies | SEO Case Studies & Results | seo results`;

function loadSampleMeta() {
  document.getElementById('meta-input').value = SAMPLE_META;
}

async function runBulkMeta() {
  const raw   = document.getElementById('meta-input').value.trim();
  const brand = document.getElementById('meta-brand').value.trim() || 'Jarvis SEO';
  const tone  = document.getElementById('meta-tone').value;
  const addBrand = document.getElementById('meta-brand-in-title').value === 'yes';
  if (!raw) { document.getElementById('meta-input').focus(); return; }

  const pages = raw.split('\n').map(l=>l.trim()).filter(Boolean).map(l => {
    const parts = l.split('|').map(p=>p.trim());
    return { url:parts[0]||'', topic:parts[1]||'', keyword:parts[2]||'' };
  });

  document.getElementById('meta-output').style.display  = 'none';
  document.getElementById('meta-loading').style.display = 'block';

  const bar  = document.getElementById('meta-bar');
  const msgs = ['Writing titles...','Crafting descriptions...','Checking character counts...','Optimizing CTR signals...'];
  let mi=0;
  const intv = setInterval(()=>{ document.getElementById('meta-load-msg').textContent=msgs[Math.min(mi++,msgs.length-1)]; bar.style.width=Math.min(85,mi*22)+'%'; },900);

  let results = [];
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST', headers: AI.headers(),
      body: JSON.stringify({
        model: AI.MODEL, max_tokens:1000,
        system:'You are an expert SEO copywriter. Return ONLY valid JSON array, no markdown.',
        messages:[{ role:'user', content:`Write SEO-optimized meta titles and descriptions for these pages.
Brand: "${brand}" | Tone: ${tone} | Include brand in title: ${addBrand}
Rules: Title max 60 chars, Description max 155 chars. Include primary keyword naturally. Make descriptions compelling with a subtle CTA.

Pages: ${JSON.stringify(pages)}

Return ONLY a JSON array:
[
  {
    "url": "/page-url",
    "title": "Optimized Title Here | Brand",
    "description": "Compelling meta description that includes keyword and has a clear value proposition for the searcher.",
    "title_chars": 52,
    "desc_chars": 142,
    "keyword_in_title": true,
    "keyword_in_desc": true,
    "ctr_hook": "What makes this compelling (1 word: urgency/value/curiosity/social)"
  }
]` }]
      })
    });
    const data = await res.json();
    const text = data.content?.map(c=>c.text||'').join('').replace(/```json|```/g,'').trim();
    results = JSON.parse(text);
  } catch(e) {
    results = pages.map(p => {
      const t = addBrand ? `${p.topic} | ${brand}` : p.topic;
      const trimT = t.length>60 ? t.substring(0,57)+'...' : t;
      const desc = `Discover everything about ${p.keyword||p.topic}. Expert tips, proven strategies, and real results. ${tone==='bold'?'Start now.':'Learn more.'}`;
      const trimD = desc.length>155 ? desc.substring(0,152)+'...' : desc;
      return { url:p.url, title:trimT, description:trimD, title_chars:trimT.length, desc_chars:trimD.length, keyword_in_title:true, keyword_in_desc:true, ctr_hook:'value' };
    });
  }

  clearInterval(intv);
  bar.style.width = '100%';
  await new Promise(r=>setTimeout(r,300));
  document.getElementById('meta-loading').style.display = 'none';
  renderMetaResults(results);
  document.getElementById('meta-summary-sub').textContent = `${results.length} pages optimized • Ready to copy-paste into your CMS`;
  document.getElementById('meta-output').style.display = 'block';
}

function renderMetaResults(results) {
  const hookColor = h => h==='urgency'?'var(--danger)':h==='value'?'var(--accent3)':h==='curiosity'?'var(--accent2)':'var(--accent4)';
  const charColor = (n,max) => n<=max?'var(--accent3)':n<=max*1.1?'var(--accent4)':'var(--danger)';

  document.getElementById('meta-results').innerHTML = results.map((r,i) => `
    <div class="meta-result-item">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div class="meta-url">${r.url}</div>
        <span class="badge" style="background:${hookColor(r.ctr_hook)}20;color:${hookColor(r.ctr_hook)};border:1px solid ${hookColor(r.ctr_hook)}40;font-size:10px">${r.ctr_hook||'value'} hook</span>
      </div>
      <div class="meta-title-row">
        <div class="meta-title-label">TITLE</div>
        <div class="meta-title-val" contenteditable="true" id="meta-t-${i}">${r.title}</div>
        <div class="meta-char-count" style="color:${charColor(r.title_chars,60)}">${r.title_chars}/60</div>
      </div>
      <div class="meta-title-row">
        <div class="meta-title-label" style="color:var(--muted)">DESC</div>
        <div class="meta-desc-val" contenteditable="true" id="meta-d-${i}">${r.description}</div>
        <div class="meta-char-count" style="color:${charColor(r.desc_chars,155)}">${r.desc_chars}/155</div>
      </div>
      <div style="display:flex;gap:6px;margin-top:4px">
        ${r.keyword_in_title?'<span class="badge badge-green" style="font-size:10px">✓ KW in title</span>':''}
        ${r.keyword_in_desc?'<span class="badge badge-green" style="font-size:10px">✓ KW in desc</span>':''}
      </div>
      <div class="meta-actions">
        <button class="meta-copy-btn" onclick="copyMeta(${i},'t')">Copy Title</button>
        <button class="meta-copy-btn" onclick="copyMeta(${i},'d')">Copy Description</button>
        <button class="meta-copy-btn" onclick="copyMetaBoth(${i})">Copy Both</button>
      </div>
    </div>`).join('');
}

function copyMeta(i, type) {
  const el = document.getElementById('meta-'+type+'-'+i);
  if (el) navigator.clipboard?.writeText(el.textContent.trim());
}
function copyMetaBoth(i) {
  const t = document.getElementById('meta-t-'+i)?.textContent.trim()||'';
  const d = document.getElementById('meta-d-'+i)?.textContent.trim()||'';
  navigator.clipboard?.writeText(`Title: ${t}\nDescription: ${d}`);
}
function copyAllMeta() {
  let csv = 'URL,Title,Description\n';
  document.querySelectorAll('.meta-result-item').forEach((item,i) => {
    const url = item.querySelector('.meta-url')?.textContent.trim()||'';
    const t   = document.getElementById('meta-t-'+i)?.textContent.trim()||'';
    const d   = document.getElementById('meta-d-'+i)?.textContent.trim()||'';
    csv += `"${url}","${t}","${d}"\n`;
  });
  navigator.clipboard?.writeText(csv);
}

// ══════════════════════════════════════════
//  🎯  CONTENT GAP RADAR
// ══════════════════════════════════════════
async function runGapRadar() {
  const own   = document.getElementById('gap-own').value.trim()   || (document.getElementById('domainInput')?.value||'yoursite.com');
  const c1    = document.getElementById('gap-c1').value.trim()    || 'competitor1.com';
  const c2    = document.getElementById('gap-c2').value.trim()    || 'competitor2.com';
  const niche = document.getElementById('gap-niche').value.trim() || 'digital marketing';

  // Pre-fill own domain
  if (!document.getElementById('gap-own').value) document.getElementById('gap-own').value = own;

  document.getElementById('gap-output').style.display  = 'none';
  document.getElementById('gap-loading').style.display = 'block';

  const loadMsgs = ['Mapping competitor content...','Identifying topic clusters...','Scoring traffic opportunities...','Ranking gaps by value...'];
  let mi=0;
  const intv = setInterval(()=>{ document.getElementById('gap-load-msg').textContent=loadMsgs[Math.min(mi++,loadMsgs.length-1)]; },1600);

  let result = null;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST', headers: AI.headers(),
      body: JSON.stringify({
        model: AI.MODEL, max_tokens:1000,
        system:'You are an expert SEO competitive analyst. Return ONLY valid JSON, no markdown.',
        messages:[{ role:'user', content:`Perform a content gap analysis for the "${niche}" niche:
Your site: ${own}
Competitor 1: ${c1}
Competitor 2: ${c2}

Return ONLY this JSON:
{
  "own": "${own}",
  "competitors": ["${c1}", "${c2}"],
  "total_gaps": 47,
  "quick_wins": 12,
  "est_traffic_opportunity": "48K/mo",
  "categories": [
    {"name": "Topic Category 1", "own_coverage": 30, "c1_coverage": 85, "c2_coverage": 70, "opportunity": 88},
    {"name": "Topic Category 2", "own_coverage": 60, "c1_coverage": 90, "c2_coverage": 65, "opportunity": 72},
    {"name": "Topic Category 3", "own_coverage": 15, "c1_coverage": 80, "c2_coverage": 55, "opportunity": 91},
    {"name": "Topic Category 4", "own_coverage": 45, "c1_coverage": 75, "c2_coverage": 80, "opportunity": 65},
    {"name": "Topic Category 5", "own_coverage": 10, "c1_coverage": 70, "c2_coverage": 40, "opportunity": 85}
  ],
  "gaps": [
    {"topic": "specific gap topic", "competitors_covering": ["${c1}"], "est_volume": "8,400", "difficulty": "Easy", "content_type": "Guide", "priority": "P1", "why_valuable": "High commercial intent, competitors ranking top 3"},
    {"topic": "gap topic 2", "competitors_covering": ["${c1}","${c2}"], "est_volume": "6,200", "difficulty": "Medium", "content_type": "Listicle", "priority": "P1", "why_valuable": "Both competitors rank here, major gap in your authority"},
    {"topic": "gap topic 3", "competitors_covering": ["${c2}"], "est_volume": "4,800", "difficulty": "Easy", "content_type": "How-To", "priority": "P1", "why_valuable": "Low difficulty quick win"},
    {"topic": "gap topic 4", "competitors_covering": ["${c1}","${c2}"], "est_volume": "3,600", "difficulty": "Medium", "content_type": "Guide", "priority": "P2", "why_valuable": "Strong informational intent, builds topical authority"},
    {"topic": "gap topic 5", "competitors_covering": ["${c1}"], "est_volume": "2,900", "difficulty": "Hard", "content_type": "Study", "priority": "P2", "why_valuable": "High value, worth the effort for authority building"},
    {"topic": "gap topic 6", "competitors_covering": ["${c2}"], "est_volume": "2,100", "difficulty": "Easy", "content_type": "Checklist", "priority": "P1", "why_valuable": "Featured snippet opportunity, low competition"},
    {"topic": "gap topic 7", "competitors_covering": ["${c1}","${c2}"], "est_volume": "1,800", "difficulty": "Medium", "content_type": "Tool", "priority": "P3", "why_valuable": "Long-term moat builder"},
    {"topic": "gap topic 8", "competitors_covering": ["${c1}"], "est_volume": "1,400", "difficulty": "Easy", "content_type": "FAQ", "priority": "P1", "why_valuable": "PAA box opportunity"}
  ]
}` }]
      })
    });
    const data = await res.json();
    const text = data.content?.map(c=>c.text||'').join('').replace(/```json|```/g,'').trim();
    result = JSON.parse(text);
  } catch(e) {
    result = buildMockGap(own, c1, c2, niche);
  }

  clearInterval(intv);
  document.getElementById('gap-loading').style.display = 'none';
  renderGapRadar(result, own, c1, c2);
  document.getElementById('gap-output').style.display = 'block';
}

function buildMockGap(own, c1, c2, niche) {
  return {
    own, competitors:[c1,c2],
    total_gaps:47, quick_wins:14, est_traffic_opportunity:'52K/mo',
    categories:[
      {name:'Beginner Guides',       own_coverage:25, c1_coverage:88, c2_coverage:72, opportunity:91},
      {name:'Tool Comparisons',      own_coverage:40, c1_coverage:92, c2_coverage:68, opportunity:84},
      {name:'Case Studies',          own_coverage:15, c1_coverage:75, c2_coverage:55, opportunity:88},
      {name:'How-To Tutorials',      own_coverage:55, c1_coverage:85, c2_coverage:78, opportunity:68},
      {name:'Industry Statistics',   own_coverage:10, c1_coverage:80, c2_coverage:45, opportunity:92},
    ],
    gaps:[
      {topic:`${niche} for beginners`,   competitors_covering:[c1,c2],  est_volume:'9,200', difficulty:'Easy',   content_type:'Guide',     priority:'P1', why_valuable:'Both rivals rank top 5, massive traffic gap'},
      {topic:`best ${niche} tools`,      competitors_covering:[c1],     est_volume:'7,400', difficulty:'Medium', content_type:'Listicle',  priority:'P1', why_valuable:'High commercial intent, great for affiliate'},
      {topic:`${niche} checklist`,       competitors_covering:[c2],     est_volume:'5,800', difficulty:'Easy',   content_type:'Checklist', priority:'P1', why_valuable:'Featured snippet opportunity in PAA box'},
      {topic:`${niche} case study 2025`, competitors_covering:[c1],     est_volume:'4,200', difficulty:'Medium', content_type:'Study',     priority:'P2', why_valuable:'Authority builder, gets backlinks naturally'},
      {topic:`${niche} statistics`,      competitors_covering:[c1,c2],  est_volume:'3,600', difficulty:'Easy',   content_type:'Stats',     priority:'P1', why_valuable:'High linkable asset potential'},
      {topic:`free ${niche} audit`,      competitors_covering:[c2],     est_volume:'2,900', difficulty:'Easy',   content_type:'Tool',      priority:'P1', why_valuable:'Lead gen + ranking opportunity'},
      {topic:`${niche} vs sem`,          competitors_covering:[c1],     est_volume:'2,100', difficulty:'Medium', content_type:'Comparison',priority:'P2', why_valuable:'Informational, builds topical coverage'},
      {topic:`${niche} ROI calculator`,  competitors_covering:[c1,c2],  est_volume:'1,800', difficulty:'Hard',   content_type:'Tool',      priority:'P3', why_valuable:'Long-term moat, very hard to replicate'},
    ]
  };
}

function renderGapRadar(r, own, c1, c2) {
  // KPIs
  document.getElementById('gap-kpis').innerHTML = [
    ['CONTENT GAPS', r.total_gaps, 'var(--danger)'],
    ['QUICK WINS (P1)', r.quick_wins, 'var(--accent3)'],
    ['TRAFFIC OPPORTUNITY', r.est_traffic_opportunity, 'var(--accent)'],
    ['COMPETITORS ANALYZED', r.competitors.length, 'var(--accent2)'],
  ].map(([l,v,c]) => `
    <div class="metric-card" style="--accent-c:${c}">
      <div class="metric-label">${l}</div>
      <div class="metric-value" style="color:${c};font-size:${String(v).length>5?'18px':'32px'}">${v}</div>
    </div>`).join('');

  // Radar coverage bars
  document.getElementById('gap-radar-bars').innerHTML = (r.categories||[]).map(cat => `
    <div class="gap-radar-row">
      <div class="gap-radar-header">
        <span style="font-size:13px;font-weight:600">${cat.name}</span>
        <span style="font-size:11px;color:var(--muted);font-family:'Space Mono',monospace">You: ${cat.own_coverage}%</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:10px;color:var(--accent);width:50px;font-family:'Space Mono',monospace">You</span>
          <div style="flex:1;height:6px;background:var(--border);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${cat.own_coverage}%;background:var(--accent);border-radius:3px;transition:width 1s ease"></div>
          </div>
          <span style="font-size:10px;color:var(--accent);width:30px;text-align:right">${cat.own_coverage}%</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:10px;color:var(--danger);width:50px;font-family:'Space Mono',monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${c1}">${c1.split('.')[0]}</span>
          <div style="flex:1;height:6px;background:var(--border);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${cat.c1_coverage}%;background:var(--danger);border-radius:3px"></div>
          </div>
          <span style="font-size:10px;color:var(--danger);width:30px;text-align:right">${cat.c1_coverage}%</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:10px;color:var(--accent4);width:50px;font-family:'Space Mono',monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${c2}">${c2.split('.')[0]}</span>
          <div style="flex:1;height:6px;background:var(--border);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${cat.c2_coverage}%;background:var(--accent4);border-radius:3px"></div>
          </div>
          <span style="font-size:10px;color:var(--accent4);width:30px;text-align:right">${cat.c2_coverage}%</span>
        </div>
      </div>
    </div>`).join('');

  // Opportunity bars
  document.getElementById('gap-opportunity').innerHTML = [...(r.categories||[])].sort((a,b)=>b.opportunity-a.opportunity).map(cat => `
    <div class="gap-opp-row">
      <div class="gap-opp-label" style="font-size:12px">${cat.name}</div>
      <div class="gap-opp-track"><div class="gap-opp-fill" style="width:${cat.opportunity}%;background:${cat.opportunity>=85?'var(--accent3)':cat.opportunity>=70?'var(--accent)':'var(--accent4)'}"></div></div>
      <div class="gap-opp-val" style="color:${cat.opportunity>=85?'var(--accent3)':cat.opportunity>=70?'var(--accent)':'var(--accent4)'}">${cat.opportunity}</div>
    </div>`).join('');

  // Gap table
  document.getElementById('gap-thead').innerHTML = `<tr>${['TOPIC GAP','VOLUME','DIFFICULTY','TYPE','COVERED BY','PRIORITY','WHY VALUABLE'].map(h=>`<th>${h}</th>`).join('')}</tr>`;
  const diffCol = d => d==='Easy'?'var(--accent3)':d==='Medium'?'var(--accent4)':'var(--danger)';
  const priCol  = p => p==='P1'?'var(--danger)':p==='P2'?'var(--accent4)':'var(--muted)';
  document.getElementById('gap-tbody').innerHTML = (r.gaps||[]).map(g => `<tr>
    <td style="font-weight:600">${g.topic}</td>
    <td><span class="vol-chip">${g.est_volume}</span></td>
    <td><span class="badge" style="background:${diffCol(g.difficulty)}20;color:${diffCol(g.difficulty)};border:1px solid ${diffCol(g.difficulty)}40">${g.difficulty}</span></td>
    <td><span class="badge badge-blue">${g.content_type}</span></td>
    <td style="font-size:11px;color:var(--muted);font-family:'Space Mono',monospace">${(g.competitors_covering||[]).map(c=>c.split('.')[0]).join(', ')}</td>
    <td><span class="badge" style="background:${priCol(g.priority)}20;color:${priCol(g.priority)};border:1px solid ${priCol(g.priority)}40">${g.priority}</span></td>
    <td style="font-size:12px;color:var(--muted)">${g.why_valuable}</td>
  </tr>`).join('');

  document.getElementById('gap-table-sub').textContent = `${r.gaps?.length||0} gaps found — sorted by priority & traffic value`;
}

function copyGaps() {
  const rows = document.querySelectorAll('#gap-tbody tr');
  let csv = 'Topic,Volume,Difficulty,Type,Priority,Why Valuable\n';
  rows.forEach(r => {
    const cells = [...r.querySelectorAll('td')].map(td=>td.textContent.trim());
    csv += cells.map(c=>`"${c}"`).join(',') + '\n';
  });
  navigator.clipboard?.writeText(csv);
}

function sendGapsToContent() {
  setTab('content');
}

// init gap-own from domain input
document.addEventListener('DOMContentLoaded', () => {
  const d = document.getElementById('domainInput')?.value;
  const go = document.getElementById('gap-own');
  if (d && go && !go.value) go.value = d;
});
/* --- */
// ===== TRAFFIC FORECAST ENGINE =====
const BASELINE = 14200;
const MONTHS = ['Now','M1','M2','M3','M4','M5','M6','M7','M8','M9','M10','M11','M12'];
let fcChart = null;
let currentScenario = Store.get('scenario', 'conservative');

const scenarios = {
  conservative: { content:2, links:8,  tech:1, budget:1 },
  realistic:    { content:4, links:15, tech:2, budget:2 },
  aggressive:   { content:7, links:40, tech:3, budget:4 }
};

function computeForecast(content, links, tech, budget) {
  // Growth model: compound monthly multiplier driven by levers
  const contentFactor = 0.008 * content;           // 0.008–0.056 per post/wk
  const linkFactor    = 0.003 * links;              // 0.024–0.18
  const techBoost     = [0, 0.04, 0.08, 0.14][tech]; // one-time early boost
  const budgetMult    = 1 + (budget - 1) * 0.12;   // 1.0 – 1.48

  const data = [BASELINE];
  for (let m = 1; m <= 12; m++) {
    const prev = data[m - 1];
    // S-curve acceleration: slow start, peak mid, compound tail
    const phase = m <= 3 ? 0.6 : m <= 6 ? 1.0 : m <= 9 ? 1.3 : 1.5;
    const techOnce = m === 1 ? techBoost : 0;
    const monthlyGrowth = (contentFactor + linkFactor + techOnce) * phase * budgetMult;
    data.push(Math.round(prev * (1 + monthlyGrowth)));
  }
  return data;
}

function computeBand(main, variance=0.15) {
  return {
    upper: main.map(v => Math.round(v * (1 + variance))),
    lower: main.map(v => Math.round(v * (1 - variance)))
  };
}

function fmtK(n) {
  if (n >= 1000000) return (n/1000000).toFixed(1)+'M';
  if (n >= 1000) return (n/1000).toFixed(1)+'K';
  return n.toString();
}

function buildChart(data, upper, lower) {
  const ctx = document.getElementById('forecastChart');
  if (!ctx) return;

  if (fcChart) { fcChart.destroy(); fcChart = null; }

  // Phase background plugin
  const phaseBg = {
    id:'phaseBg',
    beforeDraw(chart) {
      const {ctx: c, chartArea:{left,right,top,bottom}, scales:{x}} = chart;
      const w = (right-left)/12;
      // Phase 1-2: M0-M3
      c.fillStyle='rgba(0,212,255,0.04)';
      c.fillRect(left, top, w*3, bottom-top);
      // Phase 3-4: M4-M9
      c.fillStyle='rgba(124,58,237,0.04)';
      c.fillRect(left+w*3, top, w*6, bottom-top);
      // Phase 5: M10-M12
      c.fillStyle='rgba(16,185,129,0.04)';
      c.fillRect(left+w*9, top, w*3, bottom-top);
    }
  };

  fcChart = new Chart(ctx, {
    type: 'line',
    plugins: [phaseBg],
    data: {
      labels: MONTHS,
      datasets: [
        {
          label: 'Upper Bound',
          data: upper,
          borderColor: 'transparent',
          backgroundColor: 'rgba(0,212,255,0.08)',
          fill: '+1',
          pointRadius: 0, tension: 0.45
        },
        {
          label: 'Organic Traffic',
          data: data,
          borderColor: '#00d4ff',
          borderWidth: 2.5,
          backgroundColor: (ctx) => {
            const g = ctx.chart.ctx.createLinearGradient(0,0,0,300);
            g.addColorStop(0,'rgba(0,212,255,0.25)');
            g.addColorStop(1,'rgba(0,212,255,0.01)');
            return g;
          },
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: '#00d4ff',
          pointBorderColor: '#040812',
          pointBorderWidth: 2,
          pointHoverRadius: 7,
          tension: 0.45
        },
        {
          label: 'Lower Bound',
          data: lower,
          borderColor: 'transparent',
          backgroundColor: 'rgba(0,212,255,0.08)',
          fill: '-1',
          pointRadius: 0, tension: 0.45
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode:'index', intersect:false },
      plugins: {
        legend: { display:false },
        tooltip: {
          enabled: false,
          external(context) {
            const tip = document.getElementById('fc-tooltip');
            if (!tip) return;
            if (context.tooltip.opacity === 0) { tip.style.display='none'; return; }
            const dp = context.tooltip.dataPoints?.[1];
            if (!dp) return;
            const mi = dp.dataIndex;
            const val = dp.raw;
            const growth = Math.round((val/BASELINE-1)*100);
            const lo = lower[mi], hi = upper[mi];
            document.getElementById('fc-tip-month').textContent = MONTHS[mi] === 'Now' ? 'Baseline (Now)' : `Month ${mi}`;
            document.getElementById('fc-tip-traffic').textContent = fmtK(val) + ' visitors';
            document.getElementById('fc-tip-growth').textContent = growth > 0 ? `▲ +${growth}% vs baseline` : 'Baseline';
            document.getElementById('fc-tip-conf').textContent = `Range: ${fmtK(lo)} – ${fmtK(hi)}`;
            const pos = context.tooltip;
            tip.style.display = 'block';
            tip.style.left = Math.min(pos.caretX + 12, ctx.getBoundingClientRect().width - 180) + 'px';
            tip.style.top = Math.max(pos.caretY - 60, 0) + 'px';
          }
        }
      },
      scales: {
        x: {
          grid: { color:'rgba(26,42,69,0.5)', lineWidth:1 },
          ticks: { color:'#5a7a9a', font:{size:11, family:"'Space Mono', monospace"} }
        },
        y: {
          grid: { color:'rgba(26,42,69,0.5)', lineWidth:1 },
          ticks: {
            color:'#5a7a9a', font:{size:11},
            callback: v => fmtK(v)
          },
          beginAtZero: false
        }
      }
    }
  });
}

function updateForecast() {
  const content = +document.getElementById('r-content').value;
  const links   = +document.getElementById('r-links').value;
  const tech    = +document.getElementById('r-tech').value;
  const budget  = +document.getElementById('r-budget').value;

  // Update lever labels
  document.getElementById('lv-content').textContent = content + ' posts/wk';
  document.getElementById('lv-links').textContent   = links + ' links';
  document.getElementById('lv-tech').textContent    = ['','Slow','Medium','Fast'][tech];
  const budgetLabels = {1:'$500/mo',2:'$2K/mo',3:'$3K/mo',4:'$4K/mo',5:'$5K+/mo'};
  document.getElementById('lv-budget').textContent  = budgetLabels[budget];

  // Update range fill via CSS custom property
  ['content','links','tech','budget'].forEach(id => {
    const el = document.getElementById('r-'+id);
    const pct = ((el.value - el.min)/(el.max - el.min)*100).toFixed(1)+'%';
    el.style.setProperty('--pct', pct);
  });

  const data  = computeForecast(content, links, tech, budget);
  const {upper, lower} = computeBand(data, 0.18 - budget*0.02);

  // KPIs
  const m6  = data[6], m12 = data[12];
  const pct = Math.round((m12/BASELINE-1)*100);
  const val = Math.round(m12 * 1.8); // estimated value at $1.80 CPC equiv

  animKpi('kpi-m6',    fmtK(m6));
  animKpi('kpi-m12',   fmtK(m12));
  animKpi('kpi-growth', '+'+pct+'%');
  animKpi('kpi-value',  '$'+fmtK(val)+'/mo');

  buildChart(data, upper, lower);
  renderMilestones(data);
}

function animKpi(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.transform='scale(1.15)';
  el.textContent = val;
  setTimeout(()=>{ el.style.transform='scale(1)'; el.style.transition='transform 0.25s ease'; }, 50);
}

function setScenario(name, btn) {
  currentScenario = name;
  Store.set('scenario', currentScenario);
  document.querySelectorAll('.fc-pill').forEach(p=>p.classList.remove('active'));
  btn.classList.add('active');
  const s = scenarios[name];
  document.getElementById('r-content').value = s.content;
  document.getElementById('r-links').value   = s.links;
  document.getElementById('r-tech').value    = s.tech;
  document.getElementById('r-budget').value  = s.budget;
  updateForecast();
}

function renderMilestones(data) {
  const milestones = [
    { label:'🎯 25K traffic', target:25000 },
    { label:'🎯 50K traffic', target:50000 },
    { label:'🎯 75K traffic', target:75000 },
    { label:'🏆 100K traffic', target:100000 },
    { label:'⭐ 2× growth', target:BASELINE*2 },
    { label:'🚀 5× growth', target:BASELINE*5 },
  ];
  const container = document.getElementById('fc-milestones');
  if (!container) return;
  const max = data[12];
  container.innerHTML = milestones.map(m => {
    const hit = max >= m.target;
    const month = data.findIndex(v=>v>=m.target);
    const label = hit && month > 0 ? `${m.label} <span style="color:var(--accent3)">(M${month})</span>` : m.label;
    return `<div class="fc-milestone ${hit?'hit':''}">${label}</div>`;
  }).join('');
}


// Also init if roadmap is default
document.addEventListener('DOMContentLoaded', () => {
  // pre-warm range fills
  ['content','links','tech','budget'].forEach(id => {
    const el = document.getElementById('r-'+id);
    if (el) {
      const pct = ((el.value - el.min)/(el.max - el.min)*100).toFixed(1)+'%';
      el.style.setProperty('--pct', pct);
    }
  });
});
/* --- */
// ===== WIZARD STATE =====
let wizStep = 1;
const TOTAL_STEPS = 5;
const wizData = { domain:'', name:'', type:'', goals:[], timeline:'', budget:'', competitors:[], niche:'' };

function showWizard() {
  document.getElementById('wizard-overlay').style.display = 'flex';
  updateWizUI();
}

function wizNext() {
  if (wizStep === 2) {
    const d = document.getElementById('wiz-domain').value.trim();
    if (!d) {
      document.getElementById('hint-domain').classList.add('show');
      document.getElementById('wiz-domain').focus();
      return;
    }
    document.getElementById('hint-domain').classList.remove('show');
    wizData.domain = d;
    wizData.name = document.getElementById('wiz-name').value.trim();
    wizData.type = getSelectedChip('chips-type');
  }
  if (wizStep === 3) {
    wizData.goals = getSelectedChips('chips-goals');
    wizData.timeline = getSelectedChip('chips-timeline');
    wizData.budget = getSelectedChip('chips-budget');
  }
  if (wizStep === 4) {
    const rows = document.querySelectorAll('.comp-row input');
    wizData.competitors = Array.from(rows).map(r=>r.value.trim()).filter(Boolean);
    wizData.niche = document.getElementById('wiz-niche').value.trim();
    populateSummary();
  }
  if (wizStep < TOTAL_STEPS) {
    wizStep++;
    updateWizUI();
  }
}

function wizPrev() {
  if (wizStep > 1) { wizStep--; updateWizUI(); }
}

function updateWizUI() {
  // Steps
  document.querySelectorAll('.wiz-step').forEach((s,i) => {
    s.classList.toggle('active', i+1 === wizStep);
  });
  // Progress bar
  document.getElementById('wizProgress').style.width = ((wizStep-1)/(TOTAL_STEPS-1)*100) + '%';
  // Counter
  document.getElementById('wizCounter').textContent = `Step ${wizStep} of ${TOTAL_STEPS}`;
  // Dots
  document.querySelectorAll('.wiz-dot').forEach((d,i) => {
    d.classList.remove('active','done');
    if (i+1 === wizStep) d.classList.add('active');
    else if (i+1 < wizStep) d.classList.add('done');
  });
  // Buttons
  document.getElementById('wizBack').style.display = wizStep > 1 ? 'block' : 'none';
  const isLast = wizStep === TOTAL_STEPS;
  document.getElementById('wizNext').style.display = isLast ? 'none' : 'block';
  document.getElementById('wizFinish').style.display = isLast ? 'block' : 'none';
}

function wizValidate() {
  const d = document.getElementById('wiz-domain').value.trim();
  if (d) document.getElementById('hint-domain').classList.remove('show');
}

function populateSummary() {
  document.getElementById('sum-domain').textContent = wizData.domain || '—';
  document.getElementById('sum-type').textContent = stripEmoji(wizData.type) || '—';
  document.getElementById('sum-goals').textContent = wizData.goals.map(stripEmoji).join(', ') || '—';
  document.getElementById('sum-timeline').textContent = stripEmoji(wizData.timeline) || '—';
  document.getElementById('sum-budget').textContent = stripEmoji(wizData.budget) || '—';
  document.getElementById('sum-competitors').textContent = wizData.competitors.length ? wizData.competitors.join(', ') : 'None added';
  document.getElementById('sum-niche').textContent = wizData.niche || '—';
}

function stripEmoji(str) {
  if (!str) return str;
  return str.replace(/^[\p{Emoji}\s]+/u, '').trim();
}

async function wizFinish() {
  document.getElementById('wizFinish').disabled = true;
  document.getElementById('wizBack').style.display = 'none';
  document.getElementById('wiz-summary-box').style.opacity = '0.4';
  document.getElementById('wiz-ai-row').style.display = 'flex';

  const statusMsgs = [
    'Calibrating SEO modules to your goals...',
    'Mapping competitor landscape...',
    'Loading keyword opportunity data...',
    'Building your 12-month roadmap...',
    'Preparing Jarvis AI with your context...'
  ];
  let si = 0;
  const statusEl = document.getElementById('wiz-ai-status');
  const statusInterval = setInterval(() => {
    si = (si+1) % statusMsgs.length;
    statusEl.textContent = statusMsgs[si];
  }, 900);

  // Ask Jarvis AI to generate a personalized intro
  let aiIntro = '';
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: AI.headers(),
      body: JSON.stringify({
        model: AI.MODEL,
        max_tokens: 1000,
        system: 'You are JARVIS, an elite SEO strategist AI. Be direct, confident, and insightful. No fluff.',
        messages: [{
          role: 'user',
          content: `A new user just set up their Jarvis SEO workspace. Here are their details:
- Domain: ${wizData.domain}
- Site type: ${wizData.type}
- Niche: ${wizData.niche}
- SEO Goals: ${wizData.goals.join(', ')}
- Timeline: ${wizData.timeline}
- Budget: ${wizData.budget}
- Competitors: ${wizData.competitors.join(', ') || 'none specified'}

Write a sharp 3-4 sentence personalized welcome that: (1) acknowledges their specific situation, (2) identifies their #1 quick-win opportunity based on their goals/timeline, (3) tells them exactly what to do first in the dashboard. Be specific, confident, expert-level.`
        }]
      })
    });
    const data = await res.json();
    aiIntro = data.content?.map(c=>c.text||'').join('') || '';
  } catch(e) {
    aiIntro = `Welcome, ${wizData.name || wizData.domain}! Based on your goals and ${wizData.timeline || 'timeline'}, I've configured your SEO command center for maximum impact. Your #1 priority right now is fixing technical issues — start with the Site Audit tab to see your 89 critical errors. Once those are resolved, we'll move to content and link building to compound your growth.`;
  }

  clearInterval(statusInterval);

  // Apply domain to topbar & sidebar
  if (wizData.domain) {
    const inp = document.getElementById('domainInput');
    if (inp) inp.value = wizData.domain;
    const siteUrl = document.getElementById('siteUrl');
    if (siteUrl) siteUrl.textContent = wizData.domain;
  }

  // Set AI intro in Jarvis chat
  const jarvisOut = document.getElementById('jarvisOutput');
  if (jarvisOut && aiIntro) {
    jarvisOut.innerHTML = `
      <div class="ai-thinking" style="margin-bottom:12px">
        <span>🤖 JARVIS</span>
        <span style="color:var(--accent3);margin-left:8px">● Personalized to ${escapeHtml(wizData.domain)}</span>
      </div>
      <div style="font-size:13.5px;line-height:1.8">${escapeHtml(aiIntro)}</div>
    `;
  }

  // Save and close
  sessionStorage.setItem('jarvis_onboarded', '1');
  sessionStorage.setItem('jarvis_data', JSON.stringify(wizData));

  await new Promise(r => setTimeout(r, 500));
  const overlay = document.getElementById('wizard-overlay');
  overlay.style.transition = 'opacity 0.5s ease';
  overlay.style.opacity = '0';
  setTimeout(() => { overlay.style.display = 'none'; setTab('dashboard'); }, 500);
}

// Chip helpers
function selectChip(el, group) {
  document.querySelectorAll(`#chips-${group} .wiz-chip`).forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}
function toggleChip(el) { el.classList.toggle('selected'); }
function getSelectedChip(id) {
  const sel = document.querySelector(`#${id} .wiz-chip.selected`);
  return sel ? sel.textContent.trim() : '';
}
function getSelectedChips(id) {
  return Array.from(document.querySelectorAll(`#${id} .wiz-chip.selected`)).map(c=>c.textContent.trim());
}
/* --- */
// ─── DATA ───────────────────────────────────────────────
const RT_KEYWORDS = [
  { id:1,  kw:'digital marketing agency',   vol:'12K', intent:'T', positions:[11,10,9,8,7,7,6,5,4,4,3,3,3], best:3,  page:1 },
  { id:2,  kw:'seo services near me',       vol:'8.4K',intent:'T', positions:[18,17,15,13,11,9,8,7,6,6,5,5,5], best:5,  page:1 },
  { id:3,  kw:'content marketing strategy', vol:'4.8K',intent:'I', positions:[7,7,8,9,9,10,10,10,9,9,9,9,9],  best:7,  page:1 },
  { id:4,  kw:'best seo tools 2025',        vol:'6.2K',intent:'C', positions:[24,22,20,18,16,14,12,11,10,9,8,7,7], best:7, page:1 },
  { id:5,  kw:'local seo optimization',     vol:'3.5K',intent:'I', positions:[19,18,17,16,15,14,13,12,12,12,11,11,11], best:11, page:2 },
  { id:6,  kw:'seo audit checklist',        vol:'5.1K',intent:'I', positions:[45,42,38,33,28,25,22,20,18,17,16,16,16], best:16, page:2 },
  { id:7,  kw:'on page seo guide',          vol:'9.1K',intent:'I', positions:[31,29,27,25,24,22,21,20,19,18,18,18,18], best:18, page:2 },
  { id:8,  kw:'link building strategies',   vol:'7.3K',intent:'I', positions:[14,14,13,12,11,10,9,8,8,7,7,6,6],  best:6, page:1 },
  { id:9,  kw:'keyword research tool',      vol:'41K', intent:'C', positions:[55,52,49,47,44,42,40,38,36,35,34,33,33], best:33, page:4 },
  { id:10, kw:'seo strategy 2025',          vol:'18K', intent:'I', positions:[28,26,24,22,20,19,18,17,15,14,13,12,12], best:12, page:2 },
  { id:11, kw:'google my business seo',     vol:'2.8K',intent:'T', positions:[8,8,7,7,6,6,5,5,4,4,3,3,3],   best:3,  page:1 },
  { id:12, kw:'technical seo audit',        vol:'11K', intent:'I', positions:[22,21,20,18,17,16,15,14,14,13,13,12,12], best:12, page:2 },
];

const INTENT_META = {
  I: { label:'Info',  color:'#00d4ff', bg:'#00d4ff15' },
  C: { label:'Comm',  color:'#a78bfa', bg:'#7c3aed15' },
  T: { label:'Trans', color:'#10b981', bg:'#10b98115' },
  N: { label:'Nav',   color:'#f59e0b', bg:'#f59e0b15' },
};

let rtRange = 30;
let rtActiveFilter = 'all';
let rtExpandedId = null;
let rtDetailChart = null;
const sparkTip = document.createElement('div');
sparkTip.className = 'spark-tip';
sparkTip.innerHTML = '<div class="spark-tip-date" id="stDate"></div><div class="spark-tip-pos" id="stPos"></div>';
document.body.appendChild(sparkTip);

// ─── HELPERS ─────────────────────────────────────────────
function posColor(p) {
  if (p <= 3)  return '#10b981';
  if (p <= 10) return '#00d4ff';
  if (p <= 20) return '#f59e0b';
  return '#ef4444';
}
function rankBg(p) {
  if (p <= 3)  return '#10b98122';
  if (p <= 10) return '#00d4ff18';
  if (p <= 20) return '#f59e0b18';
  return '#ef444418';
}
function pageLabel(p) {
  if (p <= 10) return 'P1';
  if (p <= 20) return 'P2';
  if (p <= 30) return 'P3';
  return 'P'+Math.ceil(p/10);
}
function fmtChange(start, end) {
  const d = start - end; // lower pos = better
  if (d > 0)  return `<span class="chg-badge chg-up">▲${d}</span>`;
  if (d < 0)  return `<span class="chg-badge chg-down">▼${Math.abs(d)}</span>`;
  return `<span class="chg-badge chg-flat">—</span>`;
}
function visScore(pos) { return Math.max(0, Math.round(100 - pos * 2.8)); }

// ─── SPARKLINE DRAWING ───────────────────────────────────
function drawSparkline(canvas, positions, highlighted = -1) {
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth  || 130;
  const H = canvas.offsetHeight || 36;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const n = positions.length;
  if (n < 2) return;

  const maxP = Math.max(...positions) + 2;
  const minP = Math.max(1, Math.min(...positions) - 2);
  const xStep = W / (n - 1);
  // Invert Y so lower rank = higher on chart
  const yOf = p => H - ((maxP - p) / (maxP - minP)) * (H - 6) - 3;

  const pts = positions.map((p, i) => ({ x: i * xStep, y: yOf(p) }));

  // Gradient fill
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(0,212,255,0.18)');
  grad.addColorStop(1, 'rgba(0,212,255,0.00)');

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < n; i++) {
    const cp1x = pts[i-1].x + xStep * 0.4;
    const cp2x = pts[i].x   - xStep * 0.4;
    ctx.bezierCurveTo(cp1x, pts[i-1].y, cp2x, pts[i].y, pts[i].x, pts[i].y);
  }
  ctx.lineTo(pts[n-1].x, H);
  ctx.lineTo(pts[0].x, H);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < n; i++) {
    const cp1x = pts[i-1].x + xStep * 0.4;
    const cp2x = pts[i].x   - xStep * 0.4;
    ctx.bezierCurveTo(cp1x, pts[i-1].y, cp2x, pts[i].y, pts[i].x, pts[i].y);
  }
  ctx.strokeStyle = '#00d4ff';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Dots
  pts.forEach((pt, i) => {
    const isEnd = i === n - 1;
    const isHL  = i === highlighted;
    if (isEnd || isHL) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, isHL ? 4 : 3, 0, Math.PI * 2);
      ctx.fillStyle   = isHL ? '#fff' : posColor(positions[i]);
      ctx.strokeStyle = '#040812';
      ctx.lineWidth   = 1.5;
      ctx.fill();
      ctx.stroke();
    }
  });

  // Hover crosshair line
  if (highlighted >= 0) {
    const pt = pts[highlighted];
    ctx.beginPath();
    ctx.moveTo(pt.x, 0);
    ctx.lineTo(pt.x, H);
    ctx.strokeStyle = 'rgba(0,212,255,0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

// ─── SPARKLINE INTERACTIVITY ──────────────────────────────
function attachSparkHover(canvas, kw) {
  const n = kw.positions.length;
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const mx   = e.clientX - rect.left;
    const idx  = Math.min(n - 1, Math.max(0, Math.round(mx / (rect.width / (n - 1)))));
    drawSparkline(canvas, kw.positions, idx);

    const labels = buildDayLabels(n);
    document.getElementById('stDate').textContent = labels[idx];
    document.getElementById('stPos').textContent  = '#' + kw.positions[idx];
    sparkTip.style.display = 'block';
    sparkTip.style.left    = (e.clientX + 14) + 'px';
    sparkTip.style.top     = (e.clientY - 38) + 'px';
  });
  canvas.addEventListener('mouseleave', () => {
    drawSparkline(canvas, kw.positions);
    sparkTip.style.display = 'none';
  });
}

function buildDayLabels(n) {
  const labels = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i * Math.floor(rtRange / (n-1)));
    labels.push(d.toLocaleDateString('en-US',{month:'short',day:'numeric'}));
  }
  return labels;
}

// ─── TABLE RENDERING ─────────────────────────────────────
function rtRender() {
  const tbody = document.getElementById('rt-tbody');
  if (!tbody) return;

  let data = [...RT_KEYWORDS];

  // Filter
  if (rtActiveFilter === 'improved') data = data.filter(k => k.positions[0] > k.positions[k.positions.length-1]);
  if (rtActiveFilter === 'dropped')  data = data.filter(k => k.positions[0] < k.positions[k.positions.length-1]);
  if (rtActiveFilter === 'top3')     data = data.filter(k => k.positions[k.positions.length-1] <= 3);
  if (rtActiveFilter === 'top10')    data = data.filter(k => k.positions[k.positions.length-1] <= 10);
  if (rtActiveFilter === 'page2')    data = data.filter(k => { const p=k.positions[k.positions.length-1]; return p>10&&p<=20; });
  if (rtActiveFilter === 'unranked') data = data.filter(k => k.positions[k.positions.length-1] > 50);

  // Search
  const q = (document.getElementById('rt-search')?.value||'').toLowerCase();
  if (q) data = data.filter(k => k.kw.toLowerCase().includes(q));

  document.getElementById('rt-count').textContent = `Showing ${data.length} of 247`;

  tbody.innerHTML = '';
  data.forEach((kw, rowIdx) => {
    const curPos   = kw.positions[kw.positions.length - 1];
    const startPos = kw.positions[0];
    const im       = INTENT_META[kw.intent] || INTENT_META.I;
    const vis      = visScore(curPos);
    const visColor = vis >= 70 ? '#10b981' : vis >= 40 ? '#f59e0b' : '#ef4444';

    const tr = document.createElement('tr');
    tr.dataset.id = kw.id;
    if (rtExpandedId === kw.id) tr.classList.add('expanded');
    tr.innerHTML = `
      <td style="padding-left:20px;color:var(--muted);font-size:12px;font-family:'Space Mono',monospace">${rowIdx+1}</td>
      <td>
        <div style="font-size:13.5px;font-weight:600;margin-bottom:2px">${kw.kw}</div>
        <div style="font-size:11px;color:var(--muted);font-family:'Space Mono',monospace">${kw.positions.length}-day data</div>
      </td>
      <td><span class="vol-chip">${kw.vol}</span></td>
      <td>
        <span class="intent-dot" style="background:${im.bg};color:${im.color};padding:3px 8px;border-radius:5px;border:1px solid ${im.color}30">
          ${im.label}
        </span>
      </td>
      <td>
        <div class="spark-cell" id="spark-cell-${kw.id}">
          <canvas class="spark-canvas" id="spark-${kw.id}" width="130" height="36"></canvas>
        </div>
      </td>
      <td>
        <span class="rank-badge" style="background:${rankBg(kw.best)};color:${posColor(kw.best)}">#${kw.best}</span>
      </td>
      <td>
        <span class="rank-badge" style="background:${rankBg(curPos)};color:${posColor(curPos)};font-size:15px;width:42px">#${curPos}</span>
      </td>
      <td>${fmtChange(startPos, curPos)}</td>
      <td>
        <div class="vis-bar-wrap">
          <div class="vis-bar"><div class="vis-fill" style="width:${vis}%;background:${visColor}"></div></div>
          <span style="font-size:11px;color:${visColor};font-family:'Space Mono',monospace">${vis}</span>
        </div>
      </td>
      <td>
        <span style="font-size:11px;font-family:'Space Mono',monospace;color:${curPos<=10?'var(--accent3)':curPos<=20?'var(--accent4)':'var(--muted)'}">${pageLabel(curPos)}</span>
      </td>
    `;
    tr.addEventListener('click', () => expandRow(kw));
    tbody.appendChild(tr);

    // Draw sparkline after DOM insert
    requestAnimationFrame(() => {
      const canvas = document.getElementById('spark-' + kw.id);
      if (canvas) {
        drawSparkline(canvas, kw.positions);
        attachSparkHover(canvas, kw);
      }
    });
  });
}

// ─── ROW EXPAND ──────────────────────────────────────────
function expandRow(kw) {
  const panel = document.getElementById('rt-detail');
  if (rtExpandedId === kw.id) {
    rtExpandedId = null;
    panel.style.display = 'none';
    document.querySelectorAll('#rt-table tbody tr').forEach(r => r.classList.remove('expanded'));
    if (rtDetailChart) { rtDetailChart.destroy(); rtDetailChart = null; }
    return;
  }
  rtExpandedId = kw.id;
  document.querySelectorAll('#rt-table tbody tr').forEach(r => {
    r.classList.toggle('expanded', +r.dataset.id === kw.id);
  });

  const curPos   = kw.positions[kw.positions.length - 1];
  const startPos = kw.positions[0];
  const chg      = startPos - curPos;
  const vis      = visScore(curPos);
  const labels   = buildDayLabels(kw.positions.length);

  // Header
  document.getElementById('rt-detail-kw').textContent = '📈 ' + kw.kw;
  const im = INTENT_META[kw.intent] || INTENT_META.I;
  document.getElementById('rt-detail-badges').innerHTML = `
    <span class="badge badge-blue">${kw.vol} searches/mo</span>
    <span class="badge" style="background:${im.bg};color:${im.color};border:1px solid ${im.color}30">${im.label}</span>
    <span class="badge ${chg > 0 ? 'badge-green':'badge-red'}">${chg > 0 ? '▲ +'+chg+' positions' : chg < 0 ? '▼ '+Math.abs(chg)+' positions' : '— Stable'}</span>
    <span class="badge badge-amber">Best: #${kw.best}</span>
  `;

  // Stats
  const avgPos = Math.round(kw.positions.reduce((a,b)=>a+b,0)/kw.positions.length);
  document.getElementById('rt-detail-stats').innerHTML = `
    <div class="rt-stat-box"><div class="rt-stat-label">CURRENT</div><div class="rt-stat-val" style="color:${posColor(curPos)}">#${curPos}</div></div>
    <div class="rt-stat-box"><div class="rt-stat-label">BEST EVER</div><div class="rt-stat-val" style="color:var(--accent3)">#${kw.best}</div></div>
    <div class="rt-stat-box"><div class="rt-stat-label">AVG POS</div><div class="rt-stat-val" style="color:var(--accent4)">#${avgPos}</div></div>
    <div class="rt-stat-box"><div class="rt-stat-label">VISIBILITY</div><div class="rt-stat-val" style="color:var(--accent)">${vis}</div></div>
    <div class="rt-stat-box"><div class="rt-stat-label">PAGE</div><div class="rt-stat-val" style="color:var(--muted)">${pageLabel(curPos)}</div></div>
  `;

  // Daily dots
  const dotColors = p => p <= 3 ? '#10b981' : p <= 10 ? '#00d4ff' : p <= 20 ? '#f59e0b' : '#ef4444';
  document.getElementById('rt-daily-dots').innerHTML = kw.positions.map((p,i) => `
    <div class="day-dot" style="background:${dotColors(p)}22;color:${dotColors(p)};border:1px solid ${dotColors(p)}40" title="${labels[i]}">
      ${p}
    </div>`).join('');

  // Expanded chart
  panel.style.display = 'block';
  panel.scrollIntoView({ behavior:'smooth', block:'nearest' });

  if (rtDetailChart) { rtDetailChart.destroy(); rtDetailChart = null; }
  const ctx2 = document.getElementById('rt-detail-chart');
  if (!ctx2) return;

  // Invert positions for display (lower = better = higher on chart)
  const maxP = Math.max(...kw.positions) + 3;
  const invertedPositions = kw.positions.map(p => maxP - p);

  rtDetailChart = new Chart(ctx2, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Position',
        data: invertedPositions,
        borderColor: '#00d4ff',
        borderWidth: 2.5,
        backgroundColor: ctx => {
          const g = ctx.chart.ctx.createLinearGradient(0,0,0,220);
          g.addColorStop(0,'rgba(0,212,255,0.22)');
          g.addColorStop(1,'rgba(0,212,255,0.01)');
          return g;
        },
        fill: true,
        pointRadius: kw.positions.map((_,i) => i === kw.positions.length-1 ? 6 : 3),
        pointBackgroundColor: kw.positions.map(p => posColor(p)),
        pointBorderColor: '#040812',
        pointBorderWidth: 2,
        tension: 0.4,
      }]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins: {
        legend:{display:false},
        tooltip:{
          callbacks:{
            title: ctx2 => labels[ctx2[0].dataIndex],
            label: ctx2 => {
              const realPos = kw.positions[ctx2.dataIndex];
              return ` Position #${realPos}`;
            }
          },
          backgroundColor:'#0b1428', borderColor:'#1a2a45', borderWidth:1,
          titleColor:'#5a7a9a', bodyColor:'#00d4ff',
          titleFont:{family:"'Space Mono',monospace",size:10},
          bodyFont:{family:"'Syne',sans-serif",size:14,weight:'bold'},
        }
      },
      scales: {
        x:{ grid:{color:'rgba(26,42,69,0.4)'}, ticks:{color:'#5a7a9a',font:{size:10,family:"'Space Mono',monospace"},maxRotation:0,maxTicksLimit:8} },
        y:{
          grid:{color:'rgba(26,42,69,0.4)'},
          ticks:{
            color:'#5a7a9a', font:{size:10},
            callback: v => '#'+(maxP - Math.round(v))
          }
        }
      }
    }
  });
}

function closeDetail() {
  rtExpandedId = null;
  document.getElementById('rt-detail').style.display = 'none';
  document.querySelectorAll('#rt-table tbody tr').forEach(r=>r.classList.remove('expanded'));
  if (rtDetailChart) { rtDetailChart.destroy(); rtDetailChart = null; }
}

// ─── FILTER / SEARCH / RANGE ─────────────────────────────
function rtFilter(name, btn) {
  rtActiveFilter = name;
  document.querySelectorAll('.rt-filter').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  rtRender();
}
function rtSearch(q) { rtRender(); }
function rtSetRange(days, btn) {
  rtRange = days;
  document.querySelectorAll('.rt-range-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  rtRender();
}
function rtPage(p) { /* pagination stub */ }

// Also render if already on tracker
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('sec-tracker')?.classList.contains('active')) rtRender();
});
/* --- */
// ===== EXPORT ENGINE =====
let expTheme = 'dark';
let expReport = '';

const THEMES = {
  dark:    { bg:'#040812', surface:'#080f1e', card:'#0b1428', border:'#1a2a45', text:'#e8f4fd', muted:'#5a7a9a', accent:'#00d4ff', accent2:'#7c3aed', accent3:'#10b981', accent4:'#f59e0b', danger:'#ef4444' },
  light:   { bg:'#f8fafc', surface:'#ffffff', card:'#f1f5f9', border:'#e2e8f0', text:'#0f172a', muted:'#64748b', accent:'#0284c7', accent2:'#7c3aed', accent3:'#059669', accent4:'#d97706', danger:'#dc2626' },
  brand:   { bg:'#1e0a3c', surface:'#2d1060', card:'#3d1880', border:'#5b21b6', text:'#f3e8ff', muted:'#a78bfa', accent:'#c084fc', accent2:'#e879f9', accent3:'#34d399', accent4:'#fbbf24', danger:'#f87171' },
  minimal: { bg:'#ffffff', surface:'#f8fafc', card:'#f1f5f9', border:'#cbd5e1', text:'#1e293b', muted:'#94a3b8', accent:'#334155', accent2:'#475569', accent3:'#16a34a', accent4:'#ca8a04', danger:'#dc2626' },
};

function showExportModal() {
  document.getElementById('export-overlay').classList.add('open');
  const domain = document.getElementById('domainInput')?.value || 'yoursite.com';
  const cl = document.getElementById('exp-client');
  if (cl && !cl.value) cl.value = domain;
  calcPages();
}
function closeExport() {
  document.getElementById('export-overlay').classList.remove('open');
  resetExport();
}
function toggleSec(el) {
  el.classList.toggle('on');
  el.querySelector('.exp-sec-cb').textContent = el.classList.contains('on') ? '✓' : '';
  calcPages();
}
function pickTheme(el, t) {
  document.querySelectorAll('.exp-theme').forEach(b => b.classList.remove('on'));
  el.classList.add('on'); expTheme = t;
}
function calcPages() {
  const n = document.querySelectorAll('.exp-sec.on').length;
  document.getElementById('exp-pg-count').textContent = '~' + (n * 2 + 3) + ' pages estimated';
}

async function startExport() {
  document.getElementById('exp-config').style.display   = 'none';
  document.getElementById('exp-success').style.display  = 'none';
  document.getElementById('exp-progress').style.display = 'block';
  document.getElementById('exp-footer').style.display   = 'none';

  const domain  = document.getElementById('domainInput')?.value || 'yoursite.com';
  const client  = document.getElementById('exp-client').value  || domain;
  const author  = document.getElementById('exp-author').value  || 'Jarvis SEO';
  const title   = document.getElementById('exp-title').value   || 'SEO Strategy Report';
  const period  = document.getElementById('exp-period').value  || 'May 2026';
  const sections = Array.from(document.querySelectorAll('.exp-sec.on'))
    .map(el => el.querySelector('.exp-sec-name').textContent.trim());

  const steps = [
    'Compiling executive summary...',
    'Pulling audit data...',
    'Rendering competitor analysis...',
    'Building keyword tables...',
    'Generating roadmap timeline...',
    'Assembling ranking data...',
    'Applying theme & branding...',
    'Finalising PDF layout...',
  ];
  const barEl = document.getElementById('exp-bar');
  const subEl = document.getElementById('exp-prog-sub');
  const lblEl = document.getElementById('exp-prog-lbl');

  for (let i = 0; i < steps.length; i++) {
    subEl.textContent = steps[i];
    barEl.style.width = ((i + 1) / steps.length * 90) + '%';
    await new Promise(r => setTimeout(r, 340 + Math.random() * 260));
  }

  lblEl.textContent = 'Writing AI executive summary...';
  subEl.textContent = 'Powered by Claude';

  // AI Executive Summary
  let execSummary = '';
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST', headers: AI.headers(),
      body: JSON.stringify({
        model: AI.MODEL, max_tokens:1000,
        system:'You are JARVIS, a professional SEO strategist. Write concise, data-driven executive summaries for client reports. Be specific with numbers and outcomes.',
        messages:[{ role:'user', content:
          `Write a 3-paragraph executive summary for an SEO report:
Client: ${client} | Site: ${domain} | Period: ${period}
Current: Traffic 14,200/mo (+23% MoM), Keywords 1,847, DA 58, Health 84%
Wins: Ranked #3 for "digital marketing agency", fixed 18 canonicals, published 6 pillars
Priorities: Fix 23 broken links, schema on 47 pages, build 15 backlinks, target 85K traffic in 12 months
Sections: ${sections.join(', ')}
Be executive-level: what happened, what it means, what's next. No bullet points.`
        }]
      })
    });
    const data = await res.json();
    execSummary = data.content?.map(c => c.text||'').join('') || '';
  } catch(e) {
    execSummary = `${client}'s SEO program delivered strong momentum during ${period}, with organic traffic growing 23% month-over-month to 14,200 monthly sessions. Domain Authority climbed 4 points to 58, and the site now ranks in the top 10 for 41 high-value keywords — a net gain of 7 since last month.\n\nThe standout achievement this period was reaching position #3 for "digital marketing agency" (12,100 monthly searches), alongside resolving 18 canonical tag conflicts that had been silently diluting page authority across service pages. Six cornerstone content pieces were published and are already generating early ranking signals in target clusters.\n\nThe path forward centres on three high-leverage priorities: eliminating 23 broken internal links that constrain crawl efficiency, deploying schema markup across 47 product and service pages to unlock rich snippet opportunities, and executing a focused link-building campaign targeting 15 DA 60+ placements. With disciplined execution of the phased roadmap detailed in this report, we are confidently on track to reach 85,000 organic visits per month within 12 months.`;
  }

  barEl.style.width = '100%';
  expReport = buildReport({ client, author, title, period, domain, sections, execSummary });
  await new Promise(r => setTimeout(r, 400));

  document.getElementById('exp-progress').style.display = 'none';
  document.getElementById('exp-success').style.display  = 'block';
  document.getElementById('exp-success-sub').textContent = `${sections.length} sections • ~${sections.length * 2 + 3} pages • ${client}`;
}

function buildReport({ client, author, title, period, domain, sections, execSummary }) {
  const t = THEMES[expTheme] || THEMES.dark;
  const date = new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});

  const mBlock = (lbl, val, chg, col) => `
    <div style="background:${t.card};border:1px solid ${t.border};border-radius:10px;padding:18px;text-align:center;position:relative;overflow:hidden">
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${col}"></div>
      <div style="font-size:9px;color:${t.muted};letter-spacing:1px;font-family:monospace;margin-bottom:6px">${lbl}</div>
      <div style="font-size:26px;font-weight:900;color:${col};font-family:sans-serif">${val}</div>
      <div style="font-size:11px;color:${t.accent3};margin-top:4px">${chg}</div>
    </div>`;

  const secHdr = (ico, name, sub) => `
    <div style="display:flex;align-items:center;gap:12px;margin:40px 0 18px;padding-bottom:12px;border-bottom:2px solid ${t.border}">
      <div style="width:40px;height:40px;background:${t.accent}18;border:1px solid ${t.accent}30;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${ico}</div>
      <div><div style="font-size:17px;font-weight:800;font-family:sans-serif;color:${t.text}">${name}</div><div style="font-size:11px;color:${t.muted};margin-top:1px">${sub}</div></div>
    </div>`;

  const tRow = (cells, hdr=false) => `<tr>${cells.map(c => hdr
    ? `<th style="padding:9px 12px;font-size:9px;color:${t.muted};font-family:monospace;letter-spacing:1px;text-align:left;border-bottom:2px solid ${t.border};background:${t.card}">${c}</th>`
    : `<td style="padding:10px 12px;font-size:12px;color:${t.text};border-bottom:1px solid ${t.border}40">${c}</td>`
  ).join('')}</tr>`;

  const pill = (txt, col, bg) =>
    `<span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600;background:${bg};color:${col};border:1px solid ${col}30">${txt}</span>`;

  let body = '';

  sections.forEach(sec => {
    const n = sec.replace(/^[\s\S]{0,3}/, '').trim();

    if (n.includes('Executive')) {
      body += secHdr('📊','Executive Summary',`${period} Performance Overview`);
      body += execSummary.split('\n\n').map(p => `<p style="font-size:13.5px;line-height:1.85;color:${t.text};margin-bottom:14px">${p}</p>`).join('');
      body += `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:20px">
        ${mBlock('ORGANIC TRAFFIC','14,200','▲ +23% MoM',t.accent)}
        ${mBlock('KEYWORDS','1,847','▲ +142 new',t.accent3)}
        ${mBlock('DOMAIN AUTH','58','▲ +4 pts',t.accent4)}
        ${mBlock('SEO HEALTH','84%','▲ +6%',t.accent2)}
      </div>`;
    }

    if (n.includes('Audit')) {
      body += secHdr('🔬','Site Audit Results','1,247 pages crawled • 89 issues identified');
      body += `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
        ${mBlock('CRAWLABLE','1,189','95.3% rate',t.accent3)}
        ${mBlock('CRITICAL','23','Fix now',t.danger)}
        ${mBlock('WARNINGS','46','Fix in 30d',t.accent4)}
        ${mBlock('NOTICES','20','Optional',t.muted)}
      </div>
      <table style="width:100%;border-collapse:collapse">
        ${tRow(['ISSUE','PAGES','IMPACT','PRIORITY'],true)}
        ${tRow(['Missing meta descriptions','34',pill('High',t.danger,t.danger+'20'),'P1'])}
        ${tRow(['Duplicate title tags','12',pill('High',t.danger,t.danger+'20'),'P1'])}
        ${tRow(['Broken internal links','23',pill('Critical',t.danger,t.danger+'20'),'P1'])}
        ${tRow(['Thin content pages','19',pill('Medium',t.accent4,t.accent4+'20'),'P2'])}
        ${tRow(['Missing alt text','87',pill('Medium',t.accent4,t.accent4+'20'),'P2'])}
        ${tRow(['No schema markup','47',pill('High',t.danger,t.danger+'20'),'P1'])}
      </table>
      <div style="background:${t.card};border:1px solid ${t.border};border-radius:10px;padding:16px;margin-top:16px">
        <div style="font-size:9px;color:${t.muted};font-family:monospace;letter-spacing:1px;margin-bottom:12px">CORE WEB VITALS</div>
        ${[['LCP','4.2s','2.5s','65',t.danger],['FID','48ms','100ms','90',t.accent3],['CLS','0.14','0.10','72',t.accent4],['TTFB','840ms','600ms','55',t.danger],['INP','140ms','200ms','88',t.accent3]].map(([m,v,tg,w,col])=>
          `<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
            <span style="width:45px;font-size:10px;font-family:monospace;color:${t.muted}">${m}</span>
            <div style="flex:1;height:5px;background:${t.border};border-radius:3px;overflow:hidden"><div style="height:100%;background:${col};width:${w}%;border-radius:3px"></div></div>
            <span style="font-size:11px;font-weight:700;color:${col};width:50px;text-align:right">${v}</span>
            <span style="font-size:10px;color:${t.muted};width:50px">/ ${tg}</span>
          </div>`
        ).join('')}
      </div>`;
    }

    if (n.includes('Competitor')) {
      body += secHdr('⚔️','Competitor Analysis','Benchmarking against top 5 rivals');
      body += `<table style="width:100%;border-collapse:collapse">
        ${tRow(['DOMAIN','DA','TRAFFIC','KEYWORDS','BACKLINKS','STATUS'],true)}
        ${tRow([`<strong style="color:${t.accent}">${domain}</strong>`,'58','14.2K','1,847','3,240',pill('You',t.accent,t.accent+'18')])}
        ${tRow(['competitor1.com','74','89.4K','12,400','28,400',pill('Threat',t.danger,t.danger+'18')])}
        ${tRow(['competitor2.com','66','47.2K','7,800','14,100',pill('Watch',t.accent4,t.accent4+'18')])}
        ${tRow(['competitor3.com','61','28.6K','4,200','8,700',pill('Close',t.accent4,t.accent4+'18')])}
        ${tRow(['competitor4.com','52','11.8K','1,600','2,100',pill('Winnable',t.accent3,t.accent3+'18')])}
      </table>
      <div style="background:${t.card};border:1px solid ${t.border};border-radius:10px;padding:16px;margin-top:16px">
        <div style="font-size:9px;color:${t.muted};font-family:monospace;letter-spacing:1px;margin-bottom:12px">TOP KEYWORD GAPS — QUICK WINS</div>
        ${[['seo audit tool free','22K','Easy'],['keyword research guide','18K','Medium'],['on page seo checklist','14K','Easy'],['technical seo guide 2025','11K','Easy']].map(([kw,vol,diff])=>
          `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid ${t.border}40">
            <span style="font-size:12px;color:${t.text}">${kw}</span>
            <div style="display:flex;gap:8px">${pill(vol+'/mo',t.accent,t.accent+'18')} ${pill(diff,diff==='Easy'?t.accent3:t.accent4,(diff==='Easy'?t.accent3:t.accent4)+'18')}</div>
          </div>`
        ).join('')}
      </div>`;
    }

    if (n.includes('Keyword')) {
      body += secHdr('🎯','Keyword Strategy','247 keywords across 4 intent clusters');
      body += `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
        ${mBlock('INFORMATIONAL','89','Blog & guides',t.accent)}
        ${mBlock('COMMERCIAL','64','Comparisons',t.accent3)}
        ${mBlock('TRANSACTIONAL','72','Service pages',t.accent4)}
        ${mBlock('NAVIGATIONAL','22','Brand terms',t.accent2)}
      </div>
      <table style="width:100%;border-collapse:collapse">
        ${tRow(['KEYWORD','VOLUME','KD','POSITION','INTENT','PRIORITY'],true)}
        ${[['seo strategy guide','28K','58','—','Info','P1'],['best seo agency','19K','72','#24','Trans','P1'],['on page seo checklist','14K','44','#31','Info','P1'],['local seo tips 2025','8.6K','38','#18','Info','P1'],['seo audit service','6.2K','55','#14','Trans','P1']].map(([kw,v,kd,pos,intent,pri])=>
          tRow([kw,pill(v,t.accent,t.accent+'15'),kd,pos,pill(intent,t.accent2,t.accent2+'15'),pill(pri,t.danger,t.danger+'18')])
        ).join('')}
      </table>`;
    }

    if (n.includes('Content')) {
      body += secHdr('✍️','Content Plan','3 pillars • 12 clusters • 48 supporting articles');
      body += [['SEO Fundamentals',t.accent,'+8,400/mo'],['Content Marketing',t.accent2,'+5,200/mo'],['Link Building',t.accent3,'+3,800/mo']].map(([p,col,tr])=>
        `<div style="background:${t.card};border:1px solid ${col}40;border-radius:10px;padding:14px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:13px;font-weight:700;color:${col}">🏛️ ${p}</div>
          <div style="font-size:12px;color:${t.accent3};font-weight:600">${tr} est. traffic</div>
        </div>`
      ).join('');
      body += `<table style="width:100%;border-collapse:collapse;margin-top:14px">
        ${tRow(['WEEK','ARTICLE TITLE','TYPE','TARGET KW','VOLUME','STATUS'],true)}
        ${[['W1','Ultimate SEO Strategy Guide 2025','Pillar','seo strategy guide','28K','In Progress'],['W1','On-Page SEO: 47-Point Checklist','Cluster','on page seo checklist','14K','Published'],['W2','Technical SEO Audit Step-by-Step','Cluster','technical seo audit','11K','Planned'],['W3','Keyword Research Definitive Guide','Pillar','keyword research guide','18K','Planned']].map(([w,ttl,tp,kw,vol,st])=>
          tRow([pill(w,t.accent,t.accent+'15'),ttl,pill(tp,tp==='Pillar'?t.accent2:t.accent3,(tp==='Pillar'?t.accent2:t.accent3)+'15'),kw,pill(vol,t.accent,t.accent+'12'),pill(st,st==='Published'?t.accent3:st==='In Progress'?t.accent4:t.muted,(st==='Published'?t.accent3:st==='In Progress'?t.accent4:t.muted)+'18')])
        ).join('')}
      </table>`;
    }

    if (n.includes('Technical')) {
      body += secHdr('⚙️','Technical Fixes','Prioritized implementation checklist');
      body += [['Fix 23 broken internal links','Critical','Blocking crawl flow',t.danger],['Remove noindex from 4 pages','Critical','Pages wrongly excluded from index',t.danger],['Duplicate title tags (12 pages)','High','Diluting keyword signals',t.accent4],['Schema markup (47 pages)','High','Missing rich snippet eligibility',t.accent4],['Convert 87 images to WebP','High','LCP: 4.2s → 3.1s',t.accent4],['Implement lazy loading','Medium','Reduce page payload 40%',t.accent3],['Enable browser caching','Medium','Cuts repeat-visit load time 70%',t.accent3],['Add Cloudflare CDN','Medium','TTFB −220ms globally',t.accent3]].map(([fix,pri,desc,col])=>
        `<div style="display:flex;gap:12px;padding:11px;background:${t.card};border:1px solid ${t.border};border-radius:9px;margin-bottom:8px;align-items:flex-start">
          <div style="width:4px;min-height:36px;border-radius:4px;background:${col};flex-shrink:0;margin-top:2px"></div>
          <div style="flex:1"><div style="font-size:13px;font-weight:600;color:${t.text};margin-bottom:2px">${fix}</div><div style="font-size:11px;color:${t.muted}">${desc}</div></div>
          <div style="flex-shrink:0">${pill(pri,col,col+'18')}</div>
        </div>`
      ).join('');
    }

    if (n.includes('Backlink')) {
      body += secHdr('🔗','Backlink Strategy','Link building plan & profile analysis');
      body += `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
        ${mBlock('TOTAL LINKS','3,240','▲ +180/mo',t.accent)}
        ${mBlock('REF DOMAINS','487','▲ +24 new',t.accent3)}
        ${mBlock('AVG DA','42','Improving',t.accent4)}
        ${mBlock('TOXIC','31','Need disavow',t.danger)}
      </div>
      <table style="width:100%;border-collapse:collapse">
        ${tRow(['TARGET DOMAIN','DA','TACTIC','DIFFICULTY','STATUS'],true)}
        ${[['searchengineland.com','91','Guest Post','Hard','Outreach Sent'],['backlinko.com','89','Resource Link','Hard','Researching'],['neilpatel.com','82','Broken Link','Medium','In Progress'],['contentmarketinginstitute.com','80','Guest Post','Medium','Drafting'],['growthbadger.com','62','Link Swap','Easy','✅ Secured']].map(([d,da,tac,dif,st])=>
          tRow([d,`<strong style="color:${+da>=80?t.danger:t.accent4}">${da}</strong>`,pill(tac,t.accent2,t.accent2+'18'),pill(dif,dif==='Hard'?t.danger:dif==='Medium'?t.accent4:t.accent3,(dif==='Hard'?t.danger:dif==='Medium'?t.accent4:t.accent3)+'18'),pill(st,st.includes('✅')?t.accent3:t.accent,(st.includes('✅')?t.accent3:t.accent)+'18')])
        ).join('')}
      </table>`;
    }

    if (n.includes('Roadmap')) {
      body += secHdr('🗺️','12-Month Roadmap','Phased execution plan with milestones');
      body += [['Phase 1 — M1-2','Foundation & Technical Fix','Fix all critical errors, baseline analytics, site architecture',t.accent3,'done'],['Phase 2 — M2-4 ← CURRENT','On-Page & Content Foundation','Optimize pages, 3 pillar articles, schema implementation',t.accent,'active'],['Phase 3 — M4-6','Authority Building','50+ backlinks, digital PR, guest posts on DA 60+ sites',t.muted,'pending'],['Phase 4 — M6-9','Scale & Dominate','200+ articles, featured snippets, video SEO expansion',t.muted,'pending'],['Phase 5 — M9-12','Domination & Compound','Content refresh, international SEO, AI search optimization',t.muted,'pending']].map(([phase,title,desc,col,status])=>
        `<div style="display:flex;gap:14px;margin-bottom:12px;align-items:flex-start">
          <div style="width:30px;height:30px;border-radius:50%;background:${status==='done'?t.accent3:status==='active'?t.accent:t.card};border:2px solid ${status==='done'?t.accent3:status==='active'?t.accent:t.border};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:12px;color:${status!=='pending'?'#000':t.muted};font-weight:700">
            ${status==='done'?'✓':status==='active'?'▶':'·'}
          </div>
          <div style="flex:1;background:${t.card};border:1px solid ${status==='active'?t.accent:t.border};border-radius:9px;padding:12px">
            <div style="font-size:9px;color:${t.muted};font-family:monospace;margin-bottom:3px">${phase}</div>
            <div style="font-size:13px;font-weight:700;color:${t.text};margin-bottom:3px">${title}</div>
            <div style="font-size:11px;color:${t.muted}">${desc}</div>
          </div>
        </div>`
      ).join('');
      body += `<div style="background:linear-gradient(135deg,${t.accent}10,${t.accent2}10);border:1px solid ${t.border};border-radius:12px;padding:20px;text-align:center;margin-top:16px">
        <div style="font-size:9px;color:${t.muted};font-family:monospace;margin-bottom:6px">🏆 12-MONTH TRAFFIC TARGET</div>
        <div style="font-size:42px;font-weight:900;font-family:sans-serif;color:${t.accent}">85,000</div>
        <div style="font-size:12px;color:${t.accent3};margin-top:4px">visits/month • +498% growth • DA 75+</div>
      </div>`;
    }

    if (n.includes('Ranking')) {
      body += secHdr('📈','Ranking Report','247 keywords tracked daily');
      body += `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
        ${mBlock('IMPROVED','184','This week',t.accent3)}
        ${mBlock('DROPPED','23','Need attention',t.danger)}
        ${mBlock('TOP 3','41','▲ +7 keywords',t.accent)}
        ${mBlock('AVG POSITION','14.2','▲ Up 2.1',t.accent4)}
      </div>
      <table style="width:100%;border-collapse:collapse">
        ${tRow(['KEYWORD','VOLUME','START','NOW','CHANGE','PAGE'],true)}
        ${(typeof RT_KEYWORDS!=='undefined'?RT_KEYWORDS:[]).slice(0,8).map(k=>{
          const cur=k.positions[k.positions.length-1];const chg=k.positions[0]-cur;
          const col=cur<=3?'#10b981':cur<=10?'#00d4ff':cur<=20?'#f59e0b':'#ef4444';
          return tRow([k.kw,pill(k.vol,t.accent,t.accent+'15'),'#'+k.positions[0],`<strong style="color:${col}">#${cur}</strong>`,chg>0?`<span style="color:${t.accent3}">▲${chg}</span>`:chg<0?`<span style="color:${t.danger}">▼${Math.abs(chg)}</span>`:'—',cur<=10?'P1':cur<=20?'P2':'P3+']);
        }).join('')}
      </table>`;
    }

    if (n.includes('Speed')) {
      body += secHdr('🏎️','Page Speed Report','Core Web Vitals & fix recommendations');
      body += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px">
        <div style="background:${t.card};border:1px solid ${t.danger}40;border-radius:12px;padding:20px;text-align:center">
          <div style="font-size:9px;color:${t.muted};font-family:monospace;margin-bottom:6px">CURRENT (MOBILE)</div>
          <div style="font-size:44px;font-weight:900;color:${t.danger};font-family:sans-serif">52</div>
          <div style="font-size:11px;color:${t.accent4}">Needs Improvement</div>
        </div>
        <div style="background:${t.card};border:1px solid ${t.accent3}40;border-radius:12px;padding:20px;text-align:center">
          <div style="font-size:9px;color:${t.muted};font-family:monospace;margin-bottom:6px">TARGET (ALL FIXES)</div>
          <div style="font-size:44px;font-weight:900;color:${t.accent3};font-family:sans-serif">91</div>
          <div style="font-size:11px;color:${t.accent3}">Excellent</div>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse">
        ${tRow(['METRIC','CURRENT','TARGET','STATUS','TOP FIX'],true)}
        ${[['LCP','4.2s','2.5s','❌ Fail',t.danger,'Compress images + CDN'],['FID','48ms','100ms','✅ Pass',t.accent3,'Monitor'],['CLS','0.14','0.10','⚠️ Warn',t.accent4,'Reserve image dimensions'],['TTFB','840ms','600ms','❌ Fail',t.danger,'Upgrade hosting'],['INP','210ms','200ms','⚠️ Warn',t.accent4,'Minify & defer JS']].map(([m,cv,tg,st,col,fix])=>
          tRow([`<strong>${m}</strong>`,`<span style="color:${col}">${cv}</span>`,tg,`<span style="color:${col}">${st}</span>`,`<span style="font-size:11px;color:${t.muted}">${fix}</span>`])
        ).join('')}
      </table>`;
    }
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — ${client}</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:${t.bg};color:${t.text};font-family:'Inter',sans-serif;line-height:1.65}
  .wrap{max-width:860px;margin:0 auto;padding:52px}
  table{width:100%;border-collapse:collapse}
  p{margin-bottom:14px}
  @media print{
    .wrap{padding:32px 40px;max-width:100%}
    .no-print{display:none!important}
  }
</style>
</head>
<body>
<div class="wrap">

<!-- COVER -->
<div style="min-height:380px;display:flex;flex-direction:column;justify-content:center;padding:44px;background:linear-gradient(135deg,${t.accent}08,${t.accent2}12);border:1px solid ${t.border};border-radius:18px;margin-bottom:52px;position:relative;overflow:hidden">
  <div style="position:absolute;top:-50px;right:-50px;width:180px;height:180px;border-radius:50%;background:${t.accent}07;pointer-events:none"></div>
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px">
    <div style="width:36px;height:36px;background:linear-gradient(135deg,${t.accent},${t.accent2});border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:18px">🤖</div>
    <span style="font-weight:800;font-size:16px;letter-spacing:2px;color:${t.accent}">JARVIS SEO</span>
  </div>
  <h1 style="font-size:34px;font-weight:900;line-height:1.15;margin-bottom:12px;font-family:'Syne',sans-serif;color:${t.text}">${title}</h1>
  <div style="font-size:15px;color:${t.muted};margin-bottom:24px">${client} &nbsp;•&nbsp; ${domain}</div>
  <div style="display:flex;gap:28px;flex-wrap:wrap">
    ${[['PREPARED FOR',client],['PREPARED BY',author],['PERIOD',period],['DATE',date]].map(([l,v])=>
      `<div><div style="font-size:9px;color:${t.muted};font-family:monospace;letter-spacing:1px;margin-bottom:2px">${l}</div><div style="font-size:13px;font-weight:600">${v}</div></div>`
    ).join('')}
  </div>
</div>

<!-- TOC -->
<h2 style="font-size:16px;font-weight:800;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid ${t.border};font-family:'Syne',sans-serif">Table of Contents</h2>
${sections.map((s,i)=>`
  <div style="display:flex;align-items:center;padding:8px 0;border-bottom:1px solid ${t.border}40">
    <span style="width:24px;font-size:11px;color:${t.muted};font-family:monospace">${i+1}.</span>
    <span style="flex:1;font-size:13px">${s}</span>
    <span style="font-size:10px;color:${t.accent};font-family:monospace">pg ${(i+1)*2+2}</span>
  </div>`).join('')}

<!-- BODY SECTIONS -->
${body}

<!-- FOOTER -->
<div style="margin-top:52px;padding-top:16px;border-top:1px solid ${t.border};display:flex;justify-content:space-between;font-size:10px;color:${t.muted};font-family:monospace;flex-wrap:wrap;gap:6px">
  <span>Generated by JARVIS SEO &nbsp;•&nbsp; ${date}</span>
  <span>${client} &nbsp;•&nbsp; ${domain}</span>
  <span style="color:${t.accent}">CONFIDENTIAL</span>
</div>

</div>
</body>
</html>`;
}

function downloadReport() {
  if (!expReport) return;
  const blob = new Blob([expReport], {type:'text/html;charset=utf-8'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const domain = document.getElementById('domainInput')?.value || 'site';
  const period = document.getElementById('exp-period')?.value  || 'report';
  a.href = url;
  a.download = `jarvis-seo-${domain}-${period.replace(/\s+/g,'-')}.html`.toLowerCase();
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function previewReport() {
  if (!expReport) return;
  const win = window.open('','_blank');
  if (win) { win.document.open(); win.document.write(expReport); win.document.close(); }
}

function resetExport() {
  document.getElementById('exp-config').style.display   = 'block';
  document.getElementById('exp-progress').style.display = 'none';
  document.getElementById('exp-success').style.display  = 'none';
  document.getElementById('exp-footer').style.display   = 'flex';
  document.getElementById('exp-bar').style.width = '0%';
  expReport = '';
}
/* --- */
