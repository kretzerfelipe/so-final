package simulator

import (
	"math"
	"reflect"
	"strings"
	"testing"
)

func defaultWorkload() []*Process {
	return []*Process{
		NewProcess(1, "browser", 2, 0, 5),
		NewProcess(2, "editor", 1, 1, 3).WithIO(1, 2),
		NewProcess(3, "compiler", 3, 2, 6).WithIO(3, 3),
		NewProcess(4, "backup", 4, 4, 2),
	}
}

func run(t *testing.T, procs []*Process, cfg Config, ops ...Op) Result {
	t.Helper()
	res, err := RunConfig(procs, cfg, ops)
	if err != nil {
		t.Fatalf("RunConfig: %v", err)
	}
	return res
}

func checkTimeline(t *testing.T, got, want []int) {
	t.Helper()
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("timeline = %v, want %v", got, want)
	}
}

func checkProcs(t *testing.T, procs []*Process, finish, wait []int) {
	t.Helper()
	for i, p := range procs {
		if p.Finish != finish[i] || p.WaitingTime() != wait[i] {
			t.Errorf("P%d finish=%d wait=%d, want finish=%d wait=%d", p.PID, p.Finish, p.WaitingTime(), finish[i], wait[i])
		}
	}
}

func near(a, b float64) bool { return math.Abs(a-b) < 1e-9 }

func TestRoundRobin(t *testing.T) {
	procs := defaultWorkload()
	res := run(t, procs, Config{Policy: RoundRobin, Quantum: 2})
	checkTimeline(t, res.Timeline, []int{1, 1, 2, 3, 3, 1, 1, 4, 4, 2, 2, 3, 1, 0, 0, 3, 3, 3})
	checkProcs(t, procs, []int{13, 11, 18, 9}, []int{8, 5, 7, 3})

	m := res.Metrics
	if !near(m.AvgWaiting, 5.75) || !near(m.AvgTurnaround, 11) || !near(m.AvgResponse, 1.25) {
		t.Errorf("metrics = %+v", m)
	}
	if !near(m.CPUUtilization, 16.0/18.0*100) || !near(m.Throughput, 4.0/18.0) {
		t.Errorf("utilization/throughput = %v / %v", m.CPUUtilization, m.Throughput)
	}
	if len(res.Frames) != len(res.Timeline) {
		t.Errorf("frames = %d, ticks = %d", len(res.Frames), len(res.Timeline))
	}
}

func TestRoundRobinEvents(t *testing.T) {
	res := run(t, defaultWorkload(), Config{Policy: RoundRobin, Quantum: 2})
	kinds := map[string]bool{}
	for _, e := range res.Frames[2].Events {
		kinds[e.Kind] = true
	}
	for _, want := range []string{"timerunout", "dispatch", "switch"} {
		if !kinds[want] {
			t.Errorf("tick 2 missing %q event: %+v", want, res.Frames[2].Events)
		}
	}
}

func TestPriorityStatic(t *testing.T) {
	procs := defaultWorkload()
	res := run(t, procs, Config{Policy: Priority})
	checkTimeline(t, res.Timeline, []int{1, 2, 1, 1, 2, 2, 1, 1, 3, 3, 3, 4, 4, 0, 3, 3, 3})
	checkProcs(t, procs, []int{8, 6, 17, 13}, []int{3, 0, 6, 7})
	if !near(res.Metrics.AvgWaiting, 4.0) {
		t.Errorf("avg waiting = %v", res.Metrics.AvgWaiting)
	}
}

func TestFIFO(t *testing.T) {
	procs := defaultWorkload()
	res := run(t, procs, Config{Policy: FIFO})
	checkTimeline(t, res.Timeline, []int{1, 1, 1, 1, 1, 2, 3, 3, 3, 4, 4, 2, 2, 3, 3, 3})
	checkProcs(t, procs, []int{5, 13, 16, 11}, []int{0, 7, 5, 5})
}

func TestSJF(t *testing.T) {
	procs := defaultWorkload()
	res := run(t, procs, Config{Policy: SJF})
	checkTimeline(t, res.Timeline, []int{1, 1, 1, 1, 1, 4, 4, 2, 3, 3, 3, 2, 2, 0, 3, 3, 3})
	checkProcs(t, procs, []int{5, 13, 17, 7}, []int{0, 7, 6, 1})
}

