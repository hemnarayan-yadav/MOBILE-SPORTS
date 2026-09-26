import { useInfiniteQuery } from '@tanstack/react-query';

// An infinite list over the API's paged lists (`{ items, pagination }`): the
// phone's counterpart of the web's numbered pagination. `fetchPage({ page })`
// asks for one page; the next page exists while `page < totalPages`.
export function usePagedQuery({ queryKey, fetchPage, ...options }) {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage({ page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last?.pagination && last.pagination.page < last.pagination.totalPages
        ? last.pagination.page + 1
        : undefined,
    ...options,
  });
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  return { ...query, items };
}
