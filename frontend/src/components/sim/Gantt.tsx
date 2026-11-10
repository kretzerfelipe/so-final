import {Badge} from '@/components/ui/badge'
import {pidColor} from '@/lib/sim'

type Segment = { pid: number; start: number; length: number }

function toSegments(line: number[]): Segment[] {
    const segments: Segment[] = []
    line.forEach((pid, tick) => {
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
    timelines: number[][]
    names: Record<number, string>
    tick?: number
}

export function Gantt({timelines, names, tick}: Props) {
    const total = timelines[0]?.length ?? 0
    const multi = timelines.length > 1
    const pids = Object.keys(names).map(Number)
    const hasSwitch = timelines.some(line => line.includes(-1))

    return (
        <div className="space-y-2">
            {timelines.map((line, cpu) => (
                <div key={cpu} className="flex items-center gap-3">
                    {multi && <span className="w-12 shrink-0 text-xs text-muted-foreground">CPU {cpu + 1}</span>}
                    <div className="relative flex-1">
                        <div className="flex h-10 w-full overflow-hidden rounded-md border">
                            {toSegments(line).map((s, i) => (
                                <div
                                    key={i}
                                    style={{flexGrow: s.length, flexBasis: 0}}
                                    className={`flex items-center justify-center border-r border-background/60 text-xs font-medium ${
                                        s.pid > 0
                                            ? `${pidColor(s.pid)} text-white`
                                            : s.pid === 0
                                                ? 'bg-muted text-muted-foreground'
                                                : 'bg-amber-300 text-amber-900'
                                    }`}
                                    title={`${s.pid > 0 ? names[s.pid] : s.pid === 0 ? 'CPU ociosa' : 'Troca de contexto'}: ${s.start} → ${s.start + s.length}`}
                                >
                                    {s.pid > 0 ? `P${s.pid}` : s.pid < 0 ? '⇄' : ''}
                                </div>
                            ))}
                        </div>
                        {tick !== undefined && total > 0 && (
                            <div
                                className="pointer-events-none absolute inset-y-[-3px] rounded-sm border-2 border-foreground"
                                style={{left: `${(tick / total) * 100}%`, width: `${100 / total}%`}}
                            />
                        )}
                    </div>
                </div>
            ))}

            <div className="flex items-start gap-3">
                {multi && <span className="w-12 shrink-0"/>}
                <div className="flex w-full text-[10px] text-muted-foreground">
                    {toSegments(timelines[0] ?? []).map((s, i) => (
                        <div key={i} style={{flexGrow: s.length, flexBasis: 0}} className="pl-0.5">{s.start}</div>
                    ))}
                    <span>{total}</span>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
                {pids.map(pid => (
                    <Badge key={pid} variant="outline" className="gap-1.5">
                        <span className={`size-2 rounded-full ${pidColor(pid)}`}/>
                        P{pid} · {names[pid]}
                    </Badge>
                ))}
                <Badge variant="outline" className="gap-1.5">
                    <span className="size-2 rounded-full bg-muted-foreground/40"/>
                    CPU ociosa
                </Badge>
                {hasSwitch && (
                    <Badge variant="outline" className="gap-1.5">
                        <span className="size-2 rounded-full bg-amber-300"/>
                        Troca de contexto
                    </Badge>
                )}
            </div>
        </div>
    )
}
