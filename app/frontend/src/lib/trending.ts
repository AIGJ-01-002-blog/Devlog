// 트렌딩 (spec 017): 순위표는 서버가 10분마다 만들고, 커서에 보던 순위표가 담겨 있다. 만료되면 410이고 Feed가 처음부터 다시 받는다.
export const TRENDING_ENDPOINT = '/api/posts/trending'
export const TRENDING_HINT = '최근 7일 동안 반응이 많은 글 · 10분마다 갱신'
