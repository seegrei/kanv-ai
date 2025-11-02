import Command from './Command';
import useElementsStore from '../store/useElementsStore';

class CreateBlockCommand extends Command {
    constructor(block) {
        super();
        this.block = block;
    }

    execute() {
        const store = useElementsStore.getState();
        store.addElement(this.block);
    }

    undo() {
        const store = useElementsStore.getState();
        store.deleteElement(this.block.id);
    }

    getDescription() {
        const typeLabels = {
            'text': 'текстовый блок',
            'image': 'блок с изображением'
        };
        const label = typeLabels[this.block.type] || 'блок';
        return `Создать ${label}`;
    }
}

export default CreateBlockCommand;
