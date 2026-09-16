import { useState } from 'react';
import { PlanningTask } from '../../types/planning.types';

export const NaturalLanguageInput = ({ onAdd }: { onAdd: (task: Partial<PlanningTask>) => void }) => {
    const [inputValue, setInputValue] = useState('');

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            // Basic NLP parser stub
            let title = inputValue.trim();
            let priority: PlanningTask['priority'] = 'P3';
            let date = null;
            let tags: string[] = [];

            if (title.includes('#urgent') || title.includes('#p1')) {
                priority = 'P1';
                title = title.replace(/#(urgent|p1)/gi, '');
            }
            if (title.includes('#high') || title.includes('#p2')) {
                priority = 'P2';
                title = title.replace(/#(high|p2)/gi, '');
            }
            if (title.includes('#p3')) {
                priority = 'P3';
                title = title.replace(/#p3/gi, '');
            }
            if (title.includes('#p4')) {
                priority = 'P4';
                title = title.replace(/#p4/gi, '');
            }

            const tagMatches = title.match(/@(\w+)/g);
            if (tagMatches) {
                tags = tagMatches.map(t => t.substring(1));
                title = title.replace(/@\w+/g, '');
            }

            if (title.toLowerCase().includes('today')) {
                date = new Date().toISOString().slice(0, 10);
                title = title.replace(/today/i, '');
            } else if (title.toLowerCase().includes('tomorrow')) {
                const tmr = new Date();
                tmr.setDate(tmr.getDate() + 1);
                date = tmr.toISOString().slice(0, 10);
                title = title.replace(/tomorrow/i, '');
            }

            onAdd({
                title: title.trim(),
                priority,
                tags,
                date: date,
                hasDate: !!date
            });
            setInputValue('');
        }
    };

    return (
        <div style={{ marginBottom: '16px' }}>
            <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='e.g., "Client review tomorrow at 3pm #urgent @ClientA"'
                style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'var(--color-surface)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
                    outline: 'none',
                    transition: 'border-color 150ms ease-out'
                }}
            />
        </div>
    )
}
