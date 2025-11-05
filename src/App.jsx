import Canvas from './components/canvas/Canvas/Canvas'
import ErrorBoundary from './components/ui/ErrorBoundary/ErrorBoundary'
import './App.css'

function App() {
    return (
        <div className='app'>
            <ErrorBoundary>
                <Canvas />
            </ErrorBoundary>
        </div>
    )
}

export default App
