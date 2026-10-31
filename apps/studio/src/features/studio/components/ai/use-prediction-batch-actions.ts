import { useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { paths } from "@/shared/lib/routes"
import type { StudioScreenViewModel } from "@/features/studio/model/use-studio-screen-viewmodel"

/**
 * Accept-all / reject-all for the AI suggestions on the open item, with the
 * result toast. Shared by the canvas review bar and the Copilot tab so both
 * say the same thing. Accepting nudges toward retraining — the corrections only
 * improve the model on the next training version — with a jump to Training.
 */
export function usePredictionBatchActions(viewModel: StudioScreenViewModel) {
  const navigate = useNavigate()
  const { acceptAllPredictions, rejectAllPredictions, effectiveProjectId } =
    viewModel

  const acceptAll = useCallback(async () => {
    const count = await acceptAllPredictions()
    if (count > 0) {
      toast.success(
        `Accepted ${count} suggestion${count === 1 ? "" : "s"} as labels.`,
        {
          description: "Retrain to fold these into the next model version.",
          action: effectiveProjectId
            ? {
                label: "Train",
                onClick: () =>
                  navigate(paths.projectTraining(effectiveProjectId)),
              }
            : undefined,
        }
      )
    }
    return count
  }, [acceptAllPredictions, effectiveProjectId, navigate])

  const rejectAll = useCallback(async () => {
    const count = await rejectAllPredictions()
    if (count > 0) {
      toast.info(`Dismissed ${count} suggestion${count === 1 ? "" : "s"}.`)
    }
    return count
  }, [rejectAllPredictions])

  return { acceptAll, rejectAll }
}
