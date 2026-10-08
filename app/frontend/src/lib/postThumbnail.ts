import { bodyImages } from './postImages'

// 글 썸네일 고르기 (047). 고르지 않으면 서버가 본문 첫 사진을 쓴다. 발행할 때만 확정된다.

export type ThumbnailChoice =
  | { kind: 'auto' }
  | { kind: 'image'; url: string }
  | { kind: 'none' }

/** 에디터 정보로 지금 고른 상태를 만든다. */
export function initialThumbnail(view: { thumbnailUrl: string | null; thumbnailHidden: boolean }): ThumbnailChoice {
  if (view.thumbnailHidden) return { kind: 'none' }
  return view.thumbnailUrl ? { kind: 'image', url: view.thumbnailUrl } : { kind: 'auto' }
}

/** 발행 요청에 넣는 두 칸. */
export function thumbnailRequest(c: ThumbnailChoice): { thumbnailUrl: string | null; thumbnailHidden: boolean } {
  return { thumbnailUrl: c.kind === 'image' ? c.url : null, thumbnailHidden: c.kind === 'none' }
}

/**
 * 발행 창 미리보기 주소. 자동이면 본문 첫 사진(올리는 중인 사진은 뺀다).
 * 바깥 주소 사진은 서버가 대표 사진으로 쓰지 않지만 화면에서는 구분하지 않는다(드물다).
 */
export function thumbnailPreview(c: ThumbnailChoice, contentMd: string): string | null {
  if (c.kind === 'image') return c.url
  if (c.kind === 'none') return null
  return bodyImages(contentMd).find((i) => !i.src.startsWith('local:'))?.src ?? null
}
