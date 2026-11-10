export namespace main {
	
	export class AlgorithmRow {
	    policy: string;
	    metrics: simulator.Metrics;
	    error: string;
	
	    static createFrom(source: any = {}) {
	        return new AlgorithmRow(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.policy = source["policy"];
	        this.metrics = this.convertValues(source["metrics"], simulator.Metrics);
	        this.error = source["error"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class CompareRow {
	    mode: string;
	    launchMs: number;
	    totalMs: number;
	    threads: number;
	    stackKb: number;
	
	    static createFrom(source: any = {}) {
	        return new CompareRow(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.mode = source["mode"];
	        this.launchMs = source["launchMs"];
	        this.totalMs = source["totalMs"];
	        this.threads = source["threads"];
	        this.stackKb = source["stackKb"];
	    }
	}
	export class ProcessInput {
	    pid: number;
	    name: string;
	    priority: number;
	    arrival: number;
	    burst: number;
	    ioAfter: number;
	    ioTime: number;
	    queue: number;
	    yieldEvery: number;
	    ppid: number;
	
	    static createFrom(source: any = {}) {
	        return new ProcessInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.pid = source["pid"];
	        this.name = source["name"];
	        this.priority = source["priority"];
	        this.arrival = source["arrival"];
	        this.burst = source["burst"];
	        this.ioAfter = source["ioAfter"];
	        this.ioTime = source["ioTime"];
	        this.queue = source["queue"];
	        this.yieldEvery = source["yieldEvery"];
	        this.ppid = source["ppid"];
	    }
	}
	export class ProcessResult {
	    pid: number;
	    name: string;
	    arrival: number;
	    burst: number;
	    queue: number;
	    finish: number;
	    turnaround: number;
	    waiting: number;
	    response: number;
	    killed: boolean;
	    state: string;
	    kind: string;
	
	    static createFrom(source: any = {}) {
	        return new ProcessResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.pid = source["pid"];
	        this.name = source["name"];
	        this.arrival = source["arrival"];
	        this.burst = source["burst"];
	        this.queue = source["queue"];
	        this.finish = source["finish"];
	        this.turnaround = source["turnaround"];
	        this.waiting = source["waiting"];
	        this.response = source["response"];
	        this.killed = source["killed"];
	        this.state = source["state"];
	        this.kind = source["kind"];
	    }
	}
	export class SimConfig {
	    policy: string;
	    quantum: number;
	    cpus: number;
	    switchCost: number;
	
	    static createFrom(source: any = {}) {
	        return new SimConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.policy = source["policy"];
	        this.quantum = source["quantum"];
	        this.cpus = source["cpus"];
	        this.switchCost = source["switchCost"];
	    }
	}
	export class SimOp {
	    tick: number;
	    pid: number;
	    kind: string;
	    value: number;
	
	    static createFrom(source: any = {}) {
	        return new SimOp(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.tick = source["tick"];
	        this.pid = source["pid"];
	        this.kind = source["kind"];
	        this.value = source["value"];
	    }
	}
	export class SimulationResult {
	    timelines: number[][];
	    frames: simulator.Frame[];
	    queueNames: string[];
	    truncated: boolean;
	    metrics: simulator.Metrics;
	    processes: ProcessResult[];
	
	    static createFrom(source: any = {}) {
	        return new SimulationResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.timelines = source["timelines"];
	        this.frames = this.convertValues(source["frames"], simulator.Frame);
	        this.queueNames = source["queueNames"];
	        this.truncated = source["truncated"];
	        this.metrics = this.convertValues(source["metrics"], simulator.Metrics);
	        this.processes = this.convertValues(source["processes"], ProcessResult);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ThreadRow {
	    tid: number;
	    basePriority: number;
	    deltaPriority: number;
	    priority: number;
	    priorityName: string;
	
	    static createFrom(source: any = {}) {
	        return new ThreadRow(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.tid = source["tid"];
	        this.basePriority = source["basePriority"];
	        this.deltaPriority = source["deltaPriority"];
	        this.priority = source["priority"];
	        this.priorityName = source["priorityName"];
	    }
	}

}

export namespace simulator {
	
	export class Event {
	    kind: string;
	    pid: number;
	    cpu: number;
	    detail: string;
	
	    static createFrom(source: any = {}) {
	        return new Event(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.kind = source["kind"];
	        this.pid = source["pid"];
	        this.cpu = source["cpu"];
	        this.detail = source["detail"];
	    }
	}
	export class ProcView {
	    pid: number;
	    state: string;
	    priority: number;
	    remaining: number;
	    pc: number;
	    level: number;
	
	    static createFrom(source: any = {}) {
	        return new ProcView(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.pid = source["pid"];
	        this.state = source["state"];
	        this.priority = source["priority"];
	        this.remaining = source["remaining"];
	        this.pc = source["pc"];
	        this.level = source["level"];
	    }
	}
	export class Frame {
	    tick: number;
	    cpus: number[];
	    queues: number[][];
	    waiting: number[];
	    suspended: number[];
	    terminated: number[];
	    procs: ProcView[];
	    events: Event[];
	
	    static createFrom(source: any = {}) {
	        return new Frame(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.tick = source["tick"];
	        this.cpus = source["cpus"];
	        this.queues = source["queues"];
	        this.waiting = source["waiting"];
	        this.suspended = source["suspended"];
	        this.terminated = source["terminated"];
	        this.procs = this.convertValues(source["procs"], ProcView);
	        this.events = this.convertValues(source["events"], Event);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Metrics {
	    avgWaiting: number;
	    avgTurnaround: number;
	    avgResponse: number;
	    cpuUtilization: number;
	    throughput: number;
	    contextSwitches: number;
	    switchTicks: number;
	
	    static createFrom(source: any = {}) {
	        return new Metrics(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.avgWaiting = source["avgWaiting"];
	        this.avgTurnaround = source["avgTurnaround"];
	        this.avgResponse = source["avgResponse"];
	        this.cpuUtilization = source["cpuUtilization"];
	        this.throughput = source["throughput"];
	        this.contextSwitches = source["contextSwitches"];
	        this.switchTicks = source["switchTicks"];
	    }
	}

}

export namespace winproc {
	
	export class Info {
	    pid: number;
	    parentPid: number;
	    threads: number;
	    basePriority: number;
	    name: string;
	
	    static createFrom(source: any = {}) {
	        return new Info(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.pid = source["pid"];
	        this.parentPid = source["parentPid"];
	        this.threads = source["threads"];
	        this.basePriority = source["basePriority"];
	        this.name = source["name"];
	    }
	}

}

