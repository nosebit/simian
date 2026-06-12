'use client'

import { forwardRef } from 'react'

import { EditorContent } from './content'
import { EditorProvider, EditorRef } from './provider'
import { EditorProps } from './types'

//////////////////////////////////////////////////
// Utilitary Types
//////////////////////////////////////////////////
type EditorFC = typeof EditorWithRef & {
  Content: typeof EditorContent
  Provider: typeof EditorProvider
}

//////////////////////////////////////////////////
// Main Component
//////////////////////////////////////////////////
const EditorWithRef = forwardRef<EditorRef, EditorProps>(
  ({ children, ...props }, ref) => {
    return (
      <EditorProvider ref={ref} {...props}>
        <EditorContent />

        {children}
      </EditorProvider>
    )
  },
)

EditorWithRef.displayName = 'EditorWithRef'

export const Editor = EditorWithRef as EditorFC
Editor.Content = EditorContent
Editor.Provider = EditorProvider

export type { EditorRef } from './provider'
export * from './schema'
export * from './types'
