---
name: Fluid Kinetic System
colors:
  surface: '#f6fafc'
  surface-dim: '#d6dbdd'
  surface-bright: '#f6fafc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f4f6'
  surface-container: '#eaeef0'
  surface-container-high: '#e5e9eb'
  surface-container-highest: '#dfe3e5'
  on-surface: '#171c1e'
  on-surface-variant: '#414753'
  inverse-surface: '#2c3133'
  inverse-on-surface: '#edf1f3'
  outline: '#717784'
  outline-variant: '#c1c6d5'
  surface-tint: '#005eb3'
  primary: '#005cae'
  on-primary: '#ffffff'
  primary-container: '#0074da'
  on-primary-container: '#fefcff'
  inverse-primary: '#a7c8ff'
  secondary: '#406089'
  on-secondary: '#ffffff'
  secondary-container: '#b1d1ff'
  on-secondary-container: '#395982'
  tertiary: '#b50063'
  on-tertiary: '#ffffff'
  tertiary-container: '#dd1c7c'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#a7c8ff'
  on-primary-fixed: '#001b3c'
  on-primary-fixed-variant: '#004789'
  secondary-fixed: '#d3e4ff'
  secondary-fixed-dim: '#a9c9f7'
  on-secondary-fixed: '#001c38'
  on-secondary-fixed-variant: '#27486f'
  tertiary-fixed: '#ffd9e3'
  tertiary-fixed-dim: '#ffb0c9'
  on-tertiary-fixed: '#3e001e'
  on-tertiary-fixed-variant: '#8e004c'
  background: '#f6fafc'
  on-background: '#171c1e'
  surface-variant: '#dfe3e5'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 56px
    fontWeight: '800'
    lineHeight: 64px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.025em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-caps:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '800'
    lineHeight: 14px
    letterSpacing: 0.08em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system translates the kinetic energy, fluid hydrodynamics, and disciplined creativity of modern swimming into a sharp, energetic, and clean digital interface. Built for educators, swim academy directors, families, and athletes, the aesthetic balances athletic clarity with playful, expressive innovation. 

