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
    staleTime: 30_000
  })
}

export function useSessions(projectEncodedName: string | null) {
  const { data: projectsDir } = useProjectsDir()

  return useQuery({
    queryKey: ['sessions', projectEncodedName],
    queryFn: () => window.overseer.discoverSessions(projectEncodedName!, projectsDir!),
    enabled: !!projectEncodedName && !!projectsDir,
    staleTime: 10_000
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
