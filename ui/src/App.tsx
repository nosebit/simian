import { ThemeProvider } from 'next-themes'
import { TooltipProvider } from '@/components/ui/tooltip'
import { I18nProvider } from '@/i18n/context'
import { Route, Switch } from 'wouter'
import { Dashboard } from './pages/Dashboard'
import { EditorPage } from './pages/EditorPage'
import './App.css'

declare global {
  interface Window {
    __SIMIAN_PAPER_DATA__?: any
    __SIMIAN_PAPER_METADATA__?: {
      authors?: number[]
      slug?: string
      publishedAt?: string
      submittedAt?: string
    }
  }
}

export default function App() {
  const isBundled = !!window.__SIMIAN_PAPER_DATA__

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <I18nProvider>
          {isBundled ? (
            <EditorPage
              id={window.__SIMIAN_PAPER_METADATA__?.slug || 'paper'}
            />
          ) : (
            <Switch>
              <Route path="/">
                <Dashboard />
              </Route>
              <Route path="/:id">
                {(params) => <EditorPage id={params.id} />}
              </Route>
            </Switch>
          )}
        </I18nProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}
