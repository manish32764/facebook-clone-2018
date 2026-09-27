# Facebook Clone — 2018 Edition

A working Facebook clone styled after the 2018 desktop redesign: the `#4267B2` chrome, the
`#E9EBEE` canvas, flat white cards with `#DDDFE2` borders, and the short 42px blue bar.

- **Frontend** — React 18 + TypeScript + Vite, organised with **atomic design**
- **Backend** — Java 21 + Spring Boot 3.5, JWT auth, JPA, PostgreSQL
- **Infrastructure** — Docker Compose (Postgres + API + nginx-served SPA)
- **Setup** — one script that installs the whole toolchain and both JetBrains IDEs

---

## Single-click setup on a clean machine

Double-click **`setup.bat`**.

It asks for administrator rights, then:

1. Installs **Git, Eclipse Temurin JDK 21, Node.js LTS, Apache Maven, Docker Desktop**
   (winget first, direct vendor downloads as fallback)
2. Sets machine-level **`JAVA_HOME`**, **`MAVEN_HOME`**, **`M2_HOME`** and the matching **`PATH`** entries
3. Generates IntelliJ/WebStorm run configurations into `backend/.run` and `frontend/.run`
4. Starts Docker Desktop and runs **`docker compose up -d --build`**
5. Waits for the API and the site to answer, then verifies both
6. Installs **IntelliJ IDEA Ultimate** and **WebStorm** (latest, 30-day trial)
7. Opens `backend/` in IntelliJ, `frontend/` in WebStorm, and the app in your browser

Allow **20–40 minutes** on a clean VDI. Everything is logged to `setup/logs/setup_<timestamp>.log`.
The script is **idempotent** — re-run it any time; each step skips what is already in place.

### Switches

```
setup.bat -SkipIdes      toolchain and Docker only
setup.bat -SkipDocker    no Docker Desktop, no containers
setup.bat -SkipTools     assume the toolchain exists, go straight to Docker + IDEs
setup.bat -Rebuild       force docker compose up --build
```

> **JetBrains licensing.** IntelliJ IDEA Ultimate and WebStorm install silently, but a license
> cannot be activated from a script. Both open on the JetBrains account screen — sign in and
> choose *Start trial*.

---

## Once it is running

| What | Where |
|---|---|
| App | <http://localhost:3000> |
| API | <http://localhost:8080/api> |
| Health | <http://localhost:8080/actuator/health> |
| Postgres | `localhost:5432` — `fbclone` / `fbclone` |

The seed fills in a social graph, a News Feed, Messenger threads, stories, groups, events,
Marketplace listings and videos for Watch, then Pages, follows, friend lists, pokes, albums,
highlights, a private group with a waiting request, fundraisers, jobs, Dating profiles and ads.
It is split in three: the later parts re-check each table on every boot, so an existing
database picks up the newer sections without its posts or friendships being touched.

**Demo accounts** — every seeded user has the password `password123`:

`mark@facebook.dev` · `sarah@facebook.dev` · `john@facebook.dev` ·
`priya@facebook.dev` · `alex@facebook.dev` · `maya@facebook.dev`

Mark is friends with everyone, so his News Feed is the fullest starting point. Four more people -
`lena@`, `diego@`, `aiko@` and `noah@facebook.dev` - are nobody's friend, so Follow and Dating
have someone to show. Lena already likes Mark on Dating, so liking her back makes a match.

### Day-to-day

```
start.bat                 start the stack and open the browser
start.bat down            stop containers, keep the database
start.bat rebuild         rebuild images and restart
start.bat logs backend    tail one service
start.bat status          container status
start.bat reset           wipe the database and re-seed
```

---

## Repository layout

```
Facebook/
├─ setup.bat                  ← single-click setup (elevates itself)
├─ start.bat                  ← everyday stack control
├─ docker-compose.yml
├─ .env.example
│
├─ setup/
│  ├─ Setup.ps1               orchestrator
│  ├─ Start.ps1               up / down / rebuild / logs / reset
│  ├─ modules/
│  │  ├─ Common.psm1          logging, elevation, downloads, PATH + env vars
│  │  ├─ Prerequisites.psm1   Git, JDK, Node, Maven, Docker
│  │  ├─ JetBrains.psm1       IntelliJ IDEA Ultimate + WebStorm
│  │  └─ Project.psm1         Docker engine, compose, run configs, health checks
│  ├─ downloads/              installer cache (git-ignored)
│  └─ logs/                   timestamped setup logs
│
├─ backend/                   Java 21 · Spring Boot 3.5 · Maven
│  ├─ Dockerfile              multi-stage: maven build → JRE alpine runtime
│  └─ src/main/java/com/facebookclone/
│     ├─ entity/              User Post Comment PostLike CommentLike Friendship
│     │                        Conversation ConversationParticipant Message MessageReaction
│     │                        Notification SavedPost Story StoryView
│     │                        SocialGroup GroupMember Event EventAttendee Listing
│     ├─ repository/          Spring Data JPA
│     ├─ dto/                 request/response records
│     ├─ service/             Auth User Post Friend Message Notification Presence
│     │                        Story Group Event Marketplace Search
│     ├─ controller/          /api/{auth,users,posts,friends,messages,notifications,
│     │                        stories,groups,events,marketplace,search}
│     ├─ security/            JWT filter, principal, 401 entry point
│     ├─ config/              SecurityConfig, DataSeeder
│     └─ exception/           ApiException + global handler
│
└─ frontend/                  React 18 · TypeScript · Vite
   ├─ Dockerfile              node build → nginx (serves SPA, proxies /api)
   ├─ nginx.conf
   └─ src/
      ├─ api/                 axios client + typed endpoint modules
      ├─ context/             auth context + provider
      ├─ hooks/               useAuth, useAsync, usePostCollection, ...
      ├─ styles/              tokens.css (the 2018 palette) + global.css
      ├─ types/               shared API types
      └─ components/
         ├─ atoms/            Avatar Badge Button Card Divider Icon Input Link
         │                     PresenceDot Select Spinner Text TextArea
         ├─ molecules/        SearchBar PostHeader PostActions ReactionPicker ReactionBar
         │                     CommentItem ConversationRow MessageBubble NotificationItem
         │                     GroupCard EventCard ListingCard StoryTile Modal Tabs ...
         ├─ organisms/        TopChrome LeftSidebar RightSidebar PostCard PostComposer Feed
         │                     ChatDock MessengerPanel CommentThread StoryViewer PhotoLightbox
         │                     NotificationsDropdown MessagesDropdown CreateDialogs ...
         ├─ templates/        AppShell, AuthLayout, RequireAuth
         └─ pages/            Feed Profile Friends Messages Notifications Watch Saved
                              Memories Groups Group Events Event Marketplace Listing
                              Search Settings Post Login Register 404
```

---

## Atomic design

The frontend follows Brad Frost's five layers, and the dependency rule only ever points one way:

| Layer | Rule | Examples |
|---|---|---|
| **atoms** | Styled primitives. Import nothing from other layers. | `Button`, `Avatar`, `Icon`, `Input` |
| **molecules** | A few atoms plus one piece of behaviour. | `SearchBar`, `PostActions`, `CommentComposer` |
| **organisms** | Whole interface sections. | `PostCard`, `TopChrome`, `Feed`, `PostComposer` |
| **templates** | Layout skeletons, no data fetching of their own. | `AppShell`, `AuthLayout` |
| **pages** | Route entry points; bind data to a template. | `FeedPage`, `ProfilePage` |

Path aliases (`vite.config.ts` + `tsconfig.json`) make the layer explicit at every import:

```ts
import { Button } from '@atoms/index';
import { PostHeader } from '@molecules/index';
import { Feed } from '@organisms/index';
import { AppShell } from '@templates/index';
```

Colour, spacing, type and elevation live only in `src/styles/tokens.css` — no component
hard-codes a hex value, so the whole 2018 palette can be retuned in one file.

---

## Features

| Area | What works |
|---|---|
| **News Feed** | Friends, people you follow, Pages you follow and your groups. **Top Stories** ranks by engagement, closeness (Close Friends up, Acquaintances down) and age; **Most Recent** is newest first. Sponsored posts every few stories |
| **Posts** | Text, uploaded or linked photo and video, feeling/activity, check-in, tagging friends, editing, deleting, pinning, hiding, reporting; write on a friend's timeline; post as a Page you own |
| **Audiences** | Public, Friends, Friends except..., Specific friends, Close Friends, Only me - enforced in one shared query rule for every feed, timeline, search and permalink |
| **Uploads** | Photos, videos and PDFs up to 50 MB, stored on a Docker volume and served from `/api/media` |
| **Reactions** | All six — Like, Love, Haha, Wow, Sad, Angry — on posts and on comments, with the hover tray, the face stack and a "who reacted" dialog |
| **Comments** | Nested replies three levels deep, all six reactions, inline edit, delete (the whole thread goes), report |
| **Sharing** | Re-share to your timeline with a note; the original renders inside the new post |
| **Saved** | Bookmark any post; `/saved` lists them most recently saved first |
| **Messenger** | Direct and group threads, chat heads docked on every page, a full two-pane `/messages`, typing indicators, read receipts, message reactions, unsend, mute, leave, search |
| **Notifications** | Raised on reactions, comments, replies, shares, tags, friend requests, group posts, event invites and messages; bell dropdown, full page, unread badges |
| **Stories** | Uploaded photo or colour card, draggable text and sticker layers, Public / Friends / Close Friends audience, replies (sent to Messenger), quick reactions, a viewer list for your own, archive and profile highlights |
| **Friends** | Requests in and out (answer or cancel from the profile too), suggestions ranked by mutuals, mutual friends, unfriend; Close Friends, Acquaintances and custom friend lists; following without being friends |
| **Pokes** | Poke and poke back from a profile or `/pokes` |
| **Safety** | Block (hides both people everywhere and ends the friendship), report users, posts, comments, stories, groups, Pages and listings; a Support Inbox for your reports |
| **Presence** | A real heartbeat: green dots in the contacts rail, "Active now" in chat headers and on profiles |
| **Groups** | Public or private; private groups take join requests (with an answer) that admins approve; invites skip approval; admins edit, delete, set rules, promote and remove members, turn on post approval and review pending posts; pinned announcements |
| **Events** | Create and edit events, upload a cover, invite chosen friends, an Invitations tab, going / interested / can't go, attendee lists |
| **Marketplace** | Listings by category with search, price range, location, condition and sort; save items; edit your own; mark sold; message the seller |
| **Pages** | Create a Page, like and follow Pages, post as your Page, reviews and recommendations |
| **Fundraisers** | Start one, donate (pledges only - no money moves), progress towards the goal, recent donors, share to your timeline |
| **Gaming** | Snake, 2048 and Memory Match, with friends' leaderboards |
| **Jobs** | Post jobs (as yourself or a Page), search and filter, apply with a résumé upload, track applications; posters review applicants and set their status |
| **Dating** | An opt-in profile; suggestions never include friends; like or pass; a mutual like opens a Messenger thread |
| **Ads** | Ads Manager with impressions, clicks and CTR; ads run in the right rail and between feed posts |
| **Albums** | Photo albums on a profile, multi-photo upload, a theatre view |
| **Watch** | Every post carrying a video, in one feed |
| **Memories** | On This Day — your own posts from a year or more ago |
| **Search** | One query across people, posts, groups, events and Marketplace, with tabs |
| **Profile** | Editable bio, work, education, hometown, current city, relationship, phone, website, birthday, photos; cover and avatar |
| **Settings** | Account overview, password change, blocked people, and your Support Inbox |

Real-time behaviour (chat, badges, typing, presence) runs on **polling**, not websockets: a
3-second tick inside an open chat, 8 seconds for the thread list, 15 for the chrome badges, 20 for
presence. Polling pauses while the tab is hidden and catches up the moment it regains focus.

---

## API

All routes except `/api/auth/**` and `/actuator/health` need `Authorization: Bearer <jwt>`.

### Accounts and people

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/auth/register` · `/api/auth/login` | Create an account or sign in; both return a JWT |
| `GET` | `/api/users/me` | The signed-in profile |
| `PATCH` | `/api/users/me` | Update name, bio, work, education, hometown, city, relationship, phone, website, birthday, avatar, cover |
| `POST` | `/api/users/me/password` | Change your password |
| `POST` | `/api/users/me/heartbeat` | Refresh your presence stamp |
| `GET` | `/api/users/{id}` | A profile, your relationship to it, whether they are online, and your mutual friends |
| `GET` | `/api/users/search?q=` · `/api/users/birthdays` | People search · friends with a birthday today |

### Posts, reactions and comments

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/posts?page=&size=` | News Feed — you, your friends and your groups |
| `GET` | `/api/posts/user/{id}` · `/api/posts/group/{id}` | One timeline · one group's feed |
| `GET` | `/api/posts/videos` · `/api/posts/saved` · `/api/posts/memories` | Watch · Saved · On This Day |
| `GET` | `/api/posts/{id}` | One post, for a permalink |
| `POST` | `/api/posts` | Create a post (text, image, video, feeling, location, tags, group) |
| `PATCH` · `DELETE` | `/api/posts/{id}` | Edit or delete your own post |
| `POST` | `/api/posts/{id}/share` | Re-share onto your timeline |
| `POST` | `/api/posts/{id}/react` | Set, switch or clear a reaction (`LIKE`…`ANGRY`) |
| `POST` | `/api/posts/{id}/like` | Toggle a plain `LIKE` — the original endpoint, still supported |
| `GET` | `/api/posts/{id}/reactions` | Who reacted, and with what |
| `GET`/`POST` | `/api/posts/{id}/comments` | Read the comment tree / add a comment or reply (`parentId`) |
| `POST` · `DELETE` | `/api/posts/comments/{id}/like` · `/api/posts/comments/{id}` | Like or delete one comment |
| `POST` | `/api/posts/{id}/save` | Toggle saved |

### Messenger

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/messages/conversations` | Your threads, newest activity first |
| `GET` | `/api/messages/conversations/{id}?page=&size=` | One thread, oldest message first |
| `POST` | `/api/messages/with/{userId}` | Open (or reuse) the direct thread with someone |
| `POST` | `/api/messages/conversations` | Start a group thread |
| `POST` | `/api/messages/conversations/{id}` | Send a message (`TEXT`, `IMAGE` or `STICKER`) |
| `POST` | `/api/messages/conversations/{id}/read` · `/mute` | Mark read · mute |
| `GET`/`POST` | `/api/messages/conversations/{id}/typing` | Read or set the typing flag |
| `DELETE` | `/api/messages/conversations/{id}` | Leave (group) or archive (direct) |
| `POST` · `DELETE` | `/api/messages/{id}/react` · `/api/messages/{id}` | React to · unsend a message |
| `GET` | `/api/messages/search?q=` | Search your own messages |

### Notifications, stories and friends

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/notifications?page=&size=` | Your notifications |
| `GET` | `/api/notifications/counts` | Messages, notifications and friend-request badges in one call |
| `POST` | `/api/notifications/{id}/read` · `/api/notifications/read-all` | Mark one or all read |
| `GET`/`POST` | `/api/stories` | Live reels grouped by author / post a story |
| `POST` · `DELETE` | `/api/stories/{id}/seen` · `/api/stories/{id}` | Mark seen · delete your own |
| `GET` | `/api/friends` · `/of/{id}` · `/requests` · `/requests/sent` · `/suggestions` | Friend lists |
| `GET` | `/api/friends/online` · `/api/friends/mutual/{id}` | Who is online · mutual friends |
| `POST` | `/api/friends/request/{id}` · `/requests/{id}/accept` · `/decline` | Send and answer requests |
| `DELETE` | `/api/friends/requests/{id}` · `/api/friends/{id}` | Cancel a sent request · unfriend |

### Groups, events, Marketplace and search

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/groups` · `/discover` · `/{id}` · `/{id}/members` | Your groups, public ones you have not joined, one group, its members |
| `POST` · `DELETE` | `/api/groups` · `/{id}/join` · `/{id}/membership` | Create · join · leave |
| `GET` | `/api/events` · `/past` · `/mine` · `/{id}` · `/{id}/attendees` | Upcoming, past, yours, one event, who is coming |
| `POST` · `DELETE` | `/api/events` · `/{id}/respond` · `/{id}` | Create · reply · cancel |
| `GET` | `/api/marketplace?category=` · `/categories` · `/mine` · `/seller/{id}` · `/{id}` | Browse and read listings |
| `POST` · `PATCH` · `DELETE` | `/api/marketplace` · `/{id}/status` · `/{id}` | List · mark sold · remove |
| `POST` | `/api/marketplace/{id}/interest` | Tell the seller you are interested |
| `GET` | `/api/search?q=` | People, posts, Pages, groups, events and listings in one payload |

### Added in the second wave

| Area | Routes |
|---|---|
| Uploads | `POST /api/media` (multipart `file`) · `GET /api/media/{name}` (public) |
| Posts | `GET /api/posts?mode=top\|recent` · `/page/{id}` · `/group/{id}/pending` · `POST /{id}/pin` · `/{id}/hide` · `/{id}/approve` · `/{id}/decline` · `PATCH /comments/{id}` · `POST /comments/{id}/react` |
| Safety | `GET/POST/DELETE /api/blocks[/{userId}]` · `POST /api/reports` · `GET /api/reports/mine` |
| Social | `POST /api/follows/{userId}` · `/api/follows/{id}/followers\|following\|suggestions` · `/api/friend-lists` (CRUD, `PUT/DELETE /{id}/members/{userId}`) · `/api/pokes` (`GET`, `/sent`, `POST /{userId}`, `DELETE /{pokeId}`) |
| Groups | `PATCH/DELETE /api/groups/{id}` · `DELETE /{id}/request` · `GET /{id}/requests` · `POST /{id}/requests/{userId}/approve\|decline` · `POST/DELETE /{id}/invite` · `GET /invites` · `PATCH/DELETE /{id}/members/{userId}` |
| Events | `PATCH /api/events/{id}` · `POST /{id}/invite` · `GET /{id}/invited` · `GET /invites` |
| Marketplace | `GET /api/marketplace?q=&minPrice=&maxPrice=&location=&condition=&sort=` · `PATCH /{id}` · `POST /{id}/save` · `GET /saved` |
| Stories | `GET /api/stories/archive` · `POST /{id}/react` · `/{id}/reply` · `GET /{id}/viewers` · `/api/stories/highlights` (CRUD, `/user/{id}`) |
| Pages | `/api/pages` (liked) · `/mine` · `/discover` · `/{id}` · `POST /{id}/like` · `/{id}/follow` · `/{id}/reviews` |
| Albums | `/api/albums/user/{id}` · `/api/albums/{id}` · `POST /api/albums` · `POST /{id}/photos` · `DELETE /photos/{photoId}` |
| Fundraisers | `/api/fundraisers` · `/mine` · `/{id}` · `/{id}/donations` · `POST /{id}/donate` · `POST /{id}/close` |
| Games | `GET /api/games` · `GET /{game}/leaderboard` · `POST /{game}/scores` |
| Jobs | `/api/jobs?q=&type=&location=&remote=` · `/mine` · `/applications` · `POST /{id}/apply` · `GET /{id}/applications` · `PATCH /applications/{id}` |
| Dating | `GET/PUT /api/dating/profile` · `/suggestions` · `POST /swipe/{userId}` · `/matches` · `/likes` |
| Ads | `GET /api/ads/serve` · `POST /{id}/click` · `/mine` · `POST/PUT/DELETE /api/ads[/{id}]` · `POST /{id}/active` |

---

## Developing without Docker

**Backend** — the `local` profile uses in-memory H2, so no Postgres is needed:

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

**Frontend** — the Vite dev server proxies `/api` to `localhost:8080`:

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Other scripts: `npm run build`, `npm run lint`, `npm run typecheck`.
Backend tests: `mvn test`.

Both IDEs pick up ready-made run configurations from `backend/.run` and `frontend/.run`.

---

## Notes and limits

- **Uploads go to local disk** (the `fbclone-media-data` volume), not object storage, and there
  is no resizing or transcoding. Pasting a link still works everywhere.
- **Real-time is polling, not websockets.** It is honest and it works, but a production build
  would use STOMP over websockets rather than a timer per surface.
- **Typing indicators live in memory**, so they do not survive a restart and would not work
  across several API instances. Presence, read receipts and everything else are persisted.
- **Notifications are written on the request path.** A real system would push them onto a queue
  rather than write one row per recipient inside the sender's transaction — noticeable on a
  group thread with hundreds of people in it.
- **Private groups** show their name, About and rules to everyone (so people can ask to join),
  but their posts and members only to members.
- **Enum columns** - on startup the API drops the CHECK constraints Hibernate generated for enum
  columns, so adding a notification type or audience later does not break inserts.
- **Fundraisers and ads are pretend money.** Donations are recorded pledges and budgets are
  labels; nothing is charged.
- **`ddl-auto: update`** keeps the schema in step during development. A real deployment
  would use Flyway or Liquibase instead. Note that the columns added for reactions, presence and
  the rest are nullable, so an existing database picks them up without losing data.
- **Change `APP_JWT_SECRET`** (in `.env`) outside local development. It must be ≥ 32 characters.
- This is a learning project. It is not affiliated with Meta, and reproduces the 2018 look
  for educational purposes.
