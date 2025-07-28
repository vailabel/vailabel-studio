# Mouse Move Strategies

This directory contains the strategy pattern implementation for handling mouse move operations in the move handler.

## Overview

The mouse move logic has been refactored from a single monolithic method into separate strategy classes to improve maintainability and follow the single responsibility principle. The resize functionality has been further separated into annotation-type-specific strategies.

## Organization Principles

The strategy files are organized by **responsibility and type** into the following structure:

- **`interfaces/`** - Contains all strategy interfaces and type definitions
- **`managers/`** - Contains strategy coordinators that manage and delegate to specific strategies
- **`resize/`** - Contains all resize-related strategies, with annotation-specific implementations in a subdirectory
- **`move/`** - Contains all move-related strategies

This organization provides:

- **Clear separation of concerns** by grouping related functionality
- **Easy navigation** by organizing files by their primary responsibility
- **Scalability** for adding new annotation types or operation types
- **Maintainability** through logical grouping and consistent structure

## Strategy Classes

### `MouseMoveStrategy` (Interface)

The base interface that all mouse move strategies must implement.

```typescript
interface MouseMoveStrategy {
  handle(e: React.MouseEvent, point: Point, context: ToolHandlerContext): void
}
```

### `AnnotationResizeStrategy` (Interface)

The base interface for annotation-specific resize strategies.

```typescript
interface AnnotationResizeStrategy {
  canHandle(annotation: Annotation): boolean
  resize(
    annotation: Annotation,
    point: Point,
    resizeHandle: string,
    context: ToolHandlerContext
  ): void
}
```

### `ResizeStrategy`

Main resize strategy that coordinates annotation-specific resize operations through the `ResizeStrategyManager`.

### `ResizeStrategyManager`

Manages and coordinates different annotation-specific resize strategies:

- Finds the appropriate strategy based on annotation type
- Delegates resize operations to the correct strategy
- Provides methods to add/remove custom strategies

### Annotation-Specific Resize Strategies

#### `BoxResizeStrategy`

Handles resizing for box annotations:

- Supports all resize handles (top-left, top-right, bottom-left, bottom-right, top, right, bottom, left)
- Ensures coordinates are normalized (topLeft always above/left of bottomRight)
- Updates preview coordinates during resize operations

#### `PolygonResizeStrategy`

Handles resizing for polygon annotations:

- Supports vertex-based resizing using handles like "vertex-0", "vertex-1", etc.
- Allows moving individual vertices of the polygon
- Maintains polygon structure while updating specific points

#### `FreeDrawResizeStrategy`

Handles resizing for free draw annotations:

- Supports point-based resizing using handles like "point-0", "point-1", etc.
- Allows modifying individual points in the free draw path
- Can be extended to support scaling the entire drawing

### `MoveStrategy`

Handles mouse move operations when moving annotations. This strategy:

- Supports moving different annotation types (box, polygon, freeDraw)
- Calculates offset-based movement for each annotation type
- Updates preview coordinates during move operations
- Uses appropriate anchor points for different annotation types (topLeft for box, centroid for polygon, first point for freeDraw)

### `MouseMoveStrategyManager`

Coordinates the different strategies and determines which one to use based on the current tool state:

- Checks if resizing is in progress and delegates to `ResizeStrategy`
- Checks if moving is in progress and delegates to `MoveStrategy`
- Provides early return if no operation is in progress

## Benefits

1. **Separation of Concerns**: Each strategy handles a specific type of operation or annotation type
2. **Maintainability**: Easier to modify or extend individual behaviors without affecting others
3. **Testability**: Each strategy can be unit tested independently
4. **Extensibility**: New annotation types or behaviors can be added by implementing the appropriate interfaces
5. **Type Safety**: Annotation-specific logic is isolated and type-safe

## Usage

The strategies are integrated into the `MoveHandler` class through the `MouseMoveStrategyManager`:

```typescript
export class MoveHandler implements ToolHandler {
  private mouseMoveStrategyManager: MouseMoveStrategyManager

  constructor(private context: ToolHandlerContext) {
    this.mouseMoveStrategyManager = new MouseMoveStrategyManager()
  }

  onMouseMove(e: React.MouseEvent, point: Point) {
    this.mouseMoveStrategyManager.handleMouseMove(e, point, this.context)
  }
}
```

## File Structure

```
src/tools/handlers/strategies/
├── index.ts                                    # Main exports
├── README.md                                   # This documentation
├── interfaces/                                 # Strategy interfaces and types
│   ├── index.ts                               # Interface exports
│   ├── mouse-move-strategy.ts                 # Base mouse move strategy interface
│   └── annotation-resize-strategy.ts          # Annotation resize strategy interface
├── managers/                                   # Strategy coordinators and managers
│   ├── index.ts                               # Manager exports
│   ├── mouse-move-strategy-manager.ts         # Main strategy coordinator
│   └── resize-strategy-manager.ts             # Resize strategy coordinator
├── resize/                                     # Resize-related strategies
│   ├── index.ts                               # Resize strategy exports
│   ├── resize-strategy.ts                     # Main resize strategy
│   └── annotations/                           # Annotation-specific resize strategies
│       ├── index.ts                           # Annotation strategy exports
│       ├── box-resize-strategy.ts             # Box annotation resize logic
│       ├── polygon-resize-strategy.ts         # Polygon annotation resize logic
│       └── free-draw-resize-strategy.ts       # Free draw annotation resize logic
└── move/                                       # Move-related strategies
    ├── index.ts                               # Move strategy exports
    └── move-strategy.ts                       # Main move strategy
```

This replaces the previous complex conditional logic with a clean, organized strategy pattern implementation that is easily extensible for new annotation types.
