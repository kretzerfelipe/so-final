import {useEffect, useState} from 'react'
import {ChevronDown, ChevronUp, Pause, Play, SkipBack, SkipForward, X} from 'lucide-react'
import {main} from '../../../wailsjs/go/models'
import {Badge} from '@/components/ui/badge'
import {Button} from '@/components/ui/button'
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table'
import {QUEUE_LABELS, STATE_LABEL, STATE_STYLE, eventText, pidColor} from '@/lib/sim'

type Props = {
    result: main.SimulationResult
    policy: string
    tick: number
    setTick: (tick: number) => void
    ops: main.SimOp[]
    onOp: (kind: string, pid: number, value?: number) => void
    onRemoveOp: (index: number) => void
    onClearOps: () => void
}

const OP_LABEL: Record<string, string> = {
    suspend: 'suspender',
    resume: 'reativar',
    kill: 'destruir',
    priority: 'prioridade',
}

function PidChips({pids}: { pids: number[] }) {
    if (pids.length === 0) return <span className="text-xs text-muted-foreground">vazio</span>
    return (
        <span className="flex flex-wrap gap-1">
            {pids.map(pid => (
                <span key={pid}
                      className={`rounded px-1.5 py-0.5 text-xs font-medium text-white ${pidColor(pid)}`}>P{pid}</span>
            ))}
        </span>
    )
}

type DiagramProps = { running: number[]; ready: number[]; waiting: number[]; hot: Set<string> }

function StateDiagram({running, ready, waiting, hot}: DiagramProps) {
    const label = (pids: number[]) => (pids.length ? pids.map(p => `P${p}`).join(' ') : '—')
    const arrows = [
        {key: 'dispatch', d: 'M405 160 C395 120 365 96 340 82', text: '1 Dispatch', x: 318, y: 138},
        {key: 'timerunout', d: 'M352 60 C440 72 475 118 462 158', text: '3 TimeRunOut', x: 478, y: 104},
        {key: 'block', d: 'M222 74 C168 92 134 122 124 158', text: '2 Block', x: 112, y: 112},
        {key: 'wakeup', d: 'M182 205 C265 238 340 238 378 208', text: '4 WakeUp', x: 280, y: 254},
    ]
    const isHot = (key: string) =>
        key === 'timerunout' ? hot.has('timerunout') || hot.has('preempt') || hot.has('yield') : hot.has(key)

    return (
        <svg viewBox="0 0 580 266" className="w-full max-w-xl">
            <defs>
                <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
                    <path d="M0 0 L8 4 L0 8 z" className="fill-muted-foreground/60"/>
                </marker>
                <marker id="arrow-hot" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7"
                        orient="auto">
                    <path d="M0 0 L8 4 L0 8 z" className="fill-primary"/>
                </marker>
            </defs>
            {arrows.map(a => (
                <g key={a.key}>
                    <path
                        d={a.d}
                        fill="none"
                        strokeWidth={isHot(a.key) ? 3 : 1.5}
                        className={isHot(a.key) ? 'stroke-primary' : 'stroke-muted-foreground/60'}
                        markerEnd={isHot(a.key) ? 'url(#arrow-hot)' : 'url(#arrow)'}
                    />
                    <text x={a.x} y={a.y} textAnchor="middle"
                          className={`text-[14px] ${isHot(a.key) ? 'fill-primary font-semibold' : 'fill-muted-foreground'}`}>
                        {a.text}
                    </text>
                </g>
            ))}
            {[
                {cx: 280, cy: 48, title: 'Execução', pids: running},
                {cx: 465, cy: 190, title: 'Pronto', pids: ready},
                {cx: 105, cy: 190, title: 'Espera', pids: waiting},
            ].map(n => (
                <g key={n.title}>
                    <ellipse cx={n.cx} cy={n.cy} rx={88} ry={37} className="fill-card stroke-border" strokeWidth={1.5}/>
                    <text x={n.cx} y={n.cy - 4} textAnchor="middle"
                          className="fill-foreground text-[17px] font-medium">{n.title}</text>
                    <text x={n.cx} y={n.cy + 14} textAnchor="middle"
                          className="fill-muted-foreground text-[14px]">{label(n.pids).slice(0, 22)}</text>
                </g>
            ))}
        </svg>
    )
}

