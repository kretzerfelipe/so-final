import * as React from 'react'
import {Input} from '@/components/ui/input'

type Props = Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'type'> & {
    value: number
    onChange: (value: number) => void
}

export function NumInput({value, onChange, ...props}: Props) {
    return <Input type="number" value={value} onChange={e => onChange(Number(e.target.value))} {...props}/>
}
