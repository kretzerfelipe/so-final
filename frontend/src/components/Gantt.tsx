import {Badge} from '@/components/ui/badge'

const COLORS = [
    'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-orange-500', 'bg-lime-600',
]

function colorOf(pid: number) {
    return COLORS[(pid - 1) % COLORS.length]
}

type Segment = { pid: number; start: number; length: number }

function toSegments(timeline: number[]): Segment[] {
    const segments: Segment[] = []
    timeline.forEach((pid, tick) => {
        const last = segments[segments.length - 1]
        if (last && last.pid === pid) {
            last.length++
        } else {
            segments.push({pid, start: tick, length: 1})
        }
    })
    return segments
}

type Props = {
    timeline: number[]
    names: Record<number, string>
}

export function Gantt({timeline, names}: Props) {
    const segments = toSegments(timeline)
    const pids = Object.keys(names).map(Number)

    return (
        <div className="space-y-3">
            <div className="flex h-12 w-full overflow-hidden rounded-md border">
                {segments.map((s, i) => (
                    <div
                        key={i}
                        style={{flexGrow: s.length, flexBasis: 0}}
                        className={`flex items-center justify-center border-r border-background/60 text-xs font-medium ${
                            s.pid === 0 ? 'bg-muted text-muted-foreground' : `${colorOf(s.pid)} text-white`
                        }`}
                        title={`${s.pid === 0 ? 'CPU ociosa' : names[s.pid]}: ${s.start} → ${s.start + s.length}`}
                    >
                        {s.pid === 0 ? '' : `P${s.pid}`}
                    </div>
                ))}
            </div>

            <div className="flex w-full text-[10px] text-muted-foreground">
                {segments.map((s, i) => (
                    <div key={i} style={{flexGrow: s.length, flexBasis: 0}} className="pl-0.5">
                        {s.start}
                    </div>
                ))}
                <span>{timeline.length}</span>
            </div>

            <div className="flex flex-wrap gap-2">
                {pids.map(pid => (
                    <Badge key={pid} variant="outline" className="gap-1.5">
                        <span className={`size-2 rounded-full ${colorOf(pid)}`}/>
                        P{pid} · {names[pid]}
                    </Badge>
                ))}
                <Badge variant="outline" className="gap-1.5">
                    <span className="size-2 rounded-full bg-muted-foreground/40"/>
                    CPU ociosa
                </Badge>
            </div>
        </div>
    )
}
