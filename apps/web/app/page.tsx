"use client"

import { useState, useEffect, useRef } from "react"
import { motion, useAnimation, AnimatePresence } from "framer-motion"
import {
  Github,
  ArrowRight,
  Square,
  Hexagon,
  Pencil,
  Wand2,
  Layers,
  MousePointer,
  Check,
  Tag,
  ExternalLink,
  Clock,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { data } from "./data"
import { getGitHubReleases } from "@/lib/api"
import ReactMarkdown from "react-markdown"
import HeroSection from "@/components/HeroSection"
import FeatureHighlights from "@/components/FeatureHighlights"
import DocumentationBlog from "@/components/DocumentationBlog"
import DemoSection from "@/components/DemoSection"
import RoadmapSection from "@/components/RoadmapSection"
import CTASection from "@/components/CTASection"

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <main>
        {/* Hero Section with Animation */}
        <HeroSection />

        {/* Feature Highlights */}
        <FeatureHighlights />

        {/* Documentation & Blog Section */}
        <DocumentationBlog />

        {/* Demo Section */}
        <DemoSection />

        {/* Roadmap Section */}
        <RoadmapSection />

        {/* CTA Section */}
        <CTASection />
      </main>
    </div>
  )
}
