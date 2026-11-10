package simulator

import (
	"errors"
	"fmt"
	"sort"
)

const maxTicks = 5000

type Config struct {
	Policy     Policy
	Quantum    int
	CPUs       int
	SwitchCost int
}

type OpKind string

const (
	OpSuspend  OpKind = "suspend"
	OpResume   OpKind = "resume"
	OpKill     OpKind = "kill"
	OpPriority OpKind = "priority"
)

type Op struct {
	Tick  int
	PID   int
	Kind  OpKind
	Value int
}

type Event struct {
	Kind   string `json:"kind"`
	PID    int    `json:"pid"`
	CPU    int    `json:"cpu"`
	Detail string `json:"detail"`
}

type ProcView struct {
	PID       int    `json:"pid"`
	State     string `json:"state"`
	Priority  int    `json:"priority"`
	Remaining int    `json:"remaining"`
	PC        int    `json:"pc"`
	Level     int    `json:"level"`
}

type Frame struct {
	Tick       int        `json:"tick"`
	CPUs       []int      `json:"cpus"`
	Queues     [][]int    `json:"queues"`
	Waiting    []int      `json:"waiting"`
	Suspended  []int      `json:"suspended"`
	Terminated []int      `json:"terminated"`
	Procs      []ProcView `json:"procs"`
	Events     []Event    `json:"events"`
}

type Metrics struct {
	AvgWaiting      float64 `json:"avgWaiting"`
	AvgTurnaround   float64 `json:"avgTurnaround"`
	AvgResponse     float64 `json:"avgResponse"`
	CPUUtilization  float64 `json:"cpuUtilization"`
	Throughput      float64 `json:"throughput"`
	ContextSwitches int     `json:"contextSwitches"`
	SwitchTicks     int     `json:"switchTicks"`
}

type Result struct {
	Timeline   []int
	Timelines  [][]int
	Frames     []Frame
	QueueNames []string
	Truncated  bool
	Metrics    Metrics
}

type cpuState struct {
	running   *Process
	used      int
	switching int
	last      *Process
}

type Engine struct {
	cfg         Config
	procs       []*Process
	byPID       map[int]*Process
	ops         []Op
	sched       scheduler
	cpus        []*cpuState
	waiting     []*Process
	timelines   [][]int
	frames      []Frame
	events      []Event
	tick        int
	done        int
	busy        int
	switches    int
	switchTicks int
}

func Run(procs []*Process, policy Policy, quantum int) Result {
	res, _ := RunConfig(procs, Config{Policy: policy, Quantum: quantum, CPUs: 1}, nil)
	return res
}

func RunConfig(procs []*Process, cfg Config, ops []Op) (Result, error) {
	if cfg.CPUs == 0 {
		cfg.CPUs = 1
	}
	if err := validate(procs, cfg, ops); err != nil {
		return Result{}, err
	}
	e := newEngine(procs, cfg, ops)
	return e.run(), nil
}

