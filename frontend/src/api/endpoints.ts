import { api } from './client';
import type {
  Ad,
  AdPayload,
  Album,
  AttendeeStatus,
  Attendee,
  AuthResponse,
  BlockedUser,
  Comment,
  Conversation,
  CreatePostPayload,
  DatingProfile,
  DatingProfilePayload,
  Donation,
  Event,
  EventInvite,
  FollowState,
  Friend,
  FriendList,
  FriendRequest,
  Fundraiser,
  FundraiserPayload,
  Game,
  GameKey,
  Group,
  GroupInvite,
  GroupMember,
  Highlight,
  Job,
  JobApplication,
  JobPayload,
  JoinRequest,
  Leader,
  Listing,
  ListingCondition,
  ListingFilters,
  LoginPayload,
  Message,
  NotificationPage,
  Page,
  PagePayload,
  PageReview,
  Poke,
  Post,
  Privacy,
  ProfileResponse,
  ReactionName,
  ReactionSummary,
  Reactor,
  RegisterPayload,
  Report,
  ReportTarget,
  ScoreResult,
  SearchResults,
  SentRequest,
  Story,
  StoryAudience,
  StoryReel,
  StoryViewerRow,
  Thread,
  UnreadCounts,
  User,
} from '@/types';

export const authApi = {
  login: (payload: LoginPayload) =>
    api.post<AuthResponse>('/api/auth/login', payload).then((r) => r.data),

  register: (payload: RegisterPayload) =>
    api.post<AuthResponse>('/api/auth/register', payload).then((r) => r.data),
};

/** Photo, video and PDF uploads. Resolves to the URL to store on the object. */
export const mediaApi = {
  upload: (file: File, onProgress?: (percent: number) => void) => {
    const form = new FormData();
    form.append('file', file);
    return api
      .post<{ url: string; contentType: string }>('/api/media', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120_000,
        onUploadProgress: (event) => {
          if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
        },
      })
      .then((r) => r.data);
  },
};

export const userApi = {
  me: () => api.get<User>('/api/users/me').then((r) => r.data),

  profile: (id: number) => api.get<ProfileResponse>(`/api/users/${id}`).then((r) => r.data),

  updateMe: (updates: Partial<Record<string, string>>) =>
    api.patch<User>('/api/users/me', updates).then((r) => r.data),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<void>('/api/users/me/password', { currentPassword, newPassword }).then((r) => r.data),

  search: (query: string) =>
    api.get<User[]>('/api/users/search', { params: { q: query } }).then((r) => r.data),

  birthdays: () => api.get<User[]>('/api/users/birthdays').then((r) => r.data),

  heartbeat: () => api.post<void>('/api/users/me/heartbeat').then((r) => r.data),
};

export type FeedMode = 'top' | 'recent';

