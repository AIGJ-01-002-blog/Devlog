/** 화면을 옮긴 뒤 한 번 보여 줄 안내 (예: 가입 직후 소셜 사진 복사 실패). 탭을 닫으면 사라진다. */
const KEY = 'blog.flash'

export function setFlash(message: string): void {
  try {
    sessionStorage.setItem(KEY, message)
  } catch {
    // 저장소를 못 쓰면 안내를 건너뛴다
  }
}

export function takeFlash(): string | null {
  try {
    const m = sessionStorage.getItem(KEY)
    if (m) sessionStorage.removeItem(KEY)
    return m
  } catch {
    return null
  }
}
