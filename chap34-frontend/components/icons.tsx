type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconSparkles({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3.5 13.4 8.6 18.5 10 13.4 11.4 12 16.5 10.6 11.4 5.5 10 10.6 8.6 12 3.5Z" />
      <path d="M19 15.5 19.6 17.4 21.5 18 19.6 18.6 19 20.5 18.4 18.6 16.5 18 18.4 17.4 19 15.5Z" />
    </svg>
  );
}

export function IconUpload({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 15.5V4" />
      <path d="M7.5 8.5 12 4l4.5 4.5" />
      <path d="M4.5 15v3a2.5 2.5 0 0 0 2.5 2.5h10a2.5 2.5 0 0 0 2.5-2.5v-3" />
    </svg>
  );
}

export function IconCheck({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.3 10.8 14.6 15.5 9.6" />
    </svg>
  );
}

export function IconDownload({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 4v11.5" />
      <path d="M7.5 11 12 15.5 16.5 11" />
      <path d="M4.5 16.5v2a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

export function IconSun({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" />
    </svg>
  );
}

export function IconPosture({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <circle cx="12" cy="10" r="2.6" />
      <path d="M8 17c0-2.4 1.8-4 4-4s4 1.6 4 4" />
    </svg>
  );
}

export function IconDistance({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="7" width="8.5" height="6.5" rx="1.4" />
      <path d="M11.5 8.7 14 7v6.5l-2.5-1.7" />
      <path d="M16 10.25h4.5M19 8.5l1.5 1.75L19 12" />
    </svg>
  );
}

export function IconBackground({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3.5" y="3.5" width="12" height="12" rx="2.5" strokeDasharray="2.5 2.5" />
      <rect x="8.5" y="8.5" width="12" height="12" rx="2.5" fill="none" />
    </svg>
  );
}

export function IconFrame({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 8V4.5h3.5" />
      <path d="M20 8V4.5h-3.5" />
      <path d="M4 16v3.5h3.5" />
      <path d="M20 16v3.5h-3.5" />
      <rect x="8" y="8" width="8" height="8" rx="1.2" />
    </svg>
  );
}

export function IconIdCard({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="5.5" width="18" height="13" rx="2.2" />
      <circle cx="8.5" cy="11" r="1.9" />
      <path d="M5.7 15.3c.4-1.5 1.5-2.3 2.8-2.3s2.4.8 2.8 2.3" />
      <path d="M14 9.5h4.2M14 12.5h4.2M14 15.5h2.6" />
    </svg>
  );
}

export function IconPrinter({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M7 8.5V4.5h10v4" />
      <rect x="4" y="8.5" width="16" height="7" rx="1.8" />
      <path d="M7 15v4.5h10V15" />
      <path d="M7.5 11.5h0.01" />
    </svg>
  );
}

export function IconPlay({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M10.3 9v6l5-3-5-3Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconShield({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3.3 19 6v5.2c0 4.2-2.9 7.4-7 8.5-4.1-1.1-7-4.3-7-8.5V6l7-2.7Z" />
      <path d="M9 12.1 11.1 14.2 15.3 10" />
    </svg>
  );
}

export function IconTruck({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3.5 7.5h10v8h-10z" />
      <path d="M13.5 10.5h3.3L19.5 13v2.5h-6z" />
      <circle cx="7" cy="17" r="1.6" />
      <circle cx="16.5" cy="17" r="1.6" />
    </svg>
  );
}

export function IconAward({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="9" r="5.3" />
      <path d="M9 13.5 8 20.5l4-2 4 2-1-7" />
    </svg>
  );
}

export function IconInstagram({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17" cy="7" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconTelegram({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3.8 12.4 20 4.2 17 20l-5.3-4-2.6 2.4v-3.8l8.4-8.3-10.4 6.9-3.3-1Z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconWhatsapp({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6.5 17.5 4 20l2.6-.7A8 8 0 1 0 4 12a7.9 7.9 0 0 0 1.2 4.2Z" />
      <path d="M9 9.8c0 3.2 2.6 5.6 5.6 5.6.9 0 1.1-.6 1-1.2-.1-.4-.7-.9-1-1.1-.3-.2-.5-.1-.8.1l-.5.4c-.7-.3-1.6-1.1-1.9-1.9l.4-.5c.2-.3.3-.5.1-.8-.1-.3-.6-.9-1-1-.5-.2-1 0-1 .9Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
