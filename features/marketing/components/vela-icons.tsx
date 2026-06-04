/* ─── Vela Dental Design — shared brand SVG components ───────────── */

export interface WaveIconProps {
  color?: string;
  size?: number;
}

export function WaveIcon({ color = "#1A6BFF", size = 50 }: WaveIconProps) {
  return (
    <svg
      width={size}
      height={Math.round(size * 0.64)}
      viewBox="0 0 47 22"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M4 16 C4 16 10 4 18 4 C26 4 26 18 34 18 C40 18 42 10 42 10"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="42" cy="10" r="3" fill="#00C9A7" />
    </svg>
  );
}

export interface VelaWordmarkProps {
  scale?: number;
}

export function VelaWordmark({ scale = 1 }: VelaWordmarkProps) {
  const w = Math.round(200 * scale);
  const h = Math.round(40 * scale);
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 200 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 16 C4 16 10 4 18 4 C26 4 26 18 34 18 C40 18 42 10 42 10"
        stroke="#1A6BFF"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="42" cy="10" r="3" fill="#00C9A7" />
      <text
        x="64"
        y="24"
        fontFamily="var(--font-space-grotesk, 'Space Grotesk', system-ui, sans-serif)"
        fontSize="22"
        fontWeight="500"
        fill="#FFFFFF"
        letterSpacing="-0.8"
      >
        Vela
      </text>
      <text
        x="66"
        y="35"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="8"
        fill="#3A5A88"
        letterSpacing="1.8"
      >
        DENTAL DESIGN
      </text>
    </svg>
  );
}
