# Implementation Plan: Marketing Funnel Builder with n8n Integration

**Branch**: `001-marketing-funnel-builder` | **Date**: 2025-10-07 | **Spec**: [spec.md]
**Input**: Feature specification from `/specs/001-marketing-funnel-builder/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This plan outlines the technical implementation for a marketing funnel builder with integrated n8n workflow automation. The core of the project is a Next.js application allowing users to visually construct multi-page funnels. These funnels will trigger n8n workflows based on user interactions, with a focus on providing a seamless, logically isolated multi-tenant experience.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20.x
**Primary Dependencies**: Next.js 15.5, React 19, Tailwind CSS, Supabase, n8n
**Storage**: Supabase (PostgreSQL)
**Authentication**: Supabase Auth
**Testing**: Jest, React Testing Library
**Target Platform**: Modern Web Browsers
**Project Type**: Web Application
**Performance Goals**: Google PageSpeed Insights score of 85+ on mobile; average page load time under 2 seconds for 1,000 concurrent visitors.
**Constraints**: Must meet WCAG 2.1 AA accessibility standards.
**Scale/Scope**: Initial launch to support up to 1,000 concurrent users.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

*(Assuming a default constitution that prioritizes modularity, testing, and clear documentation, no violations are immediately apparent. This section will be filled based on the actual `constitution.md` content.)*

## Project Structure

### Documentation (this feature)

```
specs/001-marketing-funnel-builder/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
# Using existing project structure
src/
├── app/
│   ├── (builder)/
│   │   ├── canvas/
│   │   │   └── page.tsx      # Visual funnel builder UI
│   │   └── templates/
│   │       └── page.tsx      # Funnel template selection UI
│   └── api/                  # Backend API routes for funnels, pages, etc.
├── components/
│   ├── builder/              # Reusable components for the funnel builder
│   └── marketing/            # Marketing-optimized components for funnels (Hero, CTA, etc.)
├── lib/
│   ├── db.ts                 # Database connection and query logic
│   ├── auth.ts               # Authentication logic
│   └── n8n.ts                # n8n integration logic
└── tests/
    ├── integration/
    └── unit/
```

**Structure Decision**: The implementation will follow the existing Next.js app structure. New backend logic will be placed in `src/app/api/`, UI for the builder will be in `src/app/(builder)/`, and shared components will be organized under `src/components/`. Core logic for database, auth, and n8n will be abstracted into `src/lib/`.

## Complexity Tracking

*No violations to justify at this stage.*