export const postApi = {
  feed: (page = 0, size = 10, mode: FeedMode = 'top') =>
    api.get<Post[]>('/api/posts', { params: { page, size, mode } }).then((r) => r.data),

  timeline: (userId: number, page = 0, size = 10) =>
    api.get<Post[]>(`/api/posts/user/${userId}`, { params: { page, size } }).then((r) => r.data),

  groupFeed: (groupId: number, page = 0, size = 10) =>
    api.get<Post[]>(`/api/posts/group/${groupId}`, { params: { page, size } }).then((r) => r.data),

  groupPending: (groupId: number) =>
    api.get<Post[]>(`/api/posts/group/${groupId}/pending`).then((r) => r.data),

  pageFeed: (pageId: number, page = 0, size = 10) =>
    api.get<Post[]>(`/api/posts/page/${pageId}`, { params: { page, size } }).then((r) => r.data),

  videos: (page = 0, size = 10) =>
    api.get<Post[]>('/api/posts/videos', { params: { page, size } }).then((r) => r.data),

  saved: (page = 0, size = 10) =>
    api.get<Post[]>('/api/posts/saved', { params: { page, size } }).then((r) => r.data),

  memories: () => api.get<Post[]>('/api/posts/memories').then((r) => r.data),

  one: (postId: number) => api.get<Post>(`/api/posts/${postId}`).then((r) => r.data),

  create: (payload: CreatePostPayload) =>
    api.post<Post>('/api/posts', payload).then((r) => r.data),

  update: (
    postId: number,
    updates: { content?: string; feeling?: string; location?: string; privacy?: Privacy; audienceUserIds?: number[] },
  ) => api.patch<Post>(`/api/posts/${postId}`, updates).then((r) => r.data),

  share: (postId: number, payload: { content?: string; privacy?: Privacy }) =>
    api.post<Post>(`/api/posts/${postId}/share`, payload).then((r) => r.data),

  remove: (postId: number) => api.delete<void>(`/api/posts/${postId}`).then((r) => r.data),

  togglePin: (postId: number) => api.post<Post>(`/api/posts/${postId}/pin`).then((r) => r.data),

  approve: (postId: number) => api.post<Post>(`/api/posts/${postId}/approve`).then((r) => r.data),

  decline: (postId: number) => api.post<void>(`/api/posts/${postId}/decline`).then((r) => r.data),

  toggleHidden: (postId: number) =>
    api.post<{ postId: number; hidden: boolean }>(`/api/posts/${postId}/hide`).then((r) => r.data),

  /** Sending the reaction you already have clears it, the way the app behaves. */
  react: (postId: number, reaction: ReactionName) =>
    api
      .post<{ postId: number; reactions: ReactionSummary }>(`/api/posts/${postId}/react`, { reaction })
      .then((r) => r.data),

  reactors: (postId: number) =>
    api.get<Reactor[]>(`/api/posts/${postId}/reactions`).then((r) => r.data),

  comments: (postId: number) =>
    api.get<Comment[]>(`/api/posts/${postId}/comments`).then((r) => r.data),

  addComment: (postId: number, content: string, parentId?: number, imageUrl?: string) =>
    api.post<Comment>(`/api/posts/${postId}/comments`, { content, parentId, imageUrl }).then((r) => r.data),

  editComment: (commentId: number, content: string) =>
    api.patch<Comment>(`/api/posts/comments/${commentId}`, { content }).then((r) => r.data),

  likeComment: (commentId: number) =>
    api.post<Comment>(`/api/posts/comments/${commentId}/like`).then((r) => r.data),

  reactToComment: (commentId: number, reaction: ReactionName) =>
    api.post<Comment>(`/api/posts/comments/${commentId}/react`, { reaction }).then((r) => r.data),

  deleteComment: (commentId: number) =>
    api.delete<void>(`/api/posts/comments/${commentId}`).then((r) => r.data),

  toggleSave: (postId: number) =>
    api.post<{ postId: number; saved: boolean }>(`/api/posts/${postId}/save`).then((r) => r.data),
};

export const friendApi = {
  mine: () => api.get<Friend[]>('/api/friends').then((r) => r.data),

  of: (userId: number) => api.get<Friend[]>(`/api/friends/of/${userId}`).then((r) => r.data),

  requests: () => api.get<FriendRequest[]>('/api/friends/requests').then((r) => r.data),

  sentRequests: () => api.get<SentRequest[]>('/api/friends/requests/sent').then((r) => r.data),

  suggestions: (limit = 8) =>
    api.get<Friend[]>('/api/friends/suggestions', { params: { limit } }).then((r) => r.data),

  sendRequest: (userId: number) =>
    api.post<Friend>(`/api/friends/request/${userId}`).then((r) => r.data),

  accept: (requestId: number) =>
    api.post<Friend>(`/api/friends/requests/${requestId}/accept`).then((r) => r.data),

  decline: (requestId: number) =>
    api.post<Friend>(`/api/friends/requests/${requestId}/decline`).then((r) => r.data),

  cancelRequest: (requestId: number) =>
    api.delete<void>(`/api/friends/requests/${requestId}`).then((r) => r.data),

  unfriend: (userId: number) => api.delete<void>(`/api/friends/${userId}`).then((r) => r.data),

  /** Friend ids that count as online, for the contacts rail. */
  online: () => api.get<number[]>('/api/friends/online').then((r) => r.data),
};

