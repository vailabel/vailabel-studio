// BlogSidebar.tsx
import React from "react"

export default function BlogSidebar() {
  return (
    <aside className="w-full lg:w-80 flex-shrink-0">
      <div className="sticky top-24 flex flex-col gap-8">
        {/* Advertisement Banner */}
        <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-300 dark:from-blue-700 dark:to-blue-500 p-6 shadow-lg flex flex-col items-center text-center">
          <span className="uppercase text-xs font-bold tracking-widest text-white/80 mb-2">
            Sponsored
          </span>
          <div className="text-white text-lg font-semibold mb-2">
            Try Vision AI Label Studio
          </div>
          <div className="text-white/90 text-sm mb-4">
            Boost your AI projects with advanced annotation tools and team
            collaboration.
          </div>
          <a
            href="https://vailabel.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-5 py-2 rounded-lg bg-white text-blue-700 font-bold shadow hover:bg-blue-100 transition-colors mb-2"
          >
            Learn More
          </a>
          <a
            href="mailto:nathvichea1@gmail.com"
            className="inline-block px-5 py-2 rounded-lg bg-blue-700 text-white font-bold shadow hover:bg-blue-800 transition-colors mt-2"
          >
            Contact Us
          </a>
        </div>
        {/* Download Button */}
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow flex flex-col items-center">
          <div className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
            Download Desktop App
          </div>
          <div className="text-gray-600 dark:text-gray-400 text-sm mb-4 text-center">
            Get the full power of Vision AI Label Studio on your computer.
          </div>
          <a
            href="https://github.com/vailabel/vailabel-studio/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition-colors"
          >
            Download Now
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
          </a>
        </div>
      </div>
    </aside>
  )
}