func validate(procs []*Process, cfg Config, ops []Op) error {
	known := false
	for _, p := range AllPolicies {
		if p == cfg.Policy {
			known = true
		}
	}
	if !known {
		return errors.New("política de escalonamento inválida")
	}
	if cfg.CPUs < 1 || cfg.CPUs > 8 {
		return errors.New("o número de processadores deve estar entre 1 e 8")
	}
	if cfg.SwitchCost < 0 || cfg.SwitchCost > 10 {
		return errors.New("o custo da troca de contexto deve estar entre 0 e 10 ticks")
	}
	usesQuantum := cfg.Policy == RoundRobin || cfg.Policy == MultiQueue || cfg.Policy == Feedback
	if usesQuantum && cfg.Quantum < 1 {
		return errors.New("o quantum deve ser maior que zero")
	}
	if len(procs) == 0 {
		return errors.New("adicione ao menos um processo")
	}

	seen := map[int]bool{}
	for _, p := range procs {
		if p.PID < 1 || seen[p.PID] {
			return fmt.Errorf("PID %d inválido ou repetido", p.PID)
		}
		seen[p.PID] = true
	}
	for _, p := range procs {
		if p.Burst < 1 || p.Arrival < 0 || p.Priority < 0 {
			return fmt.Errorf("P%d: burst deve ser >= 1, chegada >= 0 e prioridade >= 0", p.PID)
		}
		if p.IOTime < 0 || (p.IOTime > 0 && (p.IOAfter < 1 || p.IOAfter >= p.Burst)) {
			return fmt.Errorf("P%d: a E/S deve ocorrer após pelo menos 1 tick e antes do fim do burst", p.PID)
		}
		if p.YieldEvery < 0 {
			return fmt.Errorf("P%d: o intervalo de cessão não pode ser negativo", p.PID)
		}
		if p.Queue < 0 || p.Queue >= levels {
			return fmt.Errorf("P%d: a fila deve estar entre 0 e %d", p.PID, levels-1)
		}
		if p.PPID != 0 && (p.PPID == p.PID || !seen[p.PPID]) {
			return fmt.Errorf("P%d: processo pai %d inexistente", p.PID, p.PPID)
		}
	}
	for _, o := range ops {
		if o.Tick < 0 || !seen[o.PID] {
			return errors.New("operação com tick negativo ou processo inexistente")
		}
		switch o.Kind {
		case OpSuspend, OpResume, OpKill:
		case OpPriority:
			if o.Value < 0 {
				return errors.New("a prioridade não pode ser negativa")
			}
		default:
			return errors.New("operação desconhecida")
		}
	}
	return nil
}

func newEngine(procs []*Process, cfg Config, ops []Op) *Engine {
	e := &Engine{cfg: cfg, procs: procs, byPID: map[int]*Process{}, sched: newScheduler(cfg)}
	for _, p := range procs {
		p.State = New
		p.Remaining = p.Burst
		p.Finish = 0
		p.WakeAt = 0
		p.DynPriority = p.Priority
		p.Level = 0
		p.Start = -1
		p.WaitTicks = 0
		p.Killed = false
		p.ioDone = false
		p.wasWaiting = false
		e.byPID[p.PID] = p
	}
	e.ops = append([]Op(nil), ops...)
	sort.SliceStable(e.ops, func(i, j int) bool { return e.ops[i].Tick < e.ops[j].Tick })
	for i := 0; i < cfg.CPUs; i++ {
		e.cpus = append(e.cpus, &cpuState{})
		e.timelines = append(e.timelines, nil)
	}
	return e
}

func (e *Engine) run() Result {
	truncated := false
	for e.done < len(e.procs) {
		if e.tick >= maxTicks {
			truncated = true
			break
		}
		if e.stalled() {
			break
		}
		e.step()
	}
	return e.result(truncated)
}

func (e *Engine) stalled() bool {
	for _, p := range e.procs {
		switch p.State {
		case New, Ready, Running, Waiting:
			return false
		}
	}
	for _, o := range e.ops {
		if o.Tick >= e.tick {
			return false
		}
	}
	return true
}

func (e *Engine) step() {
	e.applyOps()
	e.admit()
	e.wake()
	for i := range e.cpus {
		e.schedule(i)
	}
	e.execute()
	e.snapshot()
	e.tick++
}

func (e *Engine) log(kind string, p *Process, cpu int, detail string) {
	pid := 0
	if p != nil {
		pid = p.PID
	}
	e.events = append(e.events, Event{Kind: kind, PID: pid, CPU: cpu, Detail: detail})
}

func (e *Engine) applyOps() {
	for _, o := range e.ops {
		if o.Tick != e.tick {
			continue
		}
		p := e.byPID[o.PID]
		switch o.Kind {
		case OpSuspend:
			e.suspend(p)
		case OpResume:
			e.resume(p)
		case OpKill:
			e.kill(p, e.tick)
		case OpPriority:
			e.setPriority(p, o.Value)
		}
	}
}

