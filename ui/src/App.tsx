import { useState, useEffect } from 'react'
import { Loader2, Moon, Sun } from 'lucide-react'
import { ThemeProvider, useTheme } from 'next-themes'
import { TooltipProvider } from '@/components/ui/tooltip'
import { I18nProvider } from '@/i18n/context'
import { Editor } from '@/editor'
import { title } from '@/editor/addon/title'
import { text } from '@/editor/addon/text'
import { paragraph } from '@/editor/addon/paragraph'
import { codeBlock } from '@/editor/addon/code-block'
import { root } from '@/editor/addon/root'
import { subtitle } from '@/editor/addon/subtitle'
import { heading } from '@/editor/addon/heading'
import { column } from '@/editor/addon/column'
import { latexBlock } from '@/editor/addon/latex-block'
import { latexInline } from '@/editor/addon/latex-inline'
import './App.css'

// Default fallback if loading fails
const defaultInitialValue = [
  {
    type: 'title',
    children: [{ text: 'Untitled Paper' }],
  },
  {
    type: 'code-block',
    language: 'rust',
    children: [{ text: 'println!("Hello from Simian Paper!");' }],
  },
]

declare global {
  interface Window {
    __SIMIAN_PAPER_DATA__?: any;
  }
}

let saveTimeout: ReturnType<typeof setTimeout>

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return <div className="w-9 h-9" />

  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
      title="Toggle Theme"
    >
      {resolvedTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  )
}

export default function App() {
  const [value, setValue] = useState<any>(defaultInitialValue)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'read' | 'write'>('write')

  useEffect(() => {
    // 1. Check for statically injected data first
    if (window.__SIMIAN_PAPER_DATA__) {
      setValue(window.__SIMIAN_PAPER_DATA__)
      setMode('read')
      setLoading(false)
      return
    }

    // 2. Fallback to API if not static
    fetch('/api/paper/content')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.length > 0) {
          setValue(data)
        }
      })
      .catch((e) => console.error('Failed to load paper content', e))
      .finally(() => setLoading(false))
  }, [])

  const onChange = (newValue: any) => {
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
      fetch('/api/paper/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newValue),
      }).catch((e) => console.error('Failed to save', e))
    }, 2000)
  }

  const addons = [
    root(),
    title(),
    subtitle(),
    text(),
    paragraph(),
    heading(),
    column(),
    latexBlock(),
    latexInline(),
    codeBlock(),
  ]

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <I18nProvider>
          <div className="studio-container w-full min-h-screen bg-background text-foreground flex flex-col">
            <header className="w-full flex justify-between items-center p-4 px-8 bg-transparent sticky top-0 z-50">
              <div>{/* Left side empty or placeholder for future */}</div>
              <div className="flex items-center">
                <ThemeToggle />
              </div>
            </header>

            {loading ? (
              <div className="flex items-center justify-center p-12 mt-12 text-muted-foreground">
                <Loader2 className="animate-spin mr-2" size={20} /> Loading
                workspace...
              </div>
            ) : (
              <div className="flex-1 w-full max-w-4xl mx-auto mt-12 pb-24 px-8">
                <Editor
                  addons={addons}
                  initialValue={value}
                  onContentChange={onChange}
                  mode={mode}
                />
              </div>
            )}
          </div>
        </I18nProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}
