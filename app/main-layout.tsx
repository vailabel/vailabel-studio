"use client"
import { Folder, Home, Settings2, Sun, Moon } from "lucide-react"
import { useEffect, useState } from "react"

import React from "react"
import { Button } from "@/components/ui/button"

import Link from "next/link"

import { PolarGrid } from "recharts"
import { useTheme } from "next-themes"

const navigation = [
  { name: "Overview", href: "/", icon: Home },
  { name: "Projects", href: "/projects", icon: Folder },
  { name: "Settings", href: "/settings", icon: Settings2 },
]

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden md:block w-64 bg-gray-100 dark:bg-gray-800 p-4">
        <div className="flex items-center gap-2 mb-6">
          <PolarGrid className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">ProjectHub</span>
        </div>
        <nav className="space-y-2">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-4 md:px-6 dark:bg-gray-900">
          <h1 className="text-xl font-bold">Project Details</h1>
          <div className="flex items-center gap-4">
            {mounted && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
