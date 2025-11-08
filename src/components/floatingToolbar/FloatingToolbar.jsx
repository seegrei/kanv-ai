import { memo, useMemo, useRef, useEffect, useState } from 'react'
import { blockActionRegistry } from '../../core/BlockActionRegistry'
import useElementsStore from '../../store/useElementsStore'
import useSelectionStore from '../../store/useSelectionStore'
import useHistoryStore from '../../store/useHistoryStore'
import useBlockToolbar from '../../hooks/useBlockToolbar'
import FloatingToolbarButton from './FloatingToolbarButton'
import FloatingToolbarSeparator from './FloatingToolbarSeparator'
import './FloatingToolbar.css'

/**
 * Floating toolbar that appears above selected blocks
 * Displays context-specific actions for the selected block type
 *
 * @param {Object} props
 * @param {string} props.blockId - ID of selected block
 * @param {string} props.blockType - Type of selected block ('text', 'image', etc.)
 * @param {Object} props.blockBounds - Block bounds in world coords {x, y, width, height}
 * @param {boolean} props.isVisible - Whether toolbar should be visible
 * @param {Object} props.zoomRef - Ref to canvas zoom level
 * @param {Object} props.offsetRef - Ref to canvas offset
 */
const FloatingToolbar = memo(({ blockId, blockType, blockBounds, isVisible, zoomRef, offsetRef }) => {
    const toolbarRef = useRef(null)

    // Get stores for context
    const elementsStore = useElementsStore()
    const selectionStore = useSelectionStore()
    const historyStore = useHistoryStore()

    // Calculate toolbar position (in world coordinates)
    const { left, top } = useBlockToolbar(blockBounds)

    // Build context object for actions
    const context = useMemo(() => ({
        stores: {
            elementsStore,
            selectionStore,
            historyStore
        },
        actions: {
            updateElement: elementsStore.updateElement,
            deleteElements: elementsStore.deleteElements,
            getElementById: elementsStore.getElementById
        },
        canvas: {
            zoom: zoomRef?.current,
            offset: offsetRef?.current
        }
    }), [elementsStore, selectionStore, historyStore, zoomRef, offsetRef])

    // Get actions for this block type
    const actions = useMemo(() => {
        if (!blockId || !blockType) return []
        return blockActionRegistry.getActionsForBlock(blockType, blockId, context)
    }, [blockId, blockType, context])

    // Group actions by 'group' field and insert separators
    const groupedActions = useMemo(() => {
        if (actions.length === 0) return []

        const result = []
        let lastGroup = null

        actions.forEach((action, index) => {
            const currentGroup = action.group || 'default'

            // Add separator if group changed (but not for first action)
            if (lastGroup !== null && lastGroup !== currentGroup) {
                result.push({ type: 'separator', key: `sep-${index}` })
            }

            result.push({ type: 'action', action, key: action.id })
            lastGroup = currentGroup
        })

        return result
    }, [actions])

    // Don't render if not visible or no actions
    if (!isVisible || groupedActions.length === 0) {
        return null
    }

    return (
        <div
            ref={toolbarRef}
            className='floating-toolbar'
            style={{
                left: `${left}px`,
                top: `${top}px`
            }}
            onMouseDown={(e) => e.stopPropagation()}
        >
            {groupedActions.map(item => {
                if (item.type === 'separator') {
                    return <FloatingToolbarSeparator key={item.key} />
                }

                const { action } = item
                return (
                    <FloatingToolbarButton
                        key={item.key}
                        icon={action.icon}
                        text={action.text}
                        label={action.label}
                        disabled={action.disabled}
                        variant={action.variant}
                        onClick={() => {
                            if (action.handler) {
                                action.handler(blockId, blockType, context)
                            }
                        }}
                    />
                )
            })}
        </div>
    )
})

FloatingToolbar.displayName = 'FloatingToolbar'

export default FloatingToolbar
