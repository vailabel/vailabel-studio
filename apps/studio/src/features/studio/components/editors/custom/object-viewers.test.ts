import { VIEWER_OBJECT_TAGS } from "@/shared/lib/label-config/support"
import { OBJECT_VIEWERS } from "./object-viewers"

it("has a viewer for exactly the object tags the catalog treats as supported", () => {
  expect(Object.keys(OBJECT_VIEWERS).sort()).toEqual(
    [...VIEWER_OBJECT_TAGS].sort()
  )
})
