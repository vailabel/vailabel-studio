import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
  HasMany,
  BelongsTo,
} from "sequelize-typescript"

@Table
export class Point extends Model {
  @Column(DataType.FLOAT)
  x!: number

  @Column(DataType.FLOAT)
  y!: number
}

@Table
export class Project extends Model {
  delete() {
      throw new Error("Method not implemented.")
  }
  @PrimaryKey
  @Column(DataType.STRING)
  id!: string

  @Column(DataType.STRING)
  name!: string

  @HasMany(() => Label)
  labels!: Label[]

  @HasMany(() => ImageData)
  images!: ImageData[]

  @HasMany(() => Task)
  tasks!: Task[]

  @CreatedAt
  @Column
  createdAt!: Date

  @UpdatedAt
  @Column
  lastModified!: Date
}

@Table
export class Label extends Model {
  @PrimaryKey
  @Column(DataType.STRING)
  id!: string

  @Column(DataType.STRING)
  name!: string

  @Column(DataType.STRING)
  category?: string

  @Column(DataType.BOOLEAN)
  isAIGenerated?: boolean

  @ForeignKey(() => Project)
  @Column(DataType.STRING)
  projectId!: string

  @BelongsTo(() => Project)
  project!: Project

  @HasMany(() => Annotation)
  annotations!: Annotation[]

  @Column(DataType.STRING)
  color!: string

  @CreatedAt
  @Column
  createdAt!: Date

  @UpdatedAt
  @Column
  updatedAt!: Date
}

@Table
export class ImageData extends Model {
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

  @ForeignKey(() => Project)
  @Column(DataType.STRING)
  projectId!: string

  @BelongsTo(() => Project)
  project!: Project

  @HasMany(() => Annotation)
  annotations!: Annotation[]

  @CreatedAt
  @Column
  createdAt!: Date
}

@Table
export class Annotation extends Model {
  @PrimaryKey
  @Column(DataType.STRING)
  id!: string

  @ForeignKey(() => Label)
  @Column(DataType.STRING)
  labelId!: string

  @BelongsTo(() => Label)
  label!: Label

  @Column(DataType.STRING)
  name!: string

  @Column(DataType.STRING)
  type!: string

  @Column(DataType.JSON)
  coordinates!: { x: number; y: number }[]

  @ForeignKey(() => ImageData)
  @Column(DataType.STRING)
  imageId!: string

  @BelongsTo(() => ImageData)
  image!: ImageData

  @CreatedAt
  @Column
  createdAt!: Date

  @UpdatedAt
  @Column
  updatedAt!: Date

  @Column(DataType.STRING)
  color?: string

  @Column(DataType.BOOLEAN)
  isAIGenerated?: boolean
}

@Table
export class History extends Model {
  @PrimaryKey
  @Column(DataType.STRING)
  id!: string

  @Column(DataType.JSON)
  labels!: Label[]

  @Column(DataType.INTEGER)
  historyIndex!: number

  @Column(DataType.BOOLEAN)
  canUndo!: boolean

  @Column(DataType.BOOLEAN)
  canRedo!: boolean
}

@Table
export class Task extends Model {
  @PrimaryKey
  @Column(DataType.STRING)
  id!: string

  @Column(DataType.STRING)
  name!: string

  @Column(DataType.TEXT)
  description!: string

  @ForeignKey(() => Project)
  @Column(DataType.STRING)
  projectId!: string

  @BelongsTo(() => Project)
  project!: Project

  @Column(DataType.STRING)
  assignedTo?: string

  @Column(DataType.STRING)
  status!: string

  @CreatedAt
  @Column
  createdAt!: Date

  @UpdatedAt
  @Column
  updatedAt!: Date

  @Column(DataType.DATE)
  dueDate?: Date

  @Column(DataType.JSON)
  labels?: Label[]

  @Column(DataType.JSON)
  annotations?: Annotation[]
}

@Table
export class ExportFormat extends Model {
  @PrimaryKey
  @Column(DataType.STRING)
  id!: string

  @Column(DataType.STRING)
  name!: string

  @Column(DataType.TEXT)
  description!: string

  @Column(DataType.STRING)
  extension!: string
}

@Table
export class AIModel extends Model {
  @PrimaryKey
  @Column(DataType.STRING)
  id!: string

  @Column(DataType.STRING)
  name!: string

  @Column(DataType.TEXT)
  description!: string

  @Column(DataType.STRING)
  version!: string

  @CreatedAt
  @Column
  createdAt!: Date

  @UpdatedAt
  @Column
  updatedAt!: Date

  @Column(DataType.STRING)
  modelPath!: string

  @Column(DataType.STRING)
  configPath!: string

  @Column(DataType.INTEGER)
  modelSize!: number

  @Column(DataType.BOOLEAN)
  isCustom!: boolean
}

@Table
export class Settings extends Model {
  @PrimaryKey
  @Column(DataType.STRING)
  id!: string

  @Column(DataType.STRING)
  key!: string

  @Column(DataType.STRING)
  value!: string
}


@Table
export class User extends Model {
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
  @Column
  createdAt!: Date

  @UpdatedAt
  @Column
  updatedAt!: Date
}
