package compare

import (
	"runtime"
	"runtime/pprof"
	"sync"
	"time"
)

type Result struct {
	Mode    string
	N       int
	Launch  time.Duration
	Total   time.Duration
	Threads int
	StackKB uint64
}

var sink int

func work(iters int) {
	s := 0
	for i := 0; i < iters; i++ {
		s += i % 7
	}
	sink += s
}

func threadsCreated() int {
	return pprof.Lookup("threadcreate").Count()
}

func Run(mode string, n, iters int) Result {
	runtime.GC()
	var before, after runtime.MemStats
	runtime.ReadMemStats(&before)
	threadsBefore := threadsCreated()

	var ready, done sync.WaitGroup
	start := make(chan struct{})
	ready.Add(n)
	done.Add(n)

	t0 := time.Now()
	for i := 0; i < n; i++ {
		go func() {
			if mode == "thread" {
				runtime.LockOSThread()
				defer runtime.UnlockOSThread()
			}
			ready.Done()
			<-start
			work(iters)
			done.Done()
		}()
	}
	ready.Wait()
	launch := time.Since(t0)
	runtime.ReadMemStats(&after)
	threads := threadsCreated() - threadsBefore

	t1 := time.Now()
	close(start)
	done.Wait()
	total := launch + time.Since(t1)

	return Result{
		Mode:    mode,
		N:       n,
		Launch:  launch,
		Total:   total,
		Threads: threads,
		StackKB: (after.StackInuse - before.StackInuse) / 1024,
	}
}
