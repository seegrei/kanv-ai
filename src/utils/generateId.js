/**
 * Generate unique ID
 * Used for blocks, images, messages, boards, etc.
 * @returns {string} Unique ID in format: timestamp_randomString
 */
export const generateId = () => {
    const random = Math.random().toString(36).substring(2, 11)
    return `${Date.now()}_${random}`
}
