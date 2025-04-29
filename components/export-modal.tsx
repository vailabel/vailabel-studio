"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Download, FileJson, FileCode, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import {
  exportToJson,
  exportToCoco,
  exportToPascalVoc,
  exportToYolo,
} from "@/lib/export-utils";
import type { Project } from "@/lib/types";
import type { Label as LabelType } from "@/lib/types";

interface ExportModalProps {
  project: Project;
  labels: LabelType[];
  onClose: () => void;
}

export function ExportModal({ project, labels, onClose }: ExportModalProps) {
  const { toast } = useToast();
  const [exportFormat, setExportFormat] = useState<string>("json");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!project) return;

    setIsExporting(true);

    try {
      const fileName = project.name.replace(/\s+/g, "-").toLowerCase();

      switch (exportFormat) {
        case "json":
          exportToJson(project, labels, `${fileName}-export.json`);
          break;
        case "coco":
          exportToCoco(project, labels, `${fileName}-coco.json`);
          break;
        case "pascal":
          exportToPascalVoc(project, labels, `${fileName}-pascal`);
          break;
        case "yolo":
          exportToYolo(project, labels, `${fileName}-yolo`);
          break;
      }

      toast({
        title: "Export successful",
        description: `Project exported in ${exportFormat.toUpperCase()} format`,
      });

      onClose();
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export failed",
        description: "Failed to export the project",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Export Project</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4">
          <p className="text-sm text-gray-500">
            Choose a format to export your project data
          </p>

          <RadioGroup
            value={exportFormat}
            onValueChange={setExportFormat}
            className="mt-4 space-y-3"
          >
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="json" id="json" className="mt-1" />
              <div>
                <Label htmlFor="json" className="flex items-center">
                  <FileJson className="mr-2 h-4 w-4" />
                  Simple JSON
                </Label>
                <p className="text-xs text-gray-500">
                  Export as a simple JSON file with all project data
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <RadioGroupItem value="coco" id="coco" className="mt-1" />
              <div>
                <Label htmlFor="coco" className="flex items-center">
                  <FileJson className="mr-2 h-4 w-4" />
                  COCO JSON
                </Label>
                <p className="text-xs text-gray-500">
                  MS COCO format, compatible with many computer vision
                  frameworks
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <RadioGroupItem value="pascal" id="pascal" className="mt-1" />
              <div>
                <Label htmlFor="pascal" className="flex items-center">
                  <FileCode className="mr-2 h-4 w-4" />
                  Pascal VOC XML
                </Label>
                <p className="text-xs text-gray-500">
                  XML format used by Pascal VOC dataset, one file per image
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <RadioGroupItem value="yolo" id="yolo" className="mt-1" />
              <div>
                <Label htmlFor="yolo" className="flex items-center">
                  <FileText className="mr-2 h-4 w-4" />
                  YOLO TXT
                </Label>
                <p className="text-xs text-gray-500">
                  Darknet YOLO format, one text file per image with normalized
                  coordinates
                </p>
              </div>
            </div>
          </RadioGroup>

          <div className="mt-6 flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
