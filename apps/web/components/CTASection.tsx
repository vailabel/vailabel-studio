"use client"

import { motion } from "framer-motion"
import { ArrowRight, Github } from "lucide-react"
import React from "react"
import { data } from "@/app/data"

const CTASection = () => {
  return (
    <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center max-w-3xl mx-auto"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to transform your image labeling workflow?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Start using Vision AI Label Studio today and experience the power of
            AI-assisted annotation.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <motion.a
              href="#download"
              className="px-8 py-3 rounded-lg bg-white text-blue-600 font-medium hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Download Now <ArrowRight size={18} />
            </motion.a>
            <motion.a
              href={data.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 rounded-lg bg-blue-700 text-white font-medium hover:bg-blue-800 transition-colors flex items-center justify-center gap-2 border border-white"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Github size={18} /> Star on GitHub
            </motion.a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default CTASection
