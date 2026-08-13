/**
 * Nav glyphs, drawn bare — no plate, ring, or chip behind any of them.
 * All share one 20-unit box and 1.6 stroke so they sit evenly in the rail.
 */
const s = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Glyph({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 20 20" className="size-full" aria-hidden="true">
      {children}
    </svg>
  );
}

export const Icons = {
  overview: (
    <Glyph>
      <path d="M3 10.5 10 4l7 6.5M5 9.5V16h10V9.5" {...s} />
    </Glyph>
  ),
  orders: (
    <Glyph>
      <path d="M5 3h10v14l-2.2-1.6L10.6 17 8.4 15.4 6.2 17 4 15.4V3h1Z" {...s} />
      <path d="M7.5 7h5M7.5 10h3.5" {...s} />
    </Glyph>
  ),
  menu: (
    <Glyph>
      <path d="M3.5 5h13M3.5 10h13M3.5 15h8" {...s} />
    </Glyph>
  ),
  tables: (
    <Glyph>
      <path d="M3 4.5h14M5.5 4.5v11M14.5 4.5v11M8 8h4" {...s} />
    </Glyph>
  ),
  pos: (
    <Glyph>
      <path d="M4 3.5h12v13H4zM7 7h6M7 10h6M7 13h3" {...s} />
    </Glyph>
  ),
  staff: (
    <Glyph>
      <circle cx="7.4" cy="6.6" r="2.6" {...s} />
      <path d="M2.8 16.2c0-2.4 2-4.2 4.6-4.2s4.6 1.8 4.6 4.2" {...s} />
      <path d="M13.4 5.2a2.4 2.4 0 0 1 0 4.6M14.6 12.4c2 .4 3.4 1.9 3.4 3.8" {...s} />
    </Glyph>
  ),
  reports: (
    <Glyph>
      <path d="M3.5 16.5h13M6 16V9M10 16V4.5M14 16v-4" {...s} />
    </Glyph>
  ),
  inventory: (
    <Glyph>
      <path d="M3.5 6.5 10 3l6.5 3.5v7L10 17l-6.5-3.5z" {...s} />
      <path d="M3.5 6.5 10 10l6.5-3.5M10 10v7" {...s} />
    </Glyph>
  ),
  offers: (
    <Glyph>
      <path d="M10.6 3.2 17 9.6l-7.4 7.4L3.2 10.6V3.2z" {...s} />
      <circle cx="7" cy="7" r="1.1" {...s} />
    </Glyph>
  ),
  billing: (
    <Glyph>
      <path d="M2.8 5.5h14.4v9H2.8zM2.8 8.8h14.4M5.5 12h3" {...s} />
    </Glyph>
  ),
  tenants: (
    <Glyph>
      <path d="M3 17V7l5-3 5 3v10M13 17V9.5l4 2V17M2 17h16M6 11h2M6 14h2" {...s} />
    </Glyph>
  ),
  plans: (
    <Glyph>
      <path d="M3.5 4.5h13v11h-13zM3.5 8h13M7.5 11.5h5" {...s} />
    </Glyph>
  ),
  flags: (
    <Glyph>
      <path d="M5 17V3.5M5 4.2h9.5l-2 3 2 3H5" {...s} />
    </Glyph>
  ),
  shop: (
    <Glyph>
      <path d="M3.5 8.5V16a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V8.5" {...s} />
      <path d="M2.6 8.5 4.2 4h11.6l1.6 4.5a2.4 2.4 0 0 1-4.7.6 2.4 2.4 0 0 1-4.7 0 2.4 2.4 0 0 1-4.7-.6Z" {...s} />
      <path d="M8 17v-4h4v4" {...s} />
    </Glyph>
  ),
  branding: (
    <Glyph>
      <path d="M4 16.5c0-1.6 1.1-2.6 2.5-2.6s2.4 1 2.4 2.3c0 1-.8 1.8-2.4 1.8H3.5" {...s} />
      <path d="M8.4 14.2 15.6 5a1.9 1.9 0 0 1 2.7 2.6l-9 7.3" {...s} />
    </Glyph>
  ),
  delivery: (
    <Glyph>
      <path d="M2.4 6.6h7.2v7.2H2.4zM9.6 9.2h3.5l2.5 2.5v2.1H9.6z" {...s} />
      <circle cx="5.6" cy="15.1" r="1.35" {...s} />
      <circle cx="13.3" cy="15.1" r="1.35" {...s} />
    </Glyph>
  ),
  banners: (
    <Glyph>
      <rect x="3.2" y="5.4" width="13.6" height="9.2" rx="2" {...s} />
      <path d="M3.2 12.4 6.8 9.2l3.1 2.7 2.6-2.2 4.3 3.5" {...s} />
      <circle cx="12.9" cy="8.2" r="1.1" {...s} />
    </Glyph>
  ),
  settings: (
    <Glyph>
      <circle cx="10" cy="10" r="2.4" {...s} />
      <path
        d="M10 2.6v1.8M10 15.6v1.8M17.4 10h-1.8M4.4 10H2.6m12.2-5.2-1.3 1.3M6.7 13.3l-1.3 1.3m9.2 0-1.3-1.3M6.7 6.7 5.4 5.4"
        {...s}
      />
    </Glyph>
  ),
  support: (
    <Glyph>
      <circle cx="10" cy="10" r="7" {...s} />
      <path d="M8 8a2 2 0 1 1 2.6 1.9c-.4.2-.6.5-.6.9v.4" {...s} />
      <circle cx="10" cy="14" r="0.7" fill="currentColor" stroke="none" />
    </Glyph>
  ),
};
