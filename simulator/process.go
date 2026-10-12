package simulator

type State int

const (
	New State = iota
	Ready
	Running
	Waiting
	Terminated
)

func (s State) String() string {
	return [...]string{"NEW", "READY", "RUNNING", "WAITING", "TERMINATED"}[s]
}

type Process struct {
	PID       int
	Name      string
	Priority  int
	Arrival   int
	Burst     int
	Remaining int
	State     State
	Finish    int
	IOAfter   int
	IOTime    int
	WakeAt    int
	ioDone    bool
}

func NewProcess(pid int, name string, priority, arrival, burst int) *Process {
	return &Process{PID: pid, Name: name, Priority: priority, Arrival: arrival, Burst: burst, Remaining: burst, State: New}
}

func (p *Process) WithIO(after, duration int) *Process {
	p.IOAfter = after
	p.IOTime = duration
	return p
}

func (p *Process) Turnaround() int { return p.Finish - p.Arrival }

func (p *Process) WaitingTime() int { return p.Turnaround() - p.Burst - p.IOTime }
