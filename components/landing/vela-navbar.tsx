'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const C = {
  base: '#08101C',
  border: '#1A2E50',
  primary: '#1A6BFF',
  primaryDim: '#4D8FFF',
  text1: '#FFFFFF',
  text3: '#3A5A88',
}

function VelaWordmark() {
  return (
    <svg width="140" height="36" viewBox="0 0 260 52" fill="none" aria-label="Vela Dental Design">
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
        fontFamily="var(--font-space-grotesk), Space Grotesk, system-ui"
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
        fontFamily="var(--font-sans), Inter, system-ui"
        fontSize="10"
        fill="#3A5A88"
        letterSpacing="2"
      >
        DENTAL DESIGN
      </text>
    </svg>
  )
}

const NAV_LINKS = ['Services', 'Work', 'Labs', 'Clinics', 'About']

export default function VelaNavbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        backgroundColor: scrolled || menuOpen ? C.base : 'transparent',
        borderBottom: scrolled ? `0.5px solid ${C.border}` : '0.5px solid transparent',
        transition: 'background-color 0.25s ease, border-color 0.25s ease',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link href="/" style={{ textDecoration: 'none', lineHeight: 0 }}>
          <VelaWordmark />
        </Link>

        {/* Desktop nav */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 32,
          }}
          className="hidden md:flex"
        >
          {NAV_LINKS.map((link) => (
            <NavLink key={link} href={`#${link.toLowerCase()}`}>
              {link}
            </NavLink>
          ))}
          <BookButton />
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 5,
          }}
        >
          <span
            style={{
              display: 'block',
              width: 22,
              height: 1.5,
              backgroundColor: C.text1,
              transition: 'transform 0.25s ease, opacity 0.25s ease',
              transform: menuOpen ? 'translateY(6.5px) rotate(45deg)' : 'none',
            }}
          />
          <span
            style={{
              display: 'block',
              width: 22,
              height: 1.5,
              backgroundColor: C.text1,
              transition: 'opacity 0.25s ease',
              opacity: menuOpen ? 0 : 1,
            }}
          />
          <span
            style={{
              display: 'block',
              width: 22,
              height: 1.5,
              backgroundColor: C.text1,
              transition: 'transform 0.25s ease, opacity 0.25s ease',
              transform: menuOpen ? 'translateY(-6.5px) rotate(-45deg)' : 'none',
            }}
          />
        </button>
      </div>

      {/* Mobile fullscreen overlay */}
      {menuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            top: 64,
            backgroundColor: C.base,
            zIndex: 199,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 40,
            padding: 32,
          }}
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase()}`}
              onClick={() => setMenuOpen(false)}
              style={{
                fontFamily: 'var(--font-space-grotesk), Space Grotesk, system-ui',
                fontSize: 28,
                fontWeight: 500,
                color: C.text1,
                textDecoration: 'none',
                letterSpacing: '-0.02em',
              }}
            >
              {link}
            </a>
          ))}
          <BookButton style={{ marginTop: 8, fontSize: 15, padding: '13px 40px' }} />
        </div>
      )}
    </nav>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false)
  return (
    <a
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        color: hovered ? C.text1 : C.text3,
        fontSize: 11,
        fontFamily: 'var(--font-sans), Inter, system-ui',
        fontWeight: 500,
        textDecoration: 'none',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        transition: 'color 0.15s',
      }}
    >
      {children}
    </a>
  )
}

function BookButton({ style }: { style?: React.CSSProperties }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? C.primaryDim : C.primary,
        color: '#FFFFFF',
        padding: '10px 22px',
        borderRadius: 7,
        border: 'none',
        fontSize: 13,
        fontWeight: 500,
        fontFamily: 'var(--font-sans), Inter, system-ui',
        cursor: 'pointer',
        transition: 'background-color 0.15s',
        ...style,
      }}
    >
      Book a call
    </button>
  )
}
