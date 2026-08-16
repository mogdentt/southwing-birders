import React from "react"

type P = { size?: number; className?: string }
const S = ({ size = 24, className, children, viewBox = "0 0 24 24" }: P & { children: React.ReactNode; viewBox?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox={viewBox}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
)

export const IconHome = (p: P) => (
  <S {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
    <path d="M9.5 21v-6h5v6" />
  </S>
)

export const IconBook = (p: P) => (
  <S {...p}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14z" />
    <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
    <path d="M9 7.5h7M9 11h5" />
  </S>
)

export const IconMap = (p: P) => (
  <S {...p}>
    <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.6" />
  </S>
)

export const IconFeather = (p: P) => (
  <S {...p}>
    <path d="M20.2 3.8c-3.2-3.2-9-1.6-11.6 1S5 12 5 12s-1 5.4 0 7c0 0 5.6.4 7.2-3.6s11.2-8.4 8-11.6z" />
    <path d="M16 8 4 20M14 6l1 5 5 1" />
  </S>
)

export const IconPlus = (p: P) => (
  <S {...p}>
    <path d="M12 5v14M5 12h14" />
  </S>
)

export const IconSearch = (p: P) => (
  <S {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </S>
)

export const IconCheck = (p: P) => (
  <S {...p}>
    <path d="m4.5 12.5 5 5 10-11" />
  </S>
)

export const IconFlame = (p: P) => (
  <S {...p}>
    <path d="M12 22c4.4 0 7-2.8 7-6.7 0-3.3-2.1-5.4-3.7-7.2C13.9 6.5 13 4.6 13 2c-3.5 2-5 5-4.6 7.6.2 1.4-1 1.6-1.7.6-.3-.5-.5-1.2-.5-2C4.6 9.7 4 11.5 4 13.7 4 19.2 7.6 22 12 22z" />
  </S>
)

export const IconBinoculars = (p: P) => (
  <S {...p}>
    <circle cx="6.5" cy="16.5" r="3.5" />
    <circle cx="17.5" cy="16.5" r="3.5" />
    <path d="M10 16V6a2 2 0 0 0-4 0v7M14 16V6a2 2 0 0 1 4 0v7M10 9h4" />
  </S>
)

export const IconTarget = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="0.5" />
  </S>
)

export const IconBell = (p: P) => (
  <S {...p}>
    <path d="M18 9a6 6 0 0 0-12 0c0 6-2.5 7-2.5 7h17S18 15 18 9z" />
    <path d="M10 20a2.2 2.2 0 0 0 4 0" />
  </S>
)

export const IconSettings = (p: P) => (
  <S {...p}>
    <path d="M4 8h10M18 8h2M4 16h4M12 16h8" />
    <circle cx="16" cy="8" r="2.2" />
    <circle cx="10" cy="16" r="2.2" />
  </S>
)

export const IconBack = (p: P) => (
  <S {...p}>
    <path d="M15 5.5 8.5 12l6.5 6.5" />
  </S>
)

export const IconDownload = (p: P) => (
  <S {...p}>
    <path d="M12 4v11M7.5 11 12 15.5 16.5 11" />
    <path d="M4.5 19.5h15" />
  </S>
)

export const IconUpload = (p: P) => (
  <S {...p}>
    <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" />
    <path d="M4.5 19.5h15" />
  </S>
)

export const IconLocate = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="7" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    <circle cx="12" cy="12" r="1" />
  </S>
)

export const IconStop = (p: P) => (
  <S {...p}>
    <rect x="6" y="6" width="12" height="12" rx="2.5" />
  </S>
)

export const IconTrash = (p: P) => (
  <S {...p}>
    <path d="M4.5 6.5h15M9 6V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V6M6.5 6.5 7.5 21h9l1-14.5" />
  </S>
)

export const IconExternal = (p: P) => (
  <S {...p}>
    <path d="M14 4h6v6M20 4 11 13" />
    <path d="M19 14v6H5V5h6" />
  </S>
)

export const IconX = (p: P) => (
  <S {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </S>
)

export const IconClock = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5.2l3.4 2" />
  </S>
)

export const IconTrophy = (p: P) => (
  <S {...p}>
    <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
    <path d="M7 6H4.5a0 0 0 0 0 0 0c0 3 1.5 4.7 2.9 5M17 6h2.5c0 3-1.5 4.7-2.9 5" />
    <path d="M12 14v3.5M8.5 21h7M10 18h4l1 3h-6z" />
  </S>
)

export const IconQuiz = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.3 9.2A2.8 2.8 0 0 1 12 7c1.6 0 2.9 1.1 2.9 2.5 0 1.9-2.9 2.1-2.9 4" />
    <circle cx="12" cy="17" r="0.4" />
  </S>
)

