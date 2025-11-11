import { Sidebar } from './components/ui/Sidebar/Sidebar'
import { ViewContainer } from './components/views/ViewContainer'
import ErrorBoundary from './components/ui/ErrorBoundary/ErrorBoundary'
import './App.css'

function App() {
    return (
        <div className='app'>
            <ErrorBoundary>
                <Sidebar />
                <ViewContainer />
            </ErrorBoundary>
        </div>
    )
}

export default App
