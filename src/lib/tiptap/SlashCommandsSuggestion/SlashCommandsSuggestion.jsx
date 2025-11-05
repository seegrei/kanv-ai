import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'
import SlashCommandMenu from '../../../components/dialogs/SlashCommandMenu/SlashCommandMenu'

export const getSuggestionItems = ({ query }) => {
    const commands = [
        {
            title: 'Text',
            icon: 'T',
            description: 'Just start writing with plain text',
            command: ({ editor, range }) => {
                editor
                    .chain()
                    .focus()
                    .deleteRange(range)
                    .setNode('paragraph')
                    .run()
            }
        },
        {
            title: 'Heading 1',
            icon: 'H1',
            description: 'Big section heading',
            command: ({ editor, range }) => {
                editor
                    .chain()
                    .focus()
                    .deleteRange(range)
                    .setNode('heading', { level: 1 })
                    .run()
            }
        },
        {
            title: 'Heading 2',
            icon: 'H2',
            description: 'Medium section heading',
            command: ({ editor, range }) => {
                editor
                    .chain()
                    .focus()
                    .deleteRange(range)
                    .setNode('heading', { level: 2 })
                    .run()
            }
        },
        {
            title: 'Heading 3',
            icon: 'H3',
            description: 'Small section heading',
            command: ({ editor, range }) => {
                editor
                    .chain()
                    .focus()
                    .deleteRange(range)
                    .setNode('heading', { level: 3 })
                    .run()
            }
        },
        {
            title: 'Bullet List',
            icon: '•',
            description: 'Create a simple bullet list',
            command: ({ editor, range }) => {
                editor
                    .chain()
                    .focus()
                    .deleteRange(range)
                    .toggleBulletList()
                    .run()
            }
        },
        {
            title: 'Numbered List',
            icon: '1.',
            description: 'Create a list with numbering',
            command: ({ editor, range }) => {
                editor
                    .chain()
                    .focus()
                    .deleteRange(range)
                    .toggleOrderedList()
                    .run()
            }
        },
        {
            title: 'To-do List',
            icon: '☑',
            description: 'Track tasks with a to-do list',
            command: ({ editor, range }) => {
                editor
                    .chain()
                    .focus()
                    .deleteRange(range)
                    .toggleTaskList()
                    .run()
            }
        },
        {
            title: 'Quote',
            icon: '❝',
            description: 'Capture a quote',
            command: ({ editor, range }) => {
                editor
                    .chain()
                    .focus()
                    .deleteRange(range)
                    .toggleBlockquote()
                    .run()
            }
        },
        {
            title: 'Code Block',
            icon: '</>',
            description: 'Capture a code snippet',
            command: ({ editor, range }) => {
                editor
                    .chain()
                    .focus()
                    .deleteRange(range)
                    .toggleCodeBlock()
                    .run()
            }
        },
        {
            title: 'Separator',
            icon: '—',
            description: 'Visually divide blocks',
            command: ({ editor, range }) => {
                editor
                    .chain()
                    .focus()
                    .deleteRange(range)
                    .setHorizontalRule()
                    .run()
            }
        }
    ]

    return commands.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase())
    )
}

export const renderItems = () => {
    let component
    let popup

    return {
        onStart: props => {
            component = new ReactRenderer(SlashCommandMenu, {
                props,
                editor: props.editor
            })

            if (!props.clientRect) {
                return
            }

            popup = tippy('body', {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
                theme: 'slash-commands',
                maxWidth: 'none'
            })
        },

        onUpdate(props) {
            component.updateProps(props)

            if (!props.clientRect) {
                return
            }

            popup[0].setProps({
                getReferenceClientRect: props.clientRect
            })
        },

        onKeyDown(props) {
            if (props.event.key === 'Escape') {
                popup[0].hide()
                return true
            }

            return component.ref?.onKeyDown(props)
        },

        onExit() {
            popup[0].destroy()
            component.destroy()
        }
    }
}
