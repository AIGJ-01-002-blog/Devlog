/**
 * 화면 안에서 주소를 옮기면 화면 읽기 프로그램은 바뀐 줄 모르고 이전 자리(누른 링크)에 머문다.
 * 새 화면의 본문(<main>)으로 초점을 옮겨 거기서부터 읽게 한다. 스크롤은 건드리지 않는다.
 */
export function focusMain(root = document) {
    const main = root.querySelector('main');
    if (!main)
        return false;
    if (!main.hasAttribute('tabindex'))
        main.setAttribute('tabindex', '-1');
    main.focus({ preventScroll: true });
    return true;
}
