import { Link } from '../lib/router'

/** 없음·볼 수 없음·권한 없음을 모두 같은 화면으로 (docs/42 P-4). */
export function NotFoundPage() {
  return (
    <main className="container narrow center not-found">
      <h1>볼 수 없는 페이지예요</h1>
      <p className="muted">주소가 바뀌었거나, 삭제·비공개된 글일 수 있어요.</p>
      <Link to="/" className="btn btn-primary">홈으로</Link>
    </main>
  )
}
