import { useContext, createContext } from "react"
import { ServiceContainer } from "./ServiceContainer"

const ServiceContext = createContext<ServiceContainer | null>(null)

export function ServiceProvider({ children, services }: { children: React.ReactNode; services: ServiceContainer }) {
  return (
    <ServiceContext.Provider value={services}>
      {children}
    </ServiceContext.Provider>
  )
}

export function useServices(): ServiceContainer {
  const services = useContext(ServiceContext)
  if (!services) {
    throw new Error("useServices must be used within a ServiceProvider")
  }
  return services
}
