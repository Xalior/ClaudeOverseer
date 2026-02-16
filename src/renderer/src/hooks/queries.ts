import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

export function useProjectsDir() {
  return useQuery({
    queryKey: ['projectsDir'],
    queryFn: () => window.overseer.getProjectsDir(),
    staleTime: Infinity
  })
}

export function useProjects() {
  const { data: projectsDir } = useProjectsDir()

  return useQuery({
    queryKey: ['projects', projectsDir],
    queryFn: () => window.overseer.scanProjects(projectsDir!),
    enabled: !!projectsDir,
    staleTime: Infinity, // Event-driven via directory watcher
    refetchInterval: 120_000 // Safety fallback (2 minutes)
  })
}

export function useSessions(projectEncodedName: string | null) {
  const { data: projectsDir } = useProjectsDir()

  return useQuery({
    queryKey: ['sessions', projectEncodedName],
    queryFn: () => window.overseer.discoverSessions(projectEncodedName!, projectsDir!),
    enabled: !!projectEncodedName && !!projectsDir,
    staleTime: Infinity, // Event-driven via directory watcher
    refetchInterval: 60_000 // Safety fallback (1 minute)
  })
}

export function useSessionMessages(sessionFilePath: string | null) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['messages', sessionFilePath],
    queryFn: () => window.overseer.getMessages(sessionFilePath!),
    enabled: !!sessionFilePath,
    staleTime: Infinity // Only refetch via watcher invalidation
  })

  // Wire filesystem watcher to query invalidation
  useEffect(() => {
    if (!sessionFilePath) return

    window.overseer.watchSession(sessionFilePath)

    const unsubscribe = window.overseer.onNewMessages((data: { filePath: string; messages: unknown[] }) => {
      if (data.filePath === sessionFilePath && data.messages.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['messages', sessionFilePath] })
      }
    })

    return () => {
      unsubscribe()
      window.overseer.unwatchSession(sessionFilePath)
    }
  }, [sessionFilePath, queryClient])

  return query
}

/**
 * Directory watcher hook - start filesystem monitoring on mount, stop on unmount.
 * Invalidates React Query caches when projects/sessions change.
 */
export function useDirectoryWatcher() {
  const queryClient = useQueryClient()

  useEffect(() => {
    window.overseer.startDirectoryWatch()

    const unsubProjects = window.overseer.onProjectsChanged(() => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    })

    const unsubSessions = window.overseer.onSessionsChanged((data) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', data.projectEncodedName] })
      // Also invalidate projects (session counts may have changed)
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    })

    return () => {
      unsubProjects()
      unsubSessions()
      window.overseer.stopDirectoryWatch()
    }
  }, [queryClient])
}
