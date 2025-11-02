import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import registerBlocks from './core/registerBlocks'
import './services/analytics/AnalyticsService'

registerBlocks()

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)
