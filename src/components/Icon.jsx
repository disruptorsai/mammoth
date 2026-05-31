// Thin wrapper over Google Material Symbols (loaded in index.html).
// Usage: <Icon name="dashboard" filled className="text-primary" />
export default function Icon({ name, filled = false, className = '', style, ...rest }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={filled ? { fontVariationSettings: "'FILL' 1", ...style } : style}
      {...rest}
    >
      {name}
    </span>
  )
}
