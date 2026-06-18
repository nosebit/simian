import {
  DndContext,
  DragEndEvent,
  MeasuringStrategy,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import clsx from 'clsx'
import { FC, useCallback } from 'react'
import { useFocused, useReadOnly, useSelected } from 'slate-react'

import { ImageDraggableItem } from './item/draggable'
import { ImageItemProps } from './item/types'
import { ImageItemWithUpload } from './types'
import { Caption } from './caption'
import { useImageBlockElement } from './context'

interface Props {
  caption?: string | null
  onItemsMove: (items: ImageItemWithUpload[]) => void
  handleUploadComplete: ImageItemProps['onUploadComplete']
  onCaptionChange: (
    item: ImageItemWithUpload | null,
    val: string | null,
  ) => void
  items: ImageItemWithUpload[]
}

export const ImageBlockGrid: FC<Props> = ({
  items,
  caption,

  onItemsMove,
  handleUploadComplete,
  onCaptionChange,
}) => {
  const { focus, blockId } = useImageBlockElement()
  const isEditorSelected = useSelected()
  const isEditorFocused = useFocused()
  const readOnly = useReadOnly()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // tweak
      },
    }),
  )

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      if (!over || active.id === over.id) return

      const oldIndex = items.findIndex((i) => i.id === active.id)
      const newIndex = items.findIndex((i) => i.id === over.id)

      const movedItems = arrayMove(items, oldIndex, newIndex)
      const newItems = movedItems.map(({ upload, ...item }: any) => {
        if (upload && upload.item && upload.item.id) {
          return { ...item, id: upload.item.id }
        }

        return item
      })

      onItemsMove(newItems)
    },
    [items, onItemsMove],
  )

  return (
    <div className="flex flex-col gap-1">
      <div
        id={`image-grid-root-${blockId}`}
        className={clsx([
          'relative',
          'border-2 border-transparent outline-2',
          isEditorSelected && isEditorFocused
            ? 'outline-blue-400 dark:outline-blue-500'
            : 'outline-transparent',
        ])}
      >
        <DndContext
          sensors={sensors}
          measuring={{
            droppable: {
              strategy: MeasuringStrategy.Always,
            },
          }}
          collisionDetection={closestCenter}
          onDragEnd={readOnly ? undefined : handleDragEnd}
        >
          <SortableContext items={items} strategy={rectSortingStrategy}>
            <div
              className={clsx([
                'rounded-md overflow-hidden',
                'relative grid gap-1 h-full w-full aspect-4/3',
                items.length === 1 && 'grid-cols-1 grid-rows-1',
                items.length === 2 && 'grid-cols-2 grid-rows-1',
                items.length >= 3 && 'grid-cols-2 grid-rows-2',
              ])}
            >
              {items.map((item, idx) => (
                <ImageDraggableItem
                  disabled={readOnly || items.length === 1}
                  key={item.id}
                  item={item}
                  onUploadComplete={handleUploadComplete}
                  onCaptionChange={(val) => onCaptionChange(item, val)}
                  className={clsx([
                    items.length === 1 ? 'col-span-1 row-span-1' : '',
                    items.length === 2 ? 'col-span-1 row-span-1' : '',
                    items.length === 3
                      ? idx === 0
                        ? 'row-span-2'
                        : 'col-span-1 row-span-1'
                      : '',
                    items.length === 4 ? 'col-span-1 row-span-1' : '',
                  ])}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Render all the captions but show only the one which is focused */}
      {items.length > 1 && focus === null ? (
        <Caption
          itemId="none"
          value={caption ?? ''}
          onValueChange={(val) => onCaptionChange(null, val)}
        />
      ) : null}

      {items.map((item, idx) =>
        (items.length == 1 && idx == 0) || focus?.id === item.id ? (
          <Caption
            itemId={`standalone-${item.id}`}
            key={item.id}
            value={item.caption ?? ''}
            onValueChange={(val) => onCaptionChange(item, val)}
          />
        ) : null,
      )}
    </div>
  )
}
