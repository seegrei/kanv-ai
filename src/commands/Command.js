class Command {
    constructor() {
        this.timestamp = Date.now();
    }

    execute() {
        throw new Error('execute() must be implemented by subclass');
    }

    undo() {
        throw new Error('undo() must be implemented by subclass');
    }

    // Optional: merge with another command of the same type
    merge(command) {
        return false;
    }

    // Optional: get description for UI
    getDescription() {
        return 'Command';
    }
}

export default Command;
