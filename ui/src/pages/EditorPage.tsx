import { useState, useEffect } from 'react'
import { ChevronLeft, Loader2, Moon, Sun } from 'lucide-react'
import { Link } from 'wouter'
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
    const timer = setTimeout(() => setMounted(true), 0)
    return () => clearTimeout(timer)
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

function AuthorBadge({ authorId }: { authorId: number }) {
  const [handle, setHandle] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`https://api.github.com/user/${authorId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch')
        return res.json()
      })
      .then((data) => {
        if (data.login) {
          setHandle(data.login)
        } else {
          setError(true)
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [authorId])

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 bg-black/5 dark:bg-white/5 rounded-full border border-transparent">
        <div className="w-6 h-6 rounded-full bg-black/10 dark:bg-white/10 animate-pulse" />
        <div className="h-4 w-16 bg-black/10 dark:bg-white/10 rounded animate-pulse" />
      </div>
    )
  }

  if (error || !handle) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 bg-red-500/10 text-red-500 rounded-full text-xs font-mono">
        <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
          !
        </div>
        <span>Unknown</span>
      </div>
    )
  }

  return (
    <a
      href={`https://github.com/${handle}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-2 py-1 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors rounded-full text-xs font-mono text-zinc-700 dark:text-zinc-300 border border-black/5 dark:border-white/10"
    >
      <img
        src={`https://avatars.githubusercontent.com/u/${authorId}?v=4`}
        alt={`${handle} avatar`}
        className="w-6 h-6 rounded-full object-cover"
      />
      <span>@{handle}</span>
    </a>
  )
}

export function EditorPage({ id }: { id: string }) {
  const [value, setValue] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'read' | 'write'>('write')
  const [authors, setAuthors] = useState<number[]>([])
  const [publishedAt, setPublishedAt] = useState<string | null>(null)
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)

  useEffect(() => {
    if (window.__SIMIAN_PAPER_DATA__) {
      const data = window.__SIMIAN_PAPER_DATA__
      const metadata = window.__SIMIAN_PAPER_METADATA__
      setTimeout(() => {
        setValue(data)
        setMode('read')
        if (metadata?.authors) {
          setAuthors(metadata.authors)
        }
        if (metadata?.publishedAt) {
          setPublishedAt(metadata.publishedAt)
        }
        if (metadata?.submittedAt) {
          setSubmittedAt(metadata.submittedAt)
        }
        setLoading(false)
      }, 0)
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

  const isBundled = !!window.__SIMIAN_PAPER_DATA__

  return (
    <div className="flex flex-col h-full min-h-screen">
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between p-4 px-8 bg-white dark:bg-[#0d1117]">
        <div className="flex items-center gap-4">
          {!isBundled && (
            <Link href="/">
              <button className="p-2 -ml-2 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground">
                <ChevronLeft size={20} />
              </button>
            </Link>
          )}
          <span className="text-sm font-mono text-muted-foreground">{id}</span>
        </div>
        <div>
          <ThemeToggle />
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center p-12 mt-24 text-muted-foreground">
          <Loader2 className="animate-spin mr-2" size={20} /> Loading
          workspace...
        </div>
      ) : (
        <div className="flex-1 w-full max-w-4xl mx-auto mt-24 pb-24 px-8">
          {mode === 'read' &&
            (authors.length > 0 || publishedAt || submittedAt) && (
              <div className="mb-8 pl-2">
                {authors.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2 relative z-10">
                    {authors.map((authorId) => (
                      <AuthorBadge key={authorId} authorId={authorId} />
                    ))}
                  </div>
                )}
                {(publishedAt || submittedAt) && (
                  <div className="text-xs text-muted-foreground font-mono">
                    {publishedAt ? 'Published on ' : 'Submitted on '}
                    {new Date(publishedAt || submittedAt!).toLocaleDateString(
                      undefined,
                      { year: 'numeric', month: 'long', day: 'numeric' },
                    )}
                  </div>
                )}
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
