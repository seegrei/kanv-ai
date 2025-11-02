import Command from './Command';

class CompositeCommand extends Command {
    constructor(description = 'Групповая операция') {
        super();
        this.commands = [];
        this.description = description;
    }

    addCommand(command) {
        this.commands.push(command);
    }

    execute() {
        this.commands.forEach(cmd => cmd.execute());
    }

    undo() {
        // Undo in reverse order
        for (let i = this.commands.length - 1; i >= 0; i--) {
            this.commands[i].undo();
        }
    }

    getDescription() {
        return this.description;
    }
}

export default CompositeCommand;
