import Command from './Command';
import useElementsStore from '../store/useElementsStore';

class MoveBlockCommand extends Command {
    constructor(blockIds, oldPositions, newPositions) {
        super();
        this.blockIds = Array.isArray(blockIds) ? blockIds : [blockIds];
        this.oldPositions = Array.isArray(oldPositions) ? oldPositions : [oldPositions];
        this.newPositions = Array.isArray(newPositions) ? newPositions : [newPositions];
    }

    execute() {
        const store = useElementsStore.getState();
        this.blockIds.forEach((id, index) => {
            const newPos = this.newPositions[index];
            store.updateElement(id, { x: newPos.x, y: newPos.y });
        });
    }

    undo() {
        const store = useElementsStore.getState();
        this.blockIds.forEach((id, index) => {
            const oldPos = this.oldPositions[index];
            store.updateElement(id, { x: oldPos.x, y: oldPos.y });
        });
    }

    merge(command) {
        if (!(command instanceof MoveBlockCommand)) return false;

        // Can merge if same blocks and within 100ms
        if (command.blockIds.length !== this.blockIds.length) return false;
        if (!command.blockIds.every((id, i) => id === this.blockIds[i])) return false;
        if (command.timestamp - this.timestamp > 100) return false;

        // Merge: keep old positions from this command, update new positions from incoming command
        this.newPositions = command.newPositions;
        this.timestamp = command.timestamp;
        return true;
    }

    getDescription() {
        const count = this.blockIds.length;
        return count === 1 ? 'Move block' : `Move ${count} blocks`;
    }
}

export default MoveBlockCommand;