/** Blocking, reporting, following, friend lists and pokes. */
export const socialApi = {
  blocked: () => api.get<BlockedUser[]>('/api/blocks').then((r) => r.data),
  block: (userId: number) => api.post<void>(`/api/blocks/${userId}`).then((r) => r.data),
  unblock: (userId: number) => api.delete<void>(`/api/blocks/${userId}`).then((r) => r.data),

  report: (payload: { targetType: ReportTarget; targetId: number; reason: string; details?: string }) =>
    api.post<Report>('/api/reports', payload).then((r) => r.data),
  myReports: () => api.get<Report[]>('/api/reports/mine').then((r) => r.data),

  toggleFollow: (userId: number) => api.post<FollowState>(`/api/follows/${userId}`).then((r) => r.data),
  followers: (userId: number) => api.get<User[]>(`/api/follows/${userId}/followers`).then((r) => r.data),
  following: (userId: number) => api.get<User[]>(`/api/follows/${userId}/following`).then((r) => r.data),
  followSuggestions: () => api.get<User[]>('/api/follows/suggestions').then((r) => r.data),

  lists: () => api.get<FriendList[]>('/api/friend-lists').then((r) => r.data),
  createList: (name: string) => api.post<FriendList>('/api/friend-lists', { name }).then((r) => r.data),
  renameList: (listId: number, name: string) =>
    api.patch<FriendList>(`/api/friend-lists/${listId}`, { name }).then((r) => r.data),
  deleteList: (listId: number) => api.delete<void>(`/api/friend-lists/${listId}`).then((r) => r.data),
  addToList: (listId: number, userId: number) =>
    api.put<FriendList>(`/api/friend-lists/${listId}/members/${userId}`).then((r) => r.data),
  removeFromList: (listId: number, userId: number) =>
    api.delete<FriendList>(`/api/friend-lists/${listId}/members/${userId}`).then((r) => r.data),

  pokes: () => api.get<Poke[]>('/api/pokes').then((r) => r.data),
  sentPokes: () => api.get<Poke[]>('/api/pokes/sent').then((r) => r.data),
  poke: (userId: number) => api.post<Poke>(`/api/pokes/${userId}`).then((r) => r.data),
  dismissPoke: (pokeId: number) => api.delete<void>(`/api/pokes/${pokeId}`).then((r) => r.data),
};

export const messageApi = {
  conversations: () =>
    api.get<Conversation[]>('/api/messages/conversations').then((r) => r.data),

  thread: (conversationId: number, page = 0, size = 30) =>
    api
      .get<Thread>(`/api/messages/conversations/${conversationId}`, { params: { page, size } })
      .then((r) => r.data),

  /** Opens the direct thread with someone, reusing it when it already exists. */
  openWith: (userId: number) =>
    api.post<Conversation>(`/api/messages/with/${userId}`).then((r) => r.data),

  createGroup: (participantIds: number[], name?: string) =>
    api.post<Conversation>('/api/messages/conversations', { participantIds, name }).then((r) => r.data),

  send: (conversationId: number, content: string, attachmentUrl?: string, type?: string) =>
    api
      .post<Message>(`/api/messages/conversations/${conversationId}`, { content, attachmentUrl, type })
      .then((r) => r.data),

  markRead: (conversationId: number) =>
    api.post<void>(`/api/messages/conversations/${conversationId}/read`).then((r) => r.data),

  setTyping: (conversationId: number, typing: boolean) =>
    api.post<void>(`/api/messages/conversations/${conversationId}/typing`, { typing }).then((r) => r.data),

  typingState: (conversationId: number) =>
    api
      .get<{ typing: User[] }>(`/api/messages/conversations/${conversationId}/typing`)
      .then((r) => r.data),

  setMuted: (conversationId: number, muted: boolean) =>
    api.post<void>(`/api/messages/conversations/${conversationId}/mute`, { muted }).then((r) => r.data),

  leave: (conversationId: number) =>
    api.delete<void>(`/api/messages/conversations/${conversationId}`).then((r) => r.data),

  react: (messageId: number, emoji: string) =>
    api.post<Message>(`/api/messages/${messageId}/react`, { emoji }).then((r) => r.data),

  unsend: (messageId: number) => api.delete<void>(`/api/messages/${messageId}`).then((r) => r.data),

  search: (query: string) =>
    api.get<Message[]>('/api/messages/search', { params: { q: query } }).then((r) => r.data),
};

