import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Home, ArrowLeft } from "lucide-react"

const NotFound = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
    <motion.div
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
      className="w-full max-w-md"
    >
      <Card className="text-center">
        <CardHeader>
          <motion.div
            className="text-6xl font-extrabold text-primary mb-4"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 15,
              delay: 0.1,
            }}
          >
            404
          </motion.div>
          <CardTitle className="text-2xl">
            <motion.span
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              Page Not Found
            </motion.span>
          </CardTitle>
          <CardDescription>
            <motion.span
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              The page you're looking for doesn't exist or has been moved.
            </motion.span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button asChild className="w-full sm:w-auto">
              <a href="#/">
                <Home className="w-4 h-4 mr-2" />
                Go to Home
              </a>
            </Button>
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <a href="javascript:history.back()">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </a>
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  </div>
)

export default NotFound
