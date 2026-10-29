import type { ReactNode } from 'react'

const images = import.meta.glob('../../../docs/guides/img/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>

function imageSrc(src: string): string {
  const name = src.split('/').pop() ?? src
  const found = Object.entries(images).find(([key]) => key.endsWith(`/${name}`))
  return found?.[1] ?? src
}

function inline(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = []
  const pattern = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g
  let last = 0
  let match: RegExpExecArray | null
  let index = 0
  while ((match = pattern.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    const token = match[0]
    const key = `${keyPrefix}-${index++}`
    if (token.startsWith('**')) {
      parts.push(<strong key={key}>{token.slice(2, -2)}</strong>)
    } else {
      const linked = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      if (linked) {
        const href = linked[2] ?? ''
        const external = href.startsWith('http')
        parts.push(
          <a key={key} href={href} className="font-semibold text-blue" {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>
            {linked[1]}
          </a>,
        )
      }
    }
    last = match.index + token.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

/** A small reader for the trial guides. Headings, lists, pictures, and bold text. */
export function GuideMarkdown({ source }: { source: string }) {
  const blocks: ReactNode[] = []
  const lines = source.replaceAll('\r\n', '\n').split('\n')
  let index = 0
  let key = 0

  while (index < lines.length) {
    const line = lines[index] ?? ''
    if (line.trim() === '') {
      index += 1
      continue
    }
    const heading = line.match(/^(#{1,3}) (.+)$/)
    if (heading) {
      const text = inline(heading[2] ?? '', `h${key}`)
      const level = heading[1]?.length ?? 1
      if (level === 1) blocks.push(<h1 key={key++} className="text-2xl font-semibold text-navy">{text}</h1>)
      else if (level === 2) blocks.push(<h2 key={key++} className="mt-8 text-xl font-semibold text-navy">{text}</h2>)
      else blocks.push(<h3 key={key++} className="mt-6 text-lg font-semibold text-navy">{text}</h3>)
      index += 1
      continue
    }
    const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    if (image) {
      blocks.push(
        <figure key={key++} className="mt-4">
          <img src={imageSrc(image[2] ?? '')} alt={image[1] ?? ''} className="w-full max-w-sm rounded-xl border border-line" />
          {image[1] && <figcaption className="mt-2 text-sm text-muted">{image[1]}</figcaption>}
        </figure>,
      )
      index += 1
      continue
    }
    if (line.startsWith('- ')) {
      const items: string[] = []
      while (index < lines.length && (lines[index] ?? '').startsWith('- ')) {
        items.push((lines[index] ?? '').slice(2))
        index += 1
      }
      blocks.push(
        <ul key={key++} className="mt-3 list-disc space-y-2 pl-5 text-base leading-relaxed">
          {items.map((item) => (
            <li key={item}>{inline(item, `li${key}`)}</li>
          ))}
        </ul>,
      )
      continue
    }
    if (/^\d+\. /.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^\d+\. /.test(lines[index] ?? '')) {
        items.push((lines[index] ?? '').replace(/^\d+\. /, ''))
        index += 1
      }
      blocks.push(
        <ol key={key++} className="mt-3 list-decimal space-y-2 pl-5 text-base leading-relaxed">
          {items.map((item) => (
            <li key={item}>{inline(item, `ol${key}`)}</li>
          ))}
        </ol>,
      )
      continue
    }
    const paragraph: string[] = []
    while (index < lines.length && (lines[index] ?? '').trim() !== '' && !/^(#{1,3} |- |\d+\. |!\[)/.test(lines[index] ?? '')) {
      paragraph.push(lines[index] ?? '')
      index += 1
    }
    blocks.push(
      <p key={key++} className="mt-3 text-base leading-relaxed">
        {inline(paragraph.join(' '), `p${key}`)}
      </p>,
    )
  }

  return <div>{blocks}</div>
}
