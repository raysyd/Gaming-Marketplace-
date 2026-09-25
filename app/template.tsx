/**
 * Templates re-mount on every navigation (layouts don't), so wrapping each
 * route here gives every page the same short "settle in" entrance — see
 * .page-enter in app/motion.css. The animation only fills backwards, so
 * once it finishes the wrapper carries no transform and can't interfere
 * with sticky or fixed-position children.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
