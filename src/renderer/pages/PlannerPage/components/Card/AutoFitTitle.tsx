import { useLayoutEffect, useRef, useState, type MouseEventHandler } from 'react';

interface AutoFitTitleProps {
  title: string;
  className?: string;
  minFontSize?: number;
  maxFontSize?: number;
  onClick?: MouseEventHandler<HTMLSpanElement>;
}

export const AutoFitTitle = ({
  title,
  className = '',
  minFontSize = 9.5,
  maxFontSize = 12,
  onClick,
}: AutoFitTitleProps) => {
  const containerRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState(maxFontSize);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    const fit = () => {
      const availableWidth = container.clientWidth;
      if (!availableWidth) return;

      const preferredSize = title.length <= 18 ? 12 : title.length <= 28 ? 11 : 10;
      let low = minFontSize;
      let high = Math.min(maxFontSize, preferredSize);
      let best = low;

      for (let index = 0; index < 7; index += 1) {
        const candidate = (low + high) / 2;
        text.style.fontSize = `${candidate}px`;
        if (text.scrollWidth <= availableWidth) {
          best = candidate;
          low = candidate;
        } else {
          high = candidate;
        }
      }

      setFontSize(Math.max(minFontSize, Math.min(best, maxFontSize)));
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(container);
    return () => observer.disconnect();
  }, [maxFontSize, minFontSize, title]);

  return (
    <span ref={containerRef} onClick={onClick} className={`block min-w-0 overflow-hidden whitespace-nowrap ${className}`} title={title}>
      <span
        ref={textRef}
        className="block overflow-hidden text-ellipsis whitespace-nowrap font-medium leading-4 tracking-tight"
        style={{ fontSize: `${fontSize}px` }}
      >
        {title}
      </span>
    </span>
  );
};