export const notificationApi = {
  list: (page = 0, size = 20) =>
    api.get<NotificationPage>('/api/notifications', { params: { page, size } }).then((r) => r.data),

  /** The three chrome badges in one call; also refreshes your presence stamp. */
  counts: () => api.get<UnreadCounts>('/api/notifications/counts').then((r) => r.data),

  markRead: (id: number) => api.post<void>(`/api/notifications/${id}/read`).then((r) => r.data),

  markAllRead: () => api.post<void>('/api/notifications/read-all').then((r) => r.data),

  remove: (id: number) => api.delete<void>(`/api/notifications/${id}`).then((r) => r.data),
};

export const storyApi = {
  reels: () => api.get<StoryReel[]>('/api/stories').then((r) => r.data),

  archive: () => api.get<Story[]>('/api/stories/archive').then((r) => r.data),

  create: (payload: {
    imageUrl?: string;
    text?: string;
    backgroundColor?: string;
    overlays?: string;
    audience?: StoryAudience;
  }) => api.post<Story>('/api/stories', payload).then((r) => r.data),

  markSeen: (storyId: number) => api.post<void>(`/api/stories/${storyId}/seen`).then((r) => r.data),

  react: (storyId: number, emoji: string) =>
    api.post<void>(`/api/stories/${storyId}/react`, { emoji }).then((r) => r.data),

  reply: (storyId: number, content: string) =>
    api.post<{ conversationId: number }>(`/api/stories/${storyId}/reply`, { content }).then((r) => r.data),

  viewers: (storyId: number) =>
    api.get<StoryViewerRow[]>(`/api/stories/${storyId}/viewers`).then((r) => r.data),

  remove: (storyId: number) => api.delete<void>(`/api/stories/${storyId}`).then((r) => r.data),

  highlights: (userId: number) =>
    api.get<Highlight[]>(`/api/stories/highlights/user/${userId}`).then((r) => r.data),

  createHighlight: (title: string, storyIds: number[]) =>
    api.post<Highlight>('/api/stories/highlights', { title, storyIds }).then((r) => r.data),

  updateHighlight: (id: number, payload: { title?: string; storyIds?: number[] }) =>
    api.patch<Highlight>(`/api/stories/highlights/${id}`, payload).then((r) => r.data),

  deleteHighlight: (id: number) => api.delete<void>(`/api/stories/highlights/${id}`).then((r) => r.data),
};

