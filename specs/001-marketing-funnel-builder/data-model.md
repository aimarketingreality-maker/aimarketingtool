# Data Model

This document defines the data structures for the Marketing Funnel Builder feature. The schema is designed for a PostgreSQL database, managed via Supabase.

## Tables

### `users`
Stores public user information. Private authentication data is managed by Supabase Auth.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | Primary Key, Default: `auth.uid()` | References the user in `auth.users`. |
| `created_at` | `timestamp with time zone` | Not Null, Default: `now()` | |
| `updated_at` | `timestamp with time zone` | Not Null, Default: `now()` | |
| `email` | `text` | Unique, Not Null | User's email address. |

### `funnels`
Represents a marketing funnel created by a user.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | Primary Key, Default: `gen_random_uuid()` | |
| `user_id` | `uuid` | Foreign Key to `users.id` | The user who owns the funnel. |
| `name` | `text` | Not Null | The name of the funnel. |
| `published` | `boolean` | Not Null, Default: `false` | Whether the funnel is live. |
| `created_at` | `timestamp with time zone` | Not Null, Default: `now()` | |
| `updated_at` | `timestamp with time zone` | Not Null, Default: `now()` | |

### `pages`
Represents a single page within a funnel.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | Primary Key, Default: `gen_random_uuid()` | |
| `funnel_id` | `uuid` | Foreign Key to `funnels.id` | The funnel this page belongs to. |
| `name` | `text` | Not Null | The internal name of the page. |
| `slug` | `text` | Not Null | The URL slug for the page. Must be unique within a funnel. |
| `created_at` | `timestamp with time zone` | Not Null, Default: `now()` | |
| `updated_at` | `timestamp with time zone` | Not Null, Default: `now()` | |

### `components`
Represents a component on a page. The structure is flexible to accommodate different component types.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | Primary Key, Default: `gen_random_uuid()` | |
| `page_id` | `uuid` | Foreign Key to `pages.id` | The page this component belongs to. |
| `type` | `text` | Not Null | The type of the component (e.g., 'hero', 'video', 'opt-in-form'). |
| `order` | `integer` | Not Null | The order of the component on the page. |
| `config` | `jsonb` | Not Null | The configuration and content of the component. |
| `created_at` | `timestamp with time zone` | Not Null, Default: `now()` | |
| `updated_at` | `timestamp with time zone` | Not Null, Default: `now()` | |

### `workflows`
Represents an n8n workflow associated with a trigger in a funnel (e.g., a component action).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | Primary Key, Default: `gen_random_uuid()` | |
| `user_id` | `uuid` | Foreign Key to `users.id` | The user who owns the workflow. |
| `n8n_workflow_id` | `text` | Not Null | The ID of the workflow in the n8n instance. |
| `trigger_component_id` | `uuid` | Foreign Key to `components.id` | The component that triggers this workflow. |
| `created_at` | `timestamp with time zone` | Not Null, Default: `now()` | |
| `updated_at` | `timestamp with time zone` | Not Null, Default: `now()` | |

## Relationships

- A `user` can have multiple `funnels`.
- A `funnel` belongs to one `user` and can have multiple `pages`.
- A `page` belongs to one `funnel` and can have multiple `components`.
- A `component` can trigger one `workflow`.
- A `workflow` is associated with one `component` and belongs to one `user`.