import Command from './Command';
import useElementsStore from '../store/useElementsStore';

class UpdateContentCommand extends Command {
    constructor(blockId, oldContent, newContent) {
        super();
        this.blockId = blockId;
        this.oldContent = oldContent;
        this.newContent = newContent;
    }

    execute() {
        const store = useElementsStore.getState();
        store.updateElement(this.blockId, {
            content: this.newContent
        });
    }

    undo() {
        const store = useElementsStore.getState();
        store.updateElement(this.blockId, {
            content: this.oldContent
        });
    }

    merge(command) {
        if (!(command instanceof UpdateContentCommand)) return false;

        // Can merge if same block and within 1000ms
        if (command.blockId !== this.blockId) return false;
        if (command.timestamp - this.timestamp > 1000) return false;

        // Merge: keep old content from this command, update new content from incoming command
        this.newContent = command.newContent;
        this.timestamp = command.timestamp;
        return true;
    }

    getDescription() {
        return 'Изменить текст';
    }
}

export default UpdateContentCommand;
