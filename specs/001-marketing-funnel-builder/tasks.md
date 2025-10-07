# Tasks: Marketing Funnel Builder with n8n Integration

**Input**: Design documents from `/specs/001-marketing-funnel-builder/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests were not explicitly requested and are not included in this task list.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- Paths are relative to the project root.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure.

- [ ] T001 [P] Install Supabase and n8n client libraries: `npm install @supabase/supabase-js n8n-client`
- [ ] T002 [P] Create `.env.local` file and add Supabase/n8n credentials as defined in `quickstart.md`.
- [ ] T003 [P] Configure linting and formatting tools (ESLint, Prettier) if not already done.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T004 [P] Set up Supabase project and create the database schema based on `data-model.md`. Save the schema setup script to `db/schema.sql`.
- [ ] T005 [P] Implement Supabase client initialization in `src/lib/db.ts`.
- [ ] T006 Implement user authentication using Supabase Auth. Create authentication logic in `src/lib/auth.ts` and wrap the application with an auth provider.
- [ ] T007 Implement basic n8n client and API communication layer in `src/lib/n8n.ts`. This should include functions for listing and triggering workflows.
- [ ] T008 Create the basic layout for the builder interface in `src/app/(builder)/layout.tsx`.

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Marketer Creates and Launches a Lead Magnet Funnel (Priority: P1) 🎯 MVP

**Goal**: A marketer can select a template, customize a lead magnet funnel, connect it to a Mailchimp workflow, and publish it.

**Independent Test**: A user can create a funnel, and a form submission on the live page correctly adds a contact to a Mailchimp list.

### Implementation for User Story 1

- [x] T009 [P] [US1] Implement API route `GET /api/funnels` in `src/app/api/funnels/route.ts` to list funnels for the authenticated user.
- [x] T010 [P] [US1] Implement API route `POST /api/funnels` in `src/app/api/funnels/route.ts` to create a new funnel.
- [x] T011 [P] [US1] Implement API routes for pages (`GET /api/funnels/{funnelId}/pages`, `POST /api/funnels/{funnelId}/pages`) in `src/app/api/funnels/[funnelId]/pages/route.ts`.
- [x] T012 [P] [US1] Implement API routes for components (`GET /api/pages/{pageId}/components`, `POST /api/pages/{pageId}/components`) in `src/app/api/pages/[pageId]/components/route.ts`.
- [ ] T013 [US1] Create the funnel template selection UI in `src/app/(builder)/templates/page.tsx`. This should allow users to select the "Lead Magnet Funnel" template.
- [ ] T014 [US1] Create the main canvas UI for the visual funnel builder in `src/app/(builder)/canvas/page.tsx`. This will be the main drag-and-drop interface.
- [ ] T015 [P] [US1] Create the "Hero Section" marketing component in `src/components/marketing/HeroSection.tsx`.
- [ ] T016 [P] [US1] Create the "Opt-in Form" marketing component in `src/components/marketing/OptInForm.tsx`.
- [ ] T017 [US1] Implement the drag-and-drop functionality in the canvas UI to add and reorder components.
- [ ] T018 [US1] Implement the UI for connecting the opt-in form to a pre-built n8n workflow for Mailchimp.
- [ ] T019 [US1] Implement the logic to publish a funnel, making it accessible via a public URL.

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Entrepreneur Sells a Product with a Sales Funnel (Priority: P2)

**Goal**: An entrepreneur can create a sales funnel, connect a payment button to Stripe, and trigger an automation upon successful payment.

**Independent Test**: A test purchase made through the sales funnel correctly processes a payment and triggers the specified n8n workflow.

### Implementation for User Story 2

- [ ] T020 [P] [US2] Create the "Payment Button" marketing component in `src/components/marketing/PaymentButton.tsx`.
- [ ] T021 [US2] Add the "Product Sales Funnel" to the template selection UI in `src/app/(builder)/templates/page.tsx`.
- [ ] T022 [US2] Implement the UI for configuring the payment button with Stripe details and a product price.
- [ ] T023 [US2] Create a new API route (e.g., `/api/payments/stripe/create-checkout-session`) to handle the creation of Stripe checkout sessions.
- [ ] T024 [US2] Implement a webhook handler (`/api/webhooks/stripe`) to listen for successful payments from Stripe.
- [ ] T025 [US2] In the webhook handler, trigger the appropriate n8n workflow to grant course access and send a confirmation email.

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently.

---

## Phase 5: User Story 3 - Marketer Customizes an n8n Workflow (Priority: P3)

**Goal**: A marketer can open a simplified n8n workflow editor from within the app and customize a workflow.

**Independent Test**: A user can add a new node (e.g., a Slack notification) to an existing workflow, and triggering the funnel action correctly executes the modified workflow.

### Implementation for User Story 3

- [ ] T026 [US3] Design and implement a simplified UI for workflow customization. This will be a subset of the full n8n editor, focusing on adding and configuring nodes. This will live in a new route, e.g., `/builder/workflows/{workflowId}`.
- [ ] T027 [US3] Use the n8n REST API (via the client in `src/lib/n8n.ts`) to fetch the workflow definition for editing.
- [ ] T028 [US3] Implement the UI for adding a "Slack" node to the workflow.
- [ ] T029 [US3] Use the n8n REST API to save the modified workflow definition.

**Checkpoint**: All user stories should now be independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories.

- [ ] T030 [P] Implement responsive design improvements across all components and pages.
- [ ] T031 [P] Perform accessibility audit (WCAG 2.1 AA) and fix any issues.
- [ ] T032 Implement error handling and user feedback for failed workflow executions.
- [ ] T033 [P] Add loading states and skeletons to improve perceived performance.
- [ ] T034 Validate all steps in `quickstart.md` to ensure it is accurate.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup. Blocks all user stories.
- **User Stories (Phases 3-5)**: Depend on Foundational.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational.
- **User Story 2 (P2)**: Can start after Foundational.
- **User Story 3 (P3)**: Can start after Foundational.

### Parallel Opportunities

- All tasks marked `[P]` can be run in parallel within their respective phases.
- Once the Foundational phase is complete, work on all three User Stories can begin in parallel by different developers.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1.  Complete Phase 1: Setup
2.  Complete Phase 2: Foundational
3.  Complete Phase 3: User Story 1
4.  **STOP and VALIDATE**: Test User Story 1 independently.
5.  Deploy/demo if ready.

### Incremental Delivery

1.  Complete Setup + Foundational.
2.  Add User Story 1 → Test independently → Deploy/Demo (MVP!).
3.  Add User Story 2 → Test independently → Deploy/Demo.
4.  Add User Story 3 → Test independently → Deploy/Demo.