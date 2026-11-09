export namespace main {
	
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
	    }
	}
	export class ProcessResult {
	    pid: number;
	    name: string;
	    priority: number;
	    arrival: number;
	    burst: number;
	    ioTime: number;
	    finish: number;
	    turnaround: number;
	    waiting: number;
	
	    static createFrom(source: any = {}) {
	        return new ProcessResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.pid = source["pid"];
	        this.name = source["name"];
	        this.priority = source["priority"];
	        this.arrival = source["arrival"];
	        this.burst = source["burst"];
	        this.ioTime = source["ioTime"];
	        this.finish = source["finish"];
	        this.turnaround = source["turnaround"];
	        this.waiting = source["waiting"];
	    }
	}
	export class SimulationResult {
	    timeline: number[];
	    processes: ProcessResult[];
	    avgWaiting: number;
	
	    static createFrom(source: any = {}) {
	        return new SimulationResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.timeline = source["timeline"];
	        this.processes = this.convertValues(source["processes"], ProcessResult);
	        this.avgWaiting = source["avgWaiting"];
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

