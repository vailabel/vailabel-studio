import { useState } from "react"
import { ArrowLeft, Menu } from "lucide-react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"
import { APP_NAME, navigation } from "@/app/navigation"
import { preloadRoute } from "@/app/route-table"
import { isPathActive, paths } from "@/shared/lib/routes"
import { cn } from "@/shared/lib/utils"
import { ThemeToggle } from "@/shared/ui/theme-toggle"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/shared/ui/sheet"
import { Button } from "@/shared/ui/button"

const Brand = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center gap-2 mb-6", className)}>
    <img src="/logo.png" alt={`${APP_NAME} logo`} className="h-7 w-7" />
    <span className="text-xl font-bold">{APP_NAME}</span>
  </div>
)

interface NavListProps {
  className?: string
  /** Called after a navigation (the mobile sheet uses it to close itself). */
  onNavigate?: () => void
}

// The one rendering of the primary nav — used by the desktop sidebar and the
// mobile sheet so the two can't drift apart.
const NavList = ({ className, onNavigate }: NavListProps) => {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav className={cn("space-y-1", className)}>
      {navigation.map((item) => {
        const isActive = isPathActive(pathname, item.href)
        return (
          <Button
            key={item.href}
            variant={isActive ? "default" : "ghost"}
            onClick={() => {
              navigate(item.href)
              onNavigate?.()
            }}
            // Fetch the page chunk on intent so the click renders instantly.
            onPointerEnter={() => preloadRoute(item.href)}
            onFocus={() => preloadRoute(item.href)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium w-full justify-start h-9"
            aria-current={isActive ? "page" : undefined}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.name}</span>
          </Button>
        )
      })}
    </nav>
  )
}

const MainLayout = () => {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      {/* Sidebar for md+ */}
      <aside className="hidden md:block w-64 bg-muted/30 p-6 sticky top-0 h-screen overflow-y-auto">
        <Brand />
        <NavList />
      </aside>
      {/* Sheet for mobile (only) */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        {/* Menu button in header, only on mobile */}
        <div className="md:hidden fixed top-4 left-4 z-40">
          <SheetTrigger
            render={<Button variant="outline" size="icon" className="shadow" />}
          >
            <Menu className="h-6 w-6" />
            <span className="sr-only">Open menu</span>
          </SheetTrigger>
        </div>
        <SheetContent
          side="left"
          className="p-0 w-64 bg-background left-0 top-0 h-full fixed md:hidden"
        >
          <SheetTitle className="sr-only">Main navigation</SheetTitle>
          <Brand className="p-6" />
          <NavList className="p-6" onNavigate={() => setSheetOpen(false)} />
        </SheetContent>
      </Sheet>
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-6">
          <div className="flex items-center gap-3">
            {/* Back button, hidden on root path */}
            {pathname !== paths.overview && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                aria-label="Go back"
              >
                <ArrowLeft className="h-6 w-6" />
              </Button>
            )}
            {/* Reserve space for the fixed mobile menu button */}
            <div className="md:hidden w-12" />
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <span className="text-sm text-muted-foreground">Local Workspace</span>
          </div>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default MainLayout
