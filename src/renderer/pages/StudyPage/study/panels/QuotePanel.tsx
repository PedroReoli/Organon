
import { STUDY_QUOTES } from '@config/studyQuotes'

interface Quote {
  text: string
  author: string
}

interface QuotePanelProps {
  currentQuote: Quote
  quoteIndex: number
  setQuoteIndex: (updater: (prev: number) => number) => void
}

export const QuotePanel = ({ currentQuote, setQuoteIndex }: QuotePanelProps) => (
  <div className="study-panel-section">
    <h3>Quote do dia</h3>
    <blockquote className="study-quote-card">
      <p>{currentQuote.text}</p>
      <footer>{currentQuote.author}</footer>
    </blockquote>
    <button
      type="button"
      className="study-btn"
      onClick={() => setQuoteIndex(prev => (prev + 1) % STUDY_QUOTES.length)}
    >
      Trocar quote
    </button>
  </div>
)
