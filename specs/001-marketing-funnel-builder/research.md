# Research & Decisions

This document records the decisions made to resolve the "NEEDS CLARIFICATION" items identified in the implementation plan.

## 1. Target Node.js Version

- **Task**: Research and decide on the optimal Node.js version for the project, considering Next.js 15 and other dependencies.
- **Decision**: Node.js 20.x (LTS)
- **Rationale**: Next.js 15 supports Node.js 18.17 and higher. Using the current LTS version (20.x) ensures long-term support, stability, and access to modern language features. It is the standard for new production applications.
- **Alternatives considered**: Node.js 18.x (older LTS, still supported but 20.x is preferred for new projects).

## 2. n8n Integration Strategy

- **Task**: Investigate and decide on the best strategy for integrating the n8n workflow builder into the Next.js application.
- **Decision**: Custom UI leveraging the n8n REST API and Model Context Protocol (MCP).
- **Rationale**: The user indicated that n8n provides a "mcp" (Model Context Protocol) that can be leveraged. This approach allows for a deeply integrated and custom user experience, avoiding the limitations of an iframe. We will build a simplified UI for workflow management within our app that communicates with the n8n backend via its API. This gives us control over the UX while using n8n's powerful backend.
- **Alternatives considered**:
    - **Iframe Embedding**: Rejected due to potential limitations in customization and seamless user experience.
    - **Full Custom UI**: Rejected as rebuilding the entire n8n editor is too complex for the initial scope. We will build a targeted UI for the required interactions.
    - **Embedded SDK**: No official, full-featured embedded SDK was identified during initial research.

## 3. Database Selection

- **Task**: Research and select a database solution for storing user data, funnels, and other application state.
- **Decision**: Supabase
- **Rationale**: The user selected Supabase. It provides a managed PostgreSQL database, which is excellent for the structured data we need (Users, Funnels, Pages). Its BaaS nature, including built-in authentication and storage, will significantly accelerate development.
- **Alternatives considered**:
    - **PostgreSQL with Prisma**: A valid option, but requires more self-management of infrastructure compared to Supabase.
    - **MongoDB**: Rejected as a relational model is a better fit for the defined entities.
    - **Firebase/Firestore**: A similar BaaS, but Supabase's use of PostgreSQL was deemed a better fit for this project's data structure.

## 4. Authentication Strategy

- **Task**: Define the authentication strategy for the application.
- **Decision**: Supabase Auth
- **Rationale**: The user selected Supabase Auth. Since we are using Supabase for our database, its integrated authentication solution is the most efficient choice. It simplifies the process of securing API routes and managing user data.
- **Alternatives considered**:
    - **NextAuth.js**: A powerful library, but using Supabase's native auth reduces complexity and avoids managing a separate auth provider.
    - **Custom Implementation**: Rejected as it's complex and less secure than a dedicated, battle-tested solution like Supabase Auth.