func (e *Engine) suspend(p *Process) {
	switch p.State {
	case Ready:
		e.sched.remove(p)
	case Running:
		e.freeCPU(p)
	case Waiting:
		e.removeWaiting(p)
		p.wasWaiting = true
	default:
		return
	}
	p.State = Suspended
	e.log("suspend", p, -1, "")
}

func (e *Engine) resume(p *Process) {
	if p.State != Suspended {
		return
	}
	if p.wasWaiting && p.WakeAt > e.tick {
		p.State = Waiting
		e.waiting = append(e.waiting, p)
	} else {
		p.State = Ready
		e.sched.add(p)
	}
	p.wasWaiting = false
	e.log("resume", p, -1, "")
}

func (e *Engine) kill(p *Process, at int) {
	switch p.State {
	case Terminated:
		return
	case Ready:
		e.sched.remove(p)
	case Running:
		e.freeCPU(p)
	case Waiting:
		e.removeWaiting(p)
	}
	p.State = Terminated
	p.Killed = true
	p.Finish = at
	e.done++
	e.log("kill", p, -1, "")
	e.killChildren(p, at)
}

func (e *Engine) killChildren(parent *Process, at int) {
	for _, c := range e.procs {
		if c.PPID == parent.PID && c.State != Terminated {
			e.kill(c, at)
		}
	}
}

func (e *Engine) setPriority(p *Process, value int) {
	if p.State == Terminated {
		return
	}
	e.log("priority", p, -1, fmt.Sprintf("prioridade %d → %d", p.DynPriority, value))
	p.Priority = value
	p.DynPriority = value
}

func (e *Engine) freeCPU(p *Process) {
	for _, c := range e.cpus {
		if c.running == p {
			c.running = nil
			c.used = 0
			c.switching = 0
		}
	}
}

func (e *Engine) removeWaiting(p *Process) {
	for i, w := range e.waiting {
		if w == p {
			e.waiting = append(e.waiting[:i], e.waiting[i+1:]...)
			return
		}
	}
}

func (e *Engine) admit() {
	for _, p := range e.procs {
		if p.State == New && p.Arrival <= e.tick {
			p.State = Ready
			e.sched.add(p)
			e.log("arrive", p, -1, "")
		}
	}
}

func (e *Engine) wake() {
	kept := e.waiting[:0]
	for _, p := range e.waiting {
		if p.WakeAt > e.tick {
			kept = append(kept, p)
			continue
		}
		p.State = Ready
		detail := ""
		if e.cfg.Policy == PriorityDynamic && p.DynPriority > 0 {
			detail = fmt.Sprintf("prioridade %d → %d", p.DynPriority, p.DynPriority-1)
			p.DynPriority--
		}
		e.sched.add(p)
		e.log("wakeup", p, -1, detail)
	}
	e.waiting = kept
}

func (e *Engine) schedule(i int) {
	c := e.cpus[i]
	if c.running != nil && c.switching == 0 {
		if ok, why := e.sched.preempt(c.running, c.used); ok {
			p := c.running
			level := p.Level
			p.State = Ready
			e.sched.requeue(p, why)
			c.running = nil
			e.log(why, p, i, "")
			if p.Level != level {
				e.log("demote", p, i, fmt.Sprintf("fila %d → %d", level+1, p.Level+1))
			}
		}
	}
	if c.running == nil {
		if p := e.sched.pick(); p != nil {
			e.dispatch(i, p)
		}
	}
}

func (e *Engine) dispatch(i int, p *Process) {
	c := e.cpus[i]
	c.running = p
	c.used = 0
	p.State = Running
	e.log("dispatch", p, i, "")
	if c.last != nil && c.last != p {
		e.switches++
		c.switching = e.cfg.SwitchCost
		e.log("switch", p, i, fmt.Sprintf("salva P%d (PC=%d), carrega P%d (PC=%d)", c.last.PID, c.last.PC(), p.PID, p.PC()))
	}
	c.last = p
}

