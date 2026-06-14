"use client"

import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { GithubIcon } from "@/components/icons/github-icon"
import React from "react"

const CTASection = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white px-6 py-16 md:py-20 text-center shadow-2xl shadow-indigo-500/30"
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="cloud-aurora opacity-40" aria-hidden="true" />
          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to transform your image labeling workflow?
            </h2>
            <p className="text-xl mb-8 text-blue-100">
              Start using Vision AI Label Studio today and experience the power
              of AI-assisted annotation.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <motion.a
                href="#download"
                className="px-8 py-3.5 rounded-xl bg-white text-blue-700 font-semibold shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center gap-2"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                Download Now <ArrowRight size={18} />
              </motion.a>
              <motion.a
                href="https://github.com/vailabel/vailabel-studio"
                target="_blank"
                className="px-8 py-3.5 rounded-xl bg-white/10 text-white font-semibold ring-1 ring-white/30 backdrop-blur-sm hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                <GithubIcon size={18} /> Star on GitHub
              </motion.a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default CTASection
