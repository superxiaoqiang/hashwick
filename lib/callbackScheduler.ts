import _ = require("underscore");


class CallbackScheduler {
    private tasks: Task[] = [];
    private timeoutID: number;

    constructor(private minDelay: number) { }

    public schedule(func: Function, interval: number) {
        this.tasks.push(new Task(func, interval));
        this.scheduleNext();
    }

    private runner(task: Task) {
        task.func(() => {
            this.timeoutID = null;
            task.lastRun = Date.now();
            this.scheduleNext();
        });
    }

    private scheduleNext() {
        if (this.timeoutID)
            return;
        var next = this.getNextTask();
        var delay = next.lastRun ? Date.now() - next.lastRun + next.interval : 0;
        delay = Math.max(delay, this.minDelay);
        this.timeoutID = setTimeout(this.runner.bind(this, next), delay);
    }

    private getNextTask() {
        var now = Date.now();
        return _.reduce(this.tasks, (acc, cur) => {
            if (!acc.lastRun)
                return acc;
            if (!cur.lastRun)
                return cur;
            return acc.lastRun + acc.interval < cur.lastRun + cur.interval ? acc : cur;
        });
    }
}

class Task {
    public lastRun: number;

    constructor(public func: Function, public interval: number) { }
}

export = CallbackScheduler;
