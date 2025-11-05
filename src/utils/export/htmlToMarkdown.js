/**
 * Convert HTML content to Markdown format
 * @param {string} html - HTML content from TipTap editor
 * @returns {string} Markdown formatted text
 */
export const htmlToMarkdown = (html) => {
    if (!html) return ''

    // Create a temporary DOM element to parse HTML
    const temp = document.createElement('div')
    temp.innerHTML = html

    const convertNode = (node, indent = '') => {
        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
            return ''
        }

        const tagName = node.tagName.toLowerCase()
        const children = Array.from(node.childNodes)
        let content = children.map(child => convertNode(child, indent)).join('')

        switch (tagName) {
            case 'h1':
                return `# ${content}\n\n`
            case 'h2':
                return `## ${content}\n\n`
            case 'h3':
                return `### ${content}\n\n`
            case 'p':
                // Check if paragraph is inside a list item
                if (node.parentElement && node.parentElement.tagName.toLowerCase() === 'li') {
                    return content
                }
                return `${content}\n\n`
            case 'strong':
            case 'b':
                return `**${content}**`
            case 'em':
            case 'i':
                return `*${content}*`
            case 'code':
                return `\`${content}\``
            case 'pre':
                return `\`\`\`\n${content}\n\`\`\`\n\n`
            case 'a':
                const href = node.getAttribute('href') || ''
                return `[${content}](${href})`
            case 'ul':
                return children.map(child => {
                    if (child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() === 'li') {
                        // Check if it's a task list item
                        const input = child.querySelector('input[type="checkbox"]')
                        if (input) {
                            const checked = input.checked ? 'x' : ' '
                            // Clone node and remove checkbox to get text content
                            const clone = child.cloneNode(true)
                            const cloneInput = clone.querySelector('input[type="checkbox"]')
                            if (cloneInput) {
                                cloneInput.remove()
                            }
                            const text = convertNode(clone, indent + '  ').trim()
                            return `${indent}- [${checked}] ${text}\n`
                        }
                        const text = convertNode(child, indent + '  ')
                        return `${indent}- ${text}\n`
                    }
                    return ''
                }).join('') + '\n'
            case 'ol':
                return children.map((child, index) => {
                    if (child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() === 'li') {
                        const text = convertNode(child, indent + '  ')
                        return `${indent}${index + 1}. ${text}\n`
                    }
                    return ''
                }).join('') + '\n'
            case 'li':
                // Handle list item content (will be processed by parent ul/ol)
                return children.map(child => convertNode(child, indent)).join('')
            case 'br':
                return '\n'
            case 'hr':
                return '---\n\n'
            case 'blockquote':
                return content.split('\n').map(line =>
                    line ? `> ${line}` : '>'
                ).join('\n') + '\n\n'
            default:
                return content
        }
    }

    let markdown = convertNode(temp)

    // Clean up extra whitespace
    markdown = markdown.replace(/\n{3,}/g, '\n\n').trim()

    return markdown
}

/**
 * Download content as markdown file
 * @param {string} content - HTML content to convert and download
 * @param {string} filename - Name of the file (default: 'document.md')
 */
export const downloadAsMarkdown = (content, filename = 'document.md') => {
    const markdown = htmlToMarkdown(content)

    // Create blob with markdown content
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })

    // Create download link
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename

    // Trigger download
    document.body.appendChild(link)
    link.click()

    // Cleanup
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}
