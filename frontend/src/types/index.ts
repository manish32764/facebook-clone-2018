export interface User {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  bio?: string | null;
  hometown?: string | null;
  currentCity?: string | null;
  work?: string | null;
  education?: string | null;
  relationshipStatus?: string | null;
  phone?: string | null;
  website?: string | null;
  gender?: string | null;
  birthDate?: string | null;
  lastSeenAt?: string | null;
  createdAt?: string | null;
}

/** The six reactions, in the order the picker shows them. */
export type ReactionName = 'LIKE' | 'LOVE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY';

export interface ReactionSummary {
  total: number;
  /** Only the reactions actually used appear here. */
  breakdown: Partial<Record<ReactionName, number>>;
  top: ReactionName[];
  myReaction?: ReactionName | null;
}

export interface Reactor {
  user: User;
  reaction: ReactionName;
}

export interface Comment {
  id: number;
  author: User;
  content: string;
  imageUrl?: string | null;
  parentId?: number | null;
  createdAt: string;
  editedAt?: string | null;
  likeCount: number;
  likedByMe: boolean;
  reactions?: ReactionSummary;
  replies: Comment[];
}

export type Privacy = 'PUBLIC' | 'FRIENDS' | 'FRIENDS_EXCEPT' | 'SPECIFIC' | 'CLOSE_FRIENDS' | 'ONLY_ME';

export interface GroupRef {
  id: number;
  name: string;
  coverUrl?: string | null;
}

export interface Post {
  id: number;
  author: User;
  content: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  feeling?: string | null;
  location?: string | null;
  privacy: Privacy;
  createdAt: string;
  editedAt?: string | null;
  reactions: ReactionSummary;
  commentCount: number;
  shareCount: number;
  savedByMe: boolean;
  comments: Comment[];
  taggedUsers: User[];
  group?: GroupRef | null;
  sharedPost?: Post | null;
  /** Whose timeline it was written on, when that is not the author's. */
  wallOwner?: User | null;
  /** Set when the post was published as a Page. */
  page?: PageRef | null;
  pinned?: boolean;
  /** Waiting for a group admin. */
  pending?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canPin?: boolean;
  /** Author only: who a custom audience names. */
  audience?: User[];
}

export type Relationship = 'NONE' | 'FRIENDS' | 'REQUEST_SENT' | 'REQUEST_RECEIVED' | 'SELF';

export interface Friend {
  user: User;
  relationship: Relationship;
  mutualFriends: number;
}

export interface FriendRequest {
  requestId: number;
  from: User;
  createdAt: string;
}

export interface SentRequest {
  requestId: number;
  to: User;
  createdAt: string;
}

