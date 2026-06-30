// Hermie's wings mark. Inherits color via currentColor, so set color on a
// parent. `glow` adds the soft bloom that defines the brand.
export default function Wings({ size = 28, glow = true, color = "var(--violet)" }) {
  const height = (size * 18) / 28;
  return (
    <svg
      viewBox="0 0 64 40"
      width={size}
      height={height}
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      style={glow ? { filter: "drop-shadow(0 0 3px var(--violet-soft))" } : undefined}
      aria-hidden="true"
    >
      <path d="M30 22 C22 19, 14 17, 6 9" />
      <path d="M30 25 C23 24, 16 23, 9 18" />
      <path d="M30 29 C24 29, 18 29, 12 27" />
      <path d="M34 22 C42 19, 50 17, 58 9" />
      <path d="M34 25 C41 24, 48 23, 55 18" />
      <path d="M34 29 C40 29, 46 29, 52 27" />
      <circle cx="32" cy="24" r="3" fill={color} stroke="none" />
    </svg>
  );
}
