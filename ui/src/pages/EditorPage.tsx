import { useState, useEffect } from 'react'
import { ChevronLeft, Loader2, Moon, Sun } from 'lucide-react'
import { Link, useLocation } from 'wouter'
import { useTheme } from 'next-themes'
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
      className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
      title="Toggle Theme"
    >
      {resolvedTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  )
}

export function EditorPage({ id }: { id: string }) {
  const [value, setValue] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'read' | 'write'>('write')
  const [authors, setAuthors] = useState<number[]>([])

  useEffect(() => {
    if (window.__SIMIAN_PAPER_DATA__) {
      setValue(window.__SIMIAN_PAPER_DATA__)
      setMode('read')
      if (window.__SIMIAN_PAPER_METADATA__?.authors) {
        setAuthors(window.__SIMIAN_PAPER_METADATA__.authors)
      }
      setLoading(false)
      return
    }

    fetch(`/api/paper/${id}/content`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.length > 0) {
          setValue(data)
        }
      })
      .catch((e) => console.error('Failed to load paper content', e))
      .finally(() => setLoading(false))
  }, [id])

  const onChange = (newValue: any) => {
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
      fetch(`/api/paper/${id}/content`, {
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
    <div className="flex flex-col h-full min-h-screen">
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between p-4 px-8 bg-white dark:bg-[#0d1117]">
        <div className="flex items-center gap-4">
          <Link href="/">
            <button className="p-2 -ml-2 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground">
              <ChevronLeft size={20} />
            </button>
          </Link>
          <span className="text-sm font-mono text-muted-foreground">{id}</span>
        </div>
        <div>
          <ThemeToggle />
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center p-12 mt-24 text-muted-foreground">
          <Loader2 className="animate-spin mr-2" size={20} /> Loading workspace...
        </div>
      ) : (
        <div className="flex-1 w-full max-w-4xl mx-auto mt-24 pb-24 px-8">
          {mode === 'read' && authors.length > 0 && (
            <div className="flex -space-x-3 mb-6 relative z-10 pl-2">
              {authors.map((authorId) => (
                <div
                  key={authorId}
                  className="w-10 h-10 rounded-full border-2 border-white dark:border-[#0d1117] bg-white dark:bg-[#0d1117] overflow-hidden shadow-sm hover:z-20 transition-transform hover:scale-110"
                >
                  <img
                    src={`https://avatars.githubusercontent.com/u/${authorId}?v=4`}
                    alt="Author avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
          <Editor
            addons={addons}
            initialValue={value}
            onContentChange={onChange}
            mode={mode}
          />
        </div>
      )}
    </div>
  )
}
