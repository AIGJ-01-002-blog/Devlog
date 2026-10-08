import { useRef, useState } from 'react'
import { ACCEPTED_TYPES } from '../lib/image'
import { prepareImage, uploadPostImage } from '../lib/postImages'
import { thumbnailPreview, type ThumbnailChoice } from '../lib/postThumbnail'

/**
 * 발행 창의 썸네일 칸 (047). velog처럼 미리보기와 [사진 올리기]·[본문 첫 사진으로]·[썸네일 없애기]를 둔다.
 * 올린 사진은 본문 사진과 같은 규칙으로 올라가고, 발행할 때 고른 것으로 확정된다.
 */
export function ThumbnailPicker({ value, content, error, onChange, onBusy }: {
  value: ThumbnailChoice
  content: string
  error?: string
  onChange: (c: ThumbnailChoice) => void
  onBusy: (busy: boolean) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const preview = thumbnailPreview(value, content)
  const message = uploadError ?? error

  const pick = async (file: File | undefined) => {
    if (!file) return
    setUploadError(null)
    setUploading(true)
    onBusy(true)
    try {
      const up = await uploadPostImage(await prepareImage(file))
      onChange({ kind: 'image', url: up.url })
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : '사진을 올리지 못했어요.')
    } finally {
      setUploading(false)
      onBusy(false)
    }
  }

  return (
    <fieldset className="field thumbnail-picker">
      <legend>썸네일</legend>
      <div className="thumbnail-preview">
        {preview
          ? <img src={preview} alt="" />
          : <span className="muted small">{value.kind === 'none' ? '썸네일 없음' : '본문에 사진이 없어요'}</span>}
      </div>
      <p className="muted small" aria-live="polite">
        {uploading ? '사진을 올리는 중…'
          : value.kind === 'image' ? '직접 고른 사진이 목록과 공유 미리보기에 보여요.'
          : value.kind === 'none' ? '목록에 사진 없이 보여요.'
          : '본문 첫 사진이 목록과 공유 미리보기에 보여요.'}
      </p>
      <div className="row">
        <button type="button" className="btn btn-outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {value.kind === 'image' ? '다른 사진 올리기' : '사진 올리기'}
        </button>
        {value.kind !== 'auto' && (
          <button type="button" className="btn btn-text" disabled={uploading} onClick={() => onChange({ kind: 'auto' })}>본문 첫 사진으로</button>
        )}
        {value.kind !== 'none' && (
          <button type="button" className="btn btn-text" disabled={uploading} onClick={() => onChange({ kind: 'none' })}>썸네일 없애기</button>
        )}
      </div>
      <input ref={fileRef} type="file" accept={ACCEPTED_TYPES.join(',')} hidden
             onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = '' }} />
      {message && <p className="error small" role="alert">{message}</p>}
    </fieldset>
  )
}
