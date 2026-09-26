// Lets a routed page (e.g. PosPage) render content into the shared
// <header> in AppShell.tsx, even though the header lives outside that
// page's own component tree. AppShell owns the actual DOM node (a slot
// in the header's top-right corner) and provides it here; a page then
// uses React's createPortal with this node as the target. Needed for
// things like the Close Register button, which depends on state that
// only PosPage has (the open register session) but which should
// visually sit in the header, not in the page body.
import { createContext, useContext, type ReactNode } from "react";

const HeaderActionsContext = createContext<HTMLDivElement | null>(null);

export function HeaderActionsProvider({
  node,
  children,
}: {
  node: HTMLDivElement | null;
  children: ReactNode;
}) {
  return <HeaderActionsContext.Provider value={node}>{children}</HeaderActionsContext.Provider>;
}

// Returns the header's action slot DOM node, or null before it has
// mounted. Callers should only portal into it once it's non-null.
export function useHeaderActionsNode(): HTMLDivElement | null {
  return useContext(HeaderActionsContext);
}
