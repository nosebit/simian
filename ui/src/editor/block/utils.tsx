import { useCallback, useState } from 'react'

export function useResizer(
  initialWidth: string | undefined,
  onCommit: (width: string | undefined) => void,
) {
  const [previewWidth, setPreviewWidth] = useState<string | undefined>(
    initialWidth,
  )

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, direction: 'left' | 'right') => {
      e.preventDefault()

      const handle = e.currentTarget as HTMLElement
      const container = handle.closest('[data-block-id]') as HTMLElement
      // Ensure this selector matches your editor root class
      const editorRoot =
        (container.closest('.editor-root') as HTMLElement) || document.body

      const startX = e.clientX
      const startWidthPx = container.offsetWidth

      const SNAP_THRESHOLD = 30
      // These should match your Tailwind breakpoints/max-widths
      const standardWidthPx = Number(editorRoot.dataset.standardWidth) || editorRoot.offsetWidth
      const wideWidthPx = Number(editorRoot.dataset.wideWidth) || 1024

      const getSnappedValue = (currentWidthPx: number) => {
        // 1. Full Snap
        if (Math.abs(currentWidthPx - window.innerWidth) < SNAP_THRESHOLD) {
          return { label: 'full', value: '100%' }
        }
        // 2. Wide Snap
        if (Math.abs(currentWidthPx - wideWidthPx) < SNAP_THRESHOLD) {
          return { label: 'wide', value: '100%' }
        }
        // 3. Standard Snap
        if (Math.abs(currentWidthPx - standardWidthPx) < SNAP_THRESHOLD) {
          return { label: 'standard', value: '100%' }
        }

        // Default: Pixel string
        const clampedWidthPx = Math.min(
          window.innerWidth,
          Math.max(200, currentWidthPx),
        )
        const val = `${Math.round(clampedWidthPx)}px`
        return { label: val, value: val }
      }

      /**
       * CRITICAL FIX:
       * Immediately set the preview width on mouse down.
       * This forces the Block component to switch from "Keyword" mode (wide/full)
       * to "Percentage" mode so the image can actually be resized.
       */
      const startSnap = getSnappedValue(startWidthPx)
      setPreviewWidth(startSnap.label)

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX
        // Multiplying by 2 because we are resizing from the center (margins on both sides)
        const factor = direction === 'right' ? 2 : -2
        const currentWidthPx = startWidthPx + deltaX * factor

        const snapped = getSnappedValue(currentWidthPx)
        setPreviewWidth(snapped.label)
      }

      const onMouseUp = (upEvent: MouseEvent) => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)

        const finalDeltaX = upEvent.clientX - startX
        const factor = direction === 'right' ? 2 : -2
        const finalWidthPx = startWidthPx + finalDeltaX * factor

        const snapped = getSnappedValue(finalWidthPx)
        const commitValue =
          snapped.label === 'standard' ? undefined : snapped.label

        /**
         * CRITICAL FIX:
         * Set previewWidth to undefined. This tells the Block component:
         * "I am no longer dragging, stop using my preview and look at element.width"
         */
        setPreviewWidth(undefined)
        onCommit(commitValue)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [onCommit],
  )

  return { previewWidth, handleResizeStart, setPreviewWidth }
}
