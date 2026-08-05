import { memo } from "react"
import { useSearchParams } from "react-router-dom"
import { Dashboard } from "@/features/dataset-intelligence/components/dashboard"
import { ProjectPicker } from "@/features/dataset-intelligence/components/project-picker"

/**
 * Route shell: the selected project lives in the URL, so the picker and the
 * dashboard are just the two states of `?projectId=`.
 */
const DatasetIntelligence = memo(() => {
  const [searchParams, setSearchParams] = useSearchParams()
  const projectId = searchParams.get("projectId") || ""

  if (!projectId) {
    return <ProjectPicker onPick={(id) => setSearchParams({ projectId: id })} />
  }

  return (
    <Dashboard projectId={projectId} onChangeProject={() => setSearchParams({})} />
  )
})

DatasetIntelligence.displayName = "DatasetIntelligence"

export default DatasetIntelligence
