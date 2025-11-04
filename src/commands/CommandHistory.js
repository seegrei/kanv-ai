class CommandHistory {
    constructor(maxSize = 50) {
        this.history = [];
        this.current = -1;
        this.maxSize = maxSize;
        this.isExecuting = false;
    }

    execute(command) {
        if (this.isExecuting) return;

        this.isExecuting = true;
        try {
            // Execute command
            command.execute();

            // Remove "future" commands
            this.history = this.history.slice(0, this.current + 1);

            // Try to merge with previous command
            if (this.current >= 0) {
                const previousCommand = this.history[this.current];
                if (previousCommand.merge(command)) {
                    this.isExecuting = false;
                    return;
                }
            }

            // Add command to history
            this.history.push(command);
            this.current++;

            // Limit history size
            if (this.history.length > this.maxSize) {
                this.history.shift();
                this.current--;
            }
        } finally {
            this.isExecuting = false;
        }
    }

    undo() {
        if (!this.canUndo() || this.isExecuting) return;

        this.isExecuting = true;
        try {
            const command = this.history[this.current];
            command.undo();
            this.current--;
        } finally {
            this.isExecuting = false;
        }
    }

    redo() {
        if (!this.canRedo() || this.isExecuting) return;

        this.isExecuting = true;
        try {
            this.current++;
            const command = this.history[this.current];
            command.execute();
        } finally {
            this.isExecuting = false;
        }
    }

    canUndo() {
        return this.current >= 0;
    }

    canRedo() {
        return this.current < this.history.length - 1;
    }

    clear() {
        this.history = [];
        this.current = -1;
    }

    getAllCommands() {
        return this.history;
    }

    // Add command to history without executing it
    // Used when the command action has already been performed
    addWithoutExecute(command) {
        if (this.isExecuting) return;

        // Remove "future" commands
        this.history = this.history.slice(0, this.current + 1);

        // Add command to history
        this.history.push(command);
        this.current++;

        // Limit history size
        if (this.history.length > this.maxSize) {
            this.history.shift();
            this.current--;
        }
    }
}

export default CommandHistory;
