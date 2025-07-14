import * as React from "react"
import {
  Brain,
  Cloud,
  Folder,
  Home,
  Layers2,
  Settings2,
  ArrowLeft,
  ChevronDown,
} from "lucide-react"
import { useNavigate, useOutlet, useLocation } from "react-router-dom"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { Menu } from "lucide-react"

type NavigationItem = {
  name: string
  href: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

const navigation: NavigationItem[] = [
  { name: "Overview", href: "/", icon: Home },
  { name: "Projects", href: "/projects", icon: Folder },
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
  const [profileMenuOpen, setProfileMenuOpen] = React.useState(false)
  const profileMenuRef = React.useRef<HTMLDivElement>(null)

  // Close dropdown on click outside
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(e.target as Node)
      ) {
        setProfileMenuOpen(false)
      }
    }
    if (profileMenuOpen) {
      document.addEventListener("mousedown", handleClick)
    } else {
      document.removeEventListener("mousedown", handleClick)
    }
    return () => document.removeEventListener("mousedown", handleClick)
  }, [profileMenuOpen])

  // Keyboard accessibility: close on Escape
  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setProfileMenuOpen(false)
    }
    if (profileMenuOpen) {
      document.addEventListener("keydown", handleKey)
    } else {
      document.removeEventListener("keydown", handleKey)
    }
    return () => document.removeEventListener("keydown", handleKey)
  }, [profileMenuOpen])

  return (
    <div className="flex min-h-screen">
      {/* Sidebar for md+ */}
      <Aside navigation={navigation} location={location} />
      {/* Sheet for mobile (only) */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        {/* Menu button in header, only on mobile */}
        <div className="md:hidden fixed top-4 left-4 z-40">
          <SheetTrigger asChild>
            <button className="rounded-md p-2 bg-white dark:bg-gray-900 border shadow">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Open menu</span>
            </button>
          </SheetTrigger>
        </div>
        <SheetContent
          side="left"
          className="p-0 w-64 bg-gray-100 dark:bg-gray-800 left-0 top-0 h-full fixed md:hidden"
        >
          <VisuallyHidden asChild>
            <SheetTitle>Main navigation</SheetTitle>
          </VisuallyHidden>
          <div className="flex items-center gap-2 mb-6 p-4">
            <img src="/logo.png" alt="ProjectHub Logo" className="h-7 w-7" />
            <span className="text-xl font-bold">ProjectHub</span>
          </div>
          <nav className="space-y-2 p-4">
            {navigation.map((item) => {
              const isActive =
                location.pathname === item.href ||
                (item.href !== "/" && location.pathname.startsWith(item.href))
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    navigate(item.href)
                    setSheetOpen(false)
                  }}
                  className={
                    "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors w-full text-left " +
                    (isActive
                      ? "bg-primary text-primary-foreground shadow"
                      : "hover:bg-gray-200 dark:hover:bg-gray-700")
                  }
                  aria-current={isActive ? "page" : undefined}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </button>
              )
            })}
          </nav>
        </SheetContent>
      </Sheet>
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-4 md:px-6 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            {/* Back button, hidden on root path */}
            {location.pathname !== "/" && (
              <button
                onClick={() => navigate(-1)}
                className="rounded-md p-2 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
            )}
            {/* Only show space for menu button on mobile, but button itself is fixed above */}
            <div className="md:hidden w-10" />
            {/* Removed logo and app name from header */}
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {/* Redesigned Profile Dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button
                className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-background hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow shadow-sm font-semibold text-base text-primary"
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                onClick={() => setProfileMenuOpen((v) => !v)}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) {
                    setProfileMenuOpen(false)
                  }
                }}
              >
                Vichea Nath
                <ChevronDown className="ml-2 h-4 w-4 text-muted-foreground inline-block align-middle" />
              </button>
              {profileMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-44 rounded-md border border-gray-200 dark:border-gray-700 bg-popover shadow-lg z-40 focus:outline-none"
                  role="menu"
                  tabIndex={-1}
                >
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <span className="block font-bold text-lg text-primary">
                      Vichea Nath
                    </span>
                  </div>
                  <ul className="py-1">
                    <li>
                      <button
                        className="w-full text-left px-4 py-2 text-sm hover:bg-accent/50 rounded-md transition-colors"
                        role="menuitem"
                        tabIndex={0}
                        onClick={() => {
                          setProfileMenuOpen(false)
                          // navigate to profile page or open profile modal
                        }}
                      >
                        Profile
                      </button>
                    </li>
                    <li>
                      <button
                        className="w-full text-left px-4 py-2 text-sm hover:bg-accent/50 rounded-md transition-colors"
                        role="menuitem"
                        tabIndex={0}
                        onClick={() => {
                          setProfileMenuOpen(false)
                          // handle logout logic here
                        }}
                      >
                        Logout
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4">{outlet}</main>
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
    <aside className="hidden md:block w-64 bg-gray-100 dark:bg-gray-800 p-4">
      <div className="flex items-center gap-2 mb-6">
        <img
          src="/logo.png"
          alt="Vision AI Label Studio Logo"
          className="h-7 w-7"
        />
        <span className="text-xl font-bold">VAI Studio</span>
      </div>
      <nav className="space-y-2">
        {navigation.map((item) => {
          const isActive =
            location.pathname === item.href ||
            (item.href !== "/" && location.pathname.startsWith(item.href))
          return (
            <button
              key={item.name}
              onClick={() => navigate(item.href)}
              className={
                "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors " +
                (isActive
                  ? "bg-primary text-primary-foreground shadow"
                  : "hover:bg-gray-200 dark:hover:bg-gray-700")
              }
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
})
