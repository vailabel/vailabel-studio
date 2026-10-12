import {
  Brain,
  Folder,
  Home,
  ScanSearch,
  Settings2,
  Tag,
  type LucideIcon,
} from "lucide-react"
import { paths } from "@/shared/lib/routes"

export interface NavigationItem {
  name: string
  href: string
  icon: LucideIcon
}

export const APP_NAME = "VAI Studio"

/** Primary navigation, in display order. Shared by the sidebar and mobile sheet. */
export const navigation: NavigationItem[] = [
  { name: "Overview", href: paths.overview, icon: Home },
  { name: "Projects", href: paths.projects, icon: Folder },
  { name: "Labels", href: paths.labels, icon: Tag },
  {
    name: "Dataset Intelligence",
    href: paths.datasetIntelligence,
    icon: ScanSearch,
  },
  { name: "AI Assistant", href: paths.aiModels, icon: Brain },
  { name: "Settings", href: paths.settings, icon: Settings2 },
]
