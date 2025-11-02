import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import './SlashCommandMenu.css'

const SlashCommandMenu = forwardRef(({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    useEffect(() => {
        setSelectedIndex(0)
    }, [items])

    const selectItem = (index) => {
        const item = items[index]
        if (item) {
            command(item)
        }
    }

    const upHandler = () => {
        setSelectedIndex((selectedIndex + items.length - 1) % items.length)
    }

    const downHandler = () => {
        setSelectedIndex((selectedIndex + 1) % items.length)
    }

    const enterHandler = () => {
        selectItem(selectedIndex)
    }

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }) => {
            if (event.key === 'ArrowUp') {
                upHandler()
                return true
            }

            if (event.key === 'ArrowDown') {
                downHandler()
                return true
            }

            if (event.key === 'Enter') {
                enterHandler()
                return true
            }

            return false
        }
    }))

    if (!items || items.length === 0) {
        return null
    }

    return (
        <div className='slash-command-menu'>
            {items.map((item, index) => (
                <button
                    key={index}
                    className={`slash-command-item ${index === selectedIndex ? 'slash-command-item--selected' : ''}`}
                    onClick={() => selectItem(index)}
                >
                    <span className='slash-command-icon'>{item.icon}</span>
                    <div className='slash-command-content'>
                        <div className='slash-command-title'>{item.title}</div>
                        {item.description && (
                            <div className='slash-command-description'>{item.description}</div>
                        )}
                    </div>
                </button>
            ))}
        </div>
    )
})

SlashCommandMenu.displayName = 'SlashCommandMenu'

export default SlashCommandMenu
