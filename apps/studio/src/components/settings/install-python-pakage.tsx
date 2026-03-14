import { Card, CardContent } from "@/components/ui/card"

export const InstallPythonPackage = () => {
  return (
    <Card>
      <CardContent className="pt-6 text-sm text-muted-foreground">
        Python-based desktop features were removed in the Tauri migration.
        Future AI tooling should be implemented through Rust-native commands.
      </CardContent>
    </Card>
  )
}

export default InstallPythonPackage