export interface MutualFriends {
  mutual: User[];
  total: number;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export interface ProfileResponse {
  user: User;
  relationship: Relationship;
  online: boolean;
  mutualFriends: MutualFriends;
  /** A pending request between you, in either direction. */
  friendRequestId?: number | null;
  following: boolean;
  followerCount: number;
  followingCount: number;
  /** Your friend lists this person is on. */
  friendListIds: number[];
}

export interface CreatePostPayload {
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  feeling?: string;
  location?: string;
  privacy?: Privacy;
  groupId?: number;
  tagUserIds?: number[];
  wallOwnerId?: number;
  pageId?: number;
  audienceUserIds?: number[];
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  gender?: string;
  birthDate?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
}

// ---------------------------------------------------------------- messenger ---

export type MessageType = 'TEXT' | 'IMAGE' | 'STICKER' | 'SYSTEM';

export interface Message {
  id: number;
  conversationId: number;
  sender: User;
  content?: string | null;
  attachmentUrl?: string | null;
  type: MessageType;
  deleted: boolean;
  createdAt: string;
  /** Emoji to the names of the people who chose it. */
  reactions: Record<string, string[]>;
  myReaction?: string | null;
}

export interface Conversation {
  id: number;
  type: 'DIRECT' | 'GROUP';
  title: string;
  pictureUrl?: string | null;
  participants: User[];
  otherUser?: User | null;
  lastMessage?: Message | null;
  unreadCount: number;
  lastMessageAt?: string | null;
  muted: boolean;
  online: boolean;
}

export interface Thread {
  conversation: Conversation;
  messages: Message[];
  hasMore: boolean;
}

export interface UnreadCounts {
  messages: number;
  notifications: number;
  friendRequests: number;
}

// ------------------------------------------------------------ notifications ---

export type NotificationType =
  | 'POST_REACTION' | 'COMMENT' | 'COMMENT_REPLY' | 'COMMENT_REACTION' | 'POST_SHARE'
  | 'MENTION' | 'TAG' | 'FRIEND_REQUEST' | 'FRIEND_ACCEPTED' | 'GROUP_INVITE'
  | 'GROUP_POST' | 'EVENT_INVITE' | 'EVENT_REMINDER' | 'MESSAGE' | 'BIRTHDAY'
  | 'MEMORY' | 'LISTING_INTEREST'
  | 'WALL_POST' | 'FOLLOW' | 'POKE'
  | 'GROUP_JOIN_REQUEST' | 'GROUP_JOIN_APPROVED' | 'GROUP_POST_PENDING' | 'GROUP_POST_APPROVED' | 'GROUP_ROLE'
  | 'EVENT_UPDATED' | 'PAGE_LIKE' | 'PAGE_REVIEW' | 'STORY_REACTION' | 'STORY_REPLY'
  | 'FUNDRAISER_DONATION' | 'JOB_APPLICATION' | 'JOB_APPLICATION_UPDATE' | 'DATING_MATCH';

export interface AppNotification {
  id: number;
  type: NotificationType;
  actor?: User | null;
  text: string;
  link?: string | null;
  imageUrl?: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationPage {
  items: AppNotification[];
  unreadCount: number;
  hasMore: boolean;
}

// ------------------------------------------------------------------ stories ---

export interface Story {
  id: number;
  imageUrl?: string | null;
  text?: string | null;
  backgroundColor?: string | null;
  createdAt: string;
  expiresAt: string;
  seen: boolean;
  viewCount: number;
  /** JSON array of StoryOverlay. */
  overlays?: string | null;
  audience?: StoryAudience;
  reactionCount?: number;
}

export type StoryAudience = 'PUBLIC' | 'FRIENDS' | 'CLOSE_FRIENDS';

/** A text or sticker layer drawn over a story, positioned in 0-1 fractions. */
export interface StoryOverlay {
  kind: 'text' | 'sticker';
  value: string;
  x: number;
  y: number;
  color?: string;
  size?: number;
}

export interface StoryViewerRow {
  user: User;
  viewedAt?: string | null;
  reactions: string[];
}

export interface Highlight {
  id: number;
  title: string;
  coverUrl?: string | null;
  owner: User;
  stories: Story[];
}

export interface StoryReel {
  author: User;
  stories: Story[];
  allSeen: boolean;
}

// ------------------------------------------------------------------- groups ---

export interface Group {
  id: number;
  name: string;
  description?: string | null;
  coverUrl?: string | null;
  privacy: 'PUBLIC' | 'PRIVATE';
  createdBy: User;
  memberCount: number;
  myRole?: 'ADMIN' | 'MODERATOR' | 'MEMBER' | null;
  joined: boolean;
  createdAt: string;
  postApproval: boolean;
  rules?: string | null;
  requestPending: boolean;
  invitedBy?: User | null;
  pendingRequestCount: number;
  pendingPostCount: number;
}

export interface JoinRequest {
  id: number;
  user: User;
  answer?: string | null;
  createdAt: string;
}

export interface GroupInvite {
  group: Group;
  inviter: User;
  createdAt: string;
}

export interface GroupMember {
  user: User;
  role: 'ADMIN' | 'MODERATOR' | 'MEMBER';
  joinedAt: string;
}

// ------------------------------------------------------------------- events ---

export type AttendeeStatus = 'GOING' | 'INTERESTED' | 'NOT_GOING';

export interface Event {
  id: number;
  name: string;
  description?: string | null;
  coverUrl?: string | null;
  location?: string | null;
  startsAt: string;
  endsAt?: string | null;
  online: boolean;
  host: User;
  goingCount: number;
  interestedCount: number;
  myStatus?: AttendeeStatus | null;
  invitedCount: number;
}

export interface EventInvite {
  event: Event;
  inviter: User;
  createdAt: string;
}

export interface Attendee {
  user: User;
  status: AttendeeStatus;
}

// -------------------------------------------------------------- marketplace ---

export type ListingCondition = 'NEW' | 'USED_LIKE_NEW' | 'USED_GOOD' | 'USED_FAIR';

export interface Listing {
  id: number;
  seller: User;
  title: string;
  description?: string | null;
  price: number;
  currency: string;
  category: string;
  location?: string | null;
  imageUrl?: string | null;
  condition: ListingCondition;
  status: 'AVAILABLE' | 'PENDING' | 'SOLD';
  mine: boolean;
  createdAt: string;
  savedByMe: boolean;
}

export interface ListingFilters {
  category?: string;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  condition?: string;
  sort?: 'newest' | 'price_asc' | 'price_desc';
}

// ------------------------------------------------------------------- search ---

export interface SearchResults {
  query: string;
  people: Friend[];
  posts: Post[];
  groups: Group[];
  events: Event[];
  listings: Listing[];
  pages: Page[];
}

// -------------------------------------------------------------------- pages ---

export interface PageRef {
  id: number;
  name: string;
  avatarUrl?: string | null;
  category: string;
}

export interface Page {
  id: number;
  name: string;
  category: string;
  description?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  website?: string | null;
  phone?: string | null;
  location?: string | null;
  owner: User;
  likeCount: number;
  followerCount: number;
  liked: boolean;
  following: boolean;
  mine: boolean;
  recommendPercent?: number | null;
  reviewCount: number;
  createdAt: string;
}

export interface PagePayload {
  name: string;
  category: string;
  description?: string;
  avatarUrl?: string;
  coverUrl?: string;
  website?: string;
  phone?: string;
  location?: string;
}

export interface PageReview {
  id: number;
  author: User;
  recommends: boolean;
  content?: string | null;
  createdAt: string;
}

// ------------------------------------------------------------------- social ---

export interface BlockedUser {
  user: User;
  blockedAt: string;
}

export type ReportTarget = 'USER' | 'POST' | 'COMMENT' | 'MESSAGE' | 'PAGE' | 'GROUP' | 'LISTING' | 'STORY';

export interface Report {
  id: number;
  targetType: ReportTarget;
  targetId: number;
  targetLabel?: string | null;
  reason: string;
  details?: string | null;
  status: 'OPEN' | 'REVIEWED' | 'ACTION_TAKEN';
  createdAt: string;
}

export interface FollowState {
  following: boolean;
  followerCount: number;
  followingCount: number;
}

export interface FriendList {
  id: number;
  name: string;
  kind: 'CLOSE_FRIENDS' | 'ACQUAINTANCES' | 'CUSTOM';
  members: User[];
}

export interface Poke {
  id: number;
  user: User;
  count: number;
  lastPokedAt: string;
}

// ------------------------------------------------------------------- albums ---

export interface Photo {
  id: number;
  albumId: number;
  url: string;
  caption?: string | null;
  createdAt: string;
}

export interface Album {
  id: number;
  owner: User;
  title: string;
  description?: string | null;
  coverUrl?: string | null;
  photoCount: number;
  createdAt: string;
  photos: Photo[];
}

// -------------------------------------------------------------- fundraisers ---

export interface Fundraiser {
  id: number;
  creator: User;
  title: string;
  story?: string | null;
  coverUrl?: string | null;
  goal: number;
  raised: number;
  currency: string;
  category: string;
  beneficiary?: string | null;
  endsAt?: string | null;
  closed: boolean;
  donationCount: number;
  mine: boolean;
  createdAt: string;
}

export interface FundraiserPayload {
  title: string;
  story?: string;
  coverUrl?: string;
  goal: number;
  category: string;
  beneficiary?: string;
  endsAt?: string;
}

export interface Donation {
  id: number;
  donor: User;
  amount: number;
  message?: string | null;
  createdAt: string;
}

// -------------------------------------------------------------------- games ---

export type GameKey = 'SNAKE' | 'G2048' | 'MEMORY';

export interface Leader {
  user: User;
  score: number;
  rank: number;
}

export interface Game {
  key: GameKey;
  name: string;
  description: string;
  color: string;
  myBest: number;
  myPlays: number;
  leaders: Leader[];
}

export interface ScoreResult {
  score: number;
  best: number;
  newBest: boolean;
  leaders: Leader[];
}

// --------------------------------------------------------------------- jobs ---

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'VOLUNTEER';

export interface Job {
  id: number;
  poster: User;
  page?: PageRef | null;
  title: string;
  company: string;
  location?: string | null;
  employmentType: EmploymentType;
  remote: boolean;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency: string;
  description?: string | null;
  open: boolean;
  mine: boolean;
  applicantCount: number;
  myApplicationStatus?: string | null;
  createdAt: string;
}

export interface JobPayload {
  title: string;
  company: string;
  location?: string;
  employmentType: EmploymentType;
  remote: boolean;
  salaryMin?: number;
  salaryMax?: number;
  description?: string;
  pageId?: number;
  open?: boolean;
}

export interface JobApplication {
  id: number;
  job: Job;
  applicant: User;
  message?: string | null;
  email?: string | null;
  phone?: string | null;
  resumeUrl?: string | null;
  status: 'SUBMITTED' | 'REVIEWED' | 'INTERVIEW' | 'REJECTED' | 'HIRED';
  createdAt: string;
}

// ------------------------------------------------------------------- dating ---

export interface DatingProfile {
  user: User;
  bio?: string | null;
  interestedIn: 'MEN' | 'WOMEN' | 'EVERYONE';
  minAge: number;
  maxAge: number;
  city?: string | null;
  photoUrls: string[];
  active: boolean;
  age?: number | null;
  work?: string | null;
  education?: string | null;
}

export interface DatingProfilePayload {
  bio?: string;
  interestedIn?: string;
  minAge?: number;
  maxAge?: number;
  city?: string;
  photoUrls?: string[];
  active?: boolean;
}

// ---------------------------------------------------------------------- ads ---

export type CallToAction = 'LEARN_MORE' | 'SHOP_NOW' | 'SIGN_UP' | 'BOOK_NOW' | 'CONTACT_US' | 'DOWNLOAD';

export interface Ad {
  id: number;
  advertiser: User;
  page?: PageRef | null;
  title: string;
  body?: string | null;
  imageUrl?: string | null;
  linkUrl: string;
  callToAction: CallToAction;
  dailyBudget?: number | null;
  impressions: number;
  clicks: number;
  active: boolean;
  mine: boolean;
  createdAt: string;
}

export interface AdPayload {
  title: string;
  body?: string;
  imageUrl?: string;
  linkUrl: string;
  callToAction: CallToAction;
  dailyBudget?: number;
  pageId?: number;
  active?: boolean;
}
