import { data } from "@/app/data"
import { Mail, MessageSquare } from "lucide-react"
import { GithubIcon } from "@/components/icons/github-icon"
import Link from "next/link"

export default function Footer() {
  return (
    <footer className="relative py-14 border-t border-black/5 dark:border-white/10 bg-white/50 dark:bg-white/[0.02] backdrop-blur-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-bold text-lg mb-4 brand-accent">
              Vision AI Label Studio
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              A powerful, open-source image labeling tool with AI assistance.
            </p>
            <div className="flex items-center gap-4">
              <a
                href={data.repoUrl}
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                <GithubIcon size={20} />
              </a>
              <a
                href="https://discord.gg/vailabel"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                <MessageSquare className="w-5 h-5" />
              </a>
              <a
                href="mailto:nathvichea1@gmail.com"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/docs"
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <a
                  href="/docs/tutorials"
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  Tutorials
                </a>
              </li>
              <li>
                <a
                  href="/docs/api-reference"
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  API Reference
                </a>
              </li>
              <li>
                <a
                  href="/docs/examples"
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  Examples
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-4">Community</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href={data.repoUrl}
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href={data.discordUrl}
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  Discord
                </a>
              </li>
              <li>
                <a
                  href={data.twitterUrl}
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  Twitter
                </a>
              </li>
              <li>
                <a
                  href={data.contributingUrl}
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  Contributing
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://github.com/vailabel/vailabel-studio/blob/main/LICENSE"
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  License (GNU GPL)
                </a>
              </li>
              <li>
                <a
                  href={data.privacyUrl}
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href={data.termsUrl}
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  Terms of Use
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  )
}
