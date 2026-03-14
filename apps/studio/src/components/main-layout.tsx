import * as React from "react"
import {
  Brain,
  Cloud,
  Folder,
  Home,
  Layers2,
  Settings2,
  ArrowLeft,
  Menu,
  Tag,
} from "lucide-react"
import { useNavigate, useOutlet, useLocation } from "react-router-dom"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

type NavigationItem = {
  name: string
  href: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

const navigation: NavigationItem[] = [
  { name: "Overview", href: "/", icon: Home },
  { name: "Projects", href: "/projects", icon: Folder },
  { name: "Labels", href: "/labels", icon: Tag },
  { name: "Task", href: "/tasks", icon: Layers2 },
  { name: "Cloud Storage", href: "/cloud-storage", icon: Cloud },
  { name: "AI Models", href: "/ai-models", icon: Brain },
  { name: "Settings", href: "/settings", icon: Settings2 },
]

const MainLayout = () => {
  const navigate = useNavigate()
  const outlet = useOutlet()
  const location = useLocation()
  const [sheetOpen, setSheetOpen] = React.useState(false)

  return (
    <div className="flex min-h-screen">
      {/* Sidebar for md+ */}
      <Aside navigation={navigation} location={location} />
      {/* Sheet for mobile (only) */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        {/* Menu button in header, only on mobile */}
        <div className="md:hidden fixed top-4 left-4 z-40">
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="shadow">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
        </div>
        <SheetContent
          side="left"
          className="p-0 w-64 bg-background left-0 top-0 h-full fixed md:hidden"
        >
          <VisuallyHidden asChild>
            <SheetTitle>Main navigation</SheetTitle>
          </VisuallyHidden>
          <div className="flex items-center gap-2 mb-6 p-6">
            <img src="/logo.png" alt="ProjectHub Logo" className="h-7 w-7" />
            <span className="text-xl font-bold">ProjectHub</span>
          </div>
          <nav className="space-y-1 p-6">
            {navigation.map((item) => {
              const isActive =
                location.pathname === item.href ||
                (item.href !== "/" && location.pathname.startsWith(item.href))
              return (
                <Button
                  key={item.name}
                  variant={isActive ? "default" : "ghost"}
                  onClick={() => {
                    navigate(item.href)
                    setSheetOpen(false)
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium w-full justify-start h-9"
                  aria-current={isActive ? "page" : undefined}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Button>
              )
            })}
          </nav>
        </SheetContent>
      </Sheet>
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-6">
          <div className="flex items-center gap-3">
            {/* Back button, hidden on root path */}
            {location.pathname !== "/" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                aria-label="Go back"
              >
                <ArrowLeft className="h-6 w-6" />
              </Button>
            )}
            {/* Only show space for menu button on mobile, but button itself is fixed above */}
            <div className="md:hidden w-12" />
            {/* Removed logo and app name from header */}
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <span className="text-sm text-muted-foreground">Local Workspace</span>
          </div>
        </header>
        <main className="flex-1 p-6">{outlet}</main>
      </div>
    </div>
  )
}

export default MainLayout

type AsideProps = {
  navigation: NavigationItem[]
  location: ReturnType<typeof useLocation>
}

const Aside = React.memo(({ navigation, location }: AsideProps) => {
  const navigate = useNavigate()

  return (
    <aside className="hidden md:block w-64 bg-muted/30 p-6 sticky top-0 h-screen overflow-y-auto">
      <div className="flex items-center gap-2 mb-6">
        <img
          src="/logo.png"
          alt="Vision AI Label Studio Logo"
          className="h-7 w-7"
        />
        <span className="text-xl font-bold">VAI Studio</span>
      </div>
      <nav className="space-y-1">
        {navigation.map((item) => {
          const isActive =
            location.pathname === item.href ||
            (item.href !== "/" && location.pathname.startsWith(item.href))
          return (
            <Button
              key={item.name}
              variant={isActive ? "default" : "ghost"}
              onClick={() => navigate(item.href)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium w-full justify-start h-9"
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Button>
          )
        })}
      </nav>
    </aside>
  )
})
