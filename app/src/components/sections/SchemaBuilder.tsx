import { useState } from 'react'
import { Copy, Check, CheckCircle2 } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

type SchemaType = 'Article' | 'LocalBusiness' | 'Product' | 'FAQ' | 'BreadcrumbList' | 'Organization'

interface Field { id: string; label: string; placeholder: string; required?: boolean }

const SCHEMAS: Record<SchemaType, { description: string; fields: Field[] }> = {
  Article: {
    description: 'Blog posts, news articles, and editorial content',
    fields: [
      { id: 'headline',     label: 'Article Headline',  placeholder: 'Complete Guide to Technical SEO', required: true },
      { id: 'author',       label: 'Author Name',       placeholder: 'John Smith', required: true },
      { id: 'datePublished',label: 'Date Published',    placeholder: '2025-05-14', required: true },
      { id: 'dateModified', label: 'Date Modified',     placeholder: '2025-05-14' },
      { id: 'image',        label: 'Image URL',         placeholder: 'https://site.com/image.jpg' },
      { id: 'description',  label: 'Description',       placeholder: 'A comprehensive guide...' },
    ],
  },
  LocalBusiness: {
    description: 'Local businesses, restaurants, agencies, and service providers',
    fields: [
      { id: 'name',      label: 'Business Name',   placeholder: 'My SEO Agency', required: true },
      { id: 'address',   label: 'Street Address',  placeholder: '123 Main St', required: true },
      { id: 'city',      label: 'City',            placeholder: 'New York', required: true },
      { id: 'phone',     label: 'Phone Number',    placeholder: '+1 (555) 123-4567' },
      { id: 'url',       label: 'Website URL',     placeholder: 'https://agency.com' },
      { id: 'priceRange',label: 'Price Range',     placeholder: '$$$' },
    ],
  },
  Product: {
    description: 'E-commerce products with price and availability',
    fields: [
      { id: 'name',        label: 'Product Name',  placeholder: 'SEO Audit Tool Pro', required: true },
      { id: 'description', label: 'Description',   placeholder: 'Professional SEO audit software', required: true },
      { id: 'price',       label: 'Price',         placeholder: '97.00', required: true },
      { id: 'currency',    label: 'Currency',      placeholder: 'USD' },
      { id: 'availability',label: 'Availability',  placeholder: 'InStock' },
      { id: 'image',       label: 'Image URL',     placeholder: 'https://site.com/product.jpg' },
    ],
  },
  FAQ: {
    description: 'FAQ pages — generates rich results in Google SERPs',
    fields: [
      { id: 'q1', label: 'Question 1', placeholder: 'What is technical SEO?', required: true },
      { id: 'a1', label: 'Answer 1',   placeholder: 'Technical SEO refers to...', required: true },
      { id: 'q2', label: 'Question 2', placeholder: 'How long does SEO take?' },
      { id: 'a2', label: 'Answer 2',   placeholder: 'Most sites see results in 3-6 months...' },
      { id: 'q3', label: 'Question 3', placeholder: 'What is link building?' },
      { id: 'a3', label: 'Answer 3',   placeholder: 'Link building is the process of...' },
    ],
  },
  BreadcrumbList: {
    description: 'Navigation breadcrumbs for site structure signals',
    fields: [
      { id: 'l1n', label: 'Level 1 Name', placeholder: 'Home',     required: true },
      { id: 'l1u', label: 'Level 1 URL',  placeholder: 'https://site.com', required: true },
      { id: 'l2n', label: 'Level 2 Name', placeholder: 'Blog',     required: true },
      { id: 'l2u', label: 'Level 2 URL',  placeholder: 'https://site.com/blog', required: true },
      { id: 'l3n', label: 'Level 3 Name', placeholder: 'Current Page' },
      { id: 'l3u', label: 'Level 3 URL',  placeholder: 'https://site.com/blog/post' },
    ],
  },
  Organization: {
    description: 'Company / brand knowledge panel signals',
    fields: [
      { id: 'name',     label: 'Organization Name', placeholder: 'Acme SEO Agency', required: true },
      { id: 'url',      label: 'Website',           placeholder: 'https://agency.com', required: true },
      { id: 'logo',     label: 'Logo URL',          placeholder: 'https://agency.com/logo.png' },
      { id: 'twitter',  label: 'Twitter URL',       placeholder: 'https://twitter.com/agency' },
      { id: 'linkedin', label: 'LinkedIn URL',      placeholder: 'https://linkedin.com/company/agency' },
      { id: 'phone',    label: 'Phone',             placeholder: '+1 (555) 123-4567' },
    ],
  },
}

