import { useEffect, useState, type FormEvent } from 'react'
import { SEARCH_MAX_LENGTH } from '../lib/search'

/** 검색창. 50자까지 받고(서버도 자른다) 빈 검색어는 보내지 않는다. */
export function SearchBox({ initial, placeholder, onSearch, autoFocus = false }: {
  initial: string
  placeholder: string
  onSearch: (q: string) => void
  autoFocus?: boolean
}) {
  const [value, setValue] = useState(initial)
  useEffect(() => setValue(initial), [initial])
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const q = value.trim()
    if (q) onSearch(q)
  }
  return (
    <form className="search-box" role="search" onSubmit={submit}>
      <input type="search" value={value} maxLength={SEARCH_MAX_LENGTH} placeholder={placeholder} aria-label={placeholder}
             autoFocus={autoFocus} enterKeyHint="search" onChange={(e) => setValue(e.target.value)} />
      <button type="submit" className="btn btn-dark">검색</button>
    </form>
  )
}
