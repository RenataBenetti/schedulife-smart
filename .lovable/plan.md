
## Replace Hero Section Dashboard Mock with Real Dashboard UI

The user wants to replace the placeholder/mock dashboard preview in the landing page Hero Section with a realistic representation that matches the actual dashboard UI (as shown in the uploaded screenshot).

### What Needs to Change

The current mock in `src/components/landing/HeroSection.tsx` (lines 84–127) is a generic placeholder with colored dots and skeleton cards. It will be replaced with a faithful HTML/CSS recreation of the real dashboard, including:

- A sidebar with navigation items (Dashboard, Clientes, Agendamentos, etc.)
- A header with "Dashboard" title and user avatar
- 4 stat cards: "Sessões hoje", "Pendentes", "Pagamentos pendentes", "Templates"
- A "Sessões de hoje" table with 2 appointment rows (ZE at 12:00 and Susane at 15:00), both with "Agendado" badges

### Technical Approach

No image upload is needed. The dashboard will be built entirely with HTML/Tailwind CSS inside the existing motion container, matching the real dashboard's visual appearance closely. This gives a crisp, scalable, and always-up-to-date preview.

### Files to Edit

- **`src/components/landing/HeroSection.tsx`**: Replace the `{/* Dashboard preview mock */}` section (lines 84–127) with a detailed, realistic dashboard UI component using Tailwind classes and lucide icons, mirroring the actual dashboard layout.

### Implementation Details

The new preview will include:

**Sidebar (left column):**
- Logo area "Agendix" with calendar icon
- Nav items: Dashboard (active/highlighted), Clientes, Agendamentos, Mensagens, Pagamentos, Configurações

**Main content (right column):**
- Top header bar: "Dashboard / Visão geral do seu dia" + bell icon + user avatar
- 4 stat cards in a grid row
- "Sessões de hoje" card with 2 appointment rows

All content will be static/hardcoded demo data matching what the user shared in the screenshot. The whole thing will be wrapped in a `pointer-events-none select-none` container so it's purely decorative and won't interfere with the page.
