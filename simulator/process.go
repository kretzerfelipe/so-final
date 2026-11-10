package simulator

type State int

const (
	New State = iota
	Ready
	Running
	Waiting
	Terminated
	Suspended
)

func (s State) String() string {
	return [...]string{"NEW", "READY", "RUNNING", "WAITING", "TERMINATED", "SUSPENDED"}[s]
}

type Process struct {
	PID         int
	Name        string
	Priority    int
	Arrival     int
	Burst       int
	Remaining   int
	State       State
	Finish      int
	IOAfter     int
	IOTime      int
	WakeAt      int
	Queue       int
	YieldEvery  int
	PPID        int
	DynPriority int
	Level       int
	Start       int
	WaitTicks   int
	Killed      bool
	ioDone      bool
	wasWaiting  bool
}

func NewProcess(pid int, name string, priority, arrival, burst int) *Process {
	return &Process{
		PID: pid, Name: name, Priority: priority, Arrival: arrival, Burst: burst,
		Remaining: burst, State: New, DynPriority: priority, Start: -1,
	}
}

func (p *Process) WithIO(after, duration int) *Process {
	p.IOAfter = after
	p.IOTime = duration
	return p
}

func (p *Process) WithQueue(queue int) *Process {
	p.Queue = queue
	return p
}

func (p *Process) WithYield(every int) *Process {
	p.YieldEvery = every
	return p
}

func (p *Process) WithParent(ppid int) *Process {
	p.PPID = ppid
	return p
}

func (p *Process) Turnaround() int { return p.Finish - p.Arrival }

func (p *Process) WaitingTime() int { return p.WaitTicks }

func (p *Process) Response() int {
	if p.Start < 0 {
		return -1
	}
	return p.Start - p.Arrival
}

func (p *Process) PC() int { return p.Burst - p.Remaining }

func (p *Process) IOBound() bool { return p.IOTime > p.Burst }
