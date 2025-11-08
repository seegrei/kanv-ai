import { useCallback, useRef, useEffect, useState, useMemo } from 'react'
import { useCanvasControls } from '../../../hooks/useCanvasControls'
import { useCanvasMode } from '../../../hooks/useCanvasMode'
import useSelectionArea from '../../../hooks/useSelectionArea'
import useMultipleDraggable from '../../../hooks/useMultipleDraggable'
import useViewportCulling from '../../../hooks/useViewportCulling'
import useFocusOnElement from '../../../hooks/useFocusOnElement'
import useElementsStore from '../../../store/useElementsStore'
import useSelectionStore from '../../../store/useSelectionStore'
import useHistoryStore from '../../../store/useHistoryStore'
import useCanvasActions from '../../../store/useCanvasActions'
import useSettingsStore from '../../../store/useSettingsStore'
import useUsageStatsStore from '../../../store/useUsageStatsStore'
import CanvasBackground from '../CanvasBackground/CanvasBackground'
import Toolbar from '../../toolbar/Toolbar'
import QuickMenuButton from '../../ui/QuickMenu/QuickMenuButton'
import QuickMenu from '../../ui/QuickMenu/QuickMenu'
import SettingsDialog from '../../dialogs/SettingsDialog/SettingsDialog'
import SelectionBox from '../../blocks/SelectionBox/SelectionBox'
import UsageStatsDisplay from '../../ui/UsageStatsDisplay/UsageStatsDisplay'
import FloatingToolbar from '../../floatingToolbar/FloatingToolbar'
import CanvasRenderer from '../CanvasRenderer/CanvasRenderer'
import CanvasKeyboardHandler from '../CanvasKeyboardHandler/CanvasKeyboardHandler'
import MoveBlockCommand from '../../../commands/MoveBlockCommand'
import ResizeBlockCommand from '../../../commands/ResizeBlockCommand'
import { ELEMENT } from '../../../constants'
import { createLogger } from '../../../utils/logger'
import { eventBus } from '../../../core/EventBus'
import { storageManager } from '../../../services/storage'
import './Canvas.css'

const logger = createLogger('Canvas')

