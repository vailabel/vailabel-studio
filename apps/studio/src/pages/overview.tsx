import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Users, Folder, Tag } from "lucide-react"
import { useServices } from "@/services/ServiceProvider"

interface RecentActivityItem {
  activity: string
  user: string
  date: string
}

const Overview = () => {
  const services = useServices()
  const navigate = useNavigate()
  const [statistics, setStatistics] = useState({
    totalProjects: 0,
    activeUsers: 0,
    labelsCreated: 0,
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const [projects, labels] = await Promise.all([
        services.getProjectService().getProjects(),
        services.getLabelService().getLabelsByProjectId('') // Get all labels
      ])
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
  }, [])

  return (
    <div
      className={`p-6 font-sans min-h-screen transition-colors duration-300`}
    >
      <h1 className="text-4xl font-extrabold mb-8">Dashboard</h1>
      <section className="mb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: "Total Projects",
              value: statistics.totalProjects,
              color: "bg-blue-500",
              icon: <Folder className="w-8 h-8 opacity-80" />,
            },
            {
              title: "Active Users",
              value: statistics.activeUsers,
              color: "bg-green-500",
              icon: <Users className="w-8 h-8 opacity-80" />,
            },
            {
              title: "Labels Created",
              value: statistics.labelsCreated,
              color: "bg-purple-500",
              icon: <Tag className="w-8 h-8 opacity-80" />,
            },
          ].map((stat, index) => {
            return (
              <motion.div
                key={index}
                className={`p-6 rounded-lg shadow-lg text-white ${stat.color} flex items-center gap-4`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {stat.icon}
                <div>
                  <h3 className="text-lg font-medium">{stat.title}</h3>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
              </motion.div>
            )
          })}
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
              action: () => navigate("/projects"),
              color: "bg-blue-600",
            },
            {
              label: "View All Labels",
              action: () => navigate("/labels"),
              color: "bg-green-600",
            },
            {
              label: "Manage Users",
              action: () => navigate("/users"),
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
  )
}

export default Overview
