"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { VelaWordmark, WaveIcon } from "@/components/vela-icons";

/* ─── Design Tokens ──────────────────────────────────────────────── */
const C = {
  base: "#F7FAFF",
  surface: "#FFFFFF",
  surface2: "#F2F7FF",
  border: "#D9E5F7",
  primary: "#1A6BFF",
  primaryDim: "#4D8FFF",
  accent: "#00A88A",
  accentDim: "#00C9A7",
  text1: "#0F1D33",
  text2: "#425B7A",
  text3: "#6E86A6",
};

/* ─── Button ─────────────────────────────────────────────────────── */
interface BtnProps {
  children: React.ReactNode;
  variant?: "primary" | "ghost";
  href?: string;
  type?: "button" | "submit";
  onClick?: () => void;
}

function Btn({
  children,
  variant = "primary",
  href,
  type = "button",
  onClick,
}: BtnProps) {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);

  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 22px",
    borderRadius: "7px",
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
    textDecoration: "none",
    transition: "background 0.15s, border-color 0.15s",
    transform: active ? "scale(0.98)" : "scale(1)",
    whiteSpace: "nowrap",
  };

  const styles: Record<string, React.CSSProperties> = {
    primary: {
      ...base,
      background: hover ? C.primaryDim : C.primary,
      color: "#fff",
      border: "none",
    },
    ghost: {
      ...base,
      background: "transparent",
      color: C.primaryDim,
      border: `0.5px solid ${hover ? C.primaryDim : C.border}`,
    },
  };

  const handlers = {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setActive(false);
    },
    onMouseDown: () => setActive(true),
    onMouseUp: () => setActive(false),
  };

  if (href) {
    return (
      <Link href={href} style={styles[variant]} {...handlers}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} style={styles[variant]} onClick={onClick} {...handlers}>
      {children}
    </button>
  );
}

