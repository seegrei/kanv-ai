import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import registerBlocks from './core/RegisterBlocks'
import { initializeBlockActions } from './core/blockActions.jsx'
import './services/analytics/AnalyticsService'

registerBlocks()
initializeBlockActions()

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)