export const groupApi = {
  mine: () => api.get<Group[]>('/api/groups').then((r) => r.data),

  discover: () => api.get<Group[]>('/api/groups/discover').then((r) => r.data),

  invites: () => api.get<GroupInvite[]>('/api/groups/invites').then((r) => r.data),

  one: (id: number) => api.get<Group>(`/api/groups/${id}`).then((r) => r.data),

  members: (id: number) => api.get<GroupMember[]>(`/api/groups/${id}/members`).then((r) => r.data),

  create: (payload: { name: string; description?: string; coverUrl?: string; privacy?: string }) =>
    api.post<Group>('/api/groups', payload).then((r) => r.data),

  update: (
    id: number,
    payload: {
      name?: string;
      description?: string;
      coverUrl?: string;
      privacy?: string;
      postApproval?: boolean;
      rules?: string;
    },
  ) => api.patch<Group>(`/api/groups/${id}`, payload).then((r) => r.data),

  remove: (id: number) => api.delete<void>(`/api/groups/${id}`).then((r) => r.data),

  /** Joins a public group, or asks to join a private one. */
  join: (id: number, answer?: string) => api.post<Group>(`/api/groups/${id}/join`, { answer }).then((r) => r.data),

  cancelRequest: (id: number) => api.delete<void>(`/api/groups/${id}/request`).then((r) => r.data),

  requests: (id: number) => api.get<JoinRequest[]>(`/api/groups/${id}/requests`).then((r) => r.data),

  answerRequest: (id: number, userId: number, approve: boolean) =>
    api
      .post<void>(`/api/groups/${id}/requests/${userId}/${approve ? 'approve' : 'decline'}`)
      .then((r) => r.data),

  invite: (id: number, userIds: number[]) =>
    api.post<{ sent: number }>(`/api/groups/${id}/invite`, { userIds }).then((r) => r.data),

  declineInvite: (id: number) => api.delete<void>(`/api/groups/${id}/invite`).then((r) => r.data),

  leave: (id: number) => api.delete<void>(`/api/groups/${id}/membership`).then((r) => r.data),

  setRole: (id: number, userId: number, role: GroupMember['role']) =>
    api.patch<GroupMember>(`/api/groups/${id}/members/${userId}`, { role }).then((r) => r.data),

  removeMember: (id: number, userId: number) =>
    api.delete<void>(`/api/groups/${id}/members/${userId}`).then((r) => r.data),
};

export interface EventPayload {
  name: string;
  description?: string;
  coverUrl?: string;
  location?: string;
  startsAt: string;
  endsAt?: string;
  online?: boolean;
  inviteUserIds?: number[];
}

export const eventApi = {
  upcoming: () => api.get<Event[]>('/api/events').then((r) => r.data),

  past: () => api.get<Event[]>('/api/events/past').then((r) => r.data),

  mine: () => api.get<Event[]>('/api/events/mine').then((r) => r.data),

  invites: () => api.get<EventInvite[]>('/api/events/invites').then((r) => r.data),

  one: (id: number) => api.get<Event>(`/api/events/${id}`).then((r) => r.data),

  attendees: (id: number) => api.get<Attendee[]>(`/api/events/${id}/attendees`).then((r) => r.data),

  invited: (id: number) => api.get<number[]>(`/api/events/${id}/invited`).then((r) => r.data),

  create: (payload: EventPayload) => api.post<Event>('/api/events', payload).then((r) => r.data),

  update: (id: number, payload: Partial<EventPayload> & { clearEnd?: boolean }) =>
    api.patch<Event>(`/api/events/${id}`, payload).then((r) => r.data),

  invite: (id: number, userIds: number[]) =>
    api.post<{ sent: number }>(`/api/events/${id}/invite`, { userIds }).then((r) => r.data),

  respond: (id: number, status: AttendeeStatus) =>
    api.post<Event>(`/api/events/${id}/respond`, { status }).then((r) => r.data),

  remove: (id: number) => api.delete<void>(`/api/events/${id}`).then((r) => r.data),
};

export interface ListingPayload {
  title: string;
  description?: string;
  price: number;
  currency?: string;
  category: string;
  location?: string;
  imageUrl?: string;
  condition?: ListingCondition;
}

export const marketplaceApi = {
  categories: () => api.get<string[]>('/api/marketplace/categories').then((r) => r.data),

  browse: (filters: ListingFilters = {}) =>
    api.get<Listing[]>('/api/marketplace', { params: filters }).then((r) => r.data),

  mine: () => api.get<Listing[]>('/api/marketplace/mine').then((r) => r.data),

  saved: () => api.get<Listing[]>('/api/marketplace/saved').then((r) => r.data),

  bySeller: (sellerId: number) =>
    api.get<Listing[]>(`/api/marketplace/seller/${sellerId}`).then((r) => r.data),

  one: (id: number) => api.get<Listing>(`/api/marketplace/${id}`).then((r) => r.data),

  create: (payload: ListingPayload) => api.post<Listing>('/api/marketplace', payload).then((r) => r.data),

  update: (id: number, payload: Partial<ListingPayload>) =>
    api.patch<Listing>(`/api/marketplace/${id}`, payload).then((r) => r.data),

  setStatus: (id: number, status: string) =>
    api.patch<Listing>(`/api/marketplace/${id}/status`, { status }).then((r) => r.data),

  toggleSave: (id: number) =>
    api.post<{ listingId: number; saved: boolean }>(`/api/marketplace/${id}/save`).then((r) => r.data),

  /** Tells the seller you are interested; the reply happens in Messenger. */
  registerInterest: (id: number) =>
    api.post<void>(`/api/marketplace/${id}/interest`).then((r) => r.data),

  remove: (id: number) => api.delete<void>(`/api/marketplace/${id}`).then((r) => r.data),
};

