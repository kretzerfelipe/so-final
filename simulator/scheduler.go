package simulator

type Policy string

const (
	RoundRobin Policy = "rr"
	Priority   Policy = "priority"
)

type Result struct {
	Timeline []int
}

func Run(procs []*Process, policy Policy, quantum int) Result {
	var res Result
	var ready []*Process
	var waiting []*Process
	var running *Process
	sliceUsed := 0
	done := 0

	for t := 0; done < len(procs); t++ {
		for _, p := range procs {
			if p.State == New && p.Arrival <= t {
				p.State = Ready
				ready = append(ready, p)
			}
		}

		stillWaiting := waiting[:0]
		for _, p := range waiting {
			if p.WakeAt <= t {
				p.State = Ready
				ready = append(ready, p)
			} else {
				stillWaiting = append(stillWaiting, p)
			}
		}
		waiting = stillWaiting

		if running != nil {
			preempt := false
			switch policy {
			case RoundRobin:
				preempt = sliceUsed >= quantum
			case Priority:
				if i := bestIndex(ready); i >= 0 && ready[i].Priority < running.Priority {
					preempt = true
				}
			}
			if preempt {
				running.State = Ready
				ready = append(ready, running)
				running = nil
			}
		}

		if running == nil && len(ready) > 0 {
			i := 0
			if policy == Priority {
				i = bestIndex(ready)
			}
			running = ready[i]
			ready = append(ready[:i], ready[i+1:]...)
			running.State = Running
			sliceUsed = 0
		}

		if running == nil {
			res.Timeline = append(res.Timeline, 0)
			continue
		}

		running.Remaining--
		sliceUsed++
		res.Timeline = append(res.Timeline, running.PID)

		if running.Remaining == 0 {
			running.State = Terminated
			running.Finish = t + 1
			running = nil
			done++
		} else if running.IOTime > 0 && !running.ioDone && running.Burst-running.Remaining == running.IOAfter {
			running.ioDone = true
			running.State = Waiting
			running.WakeAt = t + 1 + running.IOTime
			waiting = append(waiting, running)
			running = nil
		}
	}
	return res
}

func bestIndex(ready []*Process) int {
	best := -1
	for i, p := range ready {
		if best < 0 || p.Priority < ready[best].Priority {
			best = i
		}
	}
	return best
}