func (e *Engine) execute() {
	var finished []*Process
	for i, c := range e.cpus {
		p := c.running
		if p == nil {
			e.timelines[i] = append(e.timelines[i], 0)
			continue
		}
		if c.switching > 0 {
			c.switching--
			p.WaitTicks++
			e.switchTicks++
			e.timelines[i] = append(e.timelines[i], -1)
			continue
		}
		if p.Start < 0 {
			p.Start = e.tick
		}
		p.Remaining--
		c.used++
		e.busy++
		e.timelines[i] = append(e.timelines[i], p.PID)

		switch {
		case p.Remaining == 0:
			p.State = Terminated
			p.Finish = e.tick + 1
			e.done++
			c.running = nil
			e.log("terminate", p, i, "")
			finished = append(finished, p)
		case p.IOTime > 0 && !p.ioDone && p.PC() == p.IOAfter:
			p.ioDone = true
			p.State = Waiting
			p.WakeAt = e.tick + 1 + p.IOTime
			e.waiting = append(e.waiting, p)
			c.running = nil
			e.log("block", p, i, fmt.Sprintf("E/S por %d ticks", p.IOTime))
		case e.cfg.Policy == Cooperative && p.YieldEvery > 0 && c.used >= p.YieldEvery:
			p.State = Ready
			e.sched.requeue(p, "yield")
			c.running = nil
			e.log("yield", p, i, "")
		}
	}
	for _, p := range finished {
		e.killChildren(p, e.tick+1)
	}
}

func (e *Engine) snapshot() {
	for _, p := range e.procs {
		if p.State == Ready {
			p.WaitTicks++
		}
	}

	frame := Frame{
		Tick: e.tick, Queues: e.sched.queues(), Events: append([]Event{}, e.events...),
		Waiting: []int{}, Suspended: []int{}, Terminated: []int{},
	}
	for i := range e.cpus {
		line := e.timelines[i]
		frame.CPUs = append(frame.CPUs, line[len(line)-1])
	}
	for _, w := range e.waiting {
		frame.Waiting = append(frame.Waiting, w.PID)
	}
	for _, p := range e.procs {
		switch p.State {
		case Suspended:
			frame.Suspended = append(frame.Suspended, p.PID)
		case Terminated:
			frame.Terminated = append(frame.Terminated, p.PID)
		}
		frame.Procs = append(frame.Procs, ProcView{
			PID: p.PID, State: p.State.String(), Priority: p.DynPriority,
			Remaining: p.Remaining, PC: p.PC(), Level: p.Level,
		})
	}
	e.frames = append(e.frames, frame)
	e.events = nil
}

func (e *Engine) result(truncated bool) Result {
	ticks := len(e.timelines[0])
	res := Result{
		Timeline:   e.timelines[0],
		Timelines:  e.timelines,
		Frames:     e.frames,
		QueueNames: e.sched.queueNames(),
		Truncated:  truncated,
	}

	var n, wait, turnaround, response float64
	for _, p := range e.procs {
		if p.State == Terminated && !p.Killed {
			n++
			wait += float64(p.WaitTicks)
			turnaround += float64(p.Turnaround())
			response += float64(p.Response())
		}
	}
	if n > 0 {
		res.Metrics.AvgWaiting = wait / n
		res.Metrics.AvgTurnaround = turnaround / n
		res.Metrics.AvgResponse = response / n
	}
	if ticks > 0 {
		res.Metrics.CPUUtilization = float64(e.busy) / float64(ticks*len(e.cpus)) * 100
		res.Metrics.Throughput = n / float64(ticks)
	}
	res.Metrics.ContextSwitches = e.switches
	res.Metrics.SwitchTicks = e.switchTicks
	return res
}
