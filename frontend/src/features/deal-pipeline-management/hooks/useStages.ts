import { useQuery } from '@tanstack/react-query'
import { listStages } from '../api'

export function useStages() {
  return useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: listStages,
    staleTime: 60_000,
  })
}
