# API/UI Operation Matrix

OpenAPI source: `http://localhost:3000/.well-known/openapi.yaml` (Coachboat API `1.1.0`)

Coverage target: `41/41 operations`
Current status: `41/41 covered`

| # | Operation | UI Entry Point | Evidence | Status |
|---|---|---|---|---|
| 1 | `GET /events` | Dashboard, Events page, Resource detail | `src/routes/(app)/+page.svelte:16`, `src/routes/(app)/events/+page.svelte:92`, `src/routes/(app)/resources/[id]/+page.svelte:42` | Covered |
| 2 | `POST /events` | Events create modal | `src/routes/(app)/events/+page.svelte:424` | Covered |
| 3 | `GET /events/{id}` | Events detail modal hydration | `src/routes/(app)/events/+page.svelte:281` | Covered |
| 4 | `PATCH /events/{id}` | Events edit modal | `src/routes/(app)/events/+page.svelte:422` | Covered |
| 5 | `DELETE /events/{id}` | Events detail modal delete action | `src/routes/(app)/events/+page.svelte:329` | Covered |
| 6 | `GET /users` | Users page, group members modal | `src/routes/(app)/users/+page.svelte:248`, `src/lib/components/GroupMembersModal.svelte:179` | Covered |
| 7 | `POST /users` | Users create modal | `src/routes/(app)/users/+page.svelte:174` | Covered |
| 8 | `GET /users/{id}` | Users permissions tab, events detail creator, members fallback hydration | `src/routes/(app)/users/+page.svelte:93`, `src/routes/(app)/events/+page.svelte:307`, `src/lib/components/GroupMembersModal.svelte:134` | Covered |
| 9 | `PATCH /users/{id}` | Users edit, password reset, settings password change | `src/routes/(app)/users/+page.svelte:169`, `src/routes/(app)/users/+page.svelte:202`, `src/routes/(app)/settings/+page.svelte:177` | Covered |
| 10 | `DELETE /users/{id}` | Users delete action | `src/routes/(app)/users/+page.svelte:224` | Covered |
| 11 | `GET /roles` | RBAC matrix page | `src/routes/(app)/settings/rbac/+page.svelte:23` | Covered |
| 12 | `GET /resources` | Dashboard, Resources page, Events page, Todo component | `src/routes/(app)/+page.svelte:21`, `src/routes/(app)/resources/+page.svelte:122`, `src/routes/(app)/events/+page.svelte:134`, `src/lib/components/TodoList.svelte:52` | Covered |
| 13 | `POST /resources` | Resources create modal | `src/routes/(app)/resources/+page.svelte:81` | Covered |
| 14 | `GET /resources/{id}` | Resource detail page, event details | `src/routes/(app)/resources/[id]/+page.svelte:31`, `src/routes/(app)/events/+page.svelte:294` | Covered |
| 15 | `PATCH /resources/{id}` | Resources edit modal | `src/routes/(app)/resources/+page.svelte:79` | Covered |
| 16 | `DELETE /resources/{id}` | Resources delete action | `src/routes/(app)/resources/+page.svelte:104` | Covered |
| 17 | `GET /resource-categories` | Events filters, Resources page, Settings categories | `src/routes/(app)/events/+page.svelte:135`, `src/routes/(app)/resources/+page.svelte:124`, `src/routes/(app)/settings/+page.svelte:56` | Covered |
| 18 | `POST /resource-categories` | Settings category create | `src/routes/(app)/settings/+page.svelte:112` | Covered |
| 19 | `PATCH /resource-categories/{id}` | Settings category edit | `src/routes/(app)/settings/+page.svelte:107` | Covered |
| 20 | `DELETE /resource-categories/{id}` | Settings category delete | `src/routes/(app)/settings/+page.svelte:139` | Covered |
| 21 | `GET /todos` | Dashboard todo list, resources page todo counts | `src/lib/components/TodoList.svelte:45`, `src/routes/(app)/resources/+page.svelte:123` | Covered |
| 22 | `POST /todos` | TodoList create task | `src/lib/components/TodoList.svelte:76` | Covered |
| 23 | `GET /todos/{id}` | Todo details modal | `src/lib/components/TodoList.svelte:172` | Covered |
| 24 | `PATCH /todos/{id}` | Todo toggle and inline edit | `src/lib/components/TodoList.svelte:111`, `src/lib/components/TodoList.svelte:202`, `src/routes/(app)/resources/+page.svelte:197` | Covered |
| 25 | `DELETE /todos/{id}` | Todo delete action | `src/lib/components/TodoList.svelte:152` | Covered |
| 26 | `GET /groups` | Groups list page | `src/routes/(app)/groups/+page.svelte:87` | Covered |
| 27 | `POST /groups` | Group create modal | `src/routes/(app)/groups/+page.svelte:66` | Covered |
| 28 | `GET /groups/{id}` | Group detail page | `src/routes/(app)/groups/[id]/+page.svelte:75` | Covered |
| 29 | `PATCH /groups/{id}` | Group edit modal | `src/routes/(app)/groups/+page.svelte:64` | Covered |
| 30 | `DELETE /groups/{id}` | Group archive/delete action | `src/routes/(app)/groups/+page.svelte:118` | Covered |
| 31 | `GET /groups/{id}/stream` | Group realtime stream connection | `src/routes/(app)/groups/[id]/+page.svelte:165` | Covered |
| 32 | `GET /groups/{id}/users` | Group members modal initial load | `src/lib/components/GroupMembersModal.svelte:178` | Covered |
| 33 | `POST /groups/{id}/users` | Add group member flow | `src/lib/components/GroupMembersModal.svelte:227` | Covered |
| 34 | `PATCH /groups/{id}/users/{userId}` | Update group member role | `src/lib/components/GroupMembersModal.svelte:249` | Covered |
| 35 | `DELETE /groups/{id}/users/{userId}` | Remove group member | `src/lib/components/GroupMembersModal.svelte:266` | Covered |
| 36 | `GET /groups/{id}/feed` | Group activity tab | `src/routes/(app)/groups/[id]/+page.svelte:115` | Covered |
| 37 | `GET /groups/{id}/posts` | Group posts tab | `src/routes/(app)/groups/[id]/+page.svelte:95` | Covered |
| 38 | `POST /groups/{id}/posts` | Group create post editor | `src/routes/(app)/groups/[id]/+page.svelte:251` | Covered |
| 39 | `GET /groups/{id}/posts/{postId}` | Canonical post fetch before editing | `src/routes/(app)/groups/[id]/+page.svelte:226` | Covered |
| 40 | `PATCH /groups/{id}/posts/{postId}` | Save edited post | `src/routes/(app)/groups/[id]/+page.svelte:316` | Covered |
| 41 | `DELETE /groups/{id}/posts/{postId}` | Delete post action | `src/routes/(app)/groups/[id]/+page.svelte:296` | Covered |

Permission note: group member mutations (`POST|PATCH|DELETE /groups/{id}/users*`) are UI-gated by `groups:update:any` in group context. `groups:manage` is no longer used for authorization.
