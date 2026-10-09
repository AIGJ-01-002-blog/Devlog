// 화면을 그리기 전에 테마를 정한다 (spec 021 FR-008). 인라인 스크립트 없이(CSP script-src 'self') 머리에서 바로 실행한다.
// 고정 선택(light/dark)만 data-theme로 두고, 없으면 CSS가 기기 설정을 따른다. 저장소가 막혀도 오류 없이 기기 설정만 따른다.
(function (d) {
  try {
    var t = localStorage.getItem('blog.theme')
    if (t === 'light' || t === 'dark') {
      d.setAttribute('data-theme', t)
      // 휴대폰 주소창 색도 고른 테마 배경에 맞춘다 (068). 두 meta(라이트·다크)를 같은 색으로
      var metas = d.querySelectorAll('meta[name="theme-color"]')
      for (var i = 0; i < metas.length; i++) metas[i].setAttribute('content', t === 'dark' ? '#121212' : '#ffffff')
    }
  } catch (e) { /* 저장소를 못 쓰면 기기 설정 */ }
  d.classList.add('js')
})(document.documentElement)
