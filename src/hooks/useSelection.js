import { useCallback, useRef } from 'react'

const useSelection = ({ id, onClick, wasDragged, wasResized }) => {
    const handleClick = useCallback(() => {
        if (wasDragged?.current || wasResized?.current) {
            return
        }
        onClick(id)
    }, [id, onClick, wasDragged, wasResized])

    return {
        handleClick
    }
}

export default useSelection
