/** 포트폴리오 모드 로고 (072 3단계): main 줄에서 브랜치가 갈라졌다 다시 합쳐지는 그래프. 장식이라 이름은 옆 글자가 맡는다 */
export function GraphLogo({ size = 28 }: { size?: number }) {
  return (
    <svg className="graph-logo" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M8 4v24" stroke="var(--branch-main)" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M8 22c0-5 4-6 8-6s8-1 8-6V7" fill="none" stroke="var(--branch-series)" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M8 26c3 0 6-1 8-4" fill="none" stroke="var(--branch-topic)" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="2.4 2.6" />
      <circle cx="8" cy="22" r="3.2" fill="var(--color-surface)" stroke="var(--branch-main)" strokeWidth="2.2" />
      <circle cx="24" cy="7" r="3.4" fill="var(--branch-series)" />
      <circle cx="16" cy="16" r="2.8" fill="var(--branch-series)" />
    </svg>
  )
}
