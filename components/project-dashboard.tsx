"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Plus, Trash2, FolderOpen, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProjectManager } from "@/components/project-manager";
import { useToast } from "@/hooks/use-toast";
import type { Project } from "@/lib/types";
import Image from "next/image";

interface ProjectDashboardProps {
  projects: Project[];
  isLoading: boolean;
  onProjectSelect: (project: Project) => void;
  onProjectCreate: (project: Project) => void;
  onProjectDelete: (projectId: string) => void;
}

export function ProjectDashboard({
  projects,
  isLoading,
  onProjectSelect,
  onProjectCreate,
  onProjectDelete,
}: ProjectDashboardProps) {
  const { toast } = useToast();
  const [showNewProject, setShowNewProject] = useState(false);

  const handleProjectCreate = (project: Project) => {
    onProjectCreate(project);
    setShowNewProject(false);

    toast({
      title: "Project created",
      description: `${project.name} has been created with ${project.images.length} images.`,
    });
  };

  const handleDeleteProject = (projectId: string, projectName: string) => {
    if (
      confirm(
        `Are you sure you want to delete "${projectName}"? This action cannot be undone.`
      )
    ) {
      onProjectDelete(projectId);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center">
          <Image
            src="/logo.png"
            alt="Logo"
            width={100}
            height={100}
            className="inline-block mr-2"
          />
        </div>
        <Button onClick={() => setShowNewProject(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-medium text-gray-500">
              Loading projects...
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.length > 0 ? (
            projects.map((project) => (
              <Card key={project.id} className="overflow-hidden">
                <CardHeader className="bg-gray-50">
                  <CardTitle>{project.name}</CardTitle>
                  <CardDescription>
                    Created on{" "}
                    {new Date(project.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <ImageIcon className="h-4 w-4" />
                    <span>{project.images.length} images</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Last modified:{" "}
                    {new Date(project.lastModified).toLocaleString()}
                  </p>
                </CardContent>
                <CardFooter className="flex justify-between bg-gray-50 p-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onProjectSelect(project)}
                  >
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Open Project
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:bg-red-50 hover:text-red-600"
                    onClick={() =>
                      handleDeleteProject(project.id, project.name)
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="col-span-full flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <p className="text-lg font-medium text-gray-500">
                  No projects found
                </p>
                <p className="text-sm text-gray-400">
                  Create a new project to get started
                </p>
                <Button
                  className="mt-4"
                  onClick={() => setShowNewProject(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Project
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showNewProject && (
          <ProjectManager
            onClose={() => setShowNewProject(false)}
            onProjectCreate={handleProjectCreate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
