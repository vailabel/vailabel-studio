/**
 * Interfaces for Python environment management
 */

export interface IPythonEnvironmentManager {
  /**
   * Ensure Python environment is set up
   * Returns the path to the Python executable to use
   */
  ensureEnvironment(apiPath: string, userDataPath: string): Promise<string>

  /**
   * Get the virtual environment Python path
   */
  getVenvPythonPath(userDataPath: string): string

  /**
   * Check if virtual environment exists
   */
  venvExists(userDataPath: string): boolean

  /**
   * Set progress callback (optional)
   */
  setProgressCallback?(
    callback: (message: string, percent?: number) => void
  ): void
}

export interface PythonEnvironmentConfig {
  apiPath: string
  userDataPath: string
  onProgress?: (message: string, percent?: number) => void
}
