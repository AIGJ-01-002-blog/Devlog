export type Visibility = 'PUBLIC' | 'FRIENDS' | 'PRIVATE'
export type PostStatus = 'DRAFT' | 'PUBLISHED'

export interface MemberView {
  id: number
  handle: string
  nickname: string
  role: string
  defaultVisibility: Visibility
  status: string
  profileImageUrl: string | null
}

export interface Me {
  authenticated: boolean
  member: MemberView | null
  agreementRequired: boolean
  previousLogin: { at: string | null; provider: string } | null
  pendingSignup: boolean
  /** 메일 인증 전이면 글쓰기 같은 쓰기 행동이 막힌다 (004) */
  emailVerified: boolean
}

export interface CardAuthor {
  id: number
  handle: string
  nickname: string
  profileImageUrl: string | null
}

export interface Card {
  id: number
  url: string
  title: string
  excerpt: string | null
  thumbnailUrl: string | null
  /** 친구 공개 글은 null */
  firstPublicAt: string | null
  publishedAt: string
  visibility: Visibility
  commentCount: number
  likeCount: number
  author: CardAuthor
}

export interface FeedPage {
  items: Card[]
  nextCursor: string | null
}

export interface BlogProfile {
  id: number
  handle: string
  nickname: string
  bio: string | null
  profileImageUrl: string | null
  publicPostCount: number
  mine: boolean
  /** 보는 사람 기준 친구 관계. 비회원·본인이면 null */
  friendship: FriendRelation | null
  /** 친구이고 양쪽 모두 공개 설정을 켰을 때만 0~7 (7 = 1주 이상) */
  lastActiveDaysAgo: number | null
}

export type FriendRelation = 'NONE' | 'SENT' | 'RECEIVED' | 'FRIENDS'

export interface FriendPerson {
  handle: string
  nickname: string
  profileImageUrl: string | null
  since: string
  lastActiveDaysAgo: number | null
}

export interface FriendOverview {
  friends: FriendPerson[]
  received: FriendPerson[]
  sent: FriendPerson[]
  lastActiveVisible: boolean
}

export interface PostDetail {
  id: number
  url: string
  title: string
  contentHtml: string
  excerpt: string | null
  thumbnailUrl: string | null
  status: PostStatus
  visibility: Visibility
  publishedAt: string | null
  firstPublicAt: string | null
  editedAt: string | null
  viewCount: number
  likeCount: number
  commentCount: number
  author: { id: number; handle: string; nickname: string; bio: string | null; profileImageUrl: string | null }
  mine: boolean
  owner: { editing: boolean; editingSavedAt: string | null; hidden: boolean } | null
  /** 입력한 순서 (010) */
  tags: string[]
}

export interface EditorView {
  id: number
  status: PostStatus
  visibility: Visibility
  title: string
  contentMd: string
  version: number
  savedAt: string
  editing: boolean
  url: string | null
  publishedAt: string | null
  firstPublicAt: string | null
  editedAt: string | null
  /** 지금 달린 태그. 다시 발행할 때 미리 채운다 (010) */
  tags: string[]
}

export interface ServerContent {
  title: string
  contentMd: string
  version: number
  savedAt: string
}

export interface ManageItem {
  id: number
  title: string
  status: PostStatus
  visibility: Visibility | null
  editing: boolean
  hidden: boolean
  updatedAt: string
  publishedAt: string | null
  editedAt: string | null
  deletedAt: string | null
  purgeAt: string | null
  viewCount: number
  likeCount: number
  commentCount: number
}

export interface ManagePage {
  items: ManageItem[]
  nextCursor: string | null
  counts: { drafts: number; published: number; trash: number } | null
}