export const pageApi = {
  categories: () => api.get<string[]>('/api/pages/categories').then((r) => r.data),
  connected: () => api.get<Page[]>('/api/pages').then((r) => r.data),
  mine: () => api.get<Page[]>('/api/pages/mine').then((r) => r.data),
  discover: () => api.get<Page[]>('/api/pages/discover').then((r) => r.data),
  one: (id: number) => api.get<Page>(`/api/pages/${id}`).then((r) => r.data),
  create: (payload: PagePayload) => api.post<Page>('/api/pages', payload).then((r) => r.data),
  update: (id: number, payload: PagePayload) => api.put<Page>(`/api/pages/${id}`, payload).then((r) => r.data),
  remove: (id: number) => api.delete<void>(`/api/pages/${id}`).then((r) => r.data),
  toggleLike: (id: number) => api.post<Page>(`/api/pages/${id}/like`).then((r) => r.data),
  toggleFollow: (id: number) => api.post<Page>(`/api/pages/${id}/follow`).then((r) => r.data),
  reviews: (id: number) => api.get<PageReview[]>(`/api/pages/${id}/reviews`).then((r) => r.data),
  review: (id: number, recommends: boolean, content?: string) =>
    api.post<PageReview>(`/api/pages/${id}/reviews`, { recommends, content }).then((r) => r.data),
  deleteReview: (id: number) => api.delete<void>(`/api/pages/${id}/reviews`).then((r) => r.data),
};

export const albumApi = {
  ofUser: (userId: number) => api.get<Album[]>(`/api/albums/user/${userId}`).then((r) => r.data),
  one: (id: number) => api.get<Album>(`/api/albums/${id}`).then((r) => r.data),
  create: (payload: { title: string; description?: string; photoUrls: string[] }) =>
    api.post<Album>('/api/albums', payload).then((r) => r.data),
  update: (id: number, payload: { title?: string; description?: string }) =>
    api.patch<Album>(`/api/albums/${id}`, payload).then((r) => r.data),
  addPhotos: (id: number, photoUrls: string[], caption?: string) =>
    api.post<Album>(`/api/albums/${id}/photos`, { photoUrls, caption }).then((r) => r.data),
  deletePhoto: (photoId: number) => api.delete<void>(`/api/albums/photos/${photoId}`).then((r) => r.data),
  remove: (id: number) => api.delete<void>(`/api/albums/${id}`).then((r) => r.data),
};

export const fundraiserApi = {
  categories: () => api.get<string[]>('/api/fundraisers/categories').then((r) => r.data),
  all: () => api.get<Fundraiser[]>('/api/fundraisers').then((r) => r.data),
  mine: () => api.get<Fundraiser[]>('/api/fundraisers/mine').then((r) => r.data),
  one: (id: number) => api.get<Fundraiser>(`/api/fundraisers/${id}`).then((r) => r.data),
  donations: (id: number) => api.get<Donation[]>(`/api/fundraisers/${id}/donations`).then((r) => r.data),
  create: (payload: FundraiserPayload) => api.post<Fundraiser>('/api/fundraisers', payload).then((r) => r.data),
  update: (id: number, payload: FundraiserPayload) =>
    api.put<Fundraiser>(`/api/fundraisers/${id}`, payload).then((r) => r.data),
  setClosed: (id: number, closed: boolean) =>
    api.post<Fundraiser>(`/api/fundraisers/${id}/close`, { closed }).then((r) => r.data),
  remove: (id: number) => api.delete<void>(`/api/fundraisers/${id}`).then((r) => r.data),
  donate: (id: number, amount: number, message?: string) =>
    api.post<Fundraiser>(`/api/fundraisers/${id}/donate`, { amount, message }).then((r) => r.data),
};

