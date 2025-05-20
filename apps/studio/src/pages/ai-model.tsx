import { useEffect, useState } from "react"
import { useDataAccess } from "@/hooks/use-data-access"
import type { AIModel } from "@vailabel/core/src/models/types"

export default function AIModelListPage() {
  const dataAccess = useDataAccess()
  const [models, setModels] = useState<AIModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    dataAccess
      .getAvailableModels()
      .then(setModels)
      .catch((e) => setError(e.message || "Failed to load models"))
      .finally(() => setLoading(false))
  }, [dataAccess])

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">AI Models</h1>
      {loading && <div>Loading models...</div>}
      {error && <div className="text-red-500">{error}</div>}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {models.length === 0 && (
            <div className="col-span-full text-center text-gray-400 py-8">
              No models found.
            </div>
          )}
          {models.map((model) => (
            <div
              key={model.id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow p-5 flex flex-col gap-2 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
                  {model.name?.[0]?.toUpperCase() || "M"}
                </div>
                <div>
                  <div className="font-semibold text-lg">{model.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    v{model.version}
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 flex-1 min-h-[40px]">
                {model.description}
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="inline-block px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-300">
                  {model.isCustom ? "Custom" : "Built-in"}
                </span>
                {/* Actions like select, delete, etc. can go here */}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
