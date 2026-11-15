import NextLink from "next/link";
import type { ComponentProps } from "react";

// next/link prefetches every link that scrolls into view. The app's layout reads the
// login cookie, so each prefetch is a server render (billed CPU) — a page with a grid of
// 30 tiles meant 30 renders before anyone tapped anything. Prefetch is off by default;
// the top loading bar + skeleton cover the short wait on tap. Pass prefetch to opt back in.
export default function Link({ prefetch = false, ...props }: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={prefetch} {...props} />;
}
