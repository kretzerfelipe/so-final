package simulator

type Policy string

const (
	FIFO            Policy = "fifo"
	SJF             Policy = "sjf"
	Cooperative     Policy = "coop"
	RoundRobin      Policy = "rr"
	Priority        Policy = "priority"
	PriorityDynamic Policy = "priority-dyn"
	MultiQueue      Policy = "mq"
	Feedback        Policy = "mlfq"
)

var AllPolicies = []Policy{FIFO, SJF, Cooperative, RoundRobin, Priority, PriorityDynamic, MultiQueue, Feedback}

const levels = 3

type scheduler interface {
	add(p *Process)
	requeue(p *Process, why string)
	pick() *Process
	preempt(running *Process, used int) (bool, string)
	remove(p *Process)
	queues() [][]int
	queueNames() []string
}

func newScheduler(cfg Config) scheduler {
	switch cfg.Policy {
	case FIFO, Cooperative:
		return &fifoSched{}
	case SJF:
		return &sjfSched{}
	case RoundRobin:
		return &rrSched{quantum: cfg.Quantum}
	case Priority, PriorityDynamic:
		return &prioSched{}
	case MultiQueue:
		return &mqSched{quantum: cfg.Quantum}
	case Feedback:
		return &mlfqSched{quantum: cfg.Quantum}
	}
	return nil
}

type queue []*Process

func (q *queue) push(p *Process) { *q = append(*q, p) }

func (q *queue) popAt(i int) *Process {
	p := (*q)[i]
	*q = append((*q)[:i], (*q)[i+1:]...)
	return p
}

func (q *queue) remove(p *Process) bool {
	for i, x := range *q {
		if x == p {
			q.popAt(i)
			return true
		}
	}
	return false
}

func (q queue) pids() []int {
	ids := make([]int, len(q))
	for i, p := range q {
		ids[i] = p.PID
	}
	return ids
}

func (q queue) best(less func(a, b *Process) bool) int {
	best := -1
	for i, p := range q {
		if best < 0 || less(p, q[best]) {
			best = i
		}
	}
	return best
}

type fifoSched struct{ q queue }

func (s *fifoSched) add(p *Process)               { s.q.push(p) }
func (s *fifoSched) requeue(p *Process, _ string) { s.q.push(p) }
func (s *fifoSched) remove(p *Process)            { s.q.remove(p) }
func (s *fifoSched) queues() [][]int              { return [][]int{s.q.pids()} }
func (s *fifoSched) queueNames() []string         { return []string{"Prontos (FIFO)"} }

func (s *fifoSched) pick() *Process {
	if len(s.q) == 0 {
		return nil
	}
	return s.q.popAt(0)
}

func (s *fifoSched) preempt(_ *Process, _ int) (bool, string) { return false, "" }

type sjfSched struct{ q queue }

func (s *sjfSched) add(p *Process)               { s.q.push(p) }
func (s *sjfSched) requeue(p *Process, _ string) { s.q.push(p) }
func (s *sjfSched) remove(p *Process)            { s.q.remove(p) }
func (s *sjfSched) queues() [][]int              { return [][]int{s.q.pids()} }
func (s *sjfSched) queueNames() []string {
	return []string{"Prontos (menor tempo restante primeiro)"}
}

func (s *sjfSched) pick() *Process {
	i := s.q.best(func(a, b *Process) bool { return a.Remaining < b.Remaining })
	if i < 0 {
		return nil
	}
	return s.q.popAt(i)
}

func (s *sjfSched) preempt(_ *Process, _ int) (bool, string) { return false, "" }

type rrSched struct {
	q       queue
	quantum int
}

func (s *rrSched) add(p *Process)               { s.q.push(p) }
func (s *rrSched) requeue(p *Process, _ string) { s.q.push(p) }
func (s *rrSched) remove(p *Process)            { s.q.remove(p) }
func (s *rrSched) queues() [][]int              { return [][]int{s.q.pids()} }
func (s *rrSched) queueNames() []string         { return []string{"Prontos (circular)"} }

