export interface Task {
    (): void;
}

var immediateOnce: Task[] = [];
var immediatePending: boolean;

export function setImmediateOnce(task: Task) {
    if (immediateOnce.indexOf(task) !== -1)
        return;
    immediateOnce.push(task);
    if (!immediatePending) {
        setTimeout(immediateRunner, 0);
        immediatePending = true;
    }
}

function immediateRunner() {
    var next: Task;
    while (next = immediateOnce.shift())
        next();
    immediatePending = false;
}