export function Player({result, policy, tick, setTick, ops, onOp, onRemoveOp, onClearOps}: Props) {
    const [playing, setPlaying] = useState(false)
    const last = result.frames.length - 1
    const frame = result.frames[Math.min(tick, last)]
    const names = Object.fromEntries(result.processes.map(p => [p.pid, p.name]))
    const byPid = Object.fromEntries(result.processes.map(p => [p.pid, p]))

    useEffect(() => {
        if (!playing) return
        if (tick >= last) {
            setPlaying(false)
            return
        }
        const id = setTimeout(() => setTick(tick + 1), 700)
        return () => clearTimeout(id)
    }, [playing, tick, last, setTick])

    if (!frame) return null
    const hot = new Set(frame.events.map(e => e.kind))
    const running = frame.cpus.filter(pid => pid > 0)
    const opTick = frame.tick + 1

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={() => setTick(0)} aria-label="Início"><SkipBack/></Button>
                <Button variant="outline" size="icon" onClick={() => setPlaying(!playing)}
                        aria-label={playing ? 'Pausar' : 'Reproduzir'}>
                    {playing ? <Pause/> : <Play/>}
                </Button>
                <Button variant="outline" size="icon" onClick={() => setTick(Math.min(last, tick + 1))}
                        aria-label="Próximo tick"><SkipForward/></Button>
                <input
                    type="range" min={0} max={last} value={tick}
                    onChange={e => setTick(Number(e.target.value))}
                    className="h-2 flex-1 accent-primary"
                />
                <Badge variant="secondary" className="tabular-nums">tick {frame.tick} / {last}</Badge>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <StateDiagram running={running} ready={frame.queues.flat()} waiting={frame.waiting} hot={hot}/>
                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">Processadores</p>
                        <div className="flex flex-wrap gap-2">
                            {frame.cpus.map((pid, i) => (
                                <Badge key={i} variant="outline" className="gap-1.5">
                                    CPU {i + 1}:
                                    {pid > 0
                                        ? <span className={`rounded px-1 text-white ${pidColor(pid)}`}>P{pid}</span>
                                        : <span className="text-muted-foreground">{pid < 0 ? 'troca de contexto' : 'ociosa'}</span>}
                                </Badge>
                            ))}
                        </div>
                    </div>
                    {frame.queues.map((q, i) => (
                        <div key={i} className="space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground">
                                {result.queueNames[i] ?? `Fila ${i + 1}`}
                            </p>
                            <PidChips pids={q}/>
                        </div>
                    ))}
                    <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">Em espera (E/S)</p>
                        <PidChips pids={frame.waiting}/>
                    </div>
                    {frame.suspended.length > 0 && (
                        <div className="space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground">Suspensos</p>
                            <PidChips pids={frame.suspended}/>
                        </div>
                    )}
                    {frame.terminated.length > 0 && (
                        <div className="space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground">Terminados</p>
                            <PidChips pids={frame.terminated}/>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">O que aconteceu neste tick</p>
                {frame.events.length === 0
                    ? <p className="text-sm text-muted-foreground">Nenhum evento.</p>
                    : (
                        <ul className="space-y-0.5 text-sm">
                            {frame.events.map((e, i) => <li key={i}>{eventText(e, names)}</li>)}
                        </ul>
                    )}
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">
                        PCB dos processos · as operações valem a partir do tick {opTick} e a simulação é refeita
                    </p>
                    {ops.length > 0 && <Button variant="ghost" size="sm" onClick={onClearOps}>Limpar operações</Button>}
                </div>
                {ops.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {ops.map((o, i) => (
                            <Badge key={i} variant="secondary" className="gap-1">
                                t={o.tick} · {OP_LABEL[o.kind]} P{o.pid}{o.kind === 'priority' ? ` = ${o.value}` : ''}
                                <button onClick={() => onRemoveOp(i)} aria-label="Remover operação"><X className="size-3"/>
                                </button>
                            </Badge>
                        ))}
                    </div>
                )}
                <div className="overflow-auto rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Processo</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Prioridade</TableHead>
                                <TableHead className="text-right">PC</TableHead>
                                <TableHead className="text-right">Restante</TableHead>
                                {(policy === 'mq' || policy === 'mlfq') &&
                                    <TableHead>{policy === 'mq' ? 'Fila' : 'Nível'}</TableHead>}
                                <TableHead className="text-right">Operações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {frame.procs.map(p => {
                                const info = byPid[p.pid]
                                const alive = p.state !== 'TERMINATED'
                                return (
                                    <TableRow key={p.pid}>
                                        <TableCell>
                                            <span className="flex items-center gap-2">
                                                <span className={`size-2 rounded-full ${pidColor(p.pid)}`}/>
                                                P{p.pid} · {names[p.pid]}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={`rounded-md px-2 py-0.5 text-xs font-medium ${STATE_STYLE[p.state]}`}>
                                                {STATE_LABEL[p.state]}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">{p.priority}</TableCell>
                                        <TableCell
                                            className="text-right tabular-nums">{p.pc}/{info?.burst}</TableCell>
                                        <TableCell className="text-right tabular-nums">{p.remaining}</TableCell>
                                        {(policy === 'mq' || policy === 'mlfq') && (
                                            <TableCell>
                                                {policy === 'mq' ? QUEUE_LABELS[info?.queue ?? 0] : p.level + 1}
                                            </TableCell>
                                        )}
                                        <TableCell>
                                            <div className="flex justify-end gap-1">
                                                {['READY', 'RUNNING', 'WAITING'].includes(p.state) && (
                                                    <Button variant="ghost" size="icon" title="Suspender"
                                                            onClick={() => onOp('suspend', p.pid)}><Pause/></Button>
                                                )}
                                                {p.state === 'SUSPENDED' && (
                                                    <Button variant="ghost" size="icon" title="Reativar"
                                                            onClick={() => onOp('resume', p.pid)}><Play/></Button>
                                                )}
                                                {alive && (
                                                    <>
                                                        <Button variant="ghost" size="icon" title="Aumentar prioridade (número menor)"
                                                                onClick={() => onOp('priority', p.pid, Math.max(0, p.priority - 1))}>
                                                            <ChevronUp/></Button>
                                                        <Button variant="ghost" size="icon" title="Diminuir prioridade (número maior)"
                                                                onClick={() => onOp('priority', p.pid, p.priority + 1)}>
                                                            <ChevronDown/></Button>
                                                        <Button variant="ghost" size="icon" title="Destruir processo"
                                                                onClick={() => onOp('kill', p.pid)}><X/></Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}