func (s *rrSched) pick() *Process {
	if len(s.q) == 0 {
		return nil
	}
	return s.q.popAt(0)
}

func (s *rrSched) preempt(_ *Process, used int) (bool, string) {
	return used >= s.quantum, "timerunout"
}

type prioSched struct{ q queue }

func (s *prioSched) add(p *Process)               { s.q.push(p) }
func (s *prioSched) requeue(p *Process, _ string) { s.q.push(p) }
func (s *prioSched) remove(p *Process)            { s.q.remove(p) }
func (s *prioSched) queues() [][]int              { return [][]int{s.q.pids()} }
func (s *prioSched) queueNames() []string         { return []string{"Prontos (por prioridade)"} }

func lowerPriority(a, b *Process) bool { return a.DynPriority < b.DynPriority }

func (s *prioSched) pick() *Process {
	i := s.q.best(lowerPriority)
	if i < 0 {
		return nil
	}
	return s.q.popAt(i)
}

func (s *prioSched) preempt(running *Process, _ int) (bool, string) {
	i := s.q.best(lowerPriority)
	return i >= 0 && s.q[i].DynPriority < running.DynPriority, "preempt"
}

type mqSched struct {
	q       [levels]queue
	quantum int
}

func clampLevel(v int) int {
	if v < 0 {
		return 0
	}
	if v >= levels {
		return levels - 1
	}
	return v
}

func (s *mqSched) add(p *Process)               { s.q[clampLevel(p.Queue)].push(p) }
func (s *mqSched) requeue(p *Process, _ string) { s.add(p) }

func (s *mqSched) remove(p *Process) {
	for i := range s.q {
		if s.q[i].remove(p) {
			return
		}
	}
}

func (s *mqSched) queues() [][]int {
	out := make([][]int, levels)
	for i := range s.q {
		out[i] = s.q[i].pids()
	}
	return out
}

func (s *mqSched) queueNames() []string {
	return []string{"Sistema (FIFO)", "Interativos (circular)", "Batch (FIFO)"}
}

func (s *mqSched) pick() *Process {
	for i := range s.q {
		if len(s.q[i]) > 0 {
			return s.q[i].popAt(0)
		}
	}
	return nil
}

func (s *mqSched) preempt(running *Process, used int) (bool, string) {
	own := clampLevel(running.Queue)
	for i := 0; i < own; i++ {
		if len(s.q[i]) > 0 {
			return true, "preempt"
		}
	}
	if own == 1 && used >= s.quantum {
		return true, "timerunout"
	}
	return false, ""
}

type mlfqSched struct {
	q       [levels]queue
	quantum int
}

func (s *mlfqSched) add(p *Process) {
	p.Level = clampLevel(p.Level)
	s.q[p.Level].push(p)
}

func (s *mlfqSched) requeue(p *Process, why string) {
	if why == "timerunout" && p.Level < levels-1 {
		p.Level++
	}
	s.add(p)
}

func (s *mlfqSched) remove(p *Process) {
	for i := range s.q {
		if s.q[i].remove(p) {
			return
		}
	}
}

func (s *mlfqSched) queues() [][]int {
	out := make([][]int, levels)
	for i := range s.q {
		out[i] = s.q[i].pids()
	}
	return out
}

func (s *mlfqSched) queueNames() []string {
	return []string{"Fila 1 (FIFO, menor quantum)", "Fila 2 (FIFO)", "Fila 3 (circular, maior quantum)"}
}

func (s *mlfqSched) pick() *Process {
	for i := range s.q {
		if len(s.q[i]) > 0 {
			return s.q[i].popAt(0)
		}
	}
	return nil
}

func (s *mlfqSched) preempt(running *Process, used int) (bool, string) {
	for i := 0; i < running.Level; i++ {
		if len(s.q[i]) > 0 {
			return true, "preempt"
		}
	}
	if used >= s.quantum<<uint(running.Level) {
		return true, "timerunout"
	}
	return false, ""
}