/* ─── Scroll-fade wrapper ────────────────────────────────────────── */
function FadeUp({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.08 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.4s ease-out ${delay}ms, transform 0.4s ease-out ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Service Card ───────────────────────────────────────────────── */
function ServiceCard({
  title,
  description,
  accent = false,
}: {
  title: string;
  description: string;
  accent?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: C.surface,
        border: `0.5px solid ${hovered ? C.primary : C.border}`,
        borderRadius: "12px",
        padding: "20px 22px",
        transition: "border-color 0.15s",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      <div style={{ marginBottom: "14px" }}>
        <WaveIcon color={accent ? C.accent : C.primary} />
      </div>
      <h3
        style={{
          fontFamily:
            "var(--font-space-grotesk, 'Space Grotesk', system-ui, sans-serif)",
          fontSize: "17px",
          fontWeight: 500,
          color: C.text1,
          margin: "0 0 8px",
          letterSpacing: "-0.02em",
          lineHeight: 1.25,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: "14px",
          color: C.text2,
          margin: "0 0 16px",
          lineHeight: 1.7,
        }}
      >
        {description}
      </p>
      <span style={{ fontSize: "13px", color: C.primary, cursor: "pointer" }}>
        Learn more →
      </span>
    </div>
  );
}

/* ─── Contact Form ───────────────────────────────────────────────── */
function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  const inputBase: React.CSSProperties = {
    width: "100%",
    background: C.surface,
    border: `0.5px solid ${C.border}`,
    borderRadius: "8px",
    padding: "10px 14px",
    fontSize: "14px",
    color: C.text1,
    fontFamily: "Inter, system-ui, sans-serif",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "11px",
    fontWeight: 500,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: C.text3,
    marginBottom: "6px",
  };

  const focusHandlers = (
    e: React.FocusEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => (e.currentTarget.style.borderColor = C.primary);
  const blurHandlers = (
    e: React.FocusEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => (e.currentTarget.style.borderColor = C.border);

  if (submitted) {
    return (
      <div
        style={{
          background: `${C.accent}15`,
          border: `0.5px solid ${C.accent}50`,
          borderRadius: "12px",
          padding: "40px 32px",
          textAlign: "center",
        }}
      >
        <div
          style={{ fontSize: "32px", marginBottom: "16px", color: C.accent }}
        >
          ✓
        </div>
        <div
          style={{
            fontFamily:
              "var(--font-space-grotesk, 'Space Grotesk', system-ui, sans-serif)",
            fontSize: "18px",
            fontWeight: 500,
            color: C.text1,
            marginBottom: "8px",
          }}
        >
          Message received
        </div>
        <div style={{ fontSize: "14px", color: C.text2 }}>
          We&apos;ll be in touch within 24 hours.
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
      }}
      style={{ display: "flex", flexDirection: "column", gap: "16px" }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label style={labelStyle}>Name</label>
          <input
            type="text"
            placeholder="Your name"
            required
            style={inputBase}
            onFocus={focusHandlers}
            onBlur={blurHandlers}
          />
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            placeholder="your@email.com"
            required
            style={inputBase}
            onFocus={focusHandlers}
            onBlur={blurHandlers}
          />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Organisation type</label>
        <select
          style={{
            ...inputBase,
            color: C.text2,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%233A5A88' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 12px center",
            paddingRight: "36px",
            appearance: "none",
          }}
        >
          <option value="">Select...</option>
          <option value="lab">Dental lab</option>
          <option value="clinic">Dental clinic</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label style={labelStyle}>Message</label>
        <textarea
          placeholder="Tell us about your case volume, software, and what you're looking for..."
          rows={4}
          style={{ ...inputBase, resize: "vertical" }}
          onFocus={focusHandlers}
          onBlur={blurHandlers}
        />
      </div>
      <div>
        <Btn type="submit">Send message →</Btn>
      </div>
    </form>
  );
}

/* ─── Data ───────────────────────────────────────────────────────── */
const LAB_SERVICES = [
  {
    title: "Crown & Bridge Design",
    description:
      "Full-contour zirconia. Accurate contacts, anatomy, and occlusion — milling-ready every time.",
  },
  {
    title: "Implant Prosthetics",
    description:
      "Screw-retained and cement-retained designs. Compatible with all major implant systems.",
  },
  {
    title: "Digital Smile Design",
    description:
      "2D/3D digital wax-up and mockup. Anterior esthetics planned and validated before any prep.",
  },
  {
    title: "Denture & Removable",
    description:
      "Full and partial denture CAD optimised for natural fit, phonetics, and patient comfort.",
  },
  {
    title: "Orthodontic Models",
    description:
      "Digital models for aligners, retainers, and study cases. Print-ready from your scanner.",
  },
  {
    title: "CAD/CAM Consultation",
    description:
      "File format guidance, milling strategy, and workflow optimisation for your equipment.",
  },
];

const CLINIC_SERVICES = [
  {
    title: "Digital Smile Design",
    description:
      "Patient-approved 2D/3D DSD presentations before any preparation or lab fees.",
  },
  {
    title: "Crown & Veneer CAD",
    description:
      "Aesthetic anterior designs with natural morphology, balanced proportions, and tissue harmony.",
  },
  {
    title: "Implant Prosthetics",
    description:
      "Custom abutment and crown design for screw-retained and cement-retained cases.",
  },
  {
    title: "Surgical Guide Design",
    description:
      "Implant placement guides designed from CBCT and intraoral scan data.",
  },
  {
    title: "Denture CAD",
    description:
      "Full and partial denture design with phonetics and occlusion check built in.",
  },
  {
    title: "Study Models",
    description:
      "Diagnostic models for treatment planning, aligner staging, and case presentations.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "Communication is fast, revisions are precise, and the designs are consistently production-ready.",
    name: "Jan M.",
    role: "Lab Owner — Germany",
  },
  {
    quote:
      "Our remakes dropped significantly after we started sending complex cases to Vela. Zero rework on full-arch implant cases.",
    name: "Dr. Sarah C.",
    role: "Clinic Director — United States",
  },
  {
    quote:
      "Reliable partner for high-volume weeks. They deliver exactly when they say they will.",
    name: "Carlos R.",
    role: "Production Manager — Spain",
  },
];

const PROOF_CASES = [
  {
    label: "Anterior Aesthetic Rehab",
    before: "Mismatched proportions, poor smile harmony",
    after: "Natural contour, balanced smile line",
  },
  {
    label: "Posterior Functional Restore",
    before: "Unstable occlusal contacts, premature wear",
    after: "Optimised occlusion, predictable fit",
  },
  {
    label: "Full-Arch Implant Bridge",
    before: "Ill-fitting provisional, patient dissatisfied",
    after: "Screw-retained bridge, zero rework",
  },
];

/* ─── Main Export ────────────────────────────────────────────────── */
export function VelaLanding() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [serviceTab, setServiceTab] = useState<"labs" | "clinics">("labs");
  const [testimonialIdx, setTestimonialIdx] = useState(0);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTestimonialIdx((i) => (i + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const services = serviceTab === "labs" ? LAB_SERVICES : CLINIC_SERVICES;

  /* shared section label style */
  const sectionLabel: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "11px",
    fontWeight: 500,
    letterSpacing: "0.10em",
    textTransform: "uppercase",
    color: C.accent,
    fontFamily: "Inter, system-ui, sans-serif",
    marginBottom: "12px",
  };

  const h2Style: React.CSSProperties = {
    fontFamily:
      "var(--font-space-grotesk, 'Space Grotesk', system-ui, sans-serif)",
    fontSize: "clamp(26px, 3.5vw, 38px)",
    fontWeight: 500,
    color: C.text1,
    letterSpacing: "-0.03em",
    lineHeight: 1.15,
    margin: "0 0 32px",
  };

  return (
    <div
      style={{
        background: C.base,
        color: C.text1,
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        minHeight: "100vh",
      }}
    >
      {/* ════════════════════════════════════════
          NAVBAR
      ════════════════════════════════════════ */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: scrolled ? `${C.base}ee` : "transparent",
          backdropFilter: scrolled ? "blur(14px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(14px)" : "none",
          borderBottom: `0.5px solid ${scrolled ? C.border : "transparent"}`,
          transition: "background 0.25s, border-color 0.25s",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "0 24px",
            height: "64px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            aria-label="Vela Dental Design — home"
            style={{ flexShrink: 0 }}
          >
            <WaveIcon />
          </Link>

          {/* Desktop links */}
          <nav
            className="hidden md:flex"
            style={{ gap: "4px", alignItems: "center" }}
          >
            {(["Services", "Work", "Labs", "Clinics", "About"] as const).map(
              (label) => (
                <a
                  key={label}
                  href={`#${label.toLowerCase()}`}
                  style={{
                    color: C.text3,
                    fontSize: "11px",
                    fontFamily: "Inter, system-ui, sans-serif",
                    textDecoration: "none",
                    padding: "7px 13px",
                    borderRadius: "6px",
                    transition: "color 0.15s",
                    letterSpacing: "0.01em",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = C.text2)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = C.text3)}
                >
                  {label}
                </a>
              ),
            )}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex">
            <Btn href="#contact">Book a call</Btn>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="flex md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            style={{
              background: "none",
              border: `0.5px solid ${C.border}`,
              borderRadius: "8px",
              padding: "8px",
              color: C.text2,
              cursor: "pointer",
            }}
          >
            {mobileOpen ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            style={{
              position: "fixed",
              inset: "64px 0 0 0",
              background: C.base,
              zIndex: 99,
              padding: "32px 24px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {(["Services", "Work", "Labs", "Clinics", "About"] as const).map(
              (label) => (
                <a
                  key={label}
                  href={`#${label.toLowerCase()}`}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    color: C.text2,
                    fontSize: "22px",
                    fontFamily:
                      "var(--font-space-grotesk, 'Space Grotesk', system-ui, sans-serif)",
                    fontWeight: 500,
                    textDecoration: "none",
                    padding: "18px 0",
                    borderBottom: `0.5px solid ${C.border}`,
                  }}
                >
                  {label}
                </a>
              ),
            )}
            <div style={{ marginTop: "28px" }}>
              <Btn href="#contact" onClick={() => setMobileOpen(false)}>
                Book a call
              </Btn>
            </div>
          </div>
        )}
      </header>

      {/* ════════════════════════════════════════
          HERO
      ════════════════════════════════════════ */}
      <section
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "96px 24px 80px",
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
          {/* Left col */}
          <div>
            <FadeUp>
              <div style={sectionLabel}>
                <WaveIcon color={C.accent} size={22} />
                Digital Dental Design
              </div>
            </FadeUp>

            <FadeUp delay={80}>
              <h1
                style={{
                  fontFamily:
                    "var(--font-space-grotesk, 'Space Grotesk', system-ui, sans-serif)",
                  fontSize: "clamp(36px, 5vw, 54px)",
                  fontWeight: 500,
                  color: C.text1,
                  letterSpacing: "-0.035em",
                  lineHeight: 1.1,
                  margin: "0 0 20px",
                }}
              >
                Designs that labs
                <br />
                produce. Perfectly.
              </h1>
            </FadeUp>

            <FadeUp delay={160}>
              <p
                style={{
                  fontSize: "16px",
                  color: C.text2,
                  lineHeight: 1.75,
                  maxWidth: "400px",
                  margin: "0 0 32px",
                }}
              >
                Precision digital prosthetic design for dental labs and clinics.
                Zero rework. Every time.
              </p>
            </FadeUp>

            <FadeUp delay={240}>
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  flexWrap: "wrap",
                  marginBottom: "44px",
                }}
              >
                <Btn href="#contact">Get a free quote</Btn>
                <Btn variant="ghost" href="#work">
                  View our work →
                </Btn>
              </div>
            </FadeUp>

            <FadeUp delay={320}>
              <div
                style={{
                  borderTop: `0.5px solid ${C.border}`,
                  paddingTop: "28px",
                  display: "flex",
                  gap: "36px",
                  flexWrap: "wrap",
                }}
              >
                {[
                  { stat: "200+", label: "Cases delivered" },
                  { stat: "50+", label: "Partner labs" },
                  { stat: "0%", label: "Rework rate" },
                ].map(({ stat, label }) => (
                  <div key={label}>
                    <div
                      style={{
                        fontFamily:
                          "var(--font-space-grotesk, 'Space Grotesk', system-ui, sans-serif)",
                        fontSize: "26px",
                        fontWeight: 500,
                        color: C.text1,
                        letterSpacing: "-0.03em",
                        lineHeight: 1,
                        marginBottom: "4px",
                      }}
                    >
                      {stat}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: C.text3,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </FadeUp>
          </div>

          {/* Right col — service preview cards */}
          <FadeUp delay={200}>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {[
                {
                  icon: C.primary,
                  title: "Crown & Bridge",
                  desc: "Full-contour zirconia. Milling-ready every time.",
                },
                {
                  icon: C.accent,
                  title: "Implant Prosthetics",
                  desc: "Screw-retained & cement-retained abutment design.",
                },
                {
                  icon: C.primary,
                  title: "Digital Smile Design",
                  desc: "2D/3D wax-up and mockup for anterior aesthetics.",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  style={{
                    background: C.surface,
                    border: `0.5px solid ${C.border}`,
                    borderRadius: "12px",
                    padding: "18px 20px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "14px",
                  }}
                >
                  <WaveIcon color={card.icon} size={26} />
                  <div>
                    <div
                      style={{
                        fontFamily:
                          "var(--font-space-grotesk, 'Space Grotesk', system-ui, sans-serif)",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: C.text1,
                        marginBottom: "4px",
                      }}
                    >
                      {card.title}
                    </div>
                    <div style={{ fontSize: "13px", color: C.text2 }}>
                      {card.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ════════════════════════════════════════
          TRUST BAR
      ════════════════════════════════════════ */}
      <section
        style={{
          background: C.surface,
          borderTop: `0.5px solid ${C.border}`,
          borderBottom: `0.5px solid ${C.border}`,
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "0 24px",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {[
            { value: "200+", label: "Cases Delivered" },
            { value: "50+", label: "Partner Labs" },
            { value: "0%", label: "Rework Rate" },
            { value: "24–48h", label: "Avg Turnaround" },
            { value: "12+", label: "Countries Served" },
          ].map((item, i, arr) => (
            <div
              key={item.label}
              style={{
                padding: "28px 36px",
                borderRight:
                  i < arr.length - 1 ? `0.5px solid ${C.border}` : "none",
                textAlign: "center",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  fontFamily:
                    "var(--font-space-grotesk, 'Space Grotesk', system-ui, sans-serif)",
                  fontSize: "22px",
                  fontWeight: 500,
                  color: C.text1,
                  letterSpacing: "-0.02em",
                  marginBottom: "4px",
                }}
              >
                {item.value}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: C.text3,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════
          SERVICES
      ════════════════════════════════════════ */}
      <section
        id="services"
        style={{ maxWidth: "1200px", margin: "0 auto", padding: "96px 24px" }}
      >
        <FadeUp>
          <div style={sectionLabel}>
            <WaveIcon color={C.accent} size={22} />
            Services
          </div>
          <h2 style={{ ...h2Style, marginBottom: "24px" }}>
            Everything your lab or clinic needs
          </h2>

          {/* Audience toggle */}
          <div
            style={{
              display: "inline-flex",
              background: C.surface,
              border: `0.5px solid ${C.border}`,
              borderRadius: "8px",
              padding: "4px",
              marginBottom: "40px",
            }}
          >
            {(["labs", "clinics"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setServiceTab(tab)}
                style={{
                  padding: "8px 22px",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 500,
                  fontFamily: "Inter, system-ui, sans-serif",
                  transition: "background 0.15s, color 0.15s",
                  background: serviceTab === tab ? C.primary : "transparent",
                  color: serviceTab === tab ? "#fff" : C.text3,
                }}
              >
                For {tab === "labs" ? "Labs" : "Clinics"}
              </button>
            ))}
          </div>
        </FadeUp>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service, i) => (
            <FadeUp key={service.title} delay={i * 60}>
              <ServiceCard {...service} accent={i % 3 === 2} />
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════
          PORTFOLIO / PROOF
      ════════════════════════════════════════ */}
      <section
        id="work"
        style={{
          background: C.surface,
          borderTop: `0.5px solid ${C.border}`,
          borderBottom: `0.5px solid ${C.border}`,
          padding: "96px 24px",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <FadeUp>
            <div style={sectionLabel}>
              <WaveIcon color={C.accent} size={22} />
              Portfolio
            </div>
            <h2 style={h2Style}>Work that speaks for itself</h2>
          </FadeUp>

          {/* Before/After cards */}
          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
            style={{ marginBottom: "40px" }}
          >
            {PROOF_CASES.map((item, i) => (
              <FadeUp key={item.label} delay={i * 80}>
                <div
                  style={{
                    background: C.base,
                    border: `0.5px solid ${C.border}`,
                    borderRadius: "12px",
                    padding: "16px",
                  }}
                >
                  <div
                    style={{
                      fontFamily:
                        "var(--font-space-grotesk, 'Space Grotesk', system-ui, sans-serif)",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: C.text1,
                      marginBottom: "12px",
                    }}
                  >
                    {item.label}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Before */}
                    <div
                      style={{
                        background: C.surface2,
                        border: `0.5px solid ${C.border}`,
                        borderRadius: "8px",
                        padding: "10px",
                      }}
                    >
                      <div
                        style={{
                          height: "72px",
                          borderRadius: "6px",
                          background: `linear-gradient(135deg, #1a2e50 0%, #0d1e38 100%)`,
                          marginBottom: "8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "9px",
                            color: C.text3,
                            letterSpacing: "0.08em",
                          }}
                        >
                          IMAGE
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: "9px",
                          fontWeight: 500,
                          color: C.text3,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          marginBottom: "4px",
                        }}
                      >
                        Before
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: C.text3,
                          lineHeight: 1.5,
                        }}
                      >
                        {item.before}
                      </div>
                    </div>
                    {/* After */}
                    <div
                      style={{
                        background: `${C.accent}0d`,
                        border: `0.5px solid ${C.accent}40`,
                        borderRadius: "8px",
                        padding: "10px",
                      }}
                    >
                      <div
                        style={{
                          height: "72px",
                          borderRadius: "6px",
                          background: `linear-gradient(135deg, ${C.accent}20 0%, ${C.accent}10 100%)`,
                          marginBottom: "8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "9px",
                            color: C.accent,
                            letterSpacing: "0.08em",
                          }}
                        >
                          IMAGE
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: "9px",
                          fontWeight: 500,
                          color: C.accent,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          marginBottom: "4px",
                        }}
                      >
                        After
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: C.text2,
                          lineHeight: 1.5,
                        }}
                      >
                        {item.after}
                      </div>
                    </div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>

          {/* Testimonial carousel */}
          <FadeUp delay={120}>
            <div
              style={{
                background: C.base,
                border: `0.5px solid ${C.border}`,
                borderRadius: "16px",
                padding: "40px 48px",
              }}
            >
              {/* Stars */}
              <div
                style={{ display: "flex", gap: "3px", marginBottom: "16px" }}
              >
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} style={{ color: C.accent, fontSize: "14px" }}>
                    ★
                  </span>
                ))}
              </div>

              {/* Quote */}
              <p
                style={{
                  fontFamily:
                    "var(--font-space-grotesk, 'Space Grotesk', system-ui, sans-serif)",
                  fontSize: "clamp(15px, 2vw, 19px)",
                  fontWeight: 500,
                  color: C.text1,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.55,
                  margin: "0 0 24px",
                  minHeight: "60px",
                  transition: "opacity 0.3s",
                }}
              >
                &ldquo;{TESTIMONIALS[testimonialIdx].quote}&rdquo;
              </p>

              {/* Author + dots */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "16px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 500,
                      color: C.text1,
                    }}
                  >
                    {TESTIMONIALS[testimonialIdx].name}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: C.text3,
                      marginTop: "2px",
                    }}
                  >
                    {TESTIMONIALS[testimonialIdx].role}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  {TESTIMONIALS.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setTestimonialIdx(i)}
                      aria-label={`Testimonial ${i + 1}`}
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: i === testimonialIdx ? C.primary : C.border,
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        transition: "background 0.2s",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ════════════════════════════════════════
          CONTACT / CTA
      ════════════════════════════════════════ */}
      <section
        id="contact"
        style={{ maxWidth: "1200px", margin: "0 auto", padding: "96px 24px" }}
      >
        <FadeUp>
          <div style={sectionLabel}>
            <WaveIcon color={C.accent} size={22} />
            Contact
          </div>
          <h2 style={h2Style}>Ready to eliminate rework?</h2>
        </FadeUp>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Form */}
          <FadeUp delay={80}>
            <ContactForm />
          </FadeUp>

          {/* Reassurance */}
          <FadeUp delay={160}>
            <div>
              {[
                "Response within 24 hours",
                "Free initial consultation",
                "No-obligation quote",
              ].map((text) => (
                <div
                  key={text}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    padding: "16px 0",
                    borderBottom: `0.5px solid ${C.border}`,
                  }}
                >
                  <span
                    style={{
                      width: "26px",
                      height: "26px",
                      borderRadius: "50%",
                      background: `${C.accent}18`,
                      border: `0.5px solid ${C.accent}40`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      color: C.accent,
                      flexShrink: 0,
                    }}
                  >
                    ✓
                  </span>
                  <span style={{ fontSize: "14px", color: C.text2 }}>
                    {text}
                  </span>
                </div>
              ))}

              <div style={{ marginTop: "32px" }}>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 500,
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                    color: C.text3,
                    marginBottom: "12px",
                  }}
                >
                  Direct contact
                </div>
                <a
                  href="mailto:hello@veladentaldesign.com"
                  style={{
                    display: "block",
                    color: C.primary,
                    textDecoration: "none",
                    fontSize: "14px",
                    marginBottom: "10px",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = C.primaryDim)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = C.primary)
                  }
                >
                  hello@veladentaldesign.com
                </a>
                <a
                  href="https://wa.me/1234567890"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    color: C.accent,
                    textDecoration: "none",
                    fontSize: "14px",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = C.accentDim)
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.color = C.accent)}
                >
                  WhatsApp →
                </a>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════ */}
      <footer
        style={{
          background: C.surface,
          borderTop: `0.5px solid ${C.border}`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ghost wave pattern */}
        <svg
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            opacity: 0.04,
            pointerEvents: "none",
          }}
          aria-hidden="true"
          preserveAspectRatio="xMidYMid slice"
        >
          {[0, 250, 500, 750, 1000].map((ox) => (
            <path
              key={ox}
              d={`M${ox} 60 C${ox + 30} 60 ${ox + 40} 20 ${ox + 80} 20 C${ox + 120} 20 ${ox + 120} 100 ${ox + 160} 100 C${ox + 200} 100 ${ox + 215} 50 ${ox + 240} 50`}
              stroke="#1A6BFF"
              strokeWidth="1.5"
              fill="none"
            />
          ))}
        </svg>

        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "64px 24px 0",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            className="grid grid-cols-2 lg:grid-cols-4 gap-10"
            style={{ marginBottom: "48px" }}
          >
            {/* Brand */}
            <div className="col-span-2 lg:col-span-1">
              <VelaWordmark />
              <p
                style={{
                  marginTop: "16px",
                  fontSize: "13px",
                  color: C.text3,
                  lineHeight: 1.65,
                  maxWidth: "210px",
                }}
              >
                Precision digital prosthetic design for dental labs and clinics.
              </p>
            </div>

            {/* Services */}
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: C.text3,
                  marginBottom: "16px",
                }}
              >
                Services
              </div>
              {[
                "Crown & Bridge",
                "Implant Design",
                "Smile Design",
                "Dentures",
                "Ortho Models",
              ].map((item) => (
                <a
                  key={item}
                  href="#services"
                  style={{
                    display: "block",
                    fontSize: "13px",
                    color: C.text2,
                    textDecoration: "none",
                    marginBottom: "10px",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = C.text1)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = C.text2)}
                >
                  {item}
                </a>
              ))}
            </div>

            {/* Company */}
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: C.text3,
                  marginBottom: "16px",
                }}
              >
                Company
              </div>
              {[
                { label: "About", href: "#about" },
                { label: "Work", href: "#work" },
                { label: "Labs", href: "#labs" },
                { label: "Clinics", href: "#clinics" },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  style={{
                    display: "block",
                    fontSize: "13px",
                    color: C.text2,
                    textDecoration: "none",
                    marginBottom: "10px",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = C.text1)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = C.text2)}
                >
                  {item.label}
                </a>
              ))}
            </div>

            {/* Contact */}
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: C.text3,
                  marginBottom: "16px",
                }}
              >
                Contact
              </div>
              <a
                href="mailto:hello@veladentaldesign.com"
                style={{
                  display: "block",
                  fontSize: "13px",
                  color: C.text2,
                  textDecoration: "none",
                  marginBottom: "10px",
                }}
              >
                hello@veladentaldesign.com
              </a>
              <a
                href="https://wa.me/1234567890"
                style={{
                  display: "block",
                  fontSize: "13px",
                  color: C.accent,
                  textDecoration: "none",
                }}
              >
                WhatsApp
              </a>
            </div>
          </div>

          {/* Bottom bar */}
          <div
            style={{
              borderTop: `0.5px solid ${C.border}`,
              padding: "20px 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <span style={{ fontSize: "12px", color: C.text3 }}>
              © {new Date().getFullYear()} Vela Dental Design. All rights
              reserved.
            </span>
            <div style={{ display: "flex", gap: "24px" }}>
              {["Privacy Policy", "Terms of Service"].map((item) => (
                <a
                  key={item}
                  href="#"
                  style={{
                    fontSize: "12px",
                    color: C.text3,
                    textDecoration: "none",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = C.text2)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = C.text3)}
                >
                  {item}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
