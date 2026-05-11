import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  NavTab, GSCSummary, GA4Summary, KeywordRow,
  GoogleSheetData, UploadedFile, ReportConfig,
  ScheduleEntry, HistoryEntry, LogEntry, AppSettings
} from '@/types'

const fmt = (d: Date) => d.toISOString().split('T')[0]
function getDefaultDates() {
  const today = new Date()
  const to = new Date(today); to.setDate(to.getDate() - 1)
  const from = new Date(to); from.setDate(from.getDate() - 6)
  const pTo = new Date(from); pTo.setDate(pTo.getDate() - 1)
  const pFrom = new Date(pTo); pFrom.setDate(pFrom.getDate() - 6)
  return { dateFrom: fmt(from), dateTo: fmt(to), prevFrom: fmt(pFrom), prevTo: fmt(pTo) }
}

const defaultConfig: ReportConfig = {
  clientName: '', clientUrl: '', gscProperty: '', ga4PropertyId: '',
  sheetId: '', ubersuggestDomain: '',
  ...getDefaultDates(),
  ga4Metrics: ['sessions','totalUsers','newUsers','engagementRate','bounceRate','averageSessionDuration','screenPageViews'],
  gscMetrics: ['clicks','impressions','ctr','position'],
  sections: { exec: true, ga4: true, gsc: true, keywords: true, sheets: false, ubersuggest: false, uploads: true, authority: true, plan: true },
  outputFormat: 'docx', tone: 'professional',
}

interface AppStore {
  theme: 'light' | 'dark'; toggleTheme: () => void
  activeTab: NavTab; setActiveTab: (t: NavTab) => void
  config: ReportConfig; setConfig: (c: Partial<ReportConfig>) => void
  setSections: (s: Partial<ReportConfig['sections']>) => void
  googleToken: string | null; setGoogleToken: (t: string | null) => void
  googleEmail: string; setGoogleEmail: (e: string) => void
  gscProperties: string[]; setGscProperties: (p: string[]) => void
  ga4Properties: Array<{propertyId: string; displayName: string}>; setGa4Properties: (p: Array<{propertyId: string; displayName: string}>) => void
  gscData: GSCSummary | null; setGscData: (d: GSCSummary | null) => void
  ga4Data: GA4Summary | null; setGa4Data: (d: GA4Summary | null) => void
  kwData: KeywordRow[]; setKwData: (d: KeywordRow[]) => void
  sheetData: GoogleSheetData | null; setSheetData: (d: GoogleSheetData | null) => void
  uploadedFiles: UploadedFile[]; addUploadedFile: (f: UploadedFile) => void
  removeUploadedFile: (id: string) => void; clearUploadedFiles: () => void
  manualGsc: string; manualGa4: string; manualKeywords: string; manualNotes: string
  setManualData: (key: 'manualGsc' | 'manualGa4' | 'manualKeywords' | 'manualNotes', val: string) => void
  generatedReport: string; setGeneratedReport: (r: string) => void
  isGenerating: boolean; setIsGenerating: (v: boolean) => void
  isFetching: { gsc: boolean; ga4: boolean; kw: boolean; sheets: boolean }
  setIsFetching: (key: keyof AppStore['isFetching'], v: boolean) => void
  progress: number; progressLabel: string; setProgress: (p: number, l: string) => void
  logs: LogEntry[]; addLog: (msg: string, type?: LogEntry['type']) => void; clearLogs: () => void
  masterPrompt: string; setMasterPrompt: (p: string) => void
  history: HistoryEntry[]
  addHistory: (e: HistoryEntry) => void; loadHistory: (id: number) => void
  schedules: ScheduleEntry[]
  addSchedule: (s: Omit<ScheduleEntry, 'id' | 'createdAt'>) => void
  removeSchedule: (id: number) => void
  settings: AppSettings; setSettings: (s: Partial<AppSettings>) => void
  _hasHydrated: boolean; setHasHydrated: (v: boolean) => void
}

