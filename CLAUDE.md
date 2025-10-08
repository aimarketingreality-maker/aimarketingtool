# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI Marketing Tool built with Next.js 15, React 19, and Tailwind CSS. The project appears to be a marketing funnel builder with visual editing capabilities. It uses TypeScript throughout and includes Storybook for component development.

## Development Commands

- `npm run dev` - Start development server with Turbopack (http://localhost:3000)
- `npm run build` - Build production application with Turbopack
- `npm run start` - Start production server
- `npm run lint` - Run ESLint for code quality checks

## Project Architecture

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **UI**: React 19, Tailwind CSS v4, Framer Motion
- **Type Safety**: TypeScript with strict mode
- **Testing**: Jest with React Testing Library
- **Component Development**: Storybook
- **Build Tool**: Turbopack

### File Structure
```
src/
├── app/
│   ├── layout.tsx          # Root layout with Geist fonts
│   ├── page.tsx           # Home page (default Next.js starter)
│   ├── globals.css        # Global styles with Tailwind v4
│   └── (builder)/         # Route group for builder functionality
│       ├── templates/     # Templates selection page
│       └── canvas/        # Visual editing canvas
├── lib/
│   └── theme.ts           # Design system with colors, spacing, presets
└── components/
    └── builder/
        └── VisualBuilder.tsx  # Main visual builder component
```

### Design System

The project uses a centralized theme system in `src/lib/theme.ts`:

- **Colors**: Dark theme focused (gray backgrounds, yellow accents)
- **Spacing**: Consistent padding/margin utilities
- **Presets**: Pre-defined combinations for common layouts

### Key Architectural Patterns

1. **Route Groups**: Uses Next.js route groups `(builder)` to organize related pages without affecting URL structure
2. **Path Aliases**: Configured with `@/*` pointing to `./src/*`
3. **Theme Integration**: Components import theme utilities from `@/lib/theme`
4. **Component-First**: Visual builder functionality is encapsulated in reusable components

## Development Notes

- Uses Tailwind CSS v4 with PostCSS integration
- ESLint configuration extends Next.js core web vitals and TypeScript rules
- No test files exist yet, but Jest and React Testing Library are configured
- Storybook is available for component development
- The project appears to be in early development with basic page structures in place