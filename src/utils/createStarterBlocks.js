import BlockFactory from '../core/BlockFactory'

/**
 * Create starter blocks for a new board
 * @returns {Array} Array of starter blocks
 */
export function createStarterBlocks() {
    const blocks = []

    // Welcome heading block
    blocks.push(BlockFactory.create('text', {
        x: 100,
        y: 100,
        width: 542.8571428571428,
        height: 102,
        content: '<h1>Hello world!</h1><p><a target="_blank" rel="noopener noreferrer nofollow" href="http://Kanv.ai"><strong>Kanv.ai</strong></a> is an open source AI-powered infinite thought board</p>'
    }))

    // Local storage info block
    blocks.push(BlockFactory.create('text', {
        x: 101.42857142857133,
        y: 225.14285714285717,
        width: 540,
        height: 54,
        content: '<p>Your data is stored locally in the browser</p>'
    }))

    // API key info block
    blocks.push(BlockFactory.create('text', {
        x: 101.42857142857133,
        y: 300.8571428571429,
        width: 540,
        height: 54,
        content: '<p>Bring your own API key to use text and image generation</p>'
    }))

    // Task list block
    blocks.push(BlockFactory.create('text', {
        x: 102.85714285714278,
        y: 379.42857142857144,
        width: 540,
        height: 214,
        content: '<h2>It would be great if you</h2><ul data-type="taskList"><li class="task-item" data-checked="false" data-type="taskItem"><label><input type="checkbox"><span></span></label><div><p>Join the Discord chat</p></div></li><li class="task-item" data-checked="false" data-type="taskItem"><label><input type="checkbox"><span></span></label><div><p>Follow on X</p></div></li><li class="task-item" data-checked="false" data-type="taskItem"><label><input type="checkbox"><span></span></label><div><p>Join the Reddit community</p></div></li><li class="task-item" data-checked="false" data-type="taskItem"><label><input type="checkbox"><span></span></label><div><p>Send your pull request on GitHub</p></div></li></ul><p></p>'
    }))

    return blocks
}