The stylistic framework blends **Corporate Modern** rigor with **Vibrant Fluid Skeuomorphism/Glassmorphism** accents:
- **Clean Architectural Clarity:** Pure white canvas surfaces (#FFFFFF) and calm aquatic neutrals (#F4F8FA) ground data-heavy academy portals, rosters, and training schedules.
- **Deep Marine Structure:** Dense, marine tones (#0B3258) evoke depth, focus, and aquatic stability for structural containers, persistent navigation bars, and authoritative typography.
- **Kinetic Accent Points:** Controlled chromatic explosions through electric blues (#047AE4) and energetic magenta-violet gradients represent motion through water, creative breakthroughs, and high-impact actions.
- **Subtle Organic Motifs:** Vector ripples, contour lines, and fluid curves function strictly as ambient atmospheric cues with low opacity (3% to 6%) to maintain legibility and professional execution.

## Colors

The palette organizes itself into deep structural anchors, luminous interactive hues, purposeful semantic indicators, and an expressive gradient signature.

### Color Architecture
- **Primary Vibrancy (`#047AE4`):** The dominant action color. Applied to active buttons, highlighted states, dynamic indicators, and key focus rings.
- **Deep Marine Structure (`#0B3258`):** The institutional anchor. Used for primary typography, persistent sidebars, inverted footers, and high-contrast structural cards.
- **Secondary Aquatic Accent (`#0392EA`):** Used for non-destructive interactive accents, secondary badges, category filters, and aquatic depth transitions.
- **Energy / Accent Magenta (`#D41076`):** Reserved for high-conversion highlights, creative milestones, premium tags, and gradient endpoints.
- **Surface Neutrals (`#FFFFFF`, `#F4F8FA`, `#E2EDF3`):** Strict division between active cards (`#FFFFFF`), baseline page canvas (`#F4F8FA`), and divider/subtle border states (`#E2EDF3`).

### Semantic & Status Tokens
- **Alert / Notice (`#FAC61C`):** High-visibility gold for "EM BREVE", pending approvals, and instructional callouts. Text on this tone must pair with `#0B3258`.
- **Success / Affirmation (`#89B113`):** Vivid aquatic moss green for "ABERTO", "GRATUITO", completed laps, and confirmed enrollments.

### The Kinetic Gradient
- **Energy Mesh Gradient:** `linear-gradient(135deg, #047AE4 0%, #7B2CBF 50%, #D41076 100%)`. Applied sparingly to heroic headlines, special community cards ("Cardume Criativo"), and primary CTA banner backgrounds. Never use behind raw body text.

## Typography

Typography pairs geometric momentum with technical reading clarity:

- **Primary Display & Headings (Plus Jakarta Sans):** Crafted with geometric proportions and subtle rounded warmth, evoking forward motion and accessibility. Large weights (Bold 700, ExtraBold 800) bring athletic impact without appearing aggressive. Tight letter tracking (`-0.02em` to `-0.03em`) creates unified, cohesive header lockups.
- **Body & Data Layer (Inter):** Maximizes readability across all digital viewports, particularly for dense lesson plans, analytical lap times, attendance tables, and methodology guides. Fixed at a 16px baseline for standard body text.
- **Labels & Micro-Copy (Plus Jakarta Sans Bold / Caps):** Rendered with deliberate uppercase letter spacing (`letter-spacing: 0.04em - 0.08em`) to guarantee quick peripheral scannability on badges, telemetry tags, and table headers.

## Layout & Spacing

The layout is built upon an 8pt rhythmic grid system designed to simulate breathable, fluid open spaces—counteracting visual clutter in information-heavy coaching environments.

### Grid Breakpoints & Behavior
- **Desktop (1024px and above):** 12-column responsive fluid grid with `2.5rem` outer margins and `1.5rem` gutters. Content is constrained to a maximum width of `1280px` for editorial reading zones, while dashboards leverage full-width fluid layouts with persistent side navigation.
- **Tablet (768px – 1023px):** 8-column layout with `1.5rem` margins and `1rem` gutters. Dashboard sidebars transition to a compact, icon-only rail or an off-canvas drawer.
- **Mobile (Below 768px):** 4-column layout with `1rem` margin and `1rem` gutter. Complex tabular data wraps into segmented swipe cards, and buttons stretch to 100% component widths within safe zones.

### Vertical Spacing Cadence
- Content modules within standard layouts utilize `space-xl` (40px) vertical separation.
- Card interiors rely on `space-md` (16px) or `space-lg` (24px) padding depending on layout tier to maintain a clean aesthetic balance.

## Elevation & Depth

Visual hierarchy adopts a clean, hydro-inspired depth model using layered white/neutral planes, frosted glass overlays, and low-opacity indigo ambient shadows rather than harsh monochrome drop shadows.

### Surface Tiers
- **Canvas Base (Level 0):** `#F4F8FA`. The foundational waterbed surface for all pages.
- **Elevated White Plats (Level 1):** `#FFFFFF` surfaces with subtle border borders (`1px solid #E2EDF3`) and an ultra-diffused atmospheric shadow (`0 2px 10px rgba(11, 50, 88, 0.04)`).
- **Floating Overlays & Dropdowns (Level 2):** `#FFFFFF` surfaces with deeper ambient diffusion (`0 10px 24px -4px rgba(11, 50, 88, 0.08), 0 4px 8px -2px rgba(11, 50, 88, 0.03)`).
- **Interactive Modals & Sheets (Level 3):** Grounded by a backdrop scrim tinted with `#0B3258` at 40% opacity and `blur(4px)`. Modal cards sit with `0 20px 40px -8px rgba(11, 50, 88, 0.16)`.

### Frosted Fluid Layers
When cards float over photographic water imagery or kinetic gradients, apply backdrop-filtered glass: `background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.6)`.

## Shapes

The shape system expresses fluid ergonomics. Rigid 90-degree corners are avoided to reinforce organic flow and safety, mirroring water droplets and ergonomic sports equipment.

- **Baseline Components (8px / `rounded-md`):** Checkboxes, form inputs, segmented control segments, and compact table cells.
- **Standard Surfaces (16px / `rounded-lg`):** Cards, modal sheets, standard buttons, and alert callouts.
- **Large Kinetic Enclosures (24px / `rounded-xl`):** Hero cards, prominent banners, featured community tiles, and floating dashboards.
- **Fully Rounded Elements (9999px / `rounded-full`):** Category chips, numeric counter pills, status badges ("ABERTO", "EM BREVE"), and floating icon buttons.

## Components

### Buttons
- **Primary Action:** Solid `#047AE4` background, `#FFFFFF` text, `rounded-lg` (16px), medium-bold font (`label-lg`). Hover shifts to `#036ac7` with smooth ease; active state scales subtly down (`scale(0.98)`).
- **Kinetic Accent / Hero CTA:** Background set to the characteristic gradient (`135deg, #047AE4, #7B2CBF, #D41076`), crisp `#FFFFFF` text. Used exclusively for primary subscription conversions and community breakthroughs ("Cardume Criativo").
- **Secondary Outlined:** Border `1.5px solid #047AE4`, background transparent, text `#047AE4`. Hover fills with `rgba(4, 122, 228, 0.06)`.
- **Ghost Marine:** Transparent background, `#0B3258` text, hover reveals subtle `#E2EDF3` tone.

### Status Badges & Chips
- **Status "ABERTO" / "GRATUITO":** Background `#89B113` with `#FFFFFF` text or soft badge variant (`rgba(137, 177, 19, 0.12)` background with `#587309` text), fully rounded pill shape (`rounded-full`), `label-caps` typography.
- **Status "EM BREVE":** Background `#FAC61C` with `#0B3258` text. High contrast, immediate scan factor.
- **Interactive Chips / Category Filters:** Height 36px, `rounded-full`, base state `#FFFFFF` with `#E2EDF3` border and `#0B3258` text. Selected state triggers solid `#0B3258` or `#047AE4` fill with `#FFFFFF` text.

### Navigation: Deep Marine Sidebar
- **Background:** `#0B3258` deep marine fill.
- **Active Navigation Item:** Highlighted with `#047AE4` background or `#0392EA` left-border accent bar (3px width) paired with a high-contrast white text label.
- **Inactive Item:** Crisp, muted light marine tone (`rgba(255, 255, 255, 0.70)`), shifting to 100% pure white on hover.
- **Collapsible State:** Compresses to an icon-only dock displaying centered iconography paired with immediate hover tooltips.

### Input Fields & Controls
- **Form Inputs:** Height 48px, background `#FFFFFF`, border `1px solid #CFDEE5`, `rounded-md` (8px), text color `#0B3258`.
- **Focus State:** 2px ring `#047AE4` with border tint `#047AE4`.
- **Checkboxes & Radios:** 20px dimensions, `rounded` (checkbox 6px, radio 50%). Checked state displays solid `#047AE4` fill with pure white checkmark icon.

### Cards & Structured Surfaces
- **Base Metric / Methodology Card:** `#FFFFFF` background, `rounded-lg` (16px), `1px solid #E2EDF3` border. Header row pairs an icon in `#0392EA` inside a circular soft-tone container with an aligned status pill.
- **Featured "Cardume Criativo" Showcase Card:** Rich, inverted `#0B3258` background with an atmospheric 1px gradient border running `#047AE4` to `#D41076`. Elevated kinetic typography over an organic fluid backdrop asset.