export const gameApi = {
  catalog: () => api.get<Game[]>('/api/games').then((r) => r.data),
  leaderboard: (game: GameKey) => api.get<Leader[]>(`/api/games/${game}/leaderboard`).then((r) => r.data),
  submit: (game: GameKey, score: number) =>
    api.post<ScoreResult>(`/api/games/${game}/scores`, { score }).then((r) => r.data),
};

export const jobApi = {
  types: () => api.get<string[]>('/api/jobs/types').then((r) => r.data),
  browse: (filters: { q?: string; type?: string; location?: string; remote?: boolean } = {}) =>
    api.get<Job[]>('/api/jobs', { params: filters }).then((r) => r.data),
  mine: () => api.get<Job[]>('/api/jobs/mine').then((r) => r.data),
  myApplications: () => api.get<JobApplication[]>('/api/jobs/applications').then((r) => r.data),
  one: (id: number) => api.get<Job>(`/api/jobs/${id}`).then((r) => r.data),
  create: (payload: JobPayload) => api.post<Job>('/api/jobs', payload).then((r) => r.data),
  update: (id: number, payload: JobPayload) => api.put<Job>(`/api/jobs/${id}`, payload).then((r) => r.data),
  remove: (id: number) => api.delete<void>(`/api/jobs/${id}`).then((r) => r.data),
  apply: (id: number, payload: { message?: string; email?: string; phone?: string; resumeUrl?: string }) =>
    api.post<Job>(`/api/jobs/${id}/apply`, payload).then((r) => r.data),
  applicants: (id: number) => api.get<JobApplication[]>(`/api/jobs/${id}/applications`).then((r) => r.data),
  setStatus: (applicationId: number, status: JobApplication['status']) =>
    api.patch<JobApplication>(`/api/jobs/applications/${applicationId}`, { status }).then((r) => r.data),
};

export const datingApi = {
  /** Null when you have not set up Dating yet. */
  profile: () =>
    api.get<DatingProfile | ''>('/api/dating/profile').then((r) => (r.status === 204 || !r.data ? null : r.data)),
  save: (payload: DatingProfilePayload) => api.put<DatingProfile>('/api/dating/profile', payload).then((r) => r.data),
  suggestions: () => api.get<DatingProfile[]>('/api/dating/suggestions').then((r) => r.data),
  swipe: (userId: number, liked: boolean) =>
    api
      .post<{ matched: boolean; match?: DatingProfile | null }>(`/api/dating/swipe/${userId}`, { liked })
      .then((r) => r.data),
  matches: () => api.get<DatingProfile[]>('/api/dating/matches').then((r) => r.data),
  likes: () => api.get<{ count: number }>('/api/dating/likes').then((r) => r.data),
};

export const adApi = {
  serve: (count = 2) => api.get<Ad[]>('/api/ads/serve', { params: { count } }).then((r) => r.data),
  click: (id: number) => api.post<{ url: string }>(`/api/ads/${id}/click`).then((r) => r.data),
  mine: () => api.get<Ad[]>('/api/ads/mine').then((r) => r.data),
  create: (payload: AdPayload) => api.post<Ad>('/api/ads', payload).then((r) => r.data),
  update: (id: number, payload: AdPayload) => api.put<Ad>(`/api/ads/${id}`, payload).then((r) => r.data),
  setActive: (id: number, active: boolean) =>
    api.post<Ad>(`/api/ads/${id}/active`, { active }).then((r) => r.data),
  remove: (id: number) => api.delete<void>(`/api/ads/${id}`).then((r) => r.data),
};

export const searchApi = {
  all: (query: string) =>
    api.get<SearchResults>('/api/search', { params: { q: query } }).then((r) => r.data),
};
