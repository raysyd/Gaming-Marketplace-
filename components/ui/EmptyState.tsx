import { EmptyBoxArt } from "./Illustrations";

/**
 * Empty/zero states: an illustration, a heading that says what's
 * missing, one sentence about what to do, and (usually) one action.
 */
export function EmptyState({
  art = <EmptyBoxArt />,
  title,
  body,
  action,
  bordered = true,
  className = "",
}: {
  art?: React.ReactNode;
  title: React.ReactNode;
  body?: React.ReactNode;
  action?: React.ReactNode;
  bordered?: boolean;
  className?: string;
}) {
  return (
    <div className={`empty-state ${bordered ? "rounded-[14px] border border-dashed border-line-strong bg-card/60" : ""} ${className}`}>
      {art}
      <h2 className="display text-[24px]">{title}</h2>
      {body && <p className="mt-2 max-w-sm text-[14.5px] leading-relaxed text-muted">{body}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
