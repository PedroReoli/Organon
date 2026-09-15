// Coluna esquerda de horários da grade horária do planner
interface TimeSlotAxisProps {
  startHour: number
  endHour: number
  interval: 30 | 60        // minutos por slot
  slotHeight: number        // px por slot
}

export function TimeSlotAxis({ startHour, endHour, interval, slotHeight }: TimeSlotAxisProps) {
  const totalSlots = ((endHour - startHour) * 60) / interval

  return (
    <div className="hourly-axis">
      {Array.from({ length: totalSlots }, (_, i) => {
        const totalMin = startHour * 60 + i * interval
        const h = Math.floor(totalMin / 60)
        const m = totalMin % 60
        const isHour = m === 0
        const label  = isHour
          ? `${String(h).padStart(2, '0')}:00`
          : null   // meia hora: sem label (só linha)

        return (
          <div
            key={i}
            className="hourly-axis-slot"
            style={{ height: slotHeight }}
          >
            {label && (
              <span className={`hourly-axis-label${i === 0 ? ' is-first' : ''}`}>
                {label}
              </span>
            )}
          </div>
        )
      })}

      {/* Último label (hora final) */}
      <div className="hourly-axis-slot" style={{ height: 0 }}>
        <span className="hourly-axis-label">
          {`${String(endHour % 24).padStart(2, '0')}:00`}
        </span>
      </div>
    </div>
  )
}
