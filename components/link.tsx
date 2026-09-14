"use client";
import type { AnchorHTMLAttributes } from "react";
// Stable URL navigation also works before hydration and without client routing.
export default function Link(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} />;
}
