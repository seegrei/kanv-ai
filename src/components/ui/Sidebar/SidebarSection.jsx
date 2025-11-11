import { memo } from 'react'

export const SidebarSection = memo(({ title, children }) => {
    return (
        <div className='sidebar-section'>
            {title && <div className='sidebar-section__title'>{title}</div>}
            <div className='sidebar-section__content'>
                {children}
            </div>
        </div>
    )
})

SidebarSection.displayName = 'SidebarSection'
