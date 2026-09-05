import {
  RankTrackerMock, SiteAuditMock, KeywordExplorerMock,
  ContentGapMock, ArticleWriterMock, AgencyViewMock,
} from '../components/mocks'

export interface FeatureSlide {
  id: string
  label: string
  title: string
  blurb: string
  Panel: () => React.ReactElement
}

export const featureSlides: FeatureSlide[] = [
  {
    id: 'tracker', label: 'Rank Tracker',
    title: 'Watch every position move, daily.',
    blurb: 'Track keywords by location and device, with Search Console clicks layered on top so you see rankings and reality together.',
    Panel: RankTrackerMock,
  },
  {
    id: 'audit', label: 'Site Audit',
    title: 'Find what is quietly capping the site.',
    blurb: 'Crawl every page and score it — titles, canonicals, broken links, alt text, Core Web Vitals — then hand the team an ordered fix list.',
    Panel: SiteAuditMock,
  },
  {
    id: 'keywords', label: 'Keyword Explorer',
    title: 'One seed keyword, hundreds of angles.',
    blurb: 'Expand any term into related queries, then enrich each with volume, difficulty and CPC from your own data provider.',
    Panel: KeywordExplorerMock,
  },
  {
    id: 'gap', label: 'Content Gap',
    title: 'Everything they rank for and you miss.',
    blurb: 'Compare yourself against up to three competitors and surface the keywords worth taking, ranked by opportunity.',
    Panel: ContentGapMock,
  },
  {
    id: 'writer', label: 'Article Writer',
    title: 'Drafts that arrive already optimised.',
    blurb: 'Generate long-form articles with outline control and a live SEO score — using your own Claude or OpenRouter key.',
    Panel: ArticleWriterMock,
  },
  {
    id: 'agency', label: 'Agency View',
    title: 'Every client domain on one screen.',
    blurb: 'Portfolio health at a glance, so you know which account needs attention before the client calls to ask.',
    Panel: AgencyViewMock,
  },
]
