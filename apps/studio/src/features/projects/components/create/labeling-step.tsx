import { memo, useMemo } from "react"
import {
  LABELING_TEMPLATES,
  type LabelingTemplate,
} from "@/shared/lib/label-config/labeling-templates"
import type { ConfigInfo } from "@/features/projects/model/config-info"
import { LabelingInterfaceEditor } from "@/features/projects/components/labeling-interface-editor"
import { TemplateCard } from "./template-card"
import { TemplateCategoryNav } from "./template-category-nav"

/** Step 2 — pick a template, then tune the labeling interface it generated. */
export const LabelingStep = memo(
  ({
    categories,
    category,
    onSelectCategory,
    templateId,
    selectedTemplate,
    customTemplate,
    configInfo,
    labelConfig,
    onLabelConfigChange,
    onSelectTemplate,
    onSelectCustom,
  }: {
    categories: readonly string[]
    category: string
    onSelectCategory: (category: string) => void
    templateId: string
    selectedTemplate?: LabelingTemplate
    customTemplate?: LabelingTemplate
    configInfo: ConfigInfo
    labelConfig: string
    onLabelConfigChange: (value: string) => void
    onSelectTemplate: (template: LabelingTemplate) => void
    onSelectCustom: (template: LabelingTemplate) => void
  }) => {
    const templates = useMemo(
      () => LABELING_TEMPLATES.filter((template) => template.category === category),
      [category]
    )

    return (
      <div className="flex h-full">
        <TemplateCategoryNav
          categories={categories}
          active={category}
          onSelectCategory={onSelectCategory}
          customTemplate={customTemplate}
          onSelectCustom={onSelectCustom}
        />

        <div className="min-w-0 flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                selected={template.id === templateId}
                onSelect={onSelectTemplate}
              />
            ))}
          </div>

          {selectedTemplate && (
            <div className="mt-6 border-t border-border pt-5">
              <p className="mb-3 text-sm font-semibold">
                {selectedTemplate.label}{" "}
                <span className="font-normal text-muted-foreground">
                  · configure the interface
                </span>
              </p>
              <LabelingInterfaceEditor
                value={labelConfig}
                onChange={onLabelConfigChange}
                config={configInfo.config}
                error={configInfo.error}
              />
            </div>
          )}
        </div>
      </div>
    )
  }
)

LabelingStep.displayName = "LabelingStep"
