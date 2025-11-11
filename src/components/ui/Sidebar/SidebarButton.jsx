import { memo } from 'react'

export const SidebarButton = memo(({ icon, label, active = false, onClick }) => {
    return (
        <button
            className={`sidebar-button ${active ? 'sidebar-button--active' : ''}`}
            onClick={onClick}
        >
            {icon && <span className='sidebar-button__icon'>{icon}</span>}
            <span className='sidebar-button__label'>{label}</span>
        </button>
    )
})

SidebarButton.displayName = 'SidebarButton'