func TestCooperativeWithoutYieldIsFIFO(t *testing.T) {
	fifo := run(t, defaultWorkload(), Config{Policy: FIFO})
	coop := run(t, defaultWorkload(), Config{Policy: Cooperative})
	checkTimeline(t, coop.Timeline, fifo.Timeline)
}

func TestCooperativeYield(t *testing.T) {
	procs := []*Process{NewProcess(1, "a", 1, 0, 4).WithYield(2), NewProcess(2, "b", 1, 0, 2)}
	res := run(t, procs, Config{Policy: Cooperative})
	checkTimeline(t, res.Timeline, []int{1, 1, 2, 2, 1, 1})
}

func TestMultiQueue(t *testing.T) {
	procs := []*Process{
		NewProcess(1, "batch", 0, 0, 4).WithQueue(2),
		NewProcess(2, "system", 0, 1, 2).WithQueue(0),
		NewProcess(3, "interactive", 0, 1, 3).WithQueue(1),
	}
	res := run(t, procs, Config{Policy: MultiQueue, Quantum: 2})
	checkTimeline(t, res.Timeline, []int{1, 2, 2, 3, 3, 3, 1, 1, 1})
	checkProcs(t, procs, []int{9, 3, 6}, []int{5, 0, 2})
}

func TestFeedbackQueues(t *testing.T) {
	procs := []*Process{NewProcess(1, "long", 0, 0, 5), NewProcess(2, "short", 0, 1, 2)}
	res := run(t, procs, Config{Policy: Feedback, Quantum: 1})
	checkTimeline(t, res.Timeline, []int{1, 2, 1, 1, 2, 1, 1})
	checkProcs(t, procs, []int{7, 5}, []int{2, 2})

	demotions := 0
	for _, f := range res.Frames {
		for _, e := range f.Events {
			if e.Kind == "demote" {
				demotions++
			}
		}
	}
	if demotions != 3 {
		t.Errorf("demotions = %d, want 3", demotions)
	}
}

func TestPriorityDynamicBoost(t *testing.T) {
	build := func() []*Process {
		return []*Process{NewProcess(1, "io", 3, 0, 3).WithIO(1, 1), NewProcess(2, "cpu", 3, 0, 2)}
	}
	static := run(t, build(), Config{Policy: Priority})
	checkTimeline(t, static.Timeline, []int{1, 2, 2, 1, 1})
	dynamic := run(t, build(), Config{Policy: PriorityDynamic})
	checkTimeline(t, dynamic.Timeline, []int{1, 2, 1, 1, 2})
}

func TestMultipleProcessors(t *testing.T) {
	procs := []*Process{NewProcess(1, "a", 1, 0, 3), NewProcess(2, "b", 1, 0, 3), NewProcess(3, "c", 1, 0, 2)}
	res := run(t, procs, Config{Policy: FIFO, CPUs: 2})
	checkTimeline(t, res.Timelines[0], []int{1, 1, 1, 3, 3})
	checkTimeline(t, res.Timelines[1], []int{2, 2, 2, 0, 0})
	if !near(res.Metrics.CPUUtilization, 8.0/10.0*100) {
		t.Errorf("utilization = %v", res.Metrics.CPUUtilization)
	}
}

func TestContextSwitchCost(t *testing.T) {
	procs := []*Process{NewProcess(1, "a", 1, 0, 2), NewProcess(2, "b", 1, 0, 2)}
	res := run(t, procs, Config{Policy: RoundRobin, Quantum: 1, SwitchCost: 1})
	checkTimeline(t, res.Timeline, []int{1, -1, 2, -1, 1, -1, 2})
	if res.Metrics.ContextSwitches != 3 || res.Metrics.SwitchTicks != 3 {
		t.Errorf("switches = %d, switch ticks = %d", res.Metrics.ContextSwitches, res.Metrics.SwitchTicks)
	}
	if !near(res.Metrics.CPUUtilization, 4.0/7.0*100) {
		t.Errorf("utilization = %v", res.Metrics.CPUUtilization)
	}
}

