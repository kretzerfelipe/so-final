package main

import (
	"context"
	"errors"
	"sort"

	"sofinal/compare"
	"sofinal/simulator"
	"sofinal/winproc"
)

const (
	maxCompareTasks = 5000
	maxCompareWork  = 50000000
)

type App struct {
	ctx context.Context
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

type SimConfig struct {
	Policy     string `json:"policy"`
	Quantum    int    `json:"quantum"`
	CPUs       int    `json:"cpus"`
	SwitchCost int    `json:"switchCost"`
}

type ProcessInput struct {
	PID        int    `json:"pid"`
	Name       string `json:"name"`
	Priority   int    `json:"priority"`
	Arrival    int    `json:"arrival"`
	Burst      int    `json:"burst"`
	IOAfter    int    `json:"ioAfter"`
	IOTime     int    `json:"ioTime"`
	Queue      int    `json:"queue"`
	YieldEvery int    `json:"yieldEvery"`
	PPID       int    `json:"ppid"`
}

type SimOp struct {
	Tick  int    `json:"tick"`
	PID   int    `json:"pid"`
	Kind  string `json:"kind"`
	Value int    `json:"value"`
}

type ProcessResult struct {
	PID        int    `json:"pid"`
	Name       string `json:"name"`
	Arrival    int    `json:"arrival"`
	Burst      int    `json:"burst"`
	Queue      int    `json:"queue"`
	Finish     int    `json:"finish"`
	Turnaround int    `json:"turnaround"`
	Waiting    int    `json:"waiting"`
	Response   int    `json:"response"`
	Killed     bool   `json:"killed"`
	State      string `json:"state"`
	Kind       string `json:"kind"`
}

type SimulationResult struct {
	Timelines  [][]int           `json:"timelines"`
	Frames     []simulator.Frame `json:"frames"`
	QueueNames []string          `json:"queueNames"`
	Truncated  bool              `json:"truncated"`
	Metrics    simulator.Metrics `json:"metrics"`
	Processes  []ProcessResult   `json:"processes"`
}

type AlgorithmRow struct {
	Policy  string            `json:"policy"`
	Metrics simulator.Metrics `json:"metrics"`
	Error   string            `json:"error"`
}

type ThreadRow struct {
	TID           uint32 `json:"tid"`
	BasePriority  int32  `json:"basePriority"`
	DeltaPriority int32  `json:"deltaPriority"`
	Priority      int32  `json:"priority"`
	PriorityName  string `json:"priorityName"`
}

type CompareRow struct {
	Mode     string  `json:"mode"`
	LaunchMs float64 `json:"launchMs"`
	TotalMs  float64 `json:"totalMs"`
	Threads  int     `json:"threads"`
	StackKB  uint64  `json:"stackKb"`
}

func (a *App) ListProcesses() ([]winproc.Info, error) {
	list, err := winproc.List()
	if err != nil {
		return nil, err
	}
	sort.Slice(list, func(i, j int) bool { return list[i].PID < list[j].PID })
	return list, nil
}

func (a *App) ListThreads(pid uint32) ([]ThreadRow, error) {
	list, err := winproc.Threads(pid)
	if err != nil {
		return nil, err
	}
	sort.Slice(list, func(i, j int) bool { return list[i].TID < list[j].TID })

	rows := make([]ThreadRow, 0, len(list))
	for _, t := range list {
		rows = append(rows, ThreadRow{
			TID:           t.TID,
			BasePriority:  t.BasePriority,
			DeltaPriority: t.DeltaPriority,
			Priority:      t.BasePriority + t.DeltaPriority,
			PriorityName:  winproc.PriorityName(t.DeltaPriority),
		})
	}
	return rows, nil
}

func buildProcesses(inputs []ProcessInput) []*simulator.Process {
	procs := make([]*simulator.Process, 0, len(inputs))
	for _, in := range inputs {
		p := simulator.NewProcess(in.PID, in.Name, in.Priority, in.Arrival, in.Burst)
		if in.IOTime > 0 {
			p.WithIO(in.IOAfter, in.IOTime)
		}
		procs = append(procs, p.WithQueue(in.Queue).WithYield(in.YieldEvery).WithParent(in.PPID))
	}
	return procs
}

func toConfig(cfg SimConfig) simulator.Config {
	return simulator.Config{
		Policy:     simulator.Policy(cfg.Policy),
		Quantum:    cfg.Quantum,
		CPUs:       cfg.CPUs,
		SwitchCost: cfg.SwitchCost,
	}
}

func (a *App) Simulate(cfg SimConfig, inputs []ProcessInput, ops []SimOp) (SimulationResult, error) {
	procs := buildProcesses(inputs)
	simOps := make([]simulator.Op, 0, len(ops))
	for _, o := range ops {
		simOps = append(simOps, simulator.Op{Tick: o.Tick, PID: o.PID, Kind: simulator.OpKind(o.Kind), Value: o.Value})
	}

	res, err := simulator.RunConfig(procs, toConfig(cfg), simOps)
	if err != nil {
		return SimulationResult{}, err
	}

	out := SimulationResult{
		Timelines:  res.Timelines,
		Frames:     res.Frames,
		QueueNames: res.QueueNames,
		Truncated:  res.Truncated,
		Metrics:    res.Metrics,
		Processes:  make([]ProcessResult, 0, len(procs)),
	}
	for _, p := range procs {
		kind := "cpu"
		if p.IOBound() {
			kind = "io"
		}
		out.Processes = append(out.Processes, ProcessResult{
			PID: p.PID, Name: p.Name, Arrival: p.Arrival, Burst: p.Burst, Queue: p.Queue,
			Finish: p.Finish, Turnaround: p.Turnaround(), Waiting: p.WaitingTime(),
			Response: p.Response(), Killed: p.Killed, State: p.State.String(), Kind: kind,
		})
	}
	return out, nil
}

func (a *App) CompareAlgorithms(cfg SimConfig, inputs []ProcessInput) ([]AlgorithmRow, error) {
	if len(inputs) == 0 {
		return nil, errors.New("adicione ao menos um processo")
	}
	rows := make([]AlgorithmRow, 0, len(simulator.AllPolicies))
	for _, policy := range simulator.AllPolicies {
		c := toConfig(cfg)
		c.Policy = policy
		if c.Quantum < 1 {
			c.Quantum = 2
		}
		res, err := simulator.RunConfig(buildProcesses(inputs), c, nil)
		row := AlgorithmRow{Policy: string(policy), Metrics: res.Metrics}
		if err != nil {
			row.Error = err.Error()
		}
		rows = append(rows, row)
	}
	return rows, nil
}

func (a *App) Compare(n, work int) ([]CompareRow, error) {
	if n < 1 || n > maxCompareTasks {
		return nil, errors.New("a quantidade de tarefas deve estar entre 1 e 5000")
	}
	if work < 1 || work > maxCompareWork {
		return nil, errors.New("as iterações de trabalho devem estar entre 1 e 50.000.000")
	}

	rows := make([]CompareRow, 0, 2)
	for _, mode := range []string{"goroutine", "thread"} {
		r := compare.Run(mode, n, work)
		rows = append(rows, CompareRow{
			Mode:     r.Mode,
			LaunchMs: float64(r.Launch.Microseconds()) / 1000,
			TotalMs:  float64(r.Total.Microseconds()) / 1000,
			Threads:  r.Threads,
			StackKB:  r.StackKB,
		})
	}
	return rows, nil
}
