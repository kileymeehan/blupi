# Blupi Design Platform - Design Guidelines

## Design Approach
**Reference-Based with Design System Foundation**: Drawing inspiration from Linear's precision, Figma's collaborative interface, and Notion's workspace clarity. Modern SaaS aesthetic prioritizing productivity without sacrificing visual appeal.

## Typography System
- **Primary Font**: Inter (Google Fonts) - crisp, professional, excellent at small sizes
- **Display/Headings**: Inter 600-700, 48px hero, 32px section headers, 24px subsections
- **Body Text**: Inter 400-500, 16px base, 14px secondary content
- **UI Elements**: Inter 500, 14px buttons/labels, 12px captions
- **Code/Technical**: Fira Code for any code snippets or technical displays

## Layout & Spacing System
**Tailwind Units**: Standardize on 4, 6, 8, 12, 16, 24 for consistent rhythm
- Section padding: py-24 desktop, py-16 mobile
- Component spacing: gap-8 for grids, gap-6 for lists
- Container: max-w-7xl with px-6 margins
- Card padding: p-6 or p-8 for feature cards

## Component Library

**Navigation**: Top bar with logo left, product links center, "Sign In" + "Start Free Trial" (primary CTA) right. Sticky on scroll with subtle shadow.

**Hero Section** (100vh): Split layout - left 50% bold headline + subheadline + dual CTAs ("Start Creating" primary, "Watch Demo" secondary with play icon), right 50% large hero image showing platform interface in action. Buttons with backdrop-blur-lg over image areas.

**Feature Showcase**: Three-column grid (grid-cols-1 md:grid-cols-3) with icon cards - each featuring large icon top, bold title, 2-line description. Icons from Heroicons outline set.

**Real-Time Collaboration Section**: Two-column split - left shows animated mockup/screenshot of live cursors and comments, right has feature list with checkmarks and descriptions. Asymmetric layout (40/60 split).

**AI Storyboard Generator**: Full-width demonstration with before/after slider interaction. Show input on left, AI-generated storyboard grid on right. Include "Try AI Generator" CTA.

**Workspace Dashboard Preview**: Large screenshot/mockup showing clean project organization, folder structure, and team member avatars. Caption highlighting multi-tenant capabilities underneath.

**Pricing Table**: Three-column comparison (Starter/Professional/Enterprise) with feature checkboxes, pricing emphasis, and contrasting CTA buttons.

**Testimonials**: Two-column grid with customer quotes, company logos, headshot photos, name/title. 4-6 testimonials total.

**Footer**: Rich footer with five columns - Product links, Company, Resources, Legal, Newsletter signup form. Social icons bottom right.

## Images Section
1. **Hero Image** (Right 50% of hero): Modern dashboard screenshot showing Blupi's interface with multiple users collaborating - visible cursor trails, comment bubbles, active design canvas. Clean, bright, professional aesthetic.

2. **Collaboration Feature**: Screenshot showing real-time cursors from 3-4 team members, inline comments, and version history sidebar.

3. **AI Storyboard Demo**: Split image - simple sketch input transforming into polished multi-panel storyboard with AI enhancement indicators.

4. **Dashboard Preview**: Full workspace view with organized projects, team member presence indicators, and clean file structure.

5. **Customer Logos**: 8-12 recognizable brand logos in testimonial section (grayscale, uniform sizing).

6. **Team Photos**: Authentic headshots for testimonials (circular crop, consistent sizing).

## Interaction Patterns
- Smooth scroll-to-section navigation
- Hover lift on feature cards (translate-y-1)
- CTA buttons: No custom states needed - standard button component handles all contexts
- Subtle fade-in animations on scroll for feature sections (single use, hero only)
- Image zoom on hover for dashboard previews (scale-105 transform)

## Responsive Strategy
- Mobile: Stack all columns, full-width hero image below headline, reduce section padding to py-12
- Tablet: Two-column layouts where applicable, maintain visual hierarchy
- Desktop: Full multi-column grids, maximize horizontal space for dashboard previews

**Key Principle**: Every section serves productivity narrative - showcasing collaboration, AI capabilities, and workspace organization with professional polish.