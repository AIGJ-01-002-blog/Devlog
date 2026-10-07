export function Avatar({ src, name, size = 32 }: { src: string | null | undefined; name: string; size?: number }) {
  if (src) return <img className="avatar" src={src} alt="" width={size} height={size} loading="lazy" />
  return (
    <span className="avatar avatar-default" style={{ width: size, height: size, fontSize: size * 0.45 }} aria-hidden="true">
      {name.slice(0, 1)}
    </span>
  )
}
