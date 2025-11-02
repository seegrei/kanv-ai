import Command from './Command';
import useElementsStore from '../store/useElementsStore';

class DeleteBlockCommand extends Command {
    constructor(blocks) {
        super();
        // Store full block data for restoration
        this.blocks = Array.isArray(blocks) ? blocks : [blocks];
    }

    execute() {
        const store = useElementsStore.getState();
        const ids = this.blocks.map(block => block.id);
        // Delete elements but do NOT delete images from IndexedDB
        // Images are preserved for potential undo
        store.deleteElements(ids);
    }

    undo() {
        const store = useElementsStore.getState();
        // Restore blocks with their original IDs and all data
        this.blocks.forEach(block => {
            store.addElement(block);
        });
    }

    getDescription() {
        const count = this.blocks.length;
        return count === 1 ? 'Удалить блок' : `Удалить ${count} блоков`;
    }
}

export default DeleteBlockCommand;
