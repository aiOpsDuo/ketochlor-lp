interface Props {
  color?: string
  opacity?: number
  className?: string
}

/** Low-opacity decorative "molecule/constellation" motif — subtle scientific graphic language. */
export default function MoleculeTexture({ color = '#FFFFFF', opacity = 0.12, className = '' }: Props) {
  const nodes = [
    [50, 8], [92, 18], [78, 48], [96, 70], [62, 92], [22, 82], [6, 52], [24, 20],
  ]
  const cx = 50
  const cy = 45
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      className={`pointer-events-none select-none ${className}`}
      style={{ opacity }}
      aria-hidden="true"
    >
      {nodes.map(([x, y], i) => (
        <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={color} strokeWidth={0.3} />
      ))}
      <circle cx={cx} cy={cy} r={1.6} fill={color} />
      {nodes.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.1} fill={color} />
      ))}
    </svg>
  )
}
