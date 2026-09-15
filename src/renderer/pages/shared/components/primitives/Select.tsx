import React, { forwardRef } from 'react'
import * as RadixSelect from '@radix-ui/react-select'
import './primitives-radix.css'

/**
 * Select wrapper sobre Radix Select.
 *
 * Uso:
 *   <Select.Root value={value} onValueChange={setValue}>
 *     <Select.Trigger>
 *       <Select.Value placeholder="Escolha..." />
 *     </Select.Trigger>
 *     <Select.Portal>
 *       <Select.Content>
 *         <Select.Viewport>
 *           <Select.Item value="a">Opcao A</Select.Item>
 *           <Select.Item value="b">Opcao B</Select.Item>
 *         </Select.Viewport>
 *       </Select.Content>
 *     </Select.Portal>
 *   </Select.Root>
 *
 * Definido no upgrade 20.
 */

const Root = RadixSelect.Root
const Value = RadixSelect.Value
const Portal = RadixSelect.Portal
const Group = RadixSelect.Group

const Trigger = forwardRef<
  React.ElementRef<typeof RadixSelect.Trigger>,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Trigger>
>(function SelectTrigger({ className = '', children, ...props }, ref) {
  return (
    <RadixSelect.Trigger
      ref={ref}
      className={`ds-select-trigger ${className}`.trim()}
      {...props}
    >
      {children}
      <RadixSelect.Icon className="ds-select-icon">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </RadixSelect.Icon>
    </RadixSelect.Trigger>
  )
})

const Content = forwardRef<
  React.ElementRef<typeof RadixSelect.Content>,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Content>
>(function SelectContent({ className = '', children, position = 'popper', ...props }, ref) {
  return (
    <RadixSelect.Content
      ref={ref}
      position={position}
      className={`ds-select-content ${className}`.trim()}
      {...props}
    >
      <RadixSelect.Viewport className="ds-select-viewport">{children}</RadixSelect.Viewport>
    </RadixSelect.Content>
  )
})

const Item = forwardRef<
  React.ElementRef<typeof RadixSelect.Item>,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Item>
>(function SelectItem({ className = '', children, ...props }, ref) {
  return (
    <RadixSelect.Item ref={ref} className={`ds-select-item ${className}`.trim()} {...props}>
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
      <RadixSelect.ItemIndicator className="ds-select-item-indicator">✓</RadixSelect.ItemIndicator>
    </RadixSelect.Item>
  )
})

const Label = forwardRef<
  React.ElementRef<typeof RadixSelect.Label>,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Label>
>(function SelectLabel({ className = '', ...props }, ref) {
  return <RadixSelect.Label ref={ref} className={`ds-select-label ${className}`.trim()} {...props} />
})

const Separator = forwardRef<
  React.ElementRef<typeof RadixSelect.Separator>,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Separator>
>(function SelectSeparator({ className = '', ...props }, ref) {
  return <RadixSelect.Separator ref={ref} className={`ds-select-separator ${className}`.trim()} {...props} />
})

export const Select = { Root, Trigger, Value, Portal, Content, Item, Group, Label, Separator }
