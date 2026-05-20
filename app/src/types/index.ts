export interface Site {
  id: number
  name: string
  domain: string
  score: number
  traffic: string
  keys: number
  issues: number
  status: 'good' | 'warning' | 'danger'
  country?: string
  client?: string
  notes?: string
}

export interface Task {
  id: number
  title: string
  assignee: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  done: boolean
  section: string
  created: string
}

export interface Schedule {
  name: string
  freq: string
  day: string
  time: string
  emails: string
  active: boolean
  next: string
}

export interface Keyword {
  id: number
  kw: string
  vol: string
  intent: 'Info' | 'Comm' | 'Trans' | 'Nav'
  positions: number[]
  best: number
  url: string
}

export interface VoiceEntry {
  text: string
  reply: string
  time: string
}

export interface WPSite {
  id: number
  name: string
  url: string
  username: string
  appPassword: string
  status: 'connected' | 'error' | 'untested'
  postCount: number
  lastPublished: string
}

export type NavSection =
  | 'dashboard' | 'analyzer' | 'competitors' | 'keywords'
  | 'content'   | 'technical' | 'backlinks'  | 'roadmap'
  | 'tracker'   | 'jarvis'    | 'roaster'    | 'clustering'
  | 'bulkmeta'  | 'gapcontent'| 'serpfeatures'| 'linkmap'
  | 'eeat'      | 'schema'    | 'scheduler'
  | 'casestudy' | 'gsc'
  | 'ga4'       | 'apisync'   | 'crawlimport'
  | 'crossview'
  | 'articlewriter' | 'contentgrader' | 'autorefresh' | 'topicalmap'
  | 'serpsim'       | 'contentspy'    | 'faqgen'
  | 'redirectmgr'   | 'loganalyzer'   | 'hreflang'   | 'robotstxt'
  | 'sitemapgen'    | 'jsseo'
  | 'contentcal'    | 'socialsnip'    | 'imagebuilder' | 'pipeline'
  | 'linksuggester'
  | 'themesettings' | 'shortcuts'    | 'sharelinks'
  | 'onboarding'    | 'apiaccess'
  | 'wordpress'
  | 'agency'
  | 'outrank'
  | 'sitesmanager'
  | 'siteexplorer'
  | 'kwexplorer'
  | 'answerpublic'
  | 'serpupdate'
  | 'intentanalyzer'
  | 'aivisibility'
  | 'team'
  | 'seonews'
  | 'activitylogs'
