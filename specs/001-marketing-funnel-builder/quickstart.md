# Quickstart: Marketing Funnel Builder

This document provides a brief guide to getting started with the Marketing Funnel Builder feature.

## Prerequisites

- Node.js 20.x
- Access to a Supabase project
- n8n instance for workflow automation

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Configure Environment Variables**:
    Create a `.env.local` file and add your Supabase project URL and anon key:
    ```
    NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
    ```
    You will also need to add environment variables for connecting to your n8n instance.

3.  **Run the Application**:
    ```bash
    npm run dev
    ```

## Key Components

-   **Funnel Builder UI**: Navigate to `/builder/canvas` to access the visual funnel builder.
-   **API Endpoints**: The core API for managing funnels, pages, and components is located in `src/app/api/`. The API is documented in `specs/001-marketing-funnel-builder/contracts/openapi.yaml`.
-   **Database Model**: The data model is defined in `specs/001-marketing-funnel-builder/data-model.md`. You will need to create the corresponding tables in your Supabase project.
-   **Authentication**: Authentication is handled by Supabase Auth. The logic is located in `src/lib/auth.ts`.

## Development Workflow

1.  **Implement UI Components**: Create new components for the funnel builder in `src/components/builder/` and marketing components in `src/components/marketing/`.
2.  **Build API Routes**: Implement the API routes in `src/app/api/` to handle CRUD operations for the data models.
3.  **Integrate with Supabase**: Use the Supabase client in `src/lib/db.ts` to interact with the database.
4.  **Connect to n8n**: Implement the n8n integration logic in `src/lib/n8n.ts` to manage workflows.
5.  **Write Tests**: Add unit and integration tests for new components and API routes in the `src/tests/` directory.