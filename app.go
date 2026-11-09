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

type ProcessInput struct {
	PID      int    `json:"pid"`
	Name     string `json:"name"`
	Priority int    `json:"priority"`
	Arrival  int    `json:"arrival"`
	Burst    int    `json:"burst"`
	IOAfter  int    `json:"ioAfter"`
	IOTime   int    `json:"ioTime"`
}

type ProcessResult struct {
	PID        int    `json:"pid"`
	Name       string `json:"name"`
	Priority   int    `json:"priority"`
	Arrival    int    `json:"arrival"`
	Burst      int    `json:"burst"`
	IOTime     int    `json:"ioTime"`
	Finish     int    `json:"finish"`
	Turnaround int    `json:"turnaround"`
	Waiting    int    `json:"waiting"`
}

type SimulationResult struct {
	Timeline   []int           `json:"timeline"`
	Processes  []ProcessResult `json:"processes"`
	AvgWaiting float64         `json:"avgWaiting"`
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

func (a *App) Simulate(policy string, quantum int, inputs []ProcessInput) (SimulationResult, error) {
	if policy != string(simulator.RoundRobin) && policy != string(simulator.Priority) {
		return SimulationResult{}, errors.New("política inválida")
	}
	if quantum < 1 {
		return SimulationResult{}, errors.New("o quantum deve ser maior que zero")
	}
	if len(inputs) == 0 {
		return SimulationResult{}, errors.New("adicione ao menos um processo")
	}

	procs := make([]*simulator.Process, 0, len(inputs))
	for _, in := range inputs {
		if in.Burst < 1 || in.Arrival < 0 {
			return SimulationResult{}, errors.New("burst deve ser >= 1 e chegada >= 0")
		}
		if in.IOTime < 0 || (in.IOTime > 0 && (in.IOAfter < 1 || in.IOAfter >= in.Burst)) {
			return SimulationResult{}, errors.New("a E/S deve ocorrer após pelo menos 1 tick e antes do fim do burst")
		}
		p := simulator.NewProcess(in.PID, in.Name, in.Priority, in.Arrival, in.Burst)
		if in.IOTime > 0 {
			p.WithIO(in.IOAfter, in.IOTime)
		}
		procs = append(procs, p)
	}

	res := simulator.Run(procs, simulator.Policy(policy), quantum)

	out := SimulationResult{Timeline: res.Timeline}
	totalWait := 0
	for _, p := range procs {
		out.Processes = append(out.Processes, ProcessResult{
			PID: p.PID, Name: p.Name, Priority: p.Priority, Arrival: p.Arrival, Burst: p.Burst,
			IOTime: p.IOTime, Finish: p.Finish, Turnaround: p.Turnaround(), Waiting: p.WaitingTime(),
		})
		totalWait += p.WaitingTime()
	}
	out.AvgWaiting = float64(totalWait) / float64(len(procs))
	return out, nil
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
