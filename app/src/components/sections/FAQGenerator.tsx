import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { HelpCircle, Loader2, Copy, Check, ChevronDown, ChevronUp, Code2 } from 'lucide-react'
import { callClaude, isAIReady } from '@/lib/ai'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

interface FAQ { q: string; a: string }


function buildSchema(keyword: string, faqs: FAQ[]) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    name: keyword,
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }, null, 2)
}

export function FAQGenerator() {
  const [keyword,    setKeyword]    = useState('')
  const [url,        setUrl]        = useState('')
  const [count,      setCount]      = useState(6)
  const [faqs,       setFaqs]       = useState<FAQ[]>([])
  const [expanded,   setExpanded]   = useState<number | null>(0)
  const [showSchema, setShowSchema] = useState(false)
  const [copied,     setCopied]     = useState<'faq' | 'schema' | null>(null)

  const generate = useMutation({
    mutationFn: async () => {
      return callClaude(
        'You are an iGaming SEO expert generating FAQ content for UK casino affiliate sites. Write E-E-A-T compliant, accurate FAQs.',
        `Generate ${count} FAQ pairs for the UK casino keyword: "${keyword}"
Page URL: ${url}

Requirements:
- Questions should match real user search intent for UK casino players
- Answers should be 2-4 sentences, specific, and reference UKGC regulations where relevant
- Include questions about: bonus terms, safety/licensing, payment methods, game types, or responsible gambling as appropriate
- Answers must be factually accurate for the UK iGaming market in 2026

Return JSON array only:
[{"q":"Question text?","a":"Detailed answer text."}]`,
        1200,
      )
    },
    onSuccess: (data) => {
      if (data) {
        try {
          const match = data.match(/\[[\s\S]*\]/)
          if (match) { setFaqs(JSON.parse(match[0]) as FAQ[]); setExpanded(0) }
        } catch { /* keep */ }
      }
    },
  })

  const schema = buildSchema(keyword, faqs)

  function copy(type: 'faq' | 'schema') {
    const text = type === 'schema'
      ? `<script type="application/ld+json">\n${schema}\n</script>`
      : faqs.map(f => `Q: ${f.q}\nA: ${f.a}`).join('\n\n')
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-5">
      {/* Input */}
      <Card>
        <CardTitle className="mb-4">AI FAQ Generator</CardTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="md:col-span-1">
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">TARGET KEYWORD</div>
            <input value={keyword} onChange={e => setKeyword(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors" />
          </div>
          <div className="md:col-span-1">
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">PAGE URL (for schema)</div>
            <input value={url} onChange={e => setUrl(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors" />
          </div>
          <div>
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">NUMBER OF FAQS</div>
            <div className="flex gap-1">
              {[4, 6, 8, 10].map(n => (
                <button key={n} onClick={() => setCount(n)}
                  className={`flex-1 py-2 rounded-lg text-[11px] font-semibold cursor-pointer transition-all border ${
                    count === n ? 'bg-accent text-black border-accent' : 'border-border text-muted hover:border-accent'
                  }`}>{n}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={() => generate.mutate()} disabled={generate.isPending}>
            {generate.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
            {generate.isPending ? 'Generating FAQs…' : `Generate ${count} FAQs`}
          </Button>
          {!isAIReady() && <span className="text-[11px] text-muted">Add an AI key in Onboarding to generate FAQs.</span>}
        </div>
      </Card>

      {faqs.length > 0 && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* FAQ accordion */}
            <Card className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CardTitle>FAQ Preview</CardTitle>
                  <Badge variant="accent">{faqs.length} questions</Badge>
                </div>
                <Button variant="ghost" className="text-[11px]" onClick={() => copy('faq')}>
                  {copied === 'faq' ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy text</>}
                </Button>
              </div>

              <div className="space-y-2">
                {faqs.map((faq, i) => (
                  <div key={i} className="border border-border rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpanded(expanded === i ? null : i)}
                      className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-surface transition-colors cursor-pointer"
                    >
                      <div className="w-5 h-5 rounded-full bg-[#00d4ff15] flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[9px] font-bold text-accent">Q</span>
                      </div>
                      <div className="flex-1 text-sm font-semibold text-tx leading-snug">{faq.q}</div>
                      {expanded === i
                        ? <ChevronUp size={14} className="text-muted shrink-0 mt-0.5" />
                        : <ChevronDown size={14} className="text-muted shrink-0 mt-0.5" />
                      }
                    </button>
                    {expanded === i && (
                      <div className="px-4 pb-4 pt-1 border-t border-border bg-surface">
                        <div className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-[#10b98115] flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-[9px] font-bold text-accent3">A</span>
                          </div>
                          <div className="text-sm text-muted leading-relaxed">{faq.a}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Schema panel */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Code2 size={14} className="text-accent" />
                  <CardTitle>JSON-LD Schema</CardTitle>
                </div>
                <Button variant="ghost" className="text-[10px]" onClick={() => setShowSchema(s => !s)}>
                  {showSchema ? 'Hide' : 'Show'}
                </Button>
              </div>

              <div className="p-3 bg-surface border border-border rounded-lg mb-3">
                <div className="text-[10px] text-muted font-mono-jarvis mb-2">Add to your page &lt;head&gt;:</div>
                <div className="bg-code rounded-lg p-3 text-[10px] font-mono-jarvis text-accent3 mb-3">
                  {'<script type="application/ld+json">'}
                  {showSchema ? (
                    <pre className="mt-1 text-[9px] text-muted overflow-x-auto whitespace-pre-wrap">{schema}</pre>
                  ) : (
                    <span className="text-muted"> … </span>
                  )}
                  {'</script>'}
                </div>
                <Button variant="primary" className="w-full justify-center text-[11px]" onClick={() => copy('schema')}>
                  {copied === 'schema' ? <><Check size={11} /> Copied!</> : <><Copy size={11} /> Copy Schema Code</>}
                </Button>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] text-muted font-mono-jarvis tracking-widest">SCHEMA DETAILS</div>
                {[
                  { label: 'Type',       val: 'FAQPage' },
                  { label: 'Questions',  val: faqs.length },
                  { label: 'Keyword',    val: keyword },
                  { label: 'Valid',      val: faqs.length > 0 ? 'Yes' : 'No' },
                ].map(r => (
                  <div key={r.label} className="flex justify-between text-xs">
                    <span className="text-muted">{r.label}</span>
                    <span className="text-tx font-mono-jarvis">{String(r.val)}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-[#10b98110] border border-[#10b98130] rounded-lg">
                <div className="text-[10px] text-accent3 font-mono-jarvis tracking-widest mb-1">SERP BENEFIT</div>
                <div className="text-xs text-muted leading-relaxed">
                  FAQPage schema can generate expandable Q&A rich results in Google, increasing your SERP real estate by up to 300% for casino queries.
                </div>
              </div>
            </Card>
          </div>
        </>
      )}

      {faqs.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <HelpCircle size={40} className="mb-3 text-muted" strokeWidth={1} />
          <div className="text-sm text-muted">Enter a keyword and click Generate FAQs</div>
        </div>
      )}
    </div>
  )
}
