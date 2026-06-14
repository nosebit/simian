import { FC, useCallback } from 'react'
import clsx from 'clsx'
import { CornerDownRight } from 'lucide-react'
import { nanoid } from 'nanoid'
import { Text } from 'slate'
import { ReactEditor } from 'slate-react'

const useIsMobile = () => false
import { useEditor } from '@/ui/editor/context'
import { ElementProps } from '@/ui/editor/types'

import { Block } from '../../block'
import { blockApply } from '../../utils'
import { useSubTitle } from '../subtitle/context'

import { useTitle } from './context'
import { useTranslations } from '@/i18n/context'

export const Title: FC<ElementProps<'title'>> = ({
  attributes,
  children,
  element,
}) => {
  const { editor, mode } = useEditor()
  const isMobile = useIsMobile()
  const t = useTranslations()
  const { emptyPlaceholder } = useTitle()
  const { isMounted: isSubTitleMounted } = useSubTitle()

  // Check if the title node is empty
  const isEmpty =
    element.children.length === 1 && (element.children[0] as Text).text === ''
  const shouldShowSubtitleButton =
    mode !== 'read' && !isMobile && editor.hasAddon('subtitle')
  const placeholder =
    typeof emptyPlaceholder === 'function'
      ? emptyPlaceholder(t)
      : emptyPlaceholder

  const actionItems = useCallback(
    () =>
      shouldShowSubtitleButton && !isSubTitleMounted
        ? [
            {
              id: 'add-subtitle',
              icon: <CornerDownRight size={18} />,
              tooltip: {
                content: 'Add Subtitle',
              },
              onClick: () => {
                const currentPath = ReactEditor.findPath(editor, element)

                blockApply({
                  at: currentPath, // After the title.
                  editor,
                  block: {
                    id: nanoid(),
                    type: 'subtitle',
                    children: [{ text: '' }],
                  },
                })
              },
            },
          ]
        : [],
    [editor, element, shouldShowSubtitleButton, isSubTitleMounted],
  )

  // const actions = shouldShowSubtitleButton ? [(
  //   <button className="">
  //     <Plus size={18} />
  //   </button>
  //   <ButtonRaw
  //     contentEditable={false}
  //     tooltip={{
  //       content: "Add Subtitle",
  //       side: "bottom",
  //     }}
  //     className={clsx([
  //       "absolute left-2 top-1.5",
  //       "opacity-0 pointer-events-none",
  //       "rounded-full border",
  //       "flex items-center justify-center size-6 [&_svg]:size-3",
  //       "hover:bg-accent dark:hover:bg-accent/50",
  //       editor.mode === "view" || isSubTitleMounted
  //         ? ""
  //         : "group-hover:opacity-100 group-hover:pointer-events-auto",
  //     ])}
  //     onClick={() => {
  //       const currentPath = ReactEditor.findPath(editor, element);

  //       blockApply({
  //         at: currentPath, // After the title.
  //         editor,
  //         block: { id: nanoid(), type: 'subtitle', children: [{ text: '' }] },
  //       });
  //     }}
  //   >
  //     <CornerDownRight />
  //   </ButtonRaw>
  // )] : [];

  return (
    <Block
      element={element}
      {...attributes}
      className={clsx([
        'relative group gap-2 mb-12',
        //"pl-10 -ml-10",
      ])}
      actionClassName="md:-translate-x-full pr-2 top-1.5"
      actionItems={actionItems}
    >
      <h1
        className={clsx([
          'leading-[1.2] min-w-px',
          'outline-none text-5xl font-extrabold tracking-tight',
          // "mb-15 text-5xl font-extrabold tracking-tight",
          isEmpty ? 'relative' : '',
        ])}
      >
        {placeholder && isEmpty && (
          <span
            contentEditable={false}
            className="absolute pointer-events-none opacity-30 select-none"
          >
            {placeholder}
          </span>
        )}

        {children}
      </h1>
    </Block>
  )
}
