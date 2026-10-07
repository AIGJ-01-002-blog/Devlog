// 화면을 그리기 전에 테마를 정한다 (spec 021 FR-008). 인라인 스크립트 없이(CSP script-src 'self') 머리에서 바로 실행한다.
// 고정 선택(light/dark)만 data-theme로 두고, 없으면 CSS가 기기 설정을 따른다. 저장소가 막혀도 오류 없이 기기 설정만 따른다.
(function (d) {
  try {
    var t = localStorage.getItem('blog.theme')
    if (t === 'light' || t === 'dark') d.setAttribute('data-theme', t)
  } catch (e) { /* 저장소를 못 쓰면 기기 설정 */ }
  d.classList.add('js')
})(document.documentElement)
