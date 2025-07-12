import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  ForeignKey,
  HasMany,
  BelongsTo,
  Default,
  CreatedAt,
  UpdatedAt,
} from "sequelize-typescript"

export class Point extends Model {
  @Column(DataType.FLOAT)
  x!: number

  @Column(DataType.FLOAT)
  y!: number
}

@Table({ timestamps: true, modelName: "projects" })
export class ProjectRepository extends Model {
  @PrimaryKey
  @Column(DataType.STRING)
  id!: string

  @Column(DataType.STRING)
  name!: string

  @CreatedAt
  @Column({ type: DataType.DATE })
  createdAt!: Date

  @UpdatedAt
  @Column({ type: DataType.DATE })
  updatedAt!: Date

  @HasMany(() => LabelRepository)
  labels!: LabelRepository[]

  @HasMany(() => ImageDataRepository)
  images!: ImageDataRepository[]

  @HasMany(() => TaskRepository)
  tasks!: TaskRepository[]
}

@Table({ timestamps: true, modelName: "labels" })
export class LabelRepository extends Model {
  @PrimaryKey
  @Column(DataType.STRING)
  id!: string

  @Column(DataType.STRING)
  name!: string

  @Column(DataType.STRING)
  category?: string

  @Column(DataType.BOOLEAN)
  isAIGenerated?: boolean

  @CreatedAt
  @Column({ type: DataType.DATE })
  createdAt!: Date

  @UpdatedAt
  @Column({ type: DataType.DATE })
  updatedAt!: Date

  @ForeignKey(() => ProjectRepository)
  @Column(DataType.STRING)
  projectId!: string

  @BelongsTo(() => ProjectRepository)
  project!: ProjectRepository

  @HasMany(() => AnnotationRepository)
  annotations!: AnnotationRepository[]

  @Column(DataType.STRING)
  color!: string
}

@Table({ timestamps: true, modelName: "image_data" })
export class ImageDataRepository extends Model {
  @PrimaryKey
  @Column(DataType.STRING)
  id!: string

  @Column(DataType.STRING)
  name!: string

  @Column(DataType.TEXT)
  data!: string

  @Column(DataType.INTEGER)
  width!: number

  @Column(DataType.INTEGER)
  height!: number

  @Column(DataType.STRING)
  url?: string

  @CreatedAt
  @Column({ type: DataType.DATE })
  createdAt!: Date

  @UpdatedAt
  @Column({ type: DataType.DATE })
  updatedAt!: Date

  @ForeignKey(() => ProjectRepository)
  @Column(DataType.STRING)
  projectId!: string

  @BelongsTo(() => ProjectRepository)
  project!: ProjectRepository

  @HasMany(() => AnnotationRepository)
  annotations!: AnnotationRepository[]
}

@Table({ timestamps: true, modelName: "annotations" })
export class AnnotationRepository extends Model {
  @PrimaryKey
  @Column(DataType.STRING)
  id!: string

  @ForeignKey(() => LabelRepository)
  @Column(DataType.STRING)
  labelId!: string

  @BelongsTo(() => LabelRepository)
  label!: LabelRepository

  @Column(DataType.STRING)
  name!: string

  @Column(DataType.STRING)
  type!: string

  @Column(DataType.JSON)
  coordinates!: { x: number; y: number }[]

  @CreatedAt
  @Column({ type: DataType.DATE })
  createdAt!: Date

  @UpdatedAt
  @Column({ type: DataType.DATE })
  updatedAt!: Date

  @ForeignKey(() => ImageDataRepository)
  @Column(DataType.STRING)
  imageId!: string

  @BelongsTo(() => ImageDataRepository)
  image!: ImageDataRepository

  @Column(DataType.STRING)
  color?: string

  @Column(DataType.BOOLEAN)
  isAIGenerated?: boolean
}

@Table({ timestamps: true, modelName: "history" })
export class HistoryRepository extends Model {
  @PrimaryKey
  @Column(DataType.STRING)
  id!: string

  @Column(DataType.JSON)
  labels!: LabelRepository[]

  @Column(DataType.INTEGER)
  historyIndex!: number

  @Column(DataType.BOOLEAN)
  canUndo!: boolean

  @Column(DataType.BOOLEAN)
  canRedo!: boolean

  @CreatedAt
  @Column({ type: DataType.DATE })
  createdAt!: Date

  @UpdatedAt
  @Column({ type: DataType.DATE })
  updatedAt!: Date
}

@Table({ timestamps: true, modelName: "tasks" })
export class TaskRepository extends Model {
  @PrimaryKey
  @Column(DataType.STRING)
  id!: string

  @Column(DataType.STRING)
  name!: string

  @Column(DataType.TEXT)
  description!: string

  @ForeignKey(() => ProjectRepository)
  @Column(DataType.STRING)
  projectId!: string

  @BelongsTo(() => ProjectRepository)
  project!: ProjectRepository

  @Column(DataType.STRING)
  assignedTo?: string

  @Column(DataType.STRING)
  status!: string

  @Column(DataType.DATE)
  dueDate?: Date

  @CreatedAt
  @Column({ type: DataType.DATE })
  createdAt!: Date

  @UpdatedAt
  @Column({ type: DataType.DATE })
  updatedAt!: Date

  @Column(DataType.JSON)
  labels?: LabelRepository[]

  @Column(DataType.JSON)
  annotations?: AnnotationRepository[]
}

@Table({ timestamps: true, modelName: "export_formats" })
export class ExportFormatRepository extends Model {
  @PrimaryKey
  @Column(DataType.STRING)
  id!: string

  @Column(DataType.STRING)
  name!: string

  @Column(DataType.TEXT)
  description!: string

  @Column(DataType.STRING)
  extension!: string

  @CreatedAt
  @Column({ type: DataType.DATE })
  createdAt!: Date

  @UpdatedAt
  @Column({ type: DataType.DATE })
  updatedAt!: Date
}

@Table({ timestamps: true, modelName: "ai_models" })
export class AIModelRepository extends Model {
  @PrimaryKey
  @Column(DataType.STRING)
  id!: string

  @Column(DataType.STRING)
  name!: string

  @Column(DataType.TEXT)
  description!: string

  @Column(DataType.STRING)
  version!: string

  @Column(DataType.STRING)
  modelPath!: string

  @Column(DataType.STRING)
  configPath!: string

  @Column(DataType.INTEGER)
  modelSize!: number

  @Column(DataType.BOOLEAN)
  isCustom!: boolean

  @CreatedAt
  @Column({ type: DataType.DATE })
  createdAt!: Date

  @UpdatedAt
  @Column({ type: DataType.DATE })
  updatedAt!: Date
}

@Table({ timestamps: true, modelName: "settings" })
export class SettingsRepository extends Model {
  @PrimaryKey
  @Column(DataType.STRING)
  id!: string

  @Column(DataType.STRING)
  key!: string

  @Column(DataType.STRING)
  value!: string

  @CreatedAt
  @Column({ type: DataType.DATE })
  createdAt!: Date

  @UpdatedAt
  @Column({ type: DataType.DATE })
  updatedAt!: Date
}

@Table({ timestamps: true, modelName: "users" })
export class UserRepository extends Model {
  @PrimaryKey
  @Column(DataType.STRING)
  id!: string

  @Column(DataType.STRING)
  email!: string

  @Column(DataType.STRING)
  name!: string

  @Column(DataType.STRING)
  password!: string

  @Column(DataType.STRING)
  role!: string

  @CreatedAt
  @Column({ type: DataType.DATE })
  createdAt!: Date

  @UpdatedAt
  @Column({ type: DataType.DATE })
  updatedAt!: Date
}
