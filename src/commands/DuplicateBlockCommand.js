import CompositeCommand from './CompositeCommand';
import CreateBlockCommand from './CreateBlockCommand';

class DuplicateBlockCommand extends CompositeCommand {
    constructor(duplicatedBlocks) {
        const count = duplicatedBlocks.length;
        super(count === 1 ? 'Дублировать блок' : `Дублировать ${count} блоков`);

        // For each duplicated block, create a CreateBlockCommand
        duplicatedBlocks.forEach(block => {
            this.addCommand(new CreateBlockCommand(block));
        });
    }
}

export default DuplicateBlockCommand;
