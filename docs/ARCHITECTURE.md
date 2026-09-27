# Architecture

## Request path

```
browser  ->  nginx :80 (frontend container)
                |-- /            static SPA bundle, index.html fallback for client routes
                |-- /assets/     hashed, immutable, 1-year cache
                `-- /api/  ----> backend :8080 (Spring Boot)
                                     |
                                     `--> postgres :5432
```

Serving the API from the same origin as the app is deliberate: the browser never issues a
CORS preflight in the Docker setup. CORS config still exists in `SecurityConfig` because the
Vite dev server (`:5173`) talks to the backend cross-origin during development.

## Authentication

Stateless JWT, HS256.

1. `POST /api/auth/login` verifies the BCrypt hash and returns a token whose subject is the user id.
2. The SPA stores the token in `localStorage` and an axios request interceptor attaches
   `Authorization: Bearer <token>` to every call.
3. `JwtAuthenticationFilter` parses the token, loads the user, and populates the
   `SecurityContext`. A bad or expired token is swallowed and the context is cleared —
   the request then continues as anonymous.
4. `RestAuthenticationEntryPoint` turns anonymous access to a protected route into **401**
   rather than Spring's default 403. This matters: the axios response interceptor treats 401
   as "your session died", clears the token and redirects to `/login`.
5. On boot the app does not trust a stored token — `AuthProvider` exchanges it for
   `/api/users/me` before rendering an authenticated route.

## Data model

```
User 1---* Post 1---* Comment 1---* Comment      (parent -> replies, one level)
     |       |    `---* PostLike  *---1 User     (carries a ReactionType)
     |       |    `---* SavedPost *---1 User
     |       `---1 Post (sharedPost)             (a re-share points at the original)
     |       `---1 SocialGroup                   (set when posted into a group)
     |       `--* User (post_tags)               ("- with Sarah Connor")
     |
     |--* Friendship (requester -> addressee, PENDING | ACCEPTED | DECLINED)
     |--* Story 1---* StoryView
     |--* Notification (recipient, actor, type, text, link)
     |--* GroupMember *---1 SocialGroup
     |--* EventAttendee *---1 Event
     `--* Listing

Conversation 1---* ConversationParticipant *---1 User
             `---* Message 1---* MessageReaction
```

`Friendship` stores one directed row per pair. An `ACCEPTED` row means both people are
friends, so `findFriendIds` selects "the other side" with a `CASE` expression rather than
storing two mirrored rows that could drift apart.

Timestamps use `@PrePersist` instead of Spring Data auditing. Auditing stamps `now()` on
every new entity unconditionally, which would have flattened the seeder's deliberately
back-dated posts into a single instant.

Two naming notes. `SocialGroup` is not called `Group` and its table is `fb_groups`, because
`GROUP` is reserved in both JPQL and SQL. `PostLike` kept its class and table name when
reactions arrived; it gained a nullable `reaction` column, so rows written before reactions
existed still read as a plain `LIKE`.

Read state in Messenger is a **watermark**, not a flag per message: each participant row
carries `lastReadAt`, so marking a thread read is one write regardless of how far behind you
were, and the unread count is a `COUNT` of messages newer than that instant.

A story's lifetime is a query filter on `expiresAt` rather than a cleanup job, so nothing has
to run on a schedule for stories to disappear after 24 hours.

## Feed queries

`PostService.decorate` is the interesting part. Rendering a page of posts needs, per post, the
reaction breakdown, your own reaction, its comments, their like counts, whether you saved it
and how many times it was shared. Done naively that is a fistful of queries per post. Instead
it issues a fixed six, each one an `IN` over the whole page:

1. the page of posts (`JOIN FETCH` the author),
2. one `COUNT` grouped by post **and reaction type**, which gives both the total and the face stack,
3. the reactions *you* left on those posts,
4. every comment on those posts, assembled into one level of replies in memory,
5. the like counts and your own likes across those comments,
6. saved ids and share counts.

The News Feed query itself carries one subtlety. It has to return timeline posts from your
friends **and** posts from every group you belong to, and a group post has a null author-side
match. Writing that as `p.group.id IN :groupIds` would make Hibernate emit an inner join and
silently drop every post without a group, so the query does an explicit
`LEFT JOIN p.group g` and tests `g` instead.

## Frontend state

There is no global store. State sits at the layer that owns it:

- **`AuthProvider`** — the session, the only truly global piece.
- **`usePostCollection`** — one paginated post list plus its mutations. The Feed page and the
  Profile page each instantiate their own; they never share or invalidate each other.
- **`useAsync`** — one-shot loads (profile, friends, requests) with an incrementing request id
  so a slow response cannot overwrite a newer one.
- **`ChatProvider`** — the Messenger dock. It sits above the routes so a chat you open from a
  profile stays open while you keep browsing, and so a Message button anywhere in the app can
  open a chat head without that page knowing anything about Messenger.

Reactions and saves apply **optimistically**. Reacting is a three-way move — add, switch, or
clear by re-sending the reaction you already hold — and the optimistic guess mirrors all three
so the button never flickers into the wrong state before the server answers. A failure rolls
back to the captured pre-click state.

## Real-time without websockets

Chat, badges, typing and presence run on `usePolling`: a callback fired on mount, then on an
interval, and again the moment the tab regains focus. Polling stops while the tab is hidden,
so a backgrounded window costs nothing. Intervals are matched to how fast the thing actually
changes — 3s inside an open chat, 8s for the thread list, 15s for the chrome badges, 20s for
presence dots.

Presence is persisted: the badge poll doubles as a heartbeat that stamps `lastSeenAt`, and
anyone seen within two minutes counts as online. Typing is deliberately **not** persisted —
it is true for a few seconds at a time, so an in-memory map with a timeout is both cheaper and
more accurate than a column. The trade-off is that typing indicators do not survive a restart
and would not work across several API instances.

## Container startup order

`docker-compose.yml` uses health-gated dependencies, not just start order:

- Postgres reports healthy via `pg_isready`.
- The backend waits for that, and reports healthy via `/actuator/health`.
- The frontend waits for the backend to be **healthy**, so nginx never comes up pointing at
  a socket that is not listening yet.

## Why these versions

- **Java 21** — the current LTS; the code uses records, pattern-matched switches and text blocks.
- **Spring Boot 3.5** — requires Java 17+, aligns with Jakarta EE 10 (`jakarta.*` imports).
- **React 18** — `createRoot`, `StrictMode` double-invocation is handled by the cancellation
  guards in `useAsync`.
- **Vite 5** — dev-server proxy and CSS Modules with no extra configuration.
