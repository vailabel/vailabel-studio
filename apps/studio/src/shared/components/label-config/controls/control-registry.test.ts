import { STANDALONE_CONTROL_TAGS } from "@/shared/lib/label-config/support"
import { CONTROL_WIDGETS } from "./control-registry"

// The template catalog decides availability from STANDALONE_CONTROL_TAGS; a
// widget added here without updating that list would stay "unsupported".
it("has a widget for exactly the controls the catalog treats as supported", () => {
  expect(Object.keys(CONTROL_WIDGETS).sort()).toEqual(
    [...STANDALONE_CONTROL_TAGS].sort()
  )
})
