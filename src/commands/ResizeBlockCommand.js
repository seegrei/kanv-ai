import Command from './Command';
import useElementsStore from '../store/useElementsStore';

class ResizeBlockCommand extends Command {
    constructor(blockId, oldBounds, newBounds) {
        super();
        this.blockId = blockId;
        this.oldBounds = oldBounds; // { x, y, width, height }
        this.newBounds = newBounds; // { x, y, width, height }
    }

    execute() {
        const store = useElementsStore.getState();
        store.updateElement(this.blockId, this.newBounds);
    }

    undo() {
        const store = useElementsStore.getState();
        store.updateElement(this.blockId, this.oldBounds);
    }

    merge(command) {
        if (!(command instanceof ResizeBlockCommand)) return false;

        // Can merge if same block and within 100ms
        if (command.blockId !== this.blockId) return false;
        if (command.timestamp - this.timestamp > 100) return false;

        // Merge: keep old bounds from this command, update new bounds from incoming command
        this.newBounds = command.newBounds;
        this.timestamp = command.timestamp;
        return true;
    }

    getDescription() {
        return 'Resize block';
    }
}

export default ResizeBlockCommand;
