"use client";
import { useEffect } from "react";

const INFINITE_SCROLL_THRESHOLD_PX = 200;

export function useHandleScroll(
  hasNextPage: boolean,
  isFetchingNextPage: boolean,
  fetchNextPage: () => void,
) {
  useEffect(() => {
    const handleScroll = () => {
      if (!hasNextPage || isFetchingNextPage) return;
      const scrollTop = document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      const nearBottom =
        scrollHeight - (scrollTop + clientHeight) <
        INFINITE_SCROLL_THRESHOLD_PX;
      if (nearBottom) fetchNextPage();
    };

    document.addEventListener("scroll", handleScroll);
    return () => {
      document.removeEventListener("scroll", handleScroll);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
}
