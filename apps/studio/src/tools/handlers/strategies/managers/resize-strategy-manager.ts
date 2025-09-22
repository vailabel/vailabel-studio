import { Annotation, Point } from "@vailabel/core"
import { ToolHandlerContext } from "../../hooks/use-canvas-handlers-context"
import { AnnotationResizeStrategy } from "../interfaces/annotation-resize-strategy"
import {
  BoxResizeStrategy,
  PolygonResizeStrategy,
  FreeDrawResizeStrategy,
} from "../resize/annotations"

export class ResizeStrategyManager {
  private strategies: AnnotationResizeStrategy[]

  constructor() {
    this.strategies = [
      new BoxResizeStrategy(),
      new PolygonResizeStrategy(),
      new FreeDrawResizeStrategy(),
    ]
  }

  resize(
    annotation: Annotation,
    point: Point,
    resizeHandle: string,
    context: ToolHandlerContext
  ): void {
    const strategy = this.strategies.find((s) => s.canHandle(annotation))

    if (strategy) {
      strategy.resize(annotation, point, resizeHandle, context)
    } else {
      console.warn(
        `No resize strategy found for annotation type: ${annotation.type}`
      )
    }
  }

  // Method to add custom resize strategies if needed
  addStrategy(strategy: AnnotationResizeStrategy): void {
    this.strategies.push(strategy)
  }

  // Method to remove a strategy
  removeStrategy(strategyType: new () => AnnotationResizeStrategy): void {
    this.strategies = this.strategies.filter(
      (strategy) => !(strategy instanceof strategyType)
    )
  }
}
