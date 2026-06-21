"""The copilot AI core — moved from the Rust `vailabel_copilot` crate.

This package owns the copilot's *brain*: deterministic intent routing, the
optional LLM plan orchestration, the QA-diff logic, label-suggestion parsing,
and the local OpenAI-compatible LLM/VLM client. It is a faithful port of the
Rust crate at `apps/studio/src-tauri/crates/copilot` (domain + application).

The split with Rust (decided 2026-06-20):
- **Python is a stateless brain.** Rust gathers the read-context (item, labels,
  annotations, predictions, resolved model paths, LLM settings + key) and POSTs
  a turn here. Python plans + runs the LLM + runs detection/segmentation compute
  in-process, and returns raw prediction *drafts* plus the reply/findings/actions.
- **Rust persists.** It runs its existing `persist_drafts` over the returned
  drafts (label-matching, row writes, `predictions:generated` events). Python
  never touches the DB or the keychain.

`orchestrator.CopilotService` is the entry point; `contracts` defines the wire
shapes; everything else mirrors a Rust module one-to-one.
"""

from .config import LlmConfig
from .orchestrator import CopilotInferencePort, CopilotService

__all__ = ["LlmConfig", "CopilotService", "CopilotInferencePort"]
