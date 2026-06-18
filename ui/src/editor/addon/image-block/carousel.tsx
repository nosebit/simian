import clsx from 'clsx'
import useEmblaCarousel from 'embla-carousel-react'
import Fade from 'embla-carousel-fade'
import Autoplay from 'embla-carousel-autoplay'
import { CircleChevronLeft, CircleChevronRight } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { ImageItemWithUpload } from './types'
import { ImageItem } from './item'
import { ImageItemProps } from './item/types'
import { Caption } from './caption'
import { useFocused, useSelected } from 'slate-react'

interface Props {
  items: ImageItemWithUpload[]
  handleUploadComplete: ImageItemProps['onUploadComplete']
  onCaptionChange: (item: ImageItemWithUpload, val: string | null) => void
}

export function ImageBlockCarousel({
  items,
  handleUploadComplete,
  onCaptionChange,
}: Props) {
  const isEditorSelected = useSelected()
  const isEditorFocused = useFocused()

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: false,
    },
    [
      Fade(),
      Autoplay({
        delay: 10000,
        stopOnInteraction: true,
        stopOnMouseEnter: true,
      }),
    ],
  )
  const [selectedIndex, setSelectedIndex] = useState(0)

  const scrollPrev = useCallback(
    (evt: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      evt.preventDefault()
      evt.stopPropagation()

      if (emblaApi) {
        emblaApi.scrollPrev()
      }
    },
    [emblaApi],
  )
  const scrollNext = useCallback(
    (evt: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      evt.preventDefault()
      evt.stopPropagation()

      if (emblaApi) {
        emblaApi.scrollNext()
      }
    },
    [emblaApi],
  )

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return

    // Use a small timeout or requestAnimationFrame to ensure
    // Slate/React have finished the layout change before Embla hooks in.
    const rafId = requestAnimationFrame(() => {
      emblaApi.on('select', onSelect)
      onSelect()
    })

    return () => {
      cancelAnimationFrame(rafId)
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi, onSelect])

  const activeItem = items[selectedIndex]

  return (
    <div className="flex flex-col gap-1">
      <div
        className={clsx([
          'rounded-md',
          'relative w-full',
          'border-2 border-transparent outline-2',
          isEditorSelected && isEditorFocused
            ? 'outline-blue-400 dark:outline-blue-500'
            : 'outline-transparent',
        ])}
      >
        {/* Embla viewport */}
        <div className={clsx(['rounded-md', 'overflow-hidden'])} ref={emblaRef}>
          <div className="flex">
            {items.map((item) => (
              <div key={item.id} className="shrink-0 w-full">
                <div className="relative w-full aspect-4/3">
                  <ImageItem
                    item={item}
                    disabled={true}
                    onUploadComplete={handleUploadComplete}
                    onCaptionChange={(val) => onCaptionChange(item, val)}
                    className="h-full w-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div
          className={clsx([
            'flex items-cente justify-between',
            'absolute left-2 right-2 bottom-2',
          ])}
        >
          {/* Prev / Next buttons */}
          <div className="flex items-center gap-1">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={scrollPrev}
              className="rounded-full text-white bg-black p-0.5"
            >
              <CircleChevronLeft className="h-6 w-6" />
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={scrollNext}
              className="rounded-full text-white bg-black p-0.5"
            >
              <CircleChevronRight className="h-6 w-6" />
            </button>
          </div>

          {/* Dots */}
          <div
            className={clsx([
              'flex items-center gap-0.5 rounded-full bg-black px-2 py-0.5',
            ])}
          >
            {items.map((_, idx) => (
              <button
                key={idx}
                onClick={() => emblaApi && emblaApi.scrollTo(idx)}
                className={clsx(
                  'h-2 w-2 rounded-full transition-colors',
                  'border border-white',
                  selectedIndex === idx ? 'bg-white' : '',
                )}
              />
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeItem && (
          <motion.div
            key={activeItem.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <Caption
              itemId={`standalone-${activeItem.id}`}
              value={activeItem.caption ?? ''}
              onValueChange={(val) => onCaptionChange(activeItem, val)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
