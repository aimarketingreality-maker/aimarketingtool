---
description: "Task list for Marketing Funnel Builder feature implementation"
---

# Tasks: Marketing Funnel Builder with n8n Integration

**Input**: Design documents from `/specs/001-marketing-funnel-builder/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL based on spec.md - not explicitly requested in user stories

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- Paths shown below assume single project - adjust based on plan.md structure

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 [P] Install Supabase and n8n client libraries: `npm install @supabase/supabase-js n8n-client @supabase/auth-helpers-nextjs`
- [x] T002 [P] Create `.env.local` file and add Supabase/n8n credentials as defined in `quickstart.md`
- [x] T003 [P] Configure TypeScript types for Supabase in src/lib/db.ts
- [x] T004 [P] Configure linting and formatting tools (ESLint, Prettier) if not already done

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 [P] Set up Supabase project and create the database schema based on `data-model.md`. Save the schema setup script to `db/schema.sql`
- [x] T006 [P] Implement Supabase client initialization in `src/lib/db.ts`
- [x] T007 Implement user authentication using Supabase Auth. Create authentication logic in `src/lib/auth.ts` and wrap the application with an auth provider
- [x] T008 Implement basic n8n client and API communication layer in `src/lib/n8n.ts`. This should include functions for listing and triggering workflows
- [x] T009 Create the basic layout for the builder interface in `src/app/(builder)/layout.tsx`
- [x] T010 [P] Setup API route structure in src/app/api/
- [x] T011 [P] Implement middleware for authentication in src/middleware.ts
- [x] T012 Configure error handling and logging infrastructure

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Marketer Creates and Launches a Lead Magnet Funnel (Priority: P1) 🎯 MVP

**Goal**: Enable users to select Lead Magnet Funnel template, customize pages, connect to Mailchimp, and publish

**Independent Test**: Can a user create a new funnel from template, customize it, connect Mailchimp workflow, and publish successfully? Test is successful if form submission adds contact to Mailchimp list.

### Implementation for User Story 1

- [x] T013 [P] [US1] Implement API route `GET /api/funnels` in `src/app/api/funnels/route.ts` to list funnels for the authenticated user
- [x] T014 [P] [US1] Implement API route `POST /api/funnels` in `src/app/api/funnels/route.ts` to create a new funnel
- [x] T015 [P] [US1] Implement API routes for pages (`GET /api/funnels/{funnelId}/pages`, `POST /api/funnels/{funnelId}/pages`) in `src/app/api/funnels/[funnelId]/pages/route.ts`
- [x] T016 [P] [US1] Implement API routes for components (`GET /api/pages/{pageId}/components`, `POST /api/pages/{pageId}/components`) in `src/app/api/pages/[pageId]/components/route.ts`
- [x] T017 [US1] Create the funnel template selection UI in `src/app/(builder)/templates/page.tsx`. This should allow users to select the "Lead Magnet Funnel" template
- [x] T018 [US1] Create the main canvas UI for the visual funnel builder in `src/app/(builder)/canvas/page.tsx`. This will be the main drag-and-drop interface
- [x] T019 [P] [US1] Create the "Hero Section" marketing component in `src/components/marketing/HeroSection.tsx`
- [x] T020 [P] [US1] Create the "Opt-in Form" marketing component in `src/components/marketing/OptInForm.tsx`
- [x] T021 [P] [US1] Create the "Testimonial" marketing component in `src/components/marketing/Testimonial.tsx`
- [x] T022 [P] [US1] Create the "Countdown Timer" marketing component in `src/components/marketing/CountdownTimer.tsx`
- [x] T023 [US1] Create funnel template data in src/lib/templates.ts
- [x] T024 [P] [US1] Create reusable builder components in src/components/builder/
  - [x] T025 [US1] ComponentLibrary in src/components/builder/ComponentLibrary.tsx
  - [x] T026 [US1] DragDropCanvas in src/components/builder/DragDropCanvas.tsx
  - [x] T027 [US1] PropertyEditor in src/components/builder/PropertyEditor.tsx
- [ ] T028 [US1] Implement the drag-and-drop functionality in the canvas UI to add and reorder components
- [ ] T029 [US1] Implement the UI for connecting the opt-in form to a pre-built n8n workflow for Mailchimp
- [ ] T030 [US1] Create n8n workflow template for Mailchimp integration
- [ ] T031 [US1] Implement the logic to publish a funnel, making it accessible via a public URL
- [ ] T032 [US1] Create public funnel page rendering in `src/app/f/[slug]/page.tsx`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Entrepreneur Sells a Product with a Sales Funnel (Priority: P2)

**Goal**: Enable users to create sales funnels with payment processing via Stripe

**Independent Test**: Can a user create a sales funnel, integrate Stripe payment, and process a test purchase successfully? Test is successful if payment triggers access granting workflow.

### Implementation for User Story 2

- [ ] T033 [US2] Create Product Sales Funnel template in src/lib/templates.ts
- [ ] T034 [P] [US2] Create additional marketing components for sales
  - [ ] T035 [US2] PaymentButton component in src/components/marketing/PaymentButton.tsx
  - [ ] T036 [US2] VideoEmbed component in src/components/marketing/VideoEmbed.tsx
  - [ ] T037 [US2] Guarantee component in src/components/marketing/Guarantee.tsx
- [ ] T038 [US2] Add the "Product Sales Funnel" to the template selection UI in `src/app/(builder)/templates/page.tsx`
- [ ] T039 [US2] Implement the UI for configuring the payment button with Stripe details and a product price
- [ ] T040 [US2] Integrate Stripe payment processing in src/lib/stripe.ts
- [ ] T041 [US2] Create a new API route (`/api/payments/stripe/create-checkout-session`) to handle the creation of Stripe checkout sessions
- [ ] T042 [US2] Implement a webhook handler (`/api/webhooks/stripe`) to listen for successful payments from Stripe
- [ ] T043 [US2] In the webhook handler, trigger the appropriate n8n workflow to grant course access and send a confirmation email
- [ ] T044 [US2] Create n8n workflow template for payment processing and access granting
- [ ] T045 [US2] Implement order confirmation page functionality

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Marketer Customizes an n8n Workflow (Priority: P3)

**Goal**: Enable users to modify existing n8n workflows through custom UI

**Independent Test**: Can a user open n8n editor for existing workflow, add new node (e.g., Slack), save it, and have modified workflow execute correctly on funnel trigger?

### Implementation for User Story 3

- [ ] T046 [US3] Create custom n8n workflow editor UI in `src/app/(builder)/workflows/page.tsx`
- [ ] T047 [P] [US3] Create n8n node components in src/components/n8n/
  - [ ] T048 [US3] NodeLibrary in src/components/n8n/NodeLibrary.tsx
  - [ ] T049 [US3] WorkflowCanvas in src/components/n8n/WorkflowCanvas.tsx
  - [ ] T050 [US3] NodeEditor in src/components/n8n/NodeEditor.tsx
- [ ] T051 [US3] Implement n8n workflow management API in src/app/api/workflows/route.ts
- [ ] T052 [US3] Use the n8n REST API (via the client in `src/lib/n8n.ts`) to fetch the workflow definition for editing
- [ ] T053 [US3] Implement the UI for adding a "Slack" node to the workflow
- [ ] T054 [US3] Use the n8n REST API to save the modified workflow definition
- [ ] T055 [US3] Create workflow execution monitoring UI
- [ ] T056 [P] [US3] Add webhook and integration nodes for common services
  - [ ] T057 [US3] Slack integration node
  - [ ] T058 [US3] HubSpot integration node
  - [ ] T059 [US3] Email provider nodes (Mailchimp, ConvertKit, ActiveCampaign)
- [ ] T060 [US3] Implement workflow validation and error handling
- [ ] T061 [US3] Create workflow template management system

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T062 [P] Optimize funnel page performance and loading speed (target: PageSpeed 85+)
- [ ] T063 [P] Ensure all components meet WCAG 2.1 AA accessibility standards
- [ ] T064 [P] Add comprehensive error handling and retry logic for n8n workflows
- [ ] T065 [P] Implement workflow execution status visibility and logging
- [ ] T066 [P] Add funnel analytics and conversion tracking
- [ ] T067 [P] Create user dashboard for managing all funnels and workflows
- [ ] T068 [P] Add mobile responsiveness testing and optimization
- [ ] T069 [P] Implement responsive design improvements across all components and pages
- [ ] T070 [P] Add loading states and skeletons to improve perceived performance
- [ ] T071 Documentation updates in docs/
- [ ] T072 Code cleanup and refactoring
- [ ] T073 Security hardening and input validation
- [ ] T074 Run quickstart.md validation and setup verification

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story

- API routes before UI components
- Core components before integration components
- Basic functionality before advanced features
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All component creation tasks marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all API routes for User Story 1 together:
Task: "Implement API route GET /api/funnels in src/app/api/funnels/route.ts"
Task: "Implement API route POST /api/funnels in src/app/api/funnels/route.ts"
Task: "Implement API routes for pages in src/app/api/funnels/[funnelId]/pages/route.ts"
Task: "Implement API routes for components in src/app/api/pages/[pageId]/components/route.ts"

# Launch all marketing components for User Story 1 together:
Task: "Create Hero Section component in src/components/marketing/HeroSection.tsx"
Task: "Create Opt-in Form component in src/components/marketing/OptInForm.tsx"
Task: "Create Testimonial component in src/components/marketing/Testimonial.tsx"
Task: "Create Countdown Timer component in src/components/marketing/CountdownTimer.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Funnel Builder + Lead Magnet)
   - Developer B: User Story 2 (Payment Processing + Sales Funnel)
   - Developer C: User Story 3 (n8n Workflow Editor)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Focus on conversion optimization over design perfection
- Ensure workflows are reliable with error handling and retry logic
- Maintain multi-tenant workflow isolation between users