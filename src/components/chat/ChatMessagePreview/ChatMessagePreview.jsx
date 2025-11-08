import { useState, useEffect, useMemo } from 'react'
import { Editor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import CustomDocument from '../../../lib/tiptap/CustomDocument'
import './ChatMessagePreview.css'

/**
 * ChatMessagePreview Component
 * Displays HTML content in read-only TipTap editor
 * Used for showing assistant responses in chat history
 */
const ChatMessagePreview = ({ content }) => {
    const [editor, setEditor] = useState(null)

    // Memoize editor extensions
    const editorExtensions = useMemo(() => [
        CustomDocument,
        StarterKit.configure({
            heading: {
                levels: [1, 2, 3]
            },
            document: false
        }),
        TaskList,
        TaskItem.configure({
            nested: true,
            HTMLAttributes: {
                class: 'task-item'
            }
        })
    ], [])

    // Initialize editor
    useEffect(() => {
        const newEditor = new Editor({
            extensions: editorExtensions,
            content: content || '',
            editable: false,
            editorProps: {
                attributes: {
                    class: 'chat-message-preview'
                }
            }
        })

        setEditor(newEditor)

        return () => {
            newEditor.destroy()
        }
    }, [editorExtensions])

    // Update content when it changes
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content || '')
        }
    }, [content, editor])

    return (
        <div className='chat-message-preview-wrapper'>
            {editor && <EditorContent editor={editor} />}
        </div>
    )
}

export default ChatMessagePreview
