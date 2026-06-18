import { useState, useEffect } from 'react'
import { useLocation } from 'wouter'
import { useTheme } from 'next-themes'
import { Plus, Loader2, FileText, Calendar, Moon, Sun, Trash } from 'lucide-react'
import Logo from '../assets/logo_w_text.png'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface PaperMetadata {
  id: string
  title: string
  slug: string | null
  last_modified: number
}

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

export function Dashboard() {
  const [papers, setPapers] = useState<PaperMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [, setLocation] = useLocation()

  useEffect(() => {
    fetch('/api/papers')
      .then((res) => res.json())
      .then((data) => {
        setPapers(data || [])
      })
      .catch((e) => console.error('Failed to load papers', e))
      .finally(() => setLoading(false))
  }, [])

  const handleCreatePaper = async () => {
    try {
      const res = await fetch('/api/papers', { method: 'POST' })
      const data = await res.json()
      if (data && data.id) {
        setLocation(`/${data.id}`)
      }
    } catch (e) {
      console.error('Failed to create paper', e)
    }
  }

  const handleDeletePaper = async (id: string) => {
    try {
      const res = await fetch(`/api/paper/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setPapers((prev) => prev.filter((p) => p.id !== id))
      } else {
        console.error('Failed to delete paper', res.statusText)
      }
    } catch (e) {
      console.error('Failed to delete paper', e)
    }
  }

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'Unknown'
    const date = new Date(timestamp * 1000)
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between p-4 px-8 bg-white dark:bg-[#0d1117]">
        <div className="flex items-center gap-3">
          <img
            src={Logo}
            alt="Simian"
            className="h-8 object-contain dark:invert"
          />
        </div>
        <div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 p-8 max-w-6xl mx-auto w-full mt-24">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Papers</h2>
          <Button
            onClick={handleCreatePaper}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm border-0"
          >
            <Plus size={16} /> New Paper
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground">
            <Loader2 className="animate-spin mr-2" size={20} /> Loading
            papers...
          </div>
        ) : papers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-24 text-center border rounded-lg bg-card/50 border-dashed">
            <FileText className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No papers found</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              You don't have any papers yet. Create your first paper to start
              exploring machine learning algorithms!
            </p>
            <Button
              onClick={handleCreatePaper}
              variant="outline"
              className="gap-2"
            >
              <Plus size={16} /> Create Paper
            </Button>
          </div>
        ) : (
          <div className="border rounded-lg bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead className="text-right">Last Modified</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {papers.map((paper) => (
                  <TableRow
                    key={paper.id}
                    className="cursor-pointer group"
                    onClick={() => setLocation(`/${paper.id}`)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        {paper.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        {paper.id}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      <div className="flex items-center justify-end gap-2 text-sm">
                        <Calendar className="w-3 h-3" />
                        {formatDate(paper.last_modified)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 -mr-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash size={16} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently move the paper
                              to the trash directory.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeletePaper(paper.id)}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  )
}