const Canvas = () => {
    const { offsetRef, zoomRef, isPanning, canvasRef, handleMouseDown, handleMouseMove, handleMouseUp } = useCanvasControls()

    const elements = useElementsStore((state) => state.elements)
    const { updateElement, updateMultipleElements } = useElementsStore()

    const selectedIds = useSelectionStore((state) => state.selectedIds)
    const setSelectedIds = useSelectionStore((state) => state.setSelectedIds)

    const executeCommand = useHistoryStore((state) => state.executeCommand)

    const { createTextBlock, createImageBlock, createChatBlock, createTextBlockAt, createImageBlockAt } = useCanvasActions()

    // Runtime bounds for the selected block during drag/resize
    const [runtimeBlockBounds, setRuntimeBlockBounds] = useState(null)

    // Callback to update runtime bounds during drag/resize
    const handleRuntimeBoundsChange = useCallback((blockId, bounds) => {
        // Only update if the block is the currently selected single block
        if (selectedIds.length === 1 && selectedIds[0] === blockId) {
            setRuntimeBlockBounds(bounds)
        }
    }, [selectedIds])

    // Clear runtime bounds when selection changes
    useEffect(() => {
        setRuntimeBlockBounds(null)
    }, [selectedIds])

    const {
        pasteElements
    } = useCanvasActions()

    // Storage state
    const [hasLoaded, setHasLoaded] = useState(false)
    const [hasCentered, setHasCentered] = useState(false)

    // Store loaded canvas state
    const loadedCanvasStateRef = useRef(null)

    // Use viewport culling for performance with large number of blocks
    const visibleElements = useViewportCulling(elements, zoomRef, offsetRef)

    // Use focus on element hook for camera centering
    const { focusOnElement, focusOnBounds, focusOnPoint } = useFocusOnElement(offsetRef, zoomRef)

    const contentRef = useRef(null)

    useEffect(() => {
        if (canvasRef.current) {
            contentRef.current = canvasRef.current.querySelector('.canvas-content')
        }
    }, [])

    // Blur active element when multiple blocks are selected
    useEffect(() => {
        if (selectedIds.length > 1) {
            const activeElement = document.activeElement
            if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                activeElement.blur()
            }
        }
    }, [selectedIds])

    const handlePaste = useCallback((imageData = null, textData = null) => {
        pasteElements(offsetRef, zoomRef, imageData, textData)
    }, [pasteElements])

    // Keyboard shortcuts are handled by CanvasKeyboardHandler component

    // Initialize StorageManager and load saved data on mount
    useEffect(() => {
        const initStorage = async () => {
            // Initialize storage manager with refs
            storageManager.init(offsetRef, zoomRef)

            // Load saved data (canvas, settings, statistics)
            const [canvasState] = await Promise.all([
                storageManager.load(),
                useSettingsStore.getState().loadSettings(),
                useUsageStatsStore.getState().loadStatistics()
            ])

            if (canvasState && canvasState.offset && canvasState.zoom) {
                loadedCanvasStateRef.current = canvasState
            }

            setHasLoaded(true)
        }

        initStorage()

        // Cleanup on unmount
        return () => {
            storageManager.destroy()
        }
    }, [])

    // Helper function to get element default dimensions
    const getElementDefaultSize = useCallback((element) => {
        const width = element.width || (element.type === 'image' ? ELEMENT.IMAGE.DEFAULT_WIDTH : ELEMENT.TEXT_BLOCK.DEFAULT_WIDTH)
        const height = element.height || (element.type === 'image' ? ELEMENT.IMAGE.DEFAULT_HEIGHT : ELEMENT.TEXT_BLOCK.DEFAULT_HEIGHT)
        return { width, height }
    }, [])

    // Find element closest to origin (0, 0) - memoized to avoid recalculations
    // Only recalculates when number of elements changes, not when they move
    const closestElement = useMemo(() => {
        if (elements.length === 0) return null

        return elements.reduce((closest, element) => {
            const { width: elementWidth, height: elementHeight } = getElementDefaultSize(element)
            const elementCenterX = element.x + elementWidth / 2
            const elementCenterY = element.y + elementHeight / 2
            // Remove Math.sqrt for performance - comparing squared distances is sufficient
            const distanceToOriginSquared = elementCenterX ** 2 + elementCenterY ** 2

            const { width: closestWidth, height: closestHeight } = getElementDefaultSize(closest)
            const closestCenterX = closest.x + closestWidth / 2
            const closestCenterY = closest.y + closestHeight / 2
            const closestDistanceSquared = closestCenterX ** 2 + closestCenterY ** 2

            return distanceToOriginSquared < closestDistanceSquared ? element : closest
        }, elements[0])
    }, [elements.length, getElementDefaultSize])

    // Center camera on element closest to origin after initial load OR restore saved canvas state
    useEffect(() => {
        if (!hasCentered && hasLoaded) {
            setHasCentered(true)

            // If we have saved canvas state, restore it
            if (loadedCanvasStateRef.current) {
                const savedState = loadedCanvasStateRef.current
                const newOffsetX = savedState.offset.x
                const newOffsetY = savedState.offset.y
                const newZoom = savedState.zoom

                // Update refs
                offsetRef.current = { x: newOffsetX, y: newOffsetY }
                zoomRef.current = newZoom

                // Update CSS variables
                if (contentRef.current) {
                    contentRef.current.style.setProperty('--canvas-offset-x', `${newOffsetX}px`)
                    contentRef.current.style.setProperty('--canvas-offset-y', `${newOffsetY}px`)
                    contentRef.current.style.setProperty('--canvas-zoom', newZoom)
                }

                logger.log('Restored canvas state:', savedState)
            } else if (closestElement) {
                // Otherwise, center on the closest element
                const { width: elementWidth } = getElementDefaultSize(closestElement)
                const elementCenterX = closestElement.x + elementWidth / 2
                const elementTopY = closestElement.y

                const viewportCenterX = window.innerWidth / 2
                const viewportCenterY = window.innerHeight * 0.2

                const newOffsetX = viewportCenterX - elementCenterX * zoomRef.current
                const newOffsetY = viewportCenterY - elementTopY * zoomRef.current

                // Update offset ref
                offsetRef.current = { x: newOffsetX, y: newOffsetY }

                // Update CSS variables
                if (contentRef.current) {
                    contentRef.current.style.setProperty('--canvas-offset-x', `${newOffsetX}px`)
                    contentRef.current.style.setProperty('--canvas-offset-y', `${newOffsetY}px`)
                }
            }
        }
    }, [closestElement, offsetRef, zoomRef, hasCentered, hasLoaded, setHasCentered, getElementDefaultSize])

    // Auto-save is now handled automatically by StorageManager

    // Listen for block creation events to auto-select new elements
    useEffect(() => {
        const handleBlockCreated = ({ id }) => {
            // Select the newly created element
            setSelectedIds([id])
            // Focus camera on the new element
            setTimeout(() => focusOnElement(id, elements), 50)
        }

        eventBus.on('block:created', handleBlockCreated)

        return () => {
            eventBus.off('block:created', handleBlockCreated)
        }
    }, [setSelectedIds, focusOnElement, elements])

    // Listen for focus events from other components
    useEffect(() => {
        const handleFocusElement = ({ elementId, options }) => {
            focusOnElement(elementId, elements, options)
        }

        const handleFocusBounds = ({ bounds, options }) => {
            focusOnBounds(bounds, options)
        }

        const handleFocusPoint = ({ x, y, options }) => {
            focusOnPoint(x, y, options)
        }

        eventBus.on('canvas:focus-element', handleFocusElement)
        eventBus.on('canvas:focus-bounds', handleFocusBounds)
        eventBus.on('canvas:focus-point', handleFocusPoint)

        return () => {
            eventBus.off('canvas:focus-element', handleFocusElement)
            eventBus.off('canvas:focus-bounds', handleFocusBounds)
            eventBus.off('canvas:focus-point', handleFocusPoint)
        }
    }, [focusOnElement, focusOnBounds, focusOnPoint, elements])

    const handleAddTextBlock = useCallback(() => {
        createTextBlock(offsetRef, zoomRef)
    }, [createTextBlock, offsetRef, zoomRef])

    const handleAddTextBlockAt = useCallback((x, y, width, height, title, content) => {
        return createTextBlockAt(x, y, width, height, content)
    }, [createTextBlockAt])

    const handleAddImageBlockAt = useCallback((x, y, width, height, imageId = null) => {
        return createImageBlockAt(x, y, width, height, imageId)
    }, [createImageBlockAt])

    const handleAddImageBlock = useCallback(() => {
        createImageBlock(offsetRef, zoomRef)
    }, [createImageBlock, offsetRef, zoomRef])

    const handleAddChatBlock = useCallback(() => {
        createChatBlock(offsetRef, zoomRef)
    }, [createChatBlock, offsetRef, zoomRef])

    const handleElementClick = useCallback((id) => {
        setSelectedIds([id])
    }, [setSelectedIds])

    const handleCanvasClick = useCallback((e) => {
        if (e.target.classList.contains('canvas')) {
            setSelectedIds([])
        }
    }, [setSelectedIds])

    const handleUpdateElement = useCallback((id, updates) => {
        updateElement(id, updates)
    }, [updateElement])

    const handleUpdateMultipleElements = useCallback((ids, updatesFn) => {
        updateMultipleElements(ids, updatesFn)
    }, [updateMultipleElements])

    const handleDragEnd = useCallback((id, oldPosition, newPosition) => {
        const command = new MoveBlockCommand(id, oldPosition, newPosition)
        executeCommand(command)
    }, [executeCommand])

    const handleResizeEnd = useCallback((id, oldBounds, newBounds) => {
        const command = new ResizeBlockCommand(id, oldBounds, newBounds)
        executeCommand(command)
    }, [executeCommand])

    const handleElementMouseDown = useCallback((e, id) => {
        // Only handle left mouse button
        if (e.button !== 0) return

        e.stopPropagation()
        if (!selectedIds.includes(id)) {
            setSelectedIds([id])
        }
    }, [selectedIds, setSelectedIds])

    // Shared multiple elements dragging hook - single instance for all blocks
    const multipleDrag = useMultipleDraggable({
        selectedIds,
        elements,
        zoomRef,
        offsetRef,
        onUpdateMultiple: updateMultipleElements,
        onMouseDown: handleElementMouseDown,
        onDragEnd: handleDragEnd
    })

    // Use selection area hook for drag-to-select functionality
    const { selectionBox, handleStart: handleSelectionStart } = useSelectionArea({
        canvasRef,
        offsetRef,
        zoomRef,
        elements,
        onSelectionChange: setSelectedIds
    })

    // Selection box handlers for SELECT mode
    const handleSelectionMouseDown = useCallback((e) => {
        // Only handle left mouse button
        if (e.button !== 0) return

        const isCanvasClick = e.target.classList.contains('canvas') ||
                              e.target.classList.contains('canvas-content') ||
                              e.target.tagName === 'svg' ||
                              e.target.tagName === 'rect'

        if (isCanvasClick) {
            // Start selection - clear will happen in handleEnd if selection is too small
            handleSelectionStart(e)
        } else {
            // Not starting selection, just clear selection
            handleCanvasClick(e)
        }
    }, [handleCanvasClick, handleSelectionStart])

    // Empty handlers for SELECT mode (selection box is handled by useSelectionArea)
    const handleSelectionMouseMove = useCallback(() => {}, [])
    const handleSelectionMouseUp = useCallback(() => {}, [])

    // Setup canvas mode with mode-specific handlers
    const canvasMode = useCanvasMode({
        select: {
            onMouseDown: handleSelectionMouseDown,
            onMouseMove: handleSelectionMouseMove,
            onMouseUp: handleSelectionMouseUp
        },
        pan: {
            onMouseDown: handleMouseDown,
            onMouseMove: handleMouseMove,
            onMouseUp: handleMouseUp
        }
    }, isPanning)

    // Prepare data for floating toolbar
    const selectedBlock = selectedIds.length === 1 ? elements.find(el => el.id === selectedIds[0]) : null
    const selectedBlockBounds = selectedBlock ? {
        x: selectedBlock.x,
        y: selectedBlock.y,
        width: selectedBlock.width || (selectedBlock.type === 'image' ? ELEMENT.IMAGE.DEFAULT_WIDTH : ELEMENT.TEXT_BLOCK.DEFAULT_WIDTH),
        height: selectedBlock.height || (selectedBlock.type === 'image' ? ELEMENT.IMAGE.DEFAULT_HEIGHT : ELEMENT.TEXT_BLOCK.DEFAULT_HEIGHT)
    } : null

    // Use runtime bounds during drag/resize, otherwise use stored bounds
    const toolbarBounds = runtimeBlockBounds || selectedBlockBounds

    // Prevent default context menu
    const handleContextMenu = useCallback((e) => {
        e.preventDefault()
    }, [])

    return (
        <div className='canvas-container' onContextMenu={handleContextMenu}>
            <QuickMenuButton />
            <QuickMenu />
            <SettingsDialog />
            <UsageStatsDisplay />
            <Toolbar onAddTextBlock={handleAddTextBlock} onAddImageBlock={handleAddImageBlock} onAddChatBlock={handleAddChatBlock} />
            <CanvasKeyboardHandler
                offsetRef={offsetRef}
                zoomRef={zoomRef}
                onPaste={handlePaste}
                elements={elements}
                focusOnElement={focusOnElement}
            />
            <div
                ref={canvasRef}
                className='canvas'
                onMouseDown={canvasMode.handlers.onMouseDown}
                onMouseMove={canvasMode.handlers.onMouseMove}
                onMouseUp={canvasMode.handlers.onMouseUp}
                style={{
                    cursor: canvasMode.handlers.cursor
                }}
            >
                <CanvasBackground zoomRef={zoomRef} offsetRef={offsetRef} elements={elements} />
                <CanvasRenderer
                    visibleElements={visibleElements}
                    selectedIds={selectedIds}
                    onElementClick={handleElementClick}
                    onElementMouseDown={handleElementMouseDown}
                    onUpdateElement={handleUpdateElement}
                    onUpdateMultiple={handleUpdateMultipleElements}
                    onDragEnd={handleDragEnd}
                    onResizeEnd={handleResizeEnd}
                    onAddTextBlockAt={handleAddTextBlockAt}
                    onAddImageBlockAt={handleAddImageBlockAt}
                    onRuntimeBoundsChange={handleRuntimeBoundsChange}
                    zoomRef={zoomRef}
                    offsetRef={offsetRef}
                    multipleDrag={multipleDrag}
                >
                    {selectedBlock && (
                        <FloatingToolbar
                            blockId={selectedBlock.id}
                            blockType={selectedBlock.type}
                            blockBounds={toolbarBounds}
                            isVisible={true}
                            zoomRef={zoomRef}
                            offsetRef={offsetRef}
                        />
                    )}
                </CanvasRenderer>
                <SelectionBox selectionBox={selectionBox} />
            </div>
        </div>
    )
}

export default Canvas
