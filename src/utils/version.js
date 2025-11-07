import packageJson from '../../package.json'

/**
 * Get application version from package.json
 * @returns {string} Application version (e.g., '0.2.0')
 */
export function getAppVersion() {
    return packageJson.version
}
