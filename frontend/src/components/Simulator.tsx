import {useState} from 'react'
import {Plus, Play, Trash2} from 'lucide-react'
import {Simulate} from '../../wailsjs/go/main/App'
import {main} from '../../wailsjs/go/models'
import {Badge} from '@/components/ui/badge'
import {Button} from '@/components/ui/button'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table'
import {Tabs, TabsList, TabsTrigger} from '@/components/ui/tabs'
import {Gantt} from '@/components/Gantt'

type Row = {
    pid: number
    name: string
    priority: number
    arrival: number
    burst: number
    ioAfter: number
    ioTime: number
}

type NumericField = 'priority' | 'arrival' | 'burst' | 'ioAfter' | 'ioTime'

const NUMERIC_COLUMNS: { field: NumericField; label: string }[] = [
    {field: 'priority', label: 'Prioridade'},
    {field: 'arrival', label: 'Chegada'},
    {field: 'burst', label: 'Burst'},
    {field: 'ioAfter', label: 'E/S após'},
    {field: 'ioTime', label: 'E/S dur.'},
]

const DEFAULT_ROWS: Row[] = [
    {pid: 1, name: 'browser', priority: 2, arrival: 0, burst: 5, ioAfter: 0, ioTime: 0},
    {pid: 2, name: 'editor', priority: 1, arrival: 1, burst: 3, ioAfter: 1, ioTime: 2},
    {pid: 3, name: 'compiler', priority: 3, arrival: 2, burst: 6, ioAfter: 3, ioTime: 3},
    {pid: 4, name: 'backup', priority: 4, arrival: 4, burst: 2, ioAfter: 0, ioTime: 0},
]

const POLICIES: Record<string, string> = {
    rr: 'Round Robin',
    priority: 'Prioridade (preemptivo)',
}

export function Simulator() {
    const [policy, setPolicy] = useState('rr')
    const [quantum, setQuantum] = useState(2)
    const [rows, setRows] = useState<Row[]>(DEFAULT_ROWS)
    const [result, setResult] = useState<main.SimulationResult | null>(null)
    const [error, setError] = useState('')

    const updateRow = (pid: number, field: keyof Row, value: string | number) =>
        setRows(rows.map(r => (r.pid === pid ? {...r, [field]: value} : r)))

    const addRow = () => {
        const pid = rows.reduce((max, r) => Math.max(max, r.pid), 0) + 1
        setRows([...rows, {pid, name: `proc${pid}`, priority: 1, arrival: 0, burst: 3, ioAfter: 0, ioTime: 0}])
    }

    const removeRow = (pid: number) => setRows(rows.filter(r => r.pid !== pid))

    const run = async () => {
        try {
            const inputs = rows.map(r => main.ProcessInput.createFrom(r))
            setResult(await Simulate(policy, quantum, inputs))
            setError('')
        } catch (e) {
            setResult(null)
            setError(String(e))
        }
    }

    const names = Object.fromEntries((result?.processes ?? []).map(p => [p.pid, p.name]))

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Configuração</CardTitle>
                    <CardDescription>
                        Escolha o algoritmo e edite os processos. A E/S é opcional: após "E/S após" ticks de CPU o
                        processo vai para WAITING por "E/S dur." ticks.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="flex flex-wrap items-end gap-6">
                        <div className="space-y-1.5">
                            <Label>Algoritmo</Label>
                            <Tabs value={policy} onValueChange={v => setPolicy(String(v))}>
                                <TabsList>
                                    {Object.entries(POLICIES).map(([key, label]) => (
                                        <TabsTrigger key={key} value={key}>{label}</TabsTrigger>
                                    ))}
                                </TabsList>
                            </Tabs>
                        </div>
                        {policy === 'rr' && (
                            <div className="space-y-1.5">
                                <Label htmlFor="quantum">Quantum (ticks)</Label>
                                <Input
                                    id="quantum"
                                    type="number"
                                    min={1}
                                    className="w-28"
                                    value={quantum}
                                    onChange={e => setQuantum(Number(e.target.value))}
                                />
                            </div>
                        )}
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">PID</TableHead>
                                <TableHead>Nome</TableHead>
                                {NUMERIC_COLUMNS.map(c => (
                                    <TableHead key={c.field} className="w-24">{c.label}</TableHead>
                                ))}
                                <TableHead className="w-12"/>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map(r => (
                                <TableRow key={r.pid}>
                                    <TableCell className="font-mono text-muted-foreground">{r.pid}</TableCell>
                                    <TableCell>
                                        <Input value={r.name} onChange={e => updateRow(r.pid, 'name', e.target.value)}/>
                                    </TableCell>
                                    {NUMERIC_COLUMNS.map(c => (
                                        <TableCell key={c.field}>
                                            <Input
                                                type="number"
                                                min={0}
                                                value={r[c.field]}
                                                onChange={e => updateRow(r.pid, c.field, Number(e.target.value))}
                                            />
                                        </TableCell>
                                    ))}
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => removeRow(r.pid)}
                                                aria-label="Remover processo">
                                            <Trash2/>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    <div className="flex items-center justify-between">
                        <Button variant="outline" onClick={addRow}><Plus/> Adicionar processo</Button>
                        <Button onClick={run}><Play/> Simular</Button>
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                </CardContent>
            </Card>

            {result && (
                <Card>
                    <CardHeader>
                        <CardTitle>Resultado</CardTitle>
                        <CardDescription>
                            Linha do tempo da CPU · menor valor de prioridade = maior prioridade.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <Gantt timeline={result.timeline} names={names}/>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Processo</TableHead>
                                    <TableHead className="text-right">E/S</TableHead>
                                    <TableHead className="text-right">Término</TableHead>
                                    <TableHead className="text-right">Turnaround</TableHead>
                                    <TableHead className="text-right">Espera</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {result.processes.map(p => (
                                    <TableRow key={p.pid}>
                                        <TableCell>P{p.pid} · {p.name}</TableCell>
                                        <TableCell className="text-right tabular-nums">{p.ioTime || '-'}</TableCell>
                                        <TableCell className="text-right tabular-nums">{p.finish}</TableCell>
                                        <TableCell className="text-right tabular-nums">{p.turnaround}</TableCell>
                                        <TableCell className="text-right tabular-nums">{p.waiting}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        <div className="flex items-center gap-2 text-sm">
                            Tempo médio de espera:
                            <Badge>{result.avgWaiting.toFixed(2)}</Badge>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
