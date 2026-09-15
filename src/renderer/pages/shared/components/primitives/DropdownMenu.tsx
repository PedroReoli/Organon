import React, { forwardRef } from 'react'
import * as RadixMenu from '@radix-ui/react-dropdown-menu'
import './primitives-radix.css'

/**
 * Dropdown Menu wrapper sobre Radix DropdownMenu.
 *
 * Substitui menus custom (CardContextMenu, etc).
 *
 * Uso:
 *   <DropdownMenu.Root>
 *     <DropdownMenu.Trigger asChild><IconButton ... /></DropdownMenu.Trigger>
 *     <DropdownMenu.Portal>
 *       <DropdownMenu.Content>
 *         <DropdownMenu.Item onSelect={...}>Editar</DropdownMenu.Item>
 *         <DropdownMenu.Separator />
 *         <DropdownMenu.Item>Excluir</DropdownMenu.Item>
 *       </DropdownMenu.Content>
 *     </DropdownMenu.Portal>
 *   </DropdownMenu.Root>
 *
 * Definido no upgrade 20.
 */

const Root = RadixMenu.Root
const Trigger = RadixMenu.Trigger
const Portal = RadixMenu.Portal
const Sub = RadixMenu.Sub
const Group = RadixMenu.Group
const RadioGroup = RadixMenu.RadioGroup

const Content = forwardRef<
  React.ElementRef<typeof RadixMenu.Content>,
  React.ComponentPropsWithoutRef<typeof RadixMenu.Content>
>(function DropdownMenuContent({ className = '', sideOffset = 4, ...props }, ref) {
  return (
    <RadixMenu.Content
      ref={ref}
      sideOffset={sideOffset}
      className={`ds-menu-content ${className}`.trim()}
      {...props}
    />
  )
})

const SubContent = forwardRef<
  React.ElementRef<typeof RadixMenu.SubContent>,
  React.ComponentPropsWithoutRef<typeof RadixMenu.SubContent>
>(function DropdownMenuSubContent({ className = '', ...props }, ref) {
  return <RadixMenu.SubContent ref={ref} className={`ds-menu-content ${className}`.trim()} {...props} />
})

const Item = forwardRef<
  React.ElementRef<typeof RadixMenu.Item>,
  React.ComponentPropsWithoutRef<typeof RadixMenu.Item>
>(function DropdownMenuItem({ className = '', ...props }, ref) {
  return <RadixMenu.Item ref={ref} className={`ds-menu-item ${className}`.trim()} {...props} />
})

const SubTrigger = forwardRef<
  React.ElementRef<typeof RadixMenu.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof RadixMenu.SubTrigger>
>(function DropdownMenuSubTrigger({ className = '', ...props }, ref) {
  return <RadixMenu.SubTrigger ref={ref} className={`ds-menu-item ds-menu-subtrigger ${className}`.trim()} {...props} />
})

const CheckboxItem = forwardRef<
  React.ElementRef<typeof RadixMenu.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof RadixMenu.CheckboxItem>
>(function DropdownMenuCheckboxItem({ className = '', children, ...props }, ref) {
  return (
    <RadixMenu.CheckboxItem
      ref={ref}
      className={`ds-menu-item ds-menu-checkbox-item ${className}`.trim()}
      {...props}
    >
      <span className="ds-menu-indicator">
        <RadixMenu.ItemIndicator>✓</RadixMenu.ItemIndicator>
      </span>
      {children}
    </RadixMenu.CheckboxItem>
  )
})

const RadioItem = forwardRef<
  React.ElementRef<typeof RadixMenu.RadioItem>,
  React.ComponentPropsWithoutRef<typeof RadixMenu.RadioItem>
>(function DropdownMenuRadioItem({ className = '', children, ...props }, ref) {
  return (
    <RadixMenu.RadioItem
      ref={ref}
      className={`ds-menu-item ds-menu-radio-item ${className}`.trim()}
      {...props}
    >
      <span className="ds-menu-indicator">
        <RadixMenu.ItemIndicator>●</RadixMenu.ItemIndicator>
      </span>
      {children}
    </RadixMenu.RadioItem>
  )
})

const Label = forwardRef<
  React.ElementRef<typeof RadixMenu.Label>,
  React.ComponentPropsWithoutRef<typeof RadixMenu.Label>
>(function DropdownMenuLabel({ className = '', ...props }, ref) {
  return <RadixMenu.Label ref={ref} className={`ds-menu-label ${className}`.trim()} {...props} />
})

const Separator = forwardRef<
  React.ElementRef<typeof RadixMenu.Separator>,
  React.ComponentPropsWithoutRef<typeof RadixMenu.Separator>
>(function DropdownMenuSeparator({ className = '', ...props }, ref) {
  return <RadixMenu.Separator ref={ref} className={`ds-menu-separator ${className}`.trim()} {...props} />
})

export const DropdownMenu = {
  Root,
  Trigger,
  Portal,
  Content,
  Sub,
  SubTrigger,
  SubContent,
  Item,
  CheckboxItem,
  RadioGroup,
  RadioItem,
  Group,
  Label,
  Separator,
}
