import type { StudioScreenViewModel } from "@/features/studio/use-studio-screen-viewmodel"
import type { Capabilities } from "@/lib/labeling-config"

// The contract every modality/task editor body receives from the labeling shell.
// An editor owns the center pane; the shell owns the surrounding chrome (header,
// file list, label palette, bottom bar) and resolves which editor to mount.
export interface EditorProps {
  viewModel: StudioScreenViewModel
  capabilities: Capabilities
}
