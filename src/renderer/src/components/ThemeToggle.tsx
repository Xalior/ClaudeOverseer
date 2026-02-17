import type { ThemeMode } from '../../../preload/index.d'

interface ThemeToggleProps {
  mode: ThemeMode
  onModeChange: (mode: ThemeMode) => void
}

const MODES: { value: ThemeMode; label: string; title: string }[] = [
  { value: 'light', label: '☀', title: 'Light' },
  { value: 'system', label: '⚙', title: 'System' },
  { value: 'dark', label: '🌙', title: 'Dark' }
]

export function ThemeToggle({ mode, onModeChange }: ThemeToggleProps) {
  return (
    <div className="theme-toggle" title={`Theme: ${mode}`}>
      {MODES.map(({ value, label, title }) => (
        <button
          key={value}
          className={`theme-toggle__btn ${mode === value ? 'theme-toggle__btn--active' : ''}`}
          onClick={() => onModeChange(value)}
          title={title}
          aria-label={`${title} theme`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
