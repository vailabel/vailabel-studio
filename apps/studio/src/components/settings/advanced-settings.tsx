import { useState } from "react"
import { Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useConfirmDialog } from "@/hooks/use-confirm-dialog"

export default function AdvancedSettings() {
  const { toast } = useToast()
  const confirm = useConfirmDialog()
  const [isClearing, setIsClearing] = useState(false)

  const handleClearAllData = async () => {
    const ok = await confirm({
      title: "Are you sure?",
      description:
        "This will delete all data from your browser's local storage or any other storage used by the app. This action cannot be undone.",
      confirmText: "Clear All Data",
      cancelText: "Cancel",
    })
    if (!ok) return
    setIsClearing(true)
    try {
      // Simulate clearing data
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast({
        title: "Success",
        description: "All data has been cleared.",
      })
    } catch (error) {
      console.error("Failed to clear data:", error)
      toast({
        title: "Error",
        description: "Failed to clear data.",
        variant: "destructive",
      })
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <section className="space-y-8">
      <h2 className="text-xl font-bold text-red-700 dark:text-red-300 mb-2">
        Advanced / Danger Zone
      </h2>
      <div className="bg-red-50 dark:bg-red-950 border border-red-300 dark:border-red-700 rounded-lg p-6 flex flex-col items-start gap-3 shadow-sm w-full">
        <div className="flex items-center gap-2">
          <Trash2
            className="h-6 w-6 text-red-600 dark:text-red-400"
            aria-hidden="true"
          />
          <span className="text-lg font-bold text-red-700 dark:text-red-300">
            Clear All Data
          </span>
        </div>
        <p className="text-sm text-red-700 dark:text-red-300 font-medium">
          This will{" "}
          <span className="font-bold underline">permanently delete</span> all
          data from your browser's local storage and any other storage used by
          the app.
          <br />
          <span className="font-bold">This action cannot be undone.</span>
        </p>
        <button
          type="button"
          onClick={handleClearAllData}
          disabled={isClearing}
          className="mt-2 w-full flex items-center justify-center gap-2 px-5 py-3 text-base font-semibold rounded-lg bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-red-400 focus:outline-none text-white shadow transition disabled:bg-red-400 disabled:cursor-not-allowed"
          aria-label="Clear all data"
          aria-disabled={isClearing}
          aria-describedby="clear-data-warning"
          data-testid="clear-all-data-btn"
        >
          <Trash2 className="h-5 w-5" />
          {isClearing ? "Clearing..." : "Clear All Data"}
        </button>
        <span id="clear-data-warning" className="sr-only">
          Warning: This action is irreversible and will delete all your data.
        </span>
      </div>
    </section>
  )
}
