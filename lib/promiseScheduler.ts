import _ = require("lodash");
import Promise = require("bluebird");


class PromiseScheduler {
    private tasks: Task[] = [];
    private timeoutID: number;

    constructor(private minDelay: number) { }

    public schedule(func: () => Promise<void>, interval: number) {
        this.tasks.push(new Task(func, interval));
        this.scheduleNext();
    }

    private runner(task: Task) {
        task.func().then(() => {
            this.timeoutID = null;
            task.lastRun = Date.now();
            this.scheduleNext();
        });
    }

    private scheduleNext() {
        if (this.timeoutID)
            return;
        var next = this.getNextTask();
        var delay = next.lastRun ? next.lastRun + next.interval - Date.now() : 0;
        delay = Math.max(delay, this.minDelay);
        this.timeoutID = setTimeout(this.runner.bind(this, next), delay);
    }

    private getNextTask() {
        var now = Date.now();
        return _.reduce<Task, Task>(this.tasks, (acc, cur) => {
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

    constructor(public func: () => Promise<void>, public interval: number) { }
}

export = PromiseScheduler;
