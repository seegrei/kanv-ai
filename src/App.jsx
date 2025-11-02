import { useEffect } from 'react'
import Canvas from './components/canvas/Canvas/Canvas'
import ErrorBoundary from './components/ui/ErrorBoundary/ErrorBoundary'
import { initializeBlockActions } from './config/blockActions.jsx'
import './App.css'

function App() {
    // Initialize block actions registry on mount
    useEffect(() => {
        initializeBlockActions()
    }, [])

    return (
        <div className='app'>
            <ErrorBoundary>
                <Canvas />
            </ErrorBoundary>
        </div>
    )
}

export default App
