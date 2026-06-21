/** Labeled wrapper shared by every control widget (title + optional hint). */
export const Field = ({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {title}
      {hint && <span className="ml-1 lowercase opacity-70">({hint})</span>}
    </span>
    {children}
  </div>
)
