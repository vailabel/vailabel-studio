import { invoke } from "@tauri-apps/api/core"

const REDACTED_RESPONSE = "[redacted sensitive response]"
const sensitiveCommands = new Set([
  "secret_set",
  "secret_get",
  "secret_delete",
  "secret_list",
])

const getLoggedResponse = (command: string, response: unknown) =>
  sensitiveCommands.has(command) ? REDACTED_RESPONSE : response

export const invokeWithLogging = async <T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T> => {
  try {
    const response = await invoke<T>(command, args)
    console.log("[rust-ipc]", command, getLoggedResponse(command, response))
    return response
  } catch (error) {
    console.error("[rust-ipc]", command, error)
    throw error
  }
}

export { REDACTED_RESPONSE }