function buildSchema(type: SchemaType, values: Record<string, string>): string {
  const v = (id: string) => values[id] || ''
  const schemas: Record<SchemaType, object> = {
    Article: { '@context':'https://schema.org', '@type':'Article', headline:v('headline'), author:{'@type':'Person',name:v('author')}, datePublished:v('datePublished'), dateModified:v('dateModified')||v('datePublished'), image:v('image'), description:v('description') },
    LocalBusiness: { '@context':'https://schema.org', '@type':'LocalBusiness', name:v('name'), address:{'@type':'PostalAddress',streetAddress:v('address'),addressLocality:v('city')}, telephone:v('phone'), url:v('url'), priceRange:v('priceRange') },
    Product: { '@context':'https://schema.org', '@type':'Product', name:v('name'), description:v('description'), image:v('image'), offers:{'@type':'Offer',price:v('price'),priceCurrency:v('currency')||'USD',availability:'https://schema.org/'+v('availability')||'InStock'} },
    FAQ: { '@context':'https://schema.org', '@type':'FAQPage', mainEntity:[...[1,2,3].filter(n=>v(`q${n}`)).map(n=>({'@type':'Question',name:v(`q${n}`),acceptedAnswer:{'@type':'Answer',text:v(`a${n}`)}}))].filter(q=>q.name) },
    BreadcrumbList: { '@context':'https://schema.org', '@type':'BreadcrumbList', itemListElement:[...[1,2,3].filter(n=>v(`l${n}n`)).map((n,i)=>({'@type':'ListItem',position:i+1,name:v(`l${n}n`),item:v(`l${n}u`)}))] },
    Organization: { '@context':'https://schema.org', '@type':'Organization', name:v('name'), url:v('url'), logo:v('logo'), sameAs:[v('twitter'),v('linkedin')].filter(Boolean), telephone:v('phone') },
  }
  return JSON.stringify(schemas[type], null, 2)
}

const TYPES: SchemaType[] = ['Article','LocalBusiness','Product','FAQ','BreadcrumbList','Organization']

export function SchemaBuilder() {
  const [activeType, setActiveType] = useState<SchemaType>('Article')
  const [values, setValues] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState(false)

  const schema = buildSchema(activeType, values)

  function copySchema() {
    navigator.clipboard.writeText(`<script type="application/ld+json">\n${schema}\n</script>`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-5">
      {/* Type selector */}
      <div className="flex gap-2 flex-wrap">
        {TYPES.map(t => (
          <button key={t} onClick={() => { setActiveType(t); setValues({}) }}
            className={cn(
              'px-4 py-2 rounded-lg text-[11px] font-semibold cursor-pointer transition-all',
              activeType === t ? 'bg-accent text-black' : 'border border-border text-muted hover:border-accent'
            )}
          >{t}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Fields */}
        <Card>
          <CardTitle className="mb-1">{activeType} Schema</CardTitle>
          <div className="text-[11px] text-muted mb-4">{SCHEMAS[activeType].description}</div>
          <div className="space-y-3">
            {SCHEMAS[activeType].fields.map(f => (
              <div key={f.id}>
                <label className="text-[10px] text-muted font-mono-jarvis tracking-widest block mb-1">
                  {f.label.toUpperCase()}{f.required && <span className="text-danger ml-1">*</span>}
                </label>
                <input
                  value={values[f.id] || ''}
                  onChange={e => setValues(prev => ({ ...prev, [f.id]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx outline-none focus:border-accent transition-colors"
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Output */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <CardTitle>Generated Schema</CardTitle>
            <Button variant="ghost" className="text-[11px]" onClick={copySchema}>
              {copied ? <Check size={12}/> : <Copy size={12}/>}
              {copied ? 'Copied!' : 'Copy Script Tag'}
            </Button>
          </div>
          <pre className="bg-surface border border-border rounded-xl p-4 text-[11px] text-accent3 font-mono-jarvis overflow-x-auto scrollbar-thin leading-relaxed">
            {`<script type="application/ld+json">`}
            {'\n'}{schema}{'\n'}
            {'</script>'}
          </pre>
          <div className="mt-3 p-3 bg-[#10b98110] border border-[#10b98130] rounded-lg text-[11px] text-accent3">
            <CheckCircle2 size={11} className="inline mr-1" />Paste this inside the {'<head>'} of your page. Test at search.google.com/test/rich-results
          </div>
        </Card>
      </div>
    </div>
  )
}
