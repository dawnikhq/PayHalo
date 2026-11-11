import type { SVGProps } from "react";

const base = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export type IconProps = SVGProps<SVGSVGElement>;

export const IconDashboard = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
  </svg>
);

export const IconAssets = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 12h13" />
    <path d="M13 6l6 6-6 6" />
  </svg>
);

export const IconBeneficiaries = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="3.2" />
  </svg>
);

export const IconPlan = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="4.5" y="3.5" width="15" height="17" rx="3" />
    <path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4" />
  </svg>
);

export const IconDocuments = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M6 3.5h7l5 5v12a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 20.5v-15A2 2 0 0 1 6 3.5Z" />
    <path d="M13 3.5V9h5" />
  </svg>
);

export const IconActivity = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M3 12h4l2.5-6 4 12L16 12h5" />
  </svg>
);

export const IconShield = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 8v5" />
    <circle cx="12" cy="16" r="0.6" fill="currentColor" />
  </svg>
);

export const IconHelp = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .9-1 1.6" />
    <circle cx="12" cy="16.4" r="0.6" fill="currentColor" />
  </svg>
);

export const IconMenu = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const IconClose = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const IconArrow = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M5 12h13" />
    <path d="M13 6.5l5.5 5.5-5.5 5.5" />
  </svg>
);

export const IconPlus = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconLogout = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M15 5.5H7.5A2.5 2.5 0 0 0 5 8v8a2.5 2.5 0 0 0 2.5 2.5H15" />
    <path d="M13 12h8m-3-3l3 3-3 3" />
  </svg>
);

export const IconWallet = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H18a2 2 0 0 1 2 2v1" />
    <rect x="3" y="9" width="18" height="10" rx="2.5" />
    <path d="M16 14h2" />
  </svg>
);

export const IconSend = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M20 4L4 10.5l6 2.5 2.5 6L20 4z" />
    <path d="M10 13l4-4" />
  </svg>
);

export const IconReceive = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 4v11" />
    <path d="M7.5 10.5L12 15l4.5-4.5" />
    <path d="M5 19h14" />
  </svg>
);

export const IconSwap = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 8h13" />
    <path d="M14 5l3 3-3 3" />
    <path d="M20 16H7" />
    <path d="M10 13l-3 3 3 3" />
  </svg>
);
