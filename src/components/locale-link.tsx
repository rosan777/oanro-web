"use client";
import NextLink from "next/link";
import type { ComponentProps } from "react";
import { useLocale } from "./locale";
import { localePath } from "@/lib/locale-path";

/** Drop-in for next/link that keeps visitors in their language: on Bangla pages, "/x" becomes "/bn/x". */
export default function Link({ href, ...rest }: ComponentProps<typeof NextLink>) {
  const { locale } = useLocale();
  const target = typeof href === "string" && href.startsWith("/") ? localePath(href, locale) : href;
  return <NextLink href={target} {...rest} />;
}