/* ── Fantail logo ── */
export const Logo = ({ size = 34 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <circle cx="24" cy="24" r="23" fill="var(--green-deep, #123B2D)" />
    <g fill="#F2E7C9">
      {/* fanned tail */}
      <path d="M24.5 26.5 8 14.5c-1.8 4.5-1.4 8.2-.3 11l16 3z" opacity="0.55" />
      <path d="M24.5 27 7.5 25.2c.4 4.6 2.3 7.6 4.3 9.4L25 29.5z" opacity="0.75" />
      <path d="M25 27.5 11.5 35c2.8 3.2 6.3 4.4 9 4.6l6-10z" opacity="0.9" />
      {/* body */}
      <path d="M22.5 30.5c0-4.5 3.4-7.6 7.4-7.6 2.6 0 4.6 1.1 5.9 2.9l4.3-.4-2.9 3c.2.7.3 1.5.3 2.3 0 4.7-3.6 8.3-8.3 8.3-4.2 0-6.7-3.6-6.7-8.5z" />
    </g>
    <circle cx="32.6" cy="26.9" r="1.15" fill="#123B2D" />
  </svg>
)

/* ── Bird silhouettes for photo fallbacks, by group ── */
export function GroupSilhouette({ group }: { group: string }) {
  const fill = "currentColor"
  switch (group) {
    case "Wetland & lake":
      return (
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <g fill={fill}>
            <ellipse cx="22" cy="30" rx="14" ry="7.5" />
            <path d="M31 26c1.5-3 1.8-6 1.6-8.5l-4 1.5c.5 2.5 1 5 2.4 7z" />
            <circle cx="31.6" cy="15.5" r="4.2" />
            <path d="M35 14.2l7 1.6-6.8 2z" />
            <path d="M8 30l-5-2c1 3.5 3 5.5 5.5 6.5z" />
          </g>
        </svg>
      )
    case "Estuary & shore":
      return (
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <g fill={fill}>
            <ellipse cx="22" cy="21" rx="10" ry="6" />
            <circle cx="30.5" cy="12.5" r="3.4" />
            <path d="M33.4 11.4 44 13l-10.4 1.8z" />
            <path d="M13 20l-6-3.5c.6 3.4 2.4 5.6 4.8 6.8z" />
            <path d="M19.5 27l-1 12M18.5 39h-3M25 27l-.5 12M24.5 39h-3" stroke={fill} strokeWidth="1.7" strokeLinecap="round" fill="none" />
          </g>
        </svg>
      )
    case "Coast & sea":
      return (
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <path
            fill={fill}
            d="M2 26c5.5-7 12.5-9 22-4.5C33.5 17 40.5 19 46 26c-5.5-2.5-10.5-2-14 .5l-3.5 3-4.5-3C20.5 24 15.5 23.5 10 26l-8 .1z"
          />
        </svg>
      )
    case "Open country":
      return (
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <g fill={fill}>
            <ellipse cx="23" cy="27" rx="12" ry="8.5" />
            <circle cx="32" cy="16.5" r="4" />
            <path d="M35.4 15.6l5.6 1.5-5.4 1.6z" />
            <path d="M31 12.7c.4-2 .2-3.6-.4-5 2 .6 3.3 1.9 3.8 3.9z" />
            <path d="M12 24l-7-1c1.5 3 4 4.6 6.6 5.2z" />
            <path d="M20 35.5l-.5 6M26 35.5l.5 6" stroke={fill} strokeWidth="1.8" strokeLinecap="round" fill="none" />
          </g>
        </svg>
      )
    default: // Bush & garden
      return (
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <g fill={fill}>
            <ellipse cx="20" cy="24" rx="10.5" ry="7" />
            <circle cx="29" cy="15" r="4.2" />
            <path d="M32.8 14 40 15.8l-7 1.7z" />
            <path d="M11 22 2 15l4 9.5L2.5 32z" />
            <path d="M18 30.5l-1 7.5M17 38h-3M24 30.5l.5 7.5M24.5 38h-3" stroke={fill} strokeWidth="1.7" strokeLinecap="round" fill="none" />
          </g>
        </svg>
      )
  }
}
