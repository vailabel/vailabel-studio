import { motion } from "framer-motion"
import MainLayout from "./main-layout"
import { useTheme } from "@/components/theme-provider"
import { useEffect, useState } from "react"
import { useDataAccess } from "@/hooks/use-data-access"

interface RecentActivityItem {
  activity: string
  user: string
  date: string
}

const Overview = () => {
  const { theme } = useTheme()
  const dataAccess = useDataAccess()

  const [statistics, setStatistics] = useState({
    totalProjects: 0,
    activeUsers: 0,
    labelsCreated: 0,
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const projects = await dataAccess.getProjects()
      const labels = await dataAccess.getLabels()

      setStatistics({
        totalProjects: projects.length,
        activeUsers: 120, // Placeholder value; replace with real data if available
        labelsCreated: labels.length,
      })
      setRecentActivity(
        Array.from({ length: 3 }, (_, index) => ({
          activity: `Action ${index + 1}`, // Mocked activity description
          user: `User ${index + 1}`, // Mocked user
          date: new Date().toISOString().split("T")[0], // Mocked date
        }))
      )
    }

    fetchData()
  }, [dataAccess])

  return (
    <MainLayout>
      <div
        className={`p-6 font-sans min-h-screen ${
          theme === "dark"
            ? "bg-gray-900 text-gray-100"
            : "bg-gray-100 text-gray-800"
        }`}
      >
        <h1 className="text-4xl font-extrabold mb-8">Dashboard</h1>

        {/* Statistics Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Total Projects",
                value: statistics.totalProjects,
                color: "bg-blue-500",
              },
              {
                title: "Active Users",
                value: statistics.activeUsers,
                color: "bg-green-500",
              },
              {
                title: "Labels Created",
                value: statistics.labelsCreated,
                color: "bg-purple-500",
              },
            ].map((stat, index) => (
              <motion.div
                key={index}
                className={`p-6 rounded-lg shadow-lg text-white ${stat.color}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <h3 className="text-lg font-medium">{stat.title}</h3>
                <p className="text-3xl font-bold">{stat.value}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Recent Activity Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Recent Activity</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((item, index) => (
                  <tr
                    key={index}
                    className={`${
                      index % 2 === 0
                        ? "bg-gray-50 dark:bg-gray-700"
                        : "bg-white dark:bg-gray-800"
                    }`}
                  >
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {item.activity}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {item.user}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {item.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Quick Actions Section */}
        <section>
          <h2 className="text-2xl font-semibold mb-6">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            {[
              {
                label: "Create New Project",
                action: () => {},
                color: "bg-blue-600",
              },
              {
                label: "View All Labels",
                action: () => {},
                color: "bg-green-600",
              },
              {
                label: "Manage Users",
                action: () => {},
                color: "bg-purple-600",
              },
            ].map((action, index) => (
              <motion.button
                key={index}
                className={`px-6 py-3 text-white rounded-lg shadow-md hover:shadow-lg ${action.color}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={action.action}
              >
                {action.label}
              </motion.button>
            ))}
          </div>
        </section>
      </div>
    </MainLayout>
  )
}

export default Overview
