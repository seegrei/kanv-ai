import { createLogger } from '../utils/logger'

const logger = createLogger('BlockActionRegistry')

/**
 * Registry for managing block actions (toolbar buttons)
 * Allows registering actions for specific block types and retrieving them
 *
 * Action structure:
 * {
 *   id: string - unique action identifier
 *   type: string OR types: string[] - block type(s) this action applies to ('text', 'image', etc.)
 *   icon: ReactNode - icon component/element to display
 *   label: string - action label for tooltip
 *   group: string - group identifier for organizing actions (actions in same group appear together)
 *   order: number - order within group (lower numbers appear first)
 *   variant: string - button variant ('default', 'primary') for styling
 *   handler: (blockId, blockType, context) => void - function to execute when action is triggered
 *   isVisible: (blockId, blockType, context) => boolean - optional visibility condition
 *   isDisabled: (blockId, blockType, context) => boolean - optional disabled condition
 * }
 *
 * Context structure:
 * {
 *   stores: { elementsStore, selectionStore, historyStore, ... }
 *   actions: { updateElement, deleteElements, ... }
 *   canvas: { zoom, offset, ... }
 * }
 */
class BlockActionRegistry {
    constructor() {
        this.actions = new Map()
        logger.info('BlockActionRegistry initialized')
    }

    /**
     * Register a single action
     * @param {Object} actionConfig - action configuration object
     */
    registerAction(actionConfig) {
        const { id, type, types } = actionConfig

        if (!id) {
            logger.error('Action registration failed: missing id', actionConfig)
            return
        }

        // Check if action with this id is already registered
        if (this.actions.has(id)) {
            logger.warn(`Action with id '${id}' is already registered, skipping duplicate registration`)
            return
        }

        // Normalize types to array
        const actionTypes = types || (type ? [type] : [])
        if (actionTypes.length === 0) {
            logger.error('Action registration failed: no type or types specified', actionConfig)
            return
        }

        // Store action with normalized types
        this.actions.set(id, {
            ...actionConfig,
            types: actionTypes
        })

        logger.info(`Action registered: ${id} for types: ${actionTypes.join(', ')}`)
    }

    /**
     * Get all actions for a specific block
     * @param {string} blockType - block type identifier
     * @param {string} blockId - block id
     * @param {Object} context - context object with stores, actions, canvas params
     * @returns {Array} - filtered and sorted actions grouped by 'group'
     */
    getActionsForBlock(blockType, blockId, context) {
        const applicableActions = []

        // Filter actions that apply to this block type
        for (const [id, action] of this.actions) {
            if (!action.types.includes(blockType)) {
                continue
            }

            // Check visibility condition
            if (action.isVisible && !action.isVisible(blockId, blockType, context)) {
                continue
            }

            // Include this action with computed disabled state
            applicableActions.push({
                ...action,
                disabled: action.isDisabled ? action.isDisabled(blockId, blockType, context) : false
            })
        }

        // Sort by group and order
        applicableActions.sort((a, b) => {
            const groupA = a.group || 'default'
            const groupB = b.group || 'default'
            const orderA = a.order || 0
            const orderB = b.order || 0

            if (groupA !== groupB) {
                return groupA.localeCompare(groupB)
            }
            return orderA - orderB
        })

        return applicableActions
    }
}

// Export singleton instance
export const blockActionRegistry = new BlockActionRegistry()

export default BlockActionRegistry
