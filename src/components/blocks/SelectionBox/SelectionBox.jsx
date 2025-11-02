import { CANVAS } from '../../../constants'

const SelectionBox = ({ selectionBox }) => {
    if (!selectionBox) return null

    return (
        <div
            className='selection-box'
            style={{
                position: 'absolute',
                left: `${Math.min(selectionBox.startX, selectionBox.endX)}px`,
                top: `${Math.min(selectionBox.startY, selectionBox.endY)}px`,
                width: `${Math.abs(selectionBox.endX - selectionBox.startX)}px`,
                height: `${Math.abs(selectionBox.endY - selectionBox.startY)}px`,
                border: `${CANVAS.SELECTION_BOX.BORDER_WIDTH}px solid ${CANVAS.SELECTION_BOX.BORDER_COLOR}`,
                backgroundColor: CANVAS.SELECTION_BOX.BACKGROUND_COLOR,
                pointerEvents: 'none',
                zIndex: 9999
            }}
        />
    )
}

export default SelectionBox
