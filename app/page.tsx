'use client'

import { useState, useEffect, useRef } from 'react'
import VelaNavbar from '@/components/landing/vela-navbar'

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const C = {
  base:       '#08101C',
  surface:    '#0D1E38',
  surface2:   '#122347',
  border:     '#1A2E50',
  primary:    '#1A6BFF',
  primaryDim: '#4D8FFF',
  accent:     '#00C9A7',
  accentDim:  '#4DDEC7',
  text1:      '#FFFFFF',
  text2:      '#A8BFDC',
  text3:      '#3A5A88',
}

const SG = 'var(--font-space-grotesk), "Space Grotesk", system-ui, sans-serif'
const INT = 'var(--font-sans), Inter, system-ui, sans-serif'

// ─── Primitives ───────────────────────────────────────────────────────────────

function WaveIcon({
  stroke = C.primary,
  width = 28,
}: {
  stroke?: string
  width?: number
}) {
  const h = Math.round((18 / 28) * width)
  return (
    <svg width={width} height={h} viewBox="0 0 44 22" fill="none" aria-hidden>
      <path
        d="M4 16 C4 16 10 4 18 4 C26 4 26 18 34 18 C40 18 42 10 42 10"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="42" cy="10" r="3" fill={C.accent} />
    </svg>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        color: C.accent,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        fontFamily: INT,
        marginBottom: 16,
      }}
    >
      <WaveIcon width={20} />
      {children}
    </div>
  )
}