func TestSuspendAndResume(t *testing.T) {
	procs := []*Process{NewProcess(1, "a", 1, 0, 4), NewProcess(2, "b", 1, 0, 2)}
	res := run(t, procs, Config{Policy: FIFO},
		Op{Tick: 1, PID: 1, Kind: OpSuspend}, Op{Tick: 3, PID: 1, Kind: OpResume})
	checkTimeline(t, res.Timeline, []int{1, 2, 2, 1, 1, 1})
	checkProcs(t, procs, []int{6, 3}, []int{0, 1})
}

func TestKillCascadesToChildren(t *testing.T) {
	procs := []*Process{NewProcess(1, "parent", 1, 0, 5), NewProcess(2, "child", 1, 0, 5).WithParent(1)}
	run(t, procs, Config{Policy: FIFO}, Op{Tick: 2, PID: 1, Kind: OpKill})
	for _, p := range procs {
		if p.State != Terminated || !p.Killed || p.Finish != 2 {
			t.Errorf("P%d state=%v killed=%v finish=%d", p.PID, p.State, p.Killed, p.Finish)
		}
	}
}

func TestParentTerminationKillsChildren(t *testing.T) {
	procs := []*Process{NewProcess(1, "parent", 1, 0, 2), NewProcess(2, "child", 1, 0, 5).WithParent(1)}
	run(t, procs, Config{Policy: FIFO})
	if !procs[1].Killed || procs[1].Finish != 2 {
		t.Errorf("child killed=%v finish=%d", procs[1].Killed, procs[1].Finish)
	}
}

func TestSetPriorityChangesOrder(t *testing.T) {
	procs := []*Process{NewProcess(1, "a", 5, 0, 3), NewProcess(2, "b", 3, 0, 3)}
	res := run(t, procs, Config{Policy: Priority}, Op{Tick: 1, PID: 1, Kind: OpPriority, Value: 1})
	checkTimeline(t, res.Timeline, []int{2, 1, 1, 1, 2, 2})
}

func TestStalledWhenEverythingSuspended(t *testing.T) {
	procs := []*Process{NewProcess(1, "a", 1, 0, 3)}
	res := run(t, procs, Config{Policy: FIFO}, Op{Tick: 1, PID: 1, Kind: OpSuspend})
	if procs[0].State != Suspended || res.Truncated {
		t.Errorf("state = %v, truncated = %v", procs[0].State, res.Truncated)
	}
}

func TestRunIsRepeatable(t *testing.T) {
	procs := defaultWorkload()
	first := run(t, procs, Config{Policy: RoundRobin, Quantum: 2})
	second := run(t, procs, Config{Policy: RoundRobin, Quantum: 2})
	checkTimeline(t, second.Timeline, first.Timeline)
}

func TestLegacyRunWrapper(t *testing.T) {
	res := Run(defaultWorkload(), RoundRobin, 2)
	checkTimeline(t, res.Timeline, []int{1, 1, 2, 3, 3, 1, 1, 4, 4, 2, 2, 3, 1, 0, 0, 3, 3, 3})
}

func TestValidation(t *testing.T) {
	cases := map[string]struct {
		procs []*Process
		cfg   Config
		want  string
	}{
		"unknown policy": {defaultWorkload(), Config{Policy: "x"}, "política"},
		"zero quantum":   {defaultWorkload(), Config{Policy: RoundRobin}, "quantum"},
		"no processes":   {nil, Config{Policy: FIFO}, "ao menos um"},
		"zero burst":     {[]*Process{NewProcess(1, "a", 1, 0, 0)}, Config{Policy: FIFO}, "burst"},
		"duplicate pid":  {[]*Process{NewProcess(1, "a", 1, 0, 1), NewProcess(1, "b", 1, 0, 1)}, Config{Policy: FIFO}, "repetido"},
		"io at the end":  {[]*Process{NewProcess(1, "a", 1, 0, 3).WithIO(3, 1)}, Config{Policy: FIFO}, "E/S"},
		"unknown parent": {[]*Process{NewProcess(1, "a", 1, 0, 3).WithParent(9)}, Config{Policy: FIFO}, "pai"},
		"too many cpus":  {defaultWorkload(), Config{Policy: FIFO, CPUs: 9}, "processadores"},
	}
	for name, c := range cases {
		_, err := RunConfig(c.procs, c.cfg, nil)
		if err == nil || !strings.Contains(err.Error(), c.want) {
			t.Errorf("%s: err = %v, want it to contain %q", name, err, c.want)
		}
	}
}
