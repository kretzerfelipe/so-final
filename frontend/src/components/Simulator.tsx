import {useState} from 'react'
import {Play, Plus, Trash2} from 'lucide-react'
import {Simulate} from '../../wailsjs/go/main/App'
import {main} from '../../wailsjs/go/models'
import {Badge} from '@/components/ui/badge'
import {Button} from '@/components/ui/button'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {NativeSelect} from '@/components/ui/native-select'
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table'
import {NumInput} from '@/components/NumInput'
import {Gantt} from '@/components/sim/Gantt'
import {Metrics} from '@/components/sim/Metrics'
import {Player} from '@/components/sim/Player'
import {CompareAlgorithms} from '@/components/sim/CompareAlgorithms'
import {DEFAULT_ROWS, EXAMPLES, POLICIES, QUEUE_LABELS, Row, STATE_LABEL} from '@/lib/sim'

type NumericField = 'priority' | 'arrival' | 'burst' | 'ioAfter' | 'ioTime' | 'yieldEvery' | 'ppid'

export function Simulator() {
    const [cfg, setCfg] = useState({policy: 'rr', quantum: 2, cpus: 1, switchCost: 0})
    const [rows, setRows] = useState<Row[]>(DEFAULT_ROWS)
    const [ops, setOps] = useState<main.SimOp[]>([])
    const [result, setResult] = useState<main.SimulationResult | null>(null)
    const [tick, setTick] = useState(0)
    const [error, setError] = useState('')
    const [dirty, setDirty] = useState(false)

    const info = POLICIES.find(p => p.value === cfg.policy) ?? POLICIES[0]

    const updateCfg = (patch: Partial<typeof cfg>) => {
        setCfg({...cfg, ...patch})
        setDirty(true)
    }

    const updateRows = (next: Row[]) => {
        setRows(next)
        setDirty(true)
    }

    const updateRow = (pid: number, patch: Partial<Row>) =>
        updateRows(rows.map(r => (r.pid === pid ? {...r, ...patch} : r)))

    const addRow = () => {
        const pid = rows.reduce((max, r) => Math.max(max, r.pid), 0) + 1
        updateRows([...rows, {
            pid, name: `proc${pid}`, priority: 1, arrival: 0, burst: 3,
            ioAfter: 0, ioTime: 0, queue: 1, yieldEvery: 0, ppid: 0,
        }])
    }

    const loadExample = (index: number) => {
        const example = EXAMPLES[index]
        setCfg({...cfg, policy: example.policy})
        setRows(example.rows)
        setResult(null)
        setOps([])
        setDirty(false)
    }

    const execute = async (nextOps: main.SimOp[], keepTick: boolean) => {
        try {
            const res = await Simulate(cfg, rows, nextOps)
            setResult(res)
            setOps(nextOps)
            setError('')
            setDirty(false)
            setTick(keepTick ? Math.min(tick, res.frames.length - 1) : 0)
        } catch (e) {
            setResult(null)
            setError(String(e))
        }
    }

    const applyOp = (kind: string, pid: number, value = 0) => {
        const op: main.SimOp = {tick: tick + 1, pid, kind, value}
        execute([...ops, op], true)
    }

    const names = Object.fromEntries((result?.processes ?? []).map(p => [p.pid, p.name]))
    const numberCell = (r: Row, field: NumericField) => (
        <TableCell key={field}>
            <NumInput min={0} value={r[field]} onChange={v => updateRow(r.pid, {[field]: v})}/>
        </TableCell>
    )

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Configuração</CardTitle>
                    <CardDescription>
                        Escolha o algoritmo, ajuste a carga de processos e simule. Também há exemplos prontos.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="policy">Algoritmo</Label>
                            <NativeSelect id="policy" className="w-72" value={cfg.policy}
                                          onChange={e => updateCfg({policy: e.target.value})}>
                                <optgroup label="Não-preemptivos">
                                    {POLICIES.slice(0, 3).map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                </optgroup>
                                <optgroup label="Preemptivos">
                                    {POLICIES.slice(3).map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                </optgroup>
                            </NativeSelect>
                        </div>
                        {info.quantum && (
                            <div className="space-y-1.5">
                                <Label htmlFor="quantum">Quantum (ticks)</Label>
                                <NumInput id="quantum" min={1} className="w-24" value={cfg.quantum}
                                          onChange={v => updateCfg({quantum: v})}/>
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <Label htmlFor="cpus">Processadores</Label>
                            <NumInput id="cpus" min={1} max={8} className="w-24" value={cfg.cpus}
                                      onChange={v => updateCfg({cpus: v})}/>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="switch">Custo da troca de contexto</Label>
                            <NumInput id="switch" min={0} max={10} className="w-28" value={cfg.switchCost}
                                      onChange={v => updateCfg({switchCost: v})}/>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="example">Exemplos</Label>
                            <NativeSelect id="example" className="w-72" value=""
                                          onChange={e => e.target.value && loadExample(Number(e.target.value))}>
                                <option value="">Carregar exemplo...</option>
                                {EXAMPLES.map((ex, i) => <option key={ex.name} value={i}>{ex.name}</option>)}
                            </NativeSelect>
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{info.description}</p>

                    <div className="overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">PID</TableHead>
                                    <TableHead>Nome</TableHead>
                                    {info.priority && <TableHead className="w-24">Prioridade</TableHead>}
                                    {info.queue && <TableHead className="w-36">Fila</TableHead>}
                                    <TableHead className="w-24">Chegada</TableHead>
                                    <TableHead className="w-24">Burst</TableHead>
                                    <TableHead className="w-24">E/S após</TableHead>
                                    <TableHead className="w-24">E/S dur.</TableHead>
                                    {info.yield && <TableHead className="w-28">Cede a cada</TableHead>}
                                    <TableHead className="w-20">Pai</TableHead>
                                    <TableHead className="w-12"/>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map(r => (
                                    <TableRow key={r.pid}>
                                        <TableCell className="font-mono text-muted-foreground">{r.pid}</TableCell>
                                        <TableCell>
                                            <Input value={r.name} onChange={e => updateRow(r.pid, {name: e.target.value})}/>
                                        </TableCell>
                                        {info.priority && numberCell(r, 'priority')}
                                        {info.queue && (
                                            <TableCell>
                                                <NativeSelect className="w-full" value={r.queue}
                                                              onChange={e => updateRow(r.pid, {queue: Number(e.target.value)})}>
                                                    {QUEUE_LABELS.map((q, i) => <option key={q} value={i}>{q}</option>)}
                                                </NativeSelect>
                                            </TableCell>
                                        )}
                                        {numberCell(r, 'arrival')}
                                        {numberCell(r, 'burst')}
                                        {numberCell(r, 'ioAfter')}
                                        {numberCell(r, 'ioTime')}
                                        {info.yield && numberCell(r, 'yieldEvery')}
                                        {numberCell(r, 'ppid')}
                                        <TableCell>
                                            <Button variant="ghost" size="icon" aria-label="Remover processo"
                                                    onClick={() => updateRows(rows.filter(x => x.pid !== r.pid))}>
                                                <Trash2/>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        E/S: depois de "E/S após" ticks de CPU o processo vai para Espera por "E/S dur." ticks (0 =
                        sem E/S). Pai: PID do processo pai (0 = nenhum); quando o pai termina, os filhos também.
                    </p>

                    <div className="flex items-center justify-between">
                        <Button variant="outline" onClick={addRow}><Plus/> Adicionar processo</Button>
                        <Button onClick={() => execute([], false)}><Play/> Simular</Button>
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                </CardContent>
            </Card>

            {result && (
                <>
                    {dirty && (
                        <p className="text-sm text-amber-700">
                            A configuração mudou desde a última simulação. Clique em Simular para atualizar.
                        </p>
                    )}
                    {result.truncated && (
                        <p className="text-sm text-destructive">A simulação foi interrompida no limite de ticks.</p>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>Resultado</CardTitle>
                            <CardDescription>
                                Linha do tempo da CPU. A moldura preta marca o tick exibido no passo a passo.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <Metrics m={result.metrics}/>
                            <Gantt timelines={result.timelines} names={names} tick={tick}/>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Passo a passo</CardTitle>
                            <CardDescription>
                                Acompanhe estados, filas e eventos tick a tick e aplique operações sobre os processos
                                (suspender, reativar, alterar prioridade, destruir).
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Player
                                result={result} policy={cfg.policy} tick={tick} setTick={setTick} ops={ops}
                                onOp={applyOp}
                                onRemoveOp={i => execute(ops.filter((_, j) => j !== i), true)}
                                onClearOps={() => execute([], true)}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Processos</CardTitle>
                            <CardDescription>
                                CPU-bound passa mais tempo executando; I/O-bound passa mais tempo em espera do que
                                executando.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-auto rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Processo</TableHead>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead className="text-right">Chegada</TableHead>
                                            <TableHead className="text-right">Burst</TableHead>
                                            <TableHead className="text-right">Término</TableHead>
                                            <TableHead className="text-right">Turnaround</TableHead>
                                            <TableHead className="text-right">Espera</TableHead>
                                            <TableHead className="text-right">Resposta</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {result.processes.map(p => (
                                            <TableRow key={p.pid}>
                                                <TableCell>P{p.pid} · {p.name}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{p.kind === 'io' ? 'I/O-bound' : 'CPU-bound'}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">{p.arrival}</TableCell>
                                                <TableCell className="text-right tabular-nums">{p.burst}</TableCell>
                                                {p.state === 'TERMINATED' ? (
                                                    <>
                                                        <TableCell className="text-right tabular-nums">
                                                            {p.finish}{p.killed ? ' (destruído)' : ''}
                                                        </TableCell>
                                                        <TableCell className="text-right tabular-nums">{p.turnaround}</TableCell>
                                                    </>
                                                ) : (
                                                    <TableCell colSpan={2} className="text-right text-muted-foreground">
                                                        {STATE_LABEL[p.state]}
                                                    </TableCell>
                                                )}
                                                <TableCell className="text-right tabular-nums">{p.waiting}</TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {p.response < 0 ? '-' : p.response}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}

            <CompareAlgorithms cfg={cfg} rows={rows}/>
        </div>
    )
}
