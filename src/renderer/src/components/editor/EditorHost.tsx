import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { EditorState, Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { useErrorBoundary } from 'react-error-boundary'
import { basicSetup } from './extensions'
import { ToolHandle } from '../../types/workspace'

export interface EditorHostProps {
  initialDoc: string
  extensions?: Extension[]
  onChange?: (doc: string) => void
}

export const EditorHost = forwardRef<ToolHandle, EditorHostProps>(
  ({ initialDoc, extensions = [], onChange }, ref) => {
    const editorContainerRef = useRef<HTMLDivElement>(null)
    const viewRef = useRef<EditorView | null>(null)
    const { showBoundary } = useErrorBoundary()
    const onChangeRef = useRef(onChange)
    const currentStream = useRef<{ cancel: () => void } | null>(null)

    useImperativeHandle(ref, () => ({
      executeAICommand: (
        prompt: string,
        options: { conversationId: string; initiativeId: string }
      ) => {
        if (!viewRef.current || currentStream.current) return

        const view = viewRef.current
        let insertPos = view.state.selection.main.head

        currentStream.current = window.forge.ai
          .generate({
            conversationId: options.conversationId,
            initiativeId: options.initiativeId,
            prompt,
            toolContext: { tool: 'editor' },
            systemPrompt:
              'You are an AI coding assistant. Generate code to be inserted directly into the document based on the prompt. Provide ONLY the code without markdown formatting or markdown code blocks (e.g. no ```typescript).'
          })
          .onChunk((event) => {
            if (event.type === 'text') {
              view.dispatch({
                changes: { from: insertPos, insert: event.content }
              })
              insertPos += event.content.length
            }
          })
          .onComplete(() => {
            currentStream.current = null
          })
          .onError((err) => {
            view.dispatch({
              changes: { from: insertPos, insert: `\n/* AI Error: ${err} */\n` }
            })
            currentStream.current = null
          })
      },
      cancelAICommand: () => {
        if (currentStream.current) {
          currentStream.current.cancel()
          currentStream.current = null
        }
      }
    }))

    useEffect(() => {
      onChangeRef.current = onChange
    }, [onChange])

    useEffect(() => {
      return () => {
        if (currentStream.current) {
          currentStream.current.cancel()
          currentStream.current = null
        }
      }
    }, [])

    useEffect(() => {
      if (!editorContainerRef.current) return

      try {
        const updateListener = EditorView.updateListener.of((update) => {
          if (update.docChanged && onChangeRef.current) {
            onChangeRef.current(update.state.doc.toString())
          }
        })

        const state = EditorState.create({
          doc: initialDoc,
          extensions: [basicSetup, updateListener, ...extensions]
        })

        const view = new EditorView({
          state,
          parent: editorContainerRef.current
        })

        viewRef.current = view

        return () => {
          view.destroy()
          viewRef.current = null
        }
      } catch (e) {
        showBoundary(e)
        return () => {}
      }
    }, [extensions, initialDoc, showBoundary])

    return (
      <div
        className="w-full h-full overflow-hidden flex flex-col [&_.cm-editor]:h-full [&_.cm-scroller]:font-mono [&_.cm-scroller]:h-full"
        ref={editorContainerRef}
      />
    )
  }
)

EditorHost.displayName = 'EditorHost'
