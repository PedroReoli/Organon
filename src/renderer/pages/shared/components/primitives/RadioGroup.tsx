import React, { forwardRef } from 'react'
import * as RadixRadio from '@radix-ui/react-radio-group'
import './primitives-radix.css'

/**
 * RadioGroup wrapper sobre Radix RadioGroup.
 *
 * Uso:
 *   <RadioGroup.Root value={value} onValueChange={setValue}>
 *     <label><RadioGroup.Item value="a" /> Opcao A</label>
 *     <label><RadioGroup.Item value="b" /> Opcao B</label>
 *   </RadioGroup.Root>
 *
 * Definido no upgrade 20.
 */

const Root = forwardRef<
  React.ElementRef<typeof RadixRadio.Root>,
  React.ComponentPropsWithoutRef<typeof RadixRadio.Root>
>(function RadioGroupRoot({ className = '', ...props }, ref) {
  return <RadixRadio.Root ref={ref} className={`ds-radio-group ${className}`.trim()} {...props} />
})

const Item = forwardRef<
  React.ElementRef<typeof RadixRadio.Item>,
  React.ComponentPropsWithoutRef<typeof RadixRadio.Item>
>(function RadioGroupItem({ className = '', ...props }, ref) {
  return (
    <RadixRadio.Item ref={ref} className={`ds-radio-item ${className}`.trim()} {...props}>
      <RadixRadio.Indicator className="ds-radio-indicator" />
    </RadixRadio.Item>
  )
})

export const RadioGroup = { Root, Item }
