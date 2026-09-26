import { useInfiniteQuery } from "@tanstack/react-query"

export interface Page<T> {
  data: T[]
  pagination?: { next_page: number | null }
}

// A list the API serves a page at a time, for "Load more": pages are fetched on
// demand and joined in order. `first` is the first response, for anything sent
// alongside the list (totals, averages).
export function usePagedList<T, P extends Page<T> = Page<T>>(
  queryKey: readonly unknown[],
  fetchPage: (page: number) => Promise<P>,
  options: { enabled?: boolean } = {},
) {
  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    getNextPageParam: (last) => last.pagination?.next_page ?? undefined,
    enabled: options.enabled ?? true,
  })

  return {
    items: query.data?.pages.flatMap((p) => p.data) ?? [],
    first: query.data?.pages[0],
    isLoading: query.isLoading,
    hasMore: !!query.hasNextPage,
    loadingMore: query.isFetchingNextPage,
    loadMore: () => query.fetchNextPage(),
  }
}
