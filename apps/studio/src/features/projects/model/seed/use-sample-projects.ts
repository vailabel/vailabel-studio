import { useState } from "react"
import { toast } from "sonner"
import { useConfirmDialog } from "@/shared/hooks/use-confirm-dialog"
import { toErrorMessage } from "@/shared/lib/errors"
import {
  removeSampleProjects,
  seedSampleProjects,
  type SeedProgress,
} from "./seed-sample-projects"

/** UI state + actions for creating / removing the sample projects. */
export function useSampleProjects(onChanged: () => void) {
  const confirm = useConfirmDialog()
  const [progress, setProgress] = useState<SeedProgress | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  const seed = async () => {
    setProgress({ done: 0, total: 0, current: "" })
    try {
      const { created, skipped, failed } = await seedSampleProjects(setProgress)
      if (failed.length > 0) {
        toast.error(`${failed.length} sample project(s) could not be created`, {
          description: failed
            .slice(0, 3)
            .map((entry) => `${entry.template}: ${entry.message}`)
            .join("\n"),
        })
      }
      if (created > 0) {
        toast.success(
          `Created ${created} sample project${created === 1 ? "" : "s"}`,
          {
            description:
              skipped > 0 ? `${skipped} already existed.` : undefined,
          }
        )
      } else if (failed.length === 0) {
        toast("Every template already has a sample project")
      }
    } catch (error) {
      toast.error("Could not create sample projects", {
        description: toErrorMessage(error),
      })
    } finally {
      setProgress(null)
      onChanged()
    }
  }

  const remove = async () => {
    const confirmed = await confirm({
      title: "Remove sample projects?",
      description:
        "Every project created by “Create sample projects” is deleted, including any labels you added to them. Your own projects are not touched.",
      confirmText: "Remove samples",
      cancelText: "Cancel",
    })
    if (!confirmed) return
    setIsRemoving(true)
    try {
      const removed = await removeSampleProjects()
      toast(`Removed ${removed} sample project${removed === 1 ? "" : "s"}`)
    } catch (error) {
      toast.error("Could not remove sample projects", {
        description: toErrorMessage(error),
      })
    } finally {
      setIsRemoving(false)
      onChanged()
    }
  }

  return {
    isBusy: progress !== null || isRemoving,
    progress,
    seed,
    remove,
  }
}