function PrimaryButton({
  children,
  onClick,
  style,
  type = 'button',
}: {
  children: React.ReactNode
  onClick?: () => void
  style?: React.CSSProperties
  type?: 'button' | 'submit'
}) {
  const [hovered, setHovered] = useState(false)
  const [active, setActive] = useState(false)
  return (
    <button
      type={type}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setActive(false) }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      style={{
        backgroundColor: hovered ? C.primaryDim : C.primary,
        color: '#FFFFFF',
        padding: '10px 22px',
        borderRadius: 7,
        border: 'none',
        fontSize: 13,
        fontWeight: 500,
        fontFamily: INT,
        cursor: 'pointer',
        transition: 'background-color 0.15s',
        transform: active ? 'scale(0.98)' : 'scale(1)',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

function GhostButton({
  children,
  onClick,
  style,
}: {
  children: React.ReactNode
  onClick?: () => void
  style?: React.CSSProperties
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: 'transparent',
        color: hovered ? C.text1 : C.primaryDim,
        border: `0.5px solid ${hovered ? C.primaryDim : C.border}`,
        padding: '10px 22px',
        borderRadius: 7,
        fontSize: 13,
        fontWeight: 500,
        fontFamily: INT,
        cursor: 'pointer',
        transition: 'all 0.15s',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// ─── Scroll animation ─────────────────────────────────────────────────────────

function useFadeIn(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])
  return { ref, visible }
}

function FadeIn({
  children,
  delay = 0,
}: {
  children: React.ReactNode
  delay?: number
}) {
  const { ref, visible } = useFadeIn()
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.4s ease-out ${delay}ms, transform 0.4s ease-out ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

// ─── Animated counter ─────────────────────────────────────────────────────────

function CountUp({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const { ref, visible } = useFadeIn()

  useEffect(() => {
    if (!visible) return
    let frame = 0
    const duration = 1400
    const fps = 60
    const totalFrames = Math.round((duration / 1000) * fps)

    const timer = setInterval(() => {
      frame++
      const progress = frame / totalFrames
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * target))
      if (frame >= totalFrames) {
        setCount(target)
        clearInterval(timer)
      }
    }, 1000 / fps)

    return () => clearInterval(timer)
  }, [visible, target])

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  )
}

// ─── Hoverable card ───────────────────────────────────────────────────────────

function HoverCard({
  children,
  style,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: C.surface,
        border: `0.5px solid ${hovered ? C.primary : C.border}`,
        borderRadius: 12,
        padding: '20px 22px',
        transition: 'border-color 0.15s',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ─── SECTION: Hero ────────────────────────────────────────────────────────────

function HeroSection() {
  const heroCards = [
    {
      title: 'Crown & Bridge',
      desc: 'Full-contour zirconia & PFM. Margins within 0.05mm on every scan.',
    },
    {
      title: 'Implant Prosthetics',
      desc: 'Screw-retained & cement. Emergence profiles done right, first time.',
    },
    {
      title: 'Digital Smile Design',
      desc: '2D/3D wax-ups and DSD presentations your patients can visualise.',
    },
  ]

  return (
    <section
      style={{
        minHeight: '100vh',
        paddingTop: 120,
        paddingBottom: 80,
        paddingLeft: 24,
        paddingRight: 24,
        backgroundColor: C.base,
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 64,
            alignItems: 'start',
          }}
        >
          {/* Left */}
          <div>
            <FadeIn>
              <SectionLabel>Digital Dental Design</SectionLabel>
            </FadeIn>

            <FadeIn delay={80}>
              <h1
                style={{
                  fontFamily: SG,
                  fontSize: 'clamp(38px, 5vw, 56px)',
                  fontWeight: 500,
                  color: C.text1,
                  letterSpacing: '-0.035em',
                  lineHeight: 1.1,
                  margin: '0 0 20px 0',
                }}
              >
                Designs that labs produce. Perfectly.
              </h1>
            </FadeIn>

            <FadeIn delay={140}>
              <p
                style={{
                  fontFamily: INT,
                  fontSize: 16,
                  color: C.text2,
                  lineHeight: 1.75,
                  maxWidth: 400,
                  margin: '0 0 32px 0',
                }}
              >
                Precision digital prosthetic design for dental labs and clinics.
                Zero rework. Every time.
              </p>
            </FadeIn>

            <FadeIn delay={200}>
              <div
                style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 48 }}
              >
                <PrimaryButton style={{ fontSize: 14, padding: '12px 28px' }}>
                  Get a free quote
                </PrimaryButton>
                <GhostButton style={{ fontSize: 14, padding: '12px 28px' }}>
                  View our work →
                </GhostButton>
              </div>
            </FadeIn>

            <FadeIn delay={260}>
              <div
                style={{
                  borderTop: `0.5px solid ${C.border}`,
                  paddingTop: 32,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 16,
                }}
              >
                {[
                  { value: 200, suffix: '+', label: 'Cases delivered' },
                  { value: 50, suffix: '+', label: 'Partner labs' },
                  { value: 0, suffix: '%', label: 'Rework rate' },
                ].map((stat) => (
                  <div key={stat.label}>
                    <div
                      style={{
                        fontFamily: SG,
                        fontSize: 36,
                        fontWeight: 500,
                        color: C.text1,
                        letterSpacing: '-0.03em',
                        lineHeight: 1,
                      }}
                    >
                      <CountUp target={stat.value} suffix={stat.suffix} />
                    </div>
                    <div
                      style={{
                        fontFamily: INT,
                        fontSize: 12,
                        color: C.text3,
                        marginTop: 6,
                      }}
                    >
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>

          {/* Right — service cards */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              paddingTop: 40,
            }}
          >
            {heroCards.map((card, i) => (
              <FadeIn key={card.title} delay={160 + i * 80}>
                <HoverCard>
                  <div style={{ marginBottom: 12 }}>
                    <WaveIcon />
                  </div>
                  <div
                    style={{
                      fontFamily: SG,
                      fontSize: 16,
                      fontWeight: 500,
                      color: C.text1,
                      marginBottom: 6,
                    }}
                  >
                    {card.title}
                  </div>
                  <div
                    style={{
                      fontFamily: INT,
                      fontSize: 14,
                      color: C.text2,
                      lineHeight: 1.6,
                    }}
                  >
                    {card.desc}
                  </div>
                </HoverCard>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── SECTION: Trust bar ───────────────────────────────────────────────────────

function TrustBarSection() {
  const items = [
    '50+ labs worldwide',
    'Zirconia specialists',
    'CAD/CAM certified',
    '24h turnaround',
    '0% remake rate',
    'ISO-compatible workflows',
  ]

  return (
    <section
      style={{
        backgroundColor: C.surface,
        borderTop: `0.5px solid ${C.border}`,
        borderBottom: `0.5px solid ${C.border}`,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          overflow: 'hidden',
        }}
      >
        {items.map((item, i) => (
          <div key={item} style={{ display: 'flex', alignItems: 'center' }}>
            <span
              style={{
                fontFamily: INT,
                fontSize: 11,
                fontWeight: 500,
                color: C.text3,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '16px 24px',
                whiteSpace: 'nowrap',
              }}
            >
              {item}
            </span>
            {i < items.length - 1 && (
              <div
                style={{ width: 0.5, height: 18, backgroundColor: C.border, flexShrink: 0 }}
              />
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── SECTION: Services ────────────────────────────────────────────────────────

const LAB_SERVICES = [
  {
    title: 'Crown & Bridge Design',
    desc: 'Full-contour zirconia, PFM, and eMax. Margins within 0.05mm on every scan.',
  },
  {
    title: 'Implant Prosthetics',
    desc: 'Screw-retained and cement-retained prosthetics. Emergence profiles correct, first time.',
  },
  {
    title: 'Digital Smile Design',
    desc: '2D and 3D wax-ups, mockups, and DSD presentations your patients can visualise.',
  },
  {
    title: 'Denture & Removable',
    desc: 'Full and partial dentures designed to your bite records and tooth selection.',
  },
  {
    title: 'Orthodontic Models',
    desc: 'Precise digital models and retainer bases from your IOS or CBCT data.',
  },
  {
    title: 'CAD/CAM Consultation',
    desc: "Not sure what's possible? We advise on design strategy and milling parameters.",
  },
]

const CLINIC_SERVICES = [
  {
    title: 'Crown & Bridge Design',
    desc: 'Send a scan, get a design. Occlusion checked, contacts verified, ready to mill.',
  },
  {
    title: 'Digital Smile Design',
    desc: 'Show patients their result before you start. 2D mock-ups and 3D previews.',
  },
  {
    title: 'Implant Prosthetics',
    desc: 'Abutments, crowns, and hybrid prosthetics designed around your surgical plan.',
  },
  {
    title: 'Orthodontic Models',
    desc: 'Aligner models, retainers, and auxiliary appliances from digital impressions.',
  },
  {
    title: 'CAD/CAM Consultation',
    desc: 'We help you choose the right material, design approach, and milling path.',
  },
  {
    title: 'Full-Arch Rehabilitation',
    desc: 'All-on-X designs, bite verification, and phased treatment planning.',
  },
]

function ServiceCard({ title, desc }: { title: string; desc: string }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: C.surface,
        border: `0.5px solid ${hovered ? C.primary : C.border}`,
        borderRadius: 12,
        padding: '24px 22px',
        transition: 'border-color 0.15s',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div>
        <WaveIcon stroke={hovered ? C.accent : C.primary} />
      </div>
      <div
        style={{
          fontFamily: SG,
          fontSize: 17,
          fontWeight: 500,
          color: C.text1,
          lineHeight: 1.2,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: INT,
          fontSize: 14,
          color: C.text2,
          lineHeight: 1.65,
          flexGrow: 1,
        }}
      >
        {desc}
      </div>
      <a
        href="#contact"
        style={{
          fontFamily: INT,
          fontSize: 13,
          color: hovered ? C.primaryDim : C.primary,
          textDecoration: 'none',
          transition: 'color 0.15s',
          marginTop: 4,
        }}
      >
        Learn more →
      </a>
    </div>
  )
}

function ServicesSection() {
  const [tab, setTab] = useState<'labs' | 'clinics'>('labs')
  const services = tab === 'labs' ? LAB_SERVICES : CLINIC_SERVICES

  return (
    <section
      id="services"
      style={{ backgroundColor: C.base, padding: '96px 24px' }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <FadeIn>
          <SectionLabel>Services</SectionLabel>
        </FadeIn>

        <FadeIn delay={80}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 20,
              marginBottom: 48,
            }}
          >
            <h2
              style={{
                fontFamily: SG,
                fontSize: 'clamp(26px, 3.5vw, 40px)',
                fontWeight: 500,
                color: C.text1,
                letterSpacing: '-0.03em',
                lineHeight: 1.15,
                margin: 0,
                maxWidth: 480,
              }}
            >
              Everything your lab or clinic needs
            </h2>

            {/* Toggle */}
            <div
              style={{
                display: 'flex',
                backgroundColor: C.surface,
                border: `0.5px solid ${C.border}`,
                borderRadius: 8,
                padding: 3,
                gap: 3,
              }}
            >
              {(['labs', 'clinics'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 6,
                    border: 'none',
                    fontSize: 13,
                    fontWeight: 500,
                    fontFamily: INT,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    backgroundColor: tab === t ? C.primary : 'transparent',
                    color: tab === t ? '#FFFFFF' : C.text3,
                  }}
                >
                  For {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </FadeIn>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {services.map((s, i) => (
            <FadeIn key={s.title + tab} delay={i * 50}>
              <ServiceCard title={s.title} desc={s.desc} />
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── SECTION: Portfolio ───────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    quote: 'Lab turnaround cut from 3 days to 6 hours. Zero fit issues since we switched.',
    name: 'Dr. Sara M.',
    role: 'Prosthodontist, London',
    rating: 5,
  },
  {
    quote: 'First agency that communicates in CAD language. Zirconia margins are consistently perfect.',
    name: 'James T.',
    role: 'Lab Owner, Dubai',
    rating: 5,
  },
  {
    quote: 'Sent 47 cases last quarter. Not a single remake.',
    name: 'Rafael K.',
    role: 'Clinic Director, Toronto',
    rating: 5,
  },
]

function BeforeAfterSlider({
  label,
  beforeLabel,
  afterLabel,
  beforeColor,
  afterColor,
}: {
  label: string
  beforeLabel: string
  afterLabel: string
  beforeColor: string
  afterColor: string
}) {
  const [pos, setPos] = useState(50)

  return (
    <div
      style={{
        backgroundColor: C.surface2,
        border: `0.5px solid ${C.border}`,
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'relative',
          height: 180,
          userSelect: 'none',
          cursor: 'ew-resize',
        }}
      >
        {/* After side */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: afterColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: 20,
          }}
        >
          <span
            style={{
              fontFamily: INT,
              fontSize: 12,
              color: C.accent,
              fontWeight: 500,
              letterSpacing: '0.04em',
            }}
          >
            {afterLabel}
          </span>
        </div>

        {/* Before side (clipped) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            clipPath: `inset(0 ${100 - pos}% 0 0)`,
            background: beforeColor,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 20,
          }}
        >
          <span
            style={{
              fontFamily: INT,
              fontSize: 12,
              color: C.text3,
              fontWeight: 500,
              letterSpacing: '0.04em',
            }}
          >
            {beforeLabel}
          </span>
        </div>

        {/* Divider */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${pos}%`,
            width: 2,
            backgroundColor: C.primary,
            pointerEvents: 'none',
            transform: 'translateX(-1px)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 28,
              height: 28,
              borderRadius: '50%',
              backgroundColor: C.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            ⟷
          </div>
        </div>

        {/* Corner labels */}
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            fontSize: 9,
            color: C.text3,
            fontFamily: INT,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            pointerEvents: 'none',
          }}
        >
          Before
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            fontSize: 9,
            color: C.text3,
            fontFamily: INT,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            pointerEvents: 'none',
          }}
        >
          After
        </div>

        {/* Range input overlay */}
        <input
          type="range"
          min={0}
          max={100}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-label={`Before/after slider: ${label}`}
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0,
            cursor: 'ew-resize',
            width: '100%',
            height: '100%',
            margin: 0,
          }}
        />
      </div>

      <div
        style={{
          padding: '12px 16px',
          borderTop: `0.5px solid ${C.border}`,
        }}
      >
        <span style={{ fontFamily: INT, fontSize: 13, color: C.text2 }}>{label}</span>
      </div>
    </div>
  )
}

function PortfolioSection() {
  const [activeTestimonial, setActiveTestimonial] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % TESTIMONIALS.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const t = TESTIMONIALS[activeTestimonial]

  return (
    <section
      id="work"
      style={{
        backgroundColor: C.surface,
        padding: '96px 24px',
        borderTop: `0.5px solid ${C.border}`,
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <FadeIn>
          <SectionLabel>Portfolio</SectionLabel>
        </FadeIn>
        <FadeIn delay={80}>
          <h2
            style={{
              fontFamily: SG,
              fontSize: 'clamp(26px, 3.5vw, 40px)',
              fontWeight: 500,
              color: C.text1,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              margin: '0 0 40px 0',
            }}
          >
            Work that speaks for itself
          </h2>
        </FadeIn>

        {/* Before/after sliders */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
            marginBottom: 40,
          }}
        >
          {[
            {
              label: 'Full-arch zirconia bridge',
              beforeLabel: 'Scan data',
              afterLabel: 'Final CAD design',
              beforeColor: `linear-gradient(135deg, #0D1E38 0%, #1A2E50 100%)`,
              afterColor: `linear-gradient(135deg, #08101C 0%, #0D2B4A 100%)`,
            },
            {
              label: 'Implant-supported crown',
              beforeLabel: 'IOS scan',
              afterLabel: 'Milling-ready STL',
              beforeColor: `linear-gradient(135deg, #122347 0%, #0D1E38 100%)`,
              afterColor: `linear-gradient(135deg, #08101C 0%, #0A1F3A 100%)`,
            },
            {
              label: 'Digital smile design',
              beforeLabel: 'Patient photos',
              afterLabel: 'DSD wax-up',
              beforeColor: `linear-gradient(135deg, #1A2E50 0%, #0D1E38 100%)`,
              afterColor: `linear-gradient(135deg, #08101C 0%, #0D2540 100%)`,
            },
          ].map((item, i) => (
            <FadeIn key={item.label} delay={i * 80}>
              <BeforeAfterSlider {...item} />
            </FadeIn>
          ))}
        </div>

        {/* Case study + testimonials */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24,
          }}
        >
          {/* Featured case study */}
          <FadeIn>
            <div
              style={{
                backgroundColor: C.surface2,
                border: `0.5px solid ${C.border}`,
                borderRadius: 12,
                padding: '28px 24px',
                height: '100%',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                  color: C.accent,
                  fontFamily: INT,
                  marginBottom: 16,
                }}
              >
                Featured case
              </div>
              <div
                style={{
                  fontFamily: SG,
                  fontSize: 20,
                  fontWeight: 500,
                  color: C.text1,
                  marginBottom: 24,
                  lineHeight: 1.3,
                }}
              >
                14-unit full-arch bridge for multi-site lab group
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Client type', value: 'High-volume dental lab' },
                  { label: 'Challenge', value: 'Inconsistent fit across 3 milling machines' },
                  { label: 'Result', value: '0 remakes across 23 subsequent cases' },
                ].map((row) => (
                  <div
                    key={row.label}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '110px 1fr',
                      gap: 12,
                      paddingBottom: 14,
                      borderBottom: `0.5px solid ${C.border}`,
                    }}
                  >
                    <span
                      style={{ fontFamily: INT, fontSize: 12, color: C.text3 }}
                    >
                      {row.label}
                    </span>
                    <span
                      style={{ fontFamily: INT, fontSize: 14, color: C.text2 }}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Testimonial carousel */}
          <FadeIn delay={100}>
            <div
              style={{
                backgroundColor: C.base,
                border: `0.5px solid ${C.border}`,
                borderRadius: 12,
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 240,
                boxSizing: 'border-box',
              }}
            >
              <div>
                <div
                  style={{
                    color: C.accent,
                    fontSize: 16,
                    letterSpacing: 3,
                    marginBottom: 16,
                  }}
                >
                  {'★'.repeat(t.rating)}
                </div>
                <p
                  style={{
                    fontFamily: SG,
                    fontSize: 18,
                    fontWeight: 500,
                    color: C.text1,
                    lineHeight: 1.55,
                    margin: '0 0 20px 0',
                  }}
                >
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>
              <div>
                <div
                  style={{
                    fontFamily: INT,
                    fontSize: 14,
                    color: C.text1,
                    fontWeight: 500,
                  }}
                >
                  {t.name}
                </div>
                <div
                  style={{ fontFamily: INT, fontSize: 12, color: C.text3, marginTop: 2 }}
                >
                  {t.role}
                </div>

                {/* Dot indicators */}
                <div style={{ display: 'flex', gap: 6, marginTop: 20 }}>
                  {TESTIMONIALS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveTestimonial(i)}
                      aria-label={`Testimonial ${i + 1}`}
                      style={{
                        width: i === activeTestimonial ? 20 : 6,
                        height: 6,
                        borderRadius: 3,
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        backgroundColor:
                          i === activeTestimonial ? C.primary : C.border,
                        padding: 0,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  )
}

// ─── SECTION: Contact ─────────────────────────────────────────────────────────

function ContactSection() {
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    orgType: '',
    message: '',
  })

  const inputBase: React.CSSProperties = {
    width: '100%',
    backgroundColor: C.surface2,
    border: `0.5px solid ${C.border}`,
    borderRadius: 8,
    padding: '10px 14px',
    fontFamily: INT,
    fontSize: 14,
    color: C.text1,
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: INT,
    fontSize: 12,
    color: C.text3,
    display: 'block',
    marginBottom: 6,
    letterSpacing: '0.04em',
  }

  return (
    <section
      id="contact"
      style={{
        backgroundColor: C.base,
        padding: '96px 24px',
        borderTop: `0.5px solid ${C.border}`,
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <FadeIn>
          <SectionLabel>Contact</SectionLabel>
        </FadeIn>
        <FadeIn delay={60}>
          <h2
            style={{
              fontFamily: SG,
              fontSize: 'clamp(26px, 3.5vw, 40px)',
              fontWeight: 500,
              color: C.text1,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              margin: '0 0 8px 0',
            }}
          >
            Ready to eliminate rework?
          </h2>
          <p
            style={{
              fontFamily: INT,
              fontSize: 16,
              color: C.text2,
              margin: '0 0 48px 0',
            }}
          >
            Start with a free consult. No obligation.
          </p>
        </FadeIn>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 48,
          }}
        >
          {/* Form */}
          <FadeIn>
            {submitted ? (
              <div
                style={{
                  backgroundColor: C.surface,
                  border: `0.5px solid ${C.accent}`,
                  borderRadius: 12,
                  padding: '48px 32px',
                  textAlign: 'center',
                }}
              >
                <div style={{ color: C.accent, fontSize: 36, marginBottom: 16 }}>
                  ✓
                </div>
                <div
                  style={{
                    fontFamily: SG,
                    fontSize: 22,
                    color: C.text1,
                    fontWeight: 500,
                    marginBottom: 8,
                  }}
                >
                  Message sent.
                </div>
                <div style={{ fontFamily: INT, fontSize: 14, color: C.text2 }}>
                  We&apos;ll be in touch within 24 hours.
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  setSubmitted(true)
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                <div
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}
                >
                  <div>
                    <label style={labelStyle}>Name</label>
                    <input
                      required
                      style={inputBase}
                      placeholder="Your name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input
                      required
                      type="email"
                      style={inputBase}
                      placeholder="you@lab.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Organisation type</label>
                  <select
                    required
                    style={{ ...inputBase, cursor: 'pointer' }}
                    value={form.orgType}
                    onChange={(e) =>
                      setForm({ ...form, orgType: e.target.value })
                    }
                  >
                    <option value="">Select type</option>
                    <option value="lab">Dental lab</option>
                    <option value="clinic">Dental clinic</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Message</label>
                  <textarea
                    required
                    rows={4}
                    style={{ ...inputBase, resize: 'vertical' }}
                    placeholder="Tell us about your cases and volume..."
                    value={form.message}
                    onChange={(e) =>
                      setForm({ ...form, message: e.target.value })
                    }
                  />
                </div>
                <PrimaryButton
                  type="submit"
                  style={{ alignSelf: 'flex-start', fontSize: 14, padding: '12px 28px' }}
                >
                  Send message
                </PrimaryButton>
              </form>
            )}
          </FadeIn>

          {/* Reassurance + direct contact */}
          <FadeIn delay={120}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              <div>
                {[
                  'Response within 24 hours',
                  'Free initial consultation',
                  'No-obligation quote',
                  'Works with any CAD software',
                ].map((item) => (
                  <div
                    key={item}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 0',
                      borderBottom: `0.5px solid ${C.border}`,
                      fontFamily: INT,
                      fontSize: 14,
                      color: C.text2,
                    }}
                  >
                    <span style={{ color: C.accent, flexShrink: 0 }}>✓</span>
                    {item}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div
                  style={{
                    fontFamily: INT,
                    fontSize: 11,
                    color: C.text3,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  Direct contact
                </div>
                <a
                  href="mailto:hello@veladental.com"
                  style={{
                    fontFamily: INT,
                    fontSize: 14,
                    color: C.primaryDim,
                    textDecoration: 'none',
                  }}
                >
                  ✉ hello@veladental.com
                </a>
                <a
                  href="#"
                  style={{
                    fontFamily: INT,
                    fontSize: 14,
                    color: C.accent,
                    textDecoration: 'none',
                  }}
                >
                  💬 WhatsApp us
                </a>
              </div>

              {/* Calendly placeholder */}
              <div
                style={{
                  backgroundColor: C.surface,
                  border: `0.5px solid ${C.border}`,
                  borderRadius: 12,
                  padding: '24px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontFamily: INT,
                    fontSize: 13,
                    color: C.text2,
                    marginBottom: 6,
                  }}
                >
                  Book a call directly
                </div>
                <div style={{ fontFamily: INT, fontSize: 12, color: C.text3 }}>
                  Calendly embed — replace with your link
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  )
}

// ─── SECTION: Footer ──────────────────────────────────────────────────────────

function FooterSection() {
  return (
    <footer
      style={{
        backgroundColor: C.surface,
        borderTop: `0.5px solid ${C.border}`,
        padding: '64px 24px 32px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ghost wave background */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="80" viewBox="0 0 400 80"><path d="M0 50 C0 50 40 8 80 8 C120 8 120 72 160 72 C200 72 200 8 240 8 C280 8 280 72 320 72 C360 72 360 8 400 8" stroke="#1A6BFF" stroke-width="1" fill="none" opacity="0.04"/></svg>',
          )}")`,
          backgroundSize: '400px 80px',
          backgroundRepeat: 'repeat',
          pointerEvents: 'none',
        }}
      />

      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 48,
            marginBottom: 48,
          }}
        >
          {/* Brand */}
          <div>
            <svg width="130" height="36" viewBox="0 0 260 52" fill="none" aria-label="Vela">
              <path
                d="M8 38 C8 38 16 10 26 10 C36 10 36 44 46 44 C56 44 56 10 66 10"
                stroke="#1A6BFF"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="66" cy="10" r="4.5" fill="#00C9A7" />
              <text
                x="82"
                y="30"
                fontFamily="Space Grotesk, system-ui"
                fontSize="28"
                fontWeight="500"
                fill="#FFFFFF"
                letterSpacing="-1"
              >
                Vela
              </text>
              <text
                x="84"
                y="44"
                fontFamily="Inter, system-ui"
                fontSize="10"
                fill="#3A5A88"
                letterSpacing="2"
              >
                DENTAL DESIGN
              </text>
            </svg>
            <p
              style={{
                fontFamily: INT,
                fontSize: 13,
                color: C.text3,
                marginTop: 14,
                lineHeight: 1.65,
                maxWidth: 220,
              }}
            >
              Precision digital prosthetic design. Zero rework. Every time.
            </p>
          </div>

          {/* Services */}
          <FooterColumn
            title="Services"
            links={[
              'Crown & Bridge',
              'Implant Prosthetics',
              'Smile Design',
              'Removable',
              'Ortho Models',
              'Consultation',
            ]}
          />

          {/* Company */}
          <FooterColumn
            title="Company"
            links={['About', 'Work', 'For Labs', 'For Clinics', 'Careers']}
          />

          {/* Contact */}
          <div>
            <div
              style={{
                fontFamily: INT,
                fontSize: 11,
                fontWeight: 500,
                color: C.text3,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                marginBottom: 16,
              }}
            >
              Contact
            </div>
            <a
              href="mailto:hello@veladental.com"
              style={{
                display: 'block',
                fontFamily: INT,
                fontSize: 13,
                color: C.text2,
                textDecoration: 'none',
                marginBottom: 10,
              }}
            >
              hello@veladental.com
            </a>
            <a
              href="#"
              style={{
                display: 'block',
                fontFamily: INT,
                fontSize: 13,
                color: C.text2,
                textDecoration: 'none',
                marginBottom: 10,
              }}
            >
              WhatsApp
            </a>
            <div
              style={{
                fontFamily: INT,
                fontSize: 12,
                color: C.text3,
                marginTop: 16,
                lineHeight: 1.6,
              }}
            >
              Response within 24h
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            borderTop: `0.5px solid ${C.border}`,
            paddingTop: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <span style={{ fontFamily: INT, fontSize: 12, color: C.text3 }}>
            © 2025 Vela Dental Design. All rights reserved.
          </span>
          <div style={{ display: 'flex', gap: 24 }}>
            {['Privacy policy', 'Terms of service'].map((item) => (
              <FooterLink key={item} href="#">
                {item}
              </FooterLink>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <div
        style={{
          fontFamily: INT,
          fontSize: 11,
          fontWeight: 500,
          color: C.text3,
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          marginBottom: 16,
        }}
      >
        {title}
      </div>
      {links.map((link) => (
        <FooterLink key={link} href="#">
          {link}
        </FooterLink>
      ))}
    </div>
  )
}

function FooterLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <a
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block',
        fontFamily: INT,
        fontSize: 13,
        color: hovered ? C.text1 : C.text2,
        textDecoration: 'none',
        marginBottom: 10,
        transition: 'color 0.15s',
      }}
    >
      {children}
    </a>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VelaLandingPage() {
  return (
    <div
      style={{
        backgroundColor: C.base,
        color: C.text1,
        minHeight: '100vh',
      }}
    >
      <VelaNavbar />
      <HeroSection />
      <TrustBarSection />
      <ServicesSection />
      <PortfolioSection />
      <ContactSection />
      <FooterSection />
    </div>
  )
}
