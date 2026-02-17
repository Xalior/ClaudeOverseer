import * as SwitchPrimitive from '@radix-ui/react-switch'

interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  id?: string
  'data-testid'?: string
}

export function Switch({ checked, onCheckedChange, id, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      id={id}
      className="ui-switch"
      checked={checked}
      onCheckedChange={onCheckedChange}
      {...props}
    >
      <SwitchPrimitive.Thumb className="ui-switch__thumb" />
    </SwitchPrimitive.Root>
  )
}
