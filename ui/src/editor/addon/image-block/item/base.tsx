import clsx from 'clsx'
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { Expand, Loader2, Shrink } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useEditor } from '@/ui/editor/context'
import { Caption } from '../caption'
import { ImageBaseItemProps } from './types'
import { useImageBlock, useImageBlockElement } from '../context'

function FullscreenImage({ children }: { children: React.ReactNode }) {
  const { editor } = useEditor()

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalStyle
    }
  }, [])

  const root =
    typeof window !== 'undefined'
      ? document.getElementById(`image-fullscreen-root-${editor.id}`)
      : null

  if (!root) return null

  return createPortal(children, root)
}

function GridFullscreenImage({ children }: { children: React.ReactNode }) {
  const { blockId } = useImageBlockElement()
  const root =
    typeof window !== 'undefined'
      ? document.getElementById(`image-grid-root-${blockId}`)
      : null

  if (!root) return <>{children}</>

  return createPortal(children, root)
}

export const ImageBaseItem = memo(
  forwardRef<HTMLDivElement, ImageBaseItemProps>(
    (
      {
        isDragging,
        className,
        item,
        onUploadComplete,
        onCaptionChange,
        ...props
      },
      ref,
    ) => {
      const { focus: focusBase, setFocus, itemsLength } = useImageBlockElement()
      const { fileUploadAction } = useImageBlock()
      const fileUpload = fileUploadAction
      const [localUrl, setLocalUrl] = useState<string | null>(null)
      const [isUploading, setIsUploading] = useState(false)

      const wasDraggingRef = useRef(false)

      const focus = focusBase?.id === item.id ? focusBase : null

      const url = useMemo(
        () => localUrl || item.url, // In Simian, url stores the full relative path
        [localUrl, item.url],
      )

      const handleUpload = useCallback(async () => {
        if (!item.upload || item.upload.item) {
          return
        }

        setIsUploading(true)

        try {
          const result = await fileUpload({ file: item.upload.file })

          if (result.data) {
            const dbFile = result.data
            const { upload, ...itemRest } = item

            onUploadComplete({
              item: {
                ...itemRest,
                id: upload.id,
                url: dbFile.url,
                height: 0, // In standard HTML img we might not know it upfront unless we wait for load event
                width: 0,
                mime: dbFile.mime,
              },
              upload,
            })
          }
        } catch (error) {
          console.error(error)
          setLocalUrl(null)
        }

        setIsUploading(false)
      }, [item, onUploadComplete, fileUpload])

      useEffect(() => {
        ;(() => {
          if (item.upload && item.upload.file) {
            const objUrl = URL.createObjectURL(item.upload.file)
            setLocalUrl(objUrl)
          }
        })()
      }, [item])

      useEffect(() => {
        if (isDragging) {
          wasDraggingRef.current = true
        }
      }, [isDragging])

      useEffect(() => {
        // Component mounting logic
        return () => {
          // Unmounting logic
        }
      }, [])

      const imageView = (
        <div
          className={clsx([
            'w-full h-full',
            focus ? '' : 'hidden',
            focus?.mode === 'expand'
              ? 'fixed top-0 left-0 z-[100]'
              : 'absolute inset-0 z-50',
          ])}
          onClick={() => {
            if (focus) {
              setFocus(null)
            }
          }}
        >
          <div
            className={clsx([
              'absolute inset-0 z-2',
              'bg-background/85',
              'backdrop-blur-sm',
              'transition-opacity duration-300',
              'pointer-events-none',
            ])}
          />

          {/* Focused image container */}
          <div className="absolute inset-0 p-4 z-3 w-full h-full flex flex-col">
            <div className="min-h-0 flex items-center justify-center">
              <div
                className="
            relative
            inline-block
            h-full
            max-h-full
            max-w-full
          "
              >
                {/* Expand button INSIDE image bounds */}
                {focus ? (
                  <Button
                    size="icon"
                    className="absolute top-2 left-2 z-40 h-8 w-8"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation()
                      setFocus(
                        focus?.mode === 'expand'
                          ? null // unfocus
                          : { ...focus, mode: 'expand' }, // expand focus
                      )
                    }}
                  >
                    {focus?.mode == 'expand' ? <Shrink /> : <Expand />}
                  </Button>
                ) : null}

                <img
                  alt={item.alt}
                  src={url}
                  className="
                block
                max-h-full
                max-w-full
                object-contain
                rounded-md
              "
                  // className={clsx([
                  //   "max-h-full max-w-full object-contain rounded-md",
                  // ])}
                />
              </div>
            </div>

            <div
              className={clsx([
                'shrink-0 pt-4 pb-2 z-10',
                focus?.mode === 'expand' ? '' : 'hidden',
              ])}
              onClick={(evt) => evt.stopPropagation()}
            >
              <Caption
                itemId={item.id}
                disabled={props.disabled}
                value={item.caption ?? null}
                onValueChange={onCaptionChange}
              />
            </div>
          </div>

          {/* <div className="absolute left-2 top-2 z-4 flex items-center">
        <Button size="icon-sm">
          <Expand />
        </Button>
      </div>

      <img
        alt={item.alt}
        src={url}
        className={clsx([
          "object-contain",
          isFocused && "absolute inset-0 z-3 p-2 flex items-center justify-center w-full h-full",
        ])}
      /> */}
        </div>
      )

      return (
        <>
          <div
            {...props}
            ref={ref}
            className={clsx([
              'relative group',
              itemsLength > 1 && 'cursor-pointer',
              'active:cursor-grabbing',
              className,
            ])}
            onPointerDownCapture={() => {
              wasDraggingRef.current = false
            }}
            onDoubleClick={(evt) => {
              evt.preventDefault()
              evt.stopPropagation()
            }}
            onClickCapture={(evt) => {
              if (wasDraggingRef.current) {
                evt.preventDefault()
                evt.stopPropagation()
                wasDraggingRef.current = false
                return
              }
            }}
            onClick={() => {
              // Toggle focus to this item.
              setFocus(focus ? null : { id: item.id })
            }}
          >
            <div
              className={clsx([
                'absolute top-2 left-2 z-1',
                'hidden group-hover:block',
              ])}
            >
              <Button
                variant="default"
                size="icon"
                className="h-8 w-8"
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault()
                  e.stopPropagation()

                  setFocus({ ...(focus ?? { id: item.id }), mode: 'expand' })
                }}
              >
                <Expand />
              </Button>
            </div>

            <img
              className={clsx([
                'w-full h-full transition-all duration-300 object-cover',
              ])}
              width={item.width}
              height={item.height}
              src={url || ''}
              alt={item.alt ?? ''}
              onLoad={() => {
                handleUpload()
              }}
            />

            {/* Loading Skeleton Overlay */}
            {isUploading && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex flex-col items-center justify-center z-10">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
                <span className="text-xs text-white font-medium mt-2">
                  Uploading...
                </span>
              </div>
            )}
          </div>

          {focus?.mode === 'expand' ? (
            <FullscreenImage>{imageView}</FullscreenImage>
          ) : focus && itemsLength > 1 ? (
            <GridFullscreenImage>{imageView}</GridFullscreenImage>
          ) : null}
        </>
      )
    },
  ),
)

ImageBaseItem.displayName = 'ImageBaseItem'
