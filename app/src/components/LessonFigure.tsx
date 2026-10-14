type LessonFigureProps = {
  src: string
  alt: string
  className?: string
}

export function LessonFigure({ src, alt, className = '' }: LessonFigureProps) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}illustrations/${src}`}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={`h-auto w-full rounded-xl bg-paper ${className}`}
    />
  )
}
