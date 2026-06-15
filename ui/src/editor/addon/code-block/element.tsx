import { useMemo, useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { Node, Transforms } from 'slate'
import { ReactEditor } from 'slate-react'

import { Block } from '@/ui/editor/block'
import { contextualize } from '@/ui/editor/context'
import { ElementProps } from '@/ui/editor/types'
const jetbrainsMono = { className: 'font-mono' }
import { useTheme } from 'next-themes'
import { Play, Loader2 } from 'lucide-react'

import { ghDarkDimmed, ghDarkHighContrast } from './utils/highlighter'

import { executeCodeBlock } from './utils/execute'

const OutputItem = ({
  item,
  idx,
  iframeRefs,
}: {
  item: { url: string; state?: any }
  idx: number
  iframeRefs: React.MutableRefObject<(HTMLIFrameElement | null)[]>
}) => {
  const [inferredType, setInferredType] = useState<string | null>(null)

  useEffect(() => {
    const url = item.url
    const timer = setTimeout(() => {
      if (url.startsWith('data:image')) {
        setInferredType('image')
        return
      }
      if (url.startsWith('data:video')) {
        setInferredType('video')
        return
      }
      if (url.startsWith('data:application/pdf')) {
        setInferredType('pdf')
        return
      }
      if (url.includes('youtube.com/embed') || url.includes('youtu.be/')) {
        setInferredType('video')
        return
      }
      if (url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i)) {
        setInferredType('image')
        return
      }
      if (url.match(/\.(mp4|webm|ogg)$/i)) {
        setInferredType('video')
        return
      }
      if (url.match(/\.pdf$/i)) {
        setInferredType('pdf')
        return
      }
      if (url.startsWith('data:text/html')) {
        setInferredType('html')
        return
      }

      if (url.startsWith('http')) {
        fetch(url, { method: 'HEAD' })
          .then((res) => {
            const contentType = res.headers.get('content-type')
            if (contentType?.startsWith('image/')) setInferredType('image')
            else if (contentType?.startsWith('video/')) setInferredType('video')
            else if (contentType?.startsWith('application/pdf'))
              setInferredType('pdf')
            else setInferredType('html')
          })
          .catch(() => {
            setInferredType('html')
          })
      } else {
        setInferredType('html')
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [item.url])

  let iframeSrc = item.url
  if (inferredType === 'video' && item.url.includes('youtu.be/')) {
    const videoId = item.url.split('youtu.be/')[1]?.split('?')[0]
    if (videoId) {
      iframeSrc = `https://www.youtube.com/embed/${videoId}`
    }
  } else if (
    inferredType === 'video' &&
    item.url.includes('youtube.com/watch')
  ) {
    const urlObj = new URL(item.url)
    const videoId = urlObj.searchParams.get('v')
    if (videoId) {
      iframeSrc = `https://www.youtube.com/embed/${videoId}`
    }
  } else if (inferredType === 'html' && item.state) {
    try {
      iframeSrc = `${item.url}#${btoa(JSON.stringify(item.state))}`
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    const handleMessage = () => {
      console.debug('message received')
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  if (!inferredType) {
    return (
      <div className="flex justify-center my-4">
        <Loader2 className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (inferredType === 'image') {
    return (
      <img
        src={item.url}
        alt="Interactive Output"
        className="w-full max-w-full rounded-md my-4 shadow-sm"
      />
    )
  }

  if (inferredType === 'pdf') {
    return (
      <iframe
        src={iframeSrc}
        className="w-full h-[600px] border rounded-md my-4 shadow-sm bg-white"
        title="Interactive Output"
      />
    )
  }

  if (inferredType === 'video') {
    return (
      <iframe
        src={iframeSrc}
        className="w-full h-[600px] border rounded-md my-4 shadow-sm bg-black"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Interactive Output"
      />
    )
  }

  if (inferredType === 'html') {
    return (
      <iframe
        ref={(el) => {
          // eslint-disable-next-line react-hooks/immutability
          if (el && iframeRefs?.current) iframeRefs.current[idx] = el
        }}
        src={iframeSrc}
        className="w-full h-[600px] border rounded-md my-4 shadow-sm bg-white"
        title="Interactive Output"
      />
    )
  }
  return null
}

export const CodeBlock = contextualize<ElementProps<'code-block'>>()(
  ['editor', 'mode'],
  ({ attributes, children, editor, element, mode }) => {
    const { resolvedTheme } = useTheme()
    const themeMode = resolvedTheme
    const linesCount = Node.string(element).split('\n').length

    const iframeRefs = useRef<(HTMLIFrameElement | null)[]>([])

    useEffect(() => {
      const handler = (event: MessageEvent) => {
        if (event.data?.type === 'SIMIAN_PLOT_STATE') {
          if (mode === 'read') return
          // Find which iframe sent this
          const idx = iframeRefs.current.findIndex(
            (ref) => ref && ref.contentWindow === event.source,
          )
          if (idx !== -1 && element.output && element.output.items) {
            try {
              const path = ReactEditor.findPath(editor, element)
              const newItems = [...element.output.items]
              newItems[idx] = { ...newItems[idx], state: event.data.state }
              Transforms.setNodes(
                editor,
                {
                  output: { ...element.output, items: newItems },
                } as Partial<Node>,
                { at: path },
              )
            } catch (e) {
              console.error('Failed to update plot state', e)
            }
          }
        }
      }
      window.addEventListener('message', handler)
      return () => window.removeEventListener('message', handler)
    }, [element, editor, mode])

    const [fgColor, bgColor] = useMemo(() => {
      if (themeMode === 'dark') {
        return [
          ghDarkDimmed.colors?.['editor.foreground'] || '#adbac7',
          ghDarkDimmed.colors?.['editor.background'] || '#22272e',
        ]
      }

      return [
        ghDarkHighContrast.colors?.['editor.foreground'] || '#0a0c10',
        ghDarkHighContrast.colors?.['editor.background'] || '#ffffff',
      ]
    }, [themeMode])

    const renderStdout = (stdout: string) => {
      if (!stdout) return null
      return (
        <span className="text-green-500 dark:text-green-400 block whitespace-pre-wrap">
          {stdout}
        </span>
      )
    }

    return (
      <Block
        {...attributes}
        element={element}
        className={clsx(['relative code-block group/code mb-6'])}
      >
        <div
          className={clsx([
            'relative border shadow-sm',
            element.output ? 'rounded-t-md border-b-0' : 'rounded-md',
          ])}
          style={{
            color: fgColor,
            backgroundColor: bgColor,
            borderColor:
              themeMode === 'dark'
                ? 'rgba(255,255,255,0.1)'
                : 'rgba(0,0,0,0.1)',
          }}
        >
          <pre
            className={clsx([
              'flex relative py-3 rounded-none not-prose leading-relaxed [font-variant-ligatures:normal] overflow-x-auto',
              jetbrainsMono.className,
            ])}
          >
            <div
              contentEditable={false}
              className="text-right pl-3 pr-4 select-none border-r border-gray-500/30 mr-4 sticky left-0 z-10 py-0 flex-shrink-0 min-w-[3rem]"
              style={{
                color: fgColor,
                backgroundColor: bgColor,
                userSelect: 'none',
              }}
            >
              <div className="opacity-40">
                {Array.from({ length: linesCount }).map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
            </div>

            <code
              className={clsx([
                'flex-1 not-prose pr-3',
                jetbrainsMono.className,
              ])}
            >
              {children}
            </code>
          </pre>

          {/* Evaluate Button */}
          {mode === 'write' && (
            <div className="absolute -bottom-4 -right-4 z-20">
              <button
                contentEditable={false}
                onClick={() => {
                  const path = ReactEditor.findPath(editor, element)
                  executeCodeBlock(editor, path)
                }}
                disabled={element.isEvaluating}
                className={clsx(
                  'p-3 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 z-10',
                  element.isEvaluating
                    ? 'bg-orange-500 shadow-orange-500/40 cursor-wait'
                    : 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/40 hover:scale-105 cursor-pointer',
                )}
              >
                {element.isEvaluating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 ml-[2px]" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Render Output if it exists */}
        {element.output && (
          <div
            contentEditable={false}
            className="border p-4 text-sm font-mono whitespace-pre overflow-x-auto shadow-inner rounded-b-md"
            style={{
              backgroundColor: themeMode === 'dark' ? '#0d1117' : '#f8fafc',
              borderColor:
                themeMode === 'dark'
                  ? 'rgba(255,255,255,0.1)'
                  : 'rgba(0,0,0,0.1)',
            }}
          >
            {element.output.success ? (
              <div>
                {renderStdout(element.output.stdout)}
                {element.output?.items &&
                  element.output.items.map((item, idx) => (
                    <OutputItem
                      key={idx}
                      item={item}
                      idx={idx}
                      iframeRefs={iframeRefs}
                    />
                  ))}
              </div>
            ) : (
              <span className="text-red-500 dark:text-red-400">
                {element.output.stderr}
              </span>
            )}
          </div>
        )}
      </Block>
    )
  },
)
