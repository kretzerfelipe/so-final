import {useState} from 'react'
import {Loader2, Play} from 'lucide-react'
import {Compare as RunCompare} from '../../wailsjs/go/main/App'
import {main} from '../../wailsjs/go/models'
import {Button} from '@/components/ui/button'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table'

const MODE_LABELS: Record<string, string> = {
    goroutine: 'Goroutines',
    thread: 'Threads do SO',
}

const MODE_BARS: Record<string, string> = {
    goroutine: 'bg-blue-500',
    thread: 'bg-amber-500',
}

type Metric = { label: string; unit: string; value: (r: main.CompareRow) => number }

const METRICS: Metric[] = [
    {label: 'Lançamento', unit: 'ms', value: r => r.launchMs},
    {label: 'Tempo total', unit: 'ms', value: r => r.totalMs},
    {label: 'Threads do SO criadas', unit: '', value: r => r.threads},
    {label: 'Memória de pilhas', unit: 'KB', value: r => r.stackKb},
]

export function Compare() {
    const [tasks, setTasks] = useState(1000)
    const [work, setWork] = useState(2000000)
    const [rows, setRows] = useState<main.CompareRow[]>([])
    const [running, setRunning] = useState(false)
    const [error, setError] = useState('')

    const run = async () => {
        setRunning(true)
        setError('')
        try {
            setRows(await RunCompare(tasks, work))
        } catch (e) {
            setRows([])
            setError(String(e))
        } finally {
            setRunning(false)
        }
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Configuração</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="tasks">Tarefas concorrentes (até 5000)</Label>
                            <Input
                                id="tasks"
                                type="number"
                                min={1}
                                max={5000}
                                className="w-48"
                                value={tasks}
                                onChange={e => setTasks(Number(e.target.value))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="work">Iterações por tarefa</Label>
                            <Input
                                id="work"
                                type="number"
                                min={1}
                                className="w-48"
                                value={work}
                                onChange={e => setWork(Number(e.target.value))}
                            />
                        </div>
                        <Button onClick={run} disabled={running}>
                            {running ? <Loader2 className="animate-spin"/> : <Play/>}
                            {running ? 'Executando...' : 'Executar'}
                        </Button>
                    </div>
                    {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
                </CardContent>
            </Card>

            {rows.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Resultado</CardTitle>
                        <CardDescription>Quanto menor, melhor em todas as métricas.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Modo</TableHead>
                                    {METRICS.map(m => (
                                        <TableHead key={m.label} className="text-right">
                                            {m.label}{m.unit && ` (${m.unit})`}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map(r => (
                                    <TableRow key={r.mode}>
                                        <TableCell>{MODE_LABELS[r.mode] ?? r.mode}</TableCell>
                                        {METRICS.map(m => (
                                            <TableCell key={m.label} className="text-right tabular-nums">
                                                {m.value(r).toLocaleString('pt-BR', {maximumFractionDigits: 2})}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        <div className="grid gap-5 sm:grid-cols-2">
                            {METRICS.map(m => {
                                const max = Math.max(...rows.map(r => m.value(r)), 1)
                                return (
                                    <div key={m.label} className="space-y-2">
                                        <p className="text-sm font-medium">{m.label}</p>
                                        {rows.map(r => (
                                            <div key={r.mode} className="flex items-center gap-2 text-xs">
                                                <span className="w-24 text-muted-foreground">
                                                    {MODE_LABELS[r.mode] ?? r.mode}
                                                </span>
                                                <div className="h-3 flex-1 rounded-full bg-muted">
                                                    <div
                                                        className={`h-3 rounded-full ${MODE_BARS[r.mode] ?? 'bg-primary'}`}
                                                        style={{width: `${(m.value(r) / max) * 100}%`}}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
