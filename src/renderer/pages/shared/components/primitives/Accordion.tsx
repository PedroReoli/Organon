import React, { forwardRef } from 'react'
import * as RadixAccordion from '@radix-ui/react-accordion'
import './primitives-radix.css'

/**
 * Accordion wrapper sobre Radix Accordion.
 *
 * Uso:
 *   <Accordion.Root type="single" collapsible>
 *     <Accordion.Item value="a">
 *       <Accordion.Trigger>Pergunta A</Accordion.Trigger>
 *       <Accordion.Content>Resposta A</Accordion.Content>
 *     </Accordion.Item>
 *   </Accordion.Root>
 *
 * Definido no upgrade 20.
 */

const Root = forwardRef<
  React.ElementRef<typeof RadixAccordion.Root>,
  React.ComponentPropsWithoutRef<typeof RadixAccordion.Root>
>(function AccordionRoot({ className = '', ...props }, ref) {
  return <RadixAccordion.Root ref={ref} className={`ds-accordion ${className}`.trim()} {...props} />
})

const Item = forwardRef<
  React.ElementRef<typeof RadixAccordion.Item>,
  React.ComponentPropsWithoutRef<typeof RadixAccordion.Item>
>(function AccordionItem({ className = '', ...props }, ref) {
  return <RadixAccordion.Item ref={ref} className={`ds-accordion-item ${className}`.trim()} {...props} />
})

const Trigger = forwardRef<
  React.ElementRef<typeof RadixAccordion.Trigger>,
  React.ComponentPropsWithoutRef<typeof RadixAccordion.Trigger>
>(function AccordionTrigger({ className = '', children, ...props }, ref) {
  return (
    <RadixAccordion.Header className="ds-accordion-header">
      <RadixAccordion.Trigger
        ref={ref}
        className={`ds-accordion-trigger ${className}`.trim()}
        {...props}
      >
        {children}
        <span className="ds-accordion-chevron" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </RadixAccordion.Trigger>
    </RadixAccordion.Header>
  )
})

const Content = forwardRef<
  React.ElementRef<typeof RadixAccordion.Content>,
  React.ComponentPropsWithoutRef<typeof RadixAccordion.Content>
>(function AccordionContent({ className = '', children, ...props }, ref) {
  return (
    <RadixAccordion.Content ref={ref} className={`ds-accordion-content ${className}`.trim()} {...props}>
      <div className="ds-accordion-content-inner">{children}</div>
    </RadixAccordion.Content>
  )
})

export const Accordion = { Root, Item, Trigger, Content }