export const DEFAULT_PROMPT = `You are a professional SEO reporting assistant for Whitebunnie Digital.
Generate a clean, client-facing SEO performance report using ONLY the data provided.
The report will be exported as a branded Word (.docx) document.

STRICT RULES:
- NEVER hallucinate numbers. If data is missing write: "Data not available for this period."
- Keep tone professional and concise
- Show % change with + for gains, - for losses
- Analyse all uploaded files (PDFs with keyword data, screenshots, spreadsheets) and extract their data
- Do NOT use emojis or icons anywhere in the report body
- Format all tables using markdown pipe syntax

CLIENT: {{CLIENT_NAME}}
WEBSITE: {{CLIENT_URL}}
REPORT PERIOD: {{DATE_FROM}} to {{DATE_TO}}
COMPARISON PERIOD: {{PREV_FROM}} to {{PREV_TO}}

SECTIONS TO INCLUDE:
{{SECTIONS}}

SEARCH CONSOLE DATA:
{{GSC_DATA}}

GA4 ANALYTICS DATA:
{{GA4_DATA}}

KEYWORD RANKINGS (GSC queries):
{{KW_DATA}}

UPLOADED FILES (keyword PDFs, screenshots, sheets):
{{UPLOADS_DATA}}

GOOGLE SHEETS DATA:
{{SHEETS_DATA}}

MANUAL NOTES:
{{MANUAL_DATA}}

OUTPUT — use this structure:

# Executive Summary
[2 paragraph narrative: traffic trend, key wins, main concerns]

## Key Wins This Week
- [metric win with % change]

## Concerns & Areas to Watch
- [concern]

## Actionable Insights
- [insight]

---

# Organic Traffic Report (GA4)

| Metric | Last 7 Days | Previous 7 Days | Change (%) |
|---|---|---|---|
| Total Users | | | |
| Sessions | | | |
| Engaged Sessions | | | |
| Engagement Rate | | | |
| Bounce Rate | | | |
| Avg Session Duration | | | |

## Analysis
- [key observations]

---

# Search Console Performance

| Metric | Last 7 Days | Previous 7 Days | Change (%) |
|---|---|---|---|
| Clicks | | | |
| Impressions | | | |
| CTR | | | |
| Avg. Position | | | |

## Analysis
- [key observations]

---

# Keyword Rankings Report

| Keyword | Current Rank | Search Volume | SEO Difficulty | Est. Traffic |
|---|---|---|---|---|
[populate from uploaded PDF keyword data or GSC data]

## Ranking Highlights
- [highlight]

## Opportunities
- [opportunity]

---

# Website Authority

| Metric | Current Value | Notes |
|---|---|---|
| Domain Authority (DA) | | |
| Total Backlinks | | |
| Referring Domains | | |
| Dofollow Backlinks | | |
| Nofollow Backlinks | | |

---

# Key Insights & Recommendations
- [strategic recommendation]

---

## 30-Day KPI Targets

| KPI | Current | Target | Why |
|---|---|---|---|
| Clicks | | | |
| Impressions | | | |
| CTR | | | |
| Avg Position | | | |`

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      toggleTheme: () => set(s => {
        const next = s.theme === 'dark' ? 'light' : 'dark'
        if (typeof document !== 'undefined') document.documentElement.setAttribute('data-theme', next)
        return { theme: next }
      }),
      activeTab: 'generate', setActiveTab: (t) => set({ activeTab: t }),
      config: defaultConfig,
      setConfig: (c) => set((s) => ({ config: { ...s.config, ...c } })),
      setSections: (sections) => set((s) => ({ config: { ...s.config, sections: { ...s.config.sections, ...sections } } })),
      googleToken: null, setGoogleToken: (t) => set({ googleToken: t }),
      googleEmail: '', setGoogleEmail: (e) => set({ googleEmail: e }),
      gscProperties: [], setGscProperties: (p) => set({ gscProperties: p }),
      ga4Properties: [], setGa4Properties: (p) => set({ ga4Properties: p }),
      gscData: null, setGscData: (d) => set({ gscData: d }),
      ga4Data: null, setGa4Data: (d) => set({ ga4Data: d }),
      kwData: [], setKwData: (d) => set({ kwData: d }),
      sheetData: null, setSheetData: (d) => set({ sheetData: d }),
      uploadedFiles: [], addUploadedFile: (f) => set((s) => ({ uploadedFiles: [...s.uploadedFiles, f] })),
      removeUploadedFile: (id) => set((s) => ({ uploadedFiles: s.uploadedFiles.filter(f => f.id !== id) })),
      clearUploadedFiles: () => set({ uploadedFiles: [] }),
      manualGsc: '', manualGa4: '', manualKeywords: '', manualNotes: '',
      setManualData: (key, val) => set({ [key]: val }),
      generatedReport: '', setGeneratedReport: (r) => set({ generatedReport: r }),
      isGenerating: false, setIsGenerating: (v) => set({ isGenerating: v }),
      isFetching: { gsc: false, ga4: false, kw: false, sheets: false },
      setIsFetching: (key, v) => set((s) => ({ isFetching: { ...s.isFetching, [key]: v } })),
      progress: 0, progressLabel: '', setProgress: (p, l) => set({ progress: p, progressLabel: l }),
      logs: [],
      addLog: (msg, type = 'default') => {
        const ts = new Date().toLocaleTimeString('en-IN', { hour12: false })
        set((s) => ({ logs: [...s.logs.slice(-199), { ts, msg, type }] }))
      },
      clearLogs: () => set({ logs: [] }),
      masterPrompt: DEFAULT_PROMPT, setMasterPrompt: (p) => set({ masterPrompt: p }),
      history: [],
      addHistory: (e) => set((s) => ({ history: [e, ...s.history].slice(0, 30) })),
      loadHistory: (id) => {
        const entry = get().history.find(h => h.id === id)
        if (entry) set({ generatedReport: entry.report, activeTab: 'generate', config: { ...get().config, clientName: entry.client } })
      },
      schedules: [],
      addSchedule: (s) => set((st) => ({ schedules: [...st.schedules, { ...s, id: Date.now(), createdAt: new Date().toISOString() }] })),
      removeSchedule: (id) => set((s) => ({ schedules: s.schedules.filter(x => x.id !== id) })),
      settings: { anthropicKey: '', googleClientId: '', mcpToken: '', model: 'claude-sonnet-4-5', maxTokens: 6000 },
      setSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } })),
      _hasHydrated: false, setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'seo-report-store-v6',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') return localStorage
        return { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      }),
      partialize: (s) => ({
        theme: s.theme, config: s.config, history: s.history, schedules: s.schedules,
        settings: s.settings, masterPrompt: s.masterPrompt,
        manualGsc: s.manualGsc, manualGa4: s.manualGa4,
        manualKeywords: s.manualKeywords, manualNotes: s.manualNotes,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true)
          if (typeof document !== 'undefined')
            document.documentElement.setAttribute('data-theme', state.theme || 'dark')
        }
      },
      skipHydration: true,
    }
  )
)
