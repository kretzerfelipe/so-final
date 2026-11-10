import {useState} from 'react'
import {BarChart3} from 'lucide-react'
import {CompareAlgorithms as RunCompare} from '../../../wailsjs/go/main/App'
import {main} from '../../../wailsjs/go/models'
import {Button} from '@/components/ui/button'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table'
import {Row, policyLabel} from '@/lib/sim'

type Props = { cfg: main.SimConfig; rows: Row[] }

type Column = {
    label: string
    pick: (r: main.AlgorithmRow) => number
    format: (v: number) => string
    best: 'min' | 'max'
}

const COLUMNS: Column[] = [
    {label: 'Espera média', pick: r => r.metrics.avgWaiting, format: v => v.toFixed(2), best: 'min'},
    {label: 'Turnaround médio', pick: r => r.metrics.avgTurnaround, format: v => v.toFixed(2), best: 'min'},
    {label: 'Resposta média', pick: r => r.metrics.avgResponse, format: v => v.toFixed(2), best: 'min'},
    {label: 'Uso da CPU', pick: r => r.metrics.cpuUtilization, format: v => `${v.toFixed(1)}%`, best: 'max'},
    {label: 'Throughput', pick: r => r.metrics.throughput, format: v => v.toFixed(3), best: 'max'},
    {label: 'Trocas de contexto', pick: r => r.metrics.contextSwitches, format: v => String(v), best: 'min'},
]

export function CompareAlgorithms({cfg, rows}: Props) {
    const [data, setData] = useState<main.AlgorithmRow[]>([])
    const [error, setError] = useState('')

    const run = async () => {
        try {
            setData(await RunCompare(cfg, rows))
            setError('')
        } catch (e) {
            setData([])
            setError(String(e))
        }
    }

    const valid = data.filter(r => !r.error)
    const bestOf = (c: Column) => {
        const values = valid.map(c.pick)
        return c.best === 'min' ? Math.min(...values) : Math.max(...values)
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Comparar algoritmos</CardTitle>
                <CardDescription>
                    Roda a mesma carga (tabela acima, quantum, processadores e custo de troca) em todos os algoritmos.
                    Em verde, o melhor valor de cada coluna. As filas do "Múltiplas filas" vêm da coluna Fila, e o
                    "Cooperativo" usa "Cede a cada".
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button variant="outline" onClick={run}><BarChart3/> Comparar todos</Button>
                {error && <p className="text-sm text-destructive">{error}</p>}
                {data.length > 0 && (
                    <div className="overflow-auto rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Algoritmo</TableHead>
                                    {COLUMNS.map(c => <TableHead key={c.label} className="text-right">{c.label}</TableHead>)}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map(r => (
                                    <TableRow key={r.policy}>
                                        <TableCell>{policyLabel(r.policy)}</TableCell>
                                        {COLUMNS.map(c => {
                                            if (r.error) return <TableCell key={c.label} className="text-right">-</TableCell>
                                            const v = c.pick(r)
                                            const isBest = Math.abs(v - bestOf(c)) < 1e-9
                                            return (
                                                <TableCell key={c.label}
                                                           className={`text-right tabular-nums ${isBest ? 'font-semibold text-emerald-700' : ''}`}>
                                                    {c.format(v)}
                                                </TableCell>
                                            )
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
