<h1 align="center">🌟 Vision AI Label Studio 🌟</h1>
<p align="center">
  <img src="/apps/web/public/logo.png" alt="Logo" width="200">
</p>
<p align="center">
  <span style="display: flex; flex-direction: row; align-items: center; justify-content: center;">
    <a href="https://sonarcloud.io/summary/new_code?id=vailabel_vailabel-studio">
      <img src="https://sonarcloud.io/api/project_badges/measure?project=vailabel_vailabel-studio&metric=alert_status" alt="Quality Gate Status">
    </a>
    <a href="https://sonarcloud.io/summary/new_code?id=vailabel_vailabel-studio">
      <img src="https://sonarcloud.io/api/project_badges/measure?project=vailabel_vailabel-studio&metric=vulnerabilities" alt="Vulnerabilities">
    </a>
    <a href="https://sonarcloud.io/summary/new_code?id=vailabel_vailabel-studio">
      <img src="https://sonarcloud.io/api/project_badges/measure?project=vailabel_vailabel-studio&metric=sqale_rating" alt="Maintainability Rating">
    </a>
    <a href="https://sonarcloud.io/summary/new_code?id=vailabel_vailabel-studio">
      <img src="https://sonarcloud.io/api/project_badges/measure?project=vailabel_vailabel-studio&metric=duplicated_lines_density" alt="Duplicated Lines (%)">
    </a>
    <a href="https://sonarcloud.io/summary/new_code?id=vailabel_vailabel-studio">
      <img src="https://sonarcloud.io/api/project_badges/measure?project=vailabel_vailabel-studio&metric=coverage" alt="Coverage">
    </a>
  </span>
</p>

<a href="https://www.producthunt.com/posts/vision-ai-label-studio?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-vision&#0045;ai&#0045;label&#0045;studio" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=966886&theme=light&t=1748298189007" alt="Vision&#0032;AI&#0032;Label&#0032;Studio - Label&#0032;images&#0032;manually&#0044;&#0032;Free&#0044;&#0032;offline&#0044;&#0032;and&#0032;open&#0045;source | Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" /></a>

<p align="center">
  A powerful, modern <strong>image labeling tool</strong> built with <strong>React.js</strong>, <strong>TypeScript</strong>, <strong>TailwindCSS</strong>, <strong>Framer Motion</strong>, and <strong>Dexie.js</strong>, designed for creating high-quality datasets for machine learning models. Supports manual annotation, free drawing, and <strong>AI-assisted labeling</strong> using <strong>YOLOv8</strong> models.
</p>

---

## 📑 Table of Contents
- [✨ Features](#-features)
- [📂 Sub-Projects](#-sub-projects)
- [📸 Demo Screenshots](#-demo-screenshots)
- [🚀 Getting Started](#-getting-started)
- [📦 Export Formats](#-export-formats)
- [🤖 AI Auto-Labeling (YOLOv8 Integration)](#-ai-auto-labeling-yolov8-integration)
- [📝 Roadmap](#-roadmap)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [❤️ Acknowledgements](#-acknowledgements)

## ✨ Features

- 🚀 **Project Management**: Create, Save, Load, and Export labeling projects offline using Dexie.js.
- 🖌️ **Manual Annotation**: Draw bounding boxes, polygons, and freehand shapes on images.
- 📈 **Custom Canvas Tools**: Zoom, Pan, Resizable Divider, Ruler Guides, Dynamic Cursor Coordinates.
- ⚡ **AI Auto-Labeling**: Integrate YOLOv8 models to automatically detect and label objects.
- 🖱️ **Custom Right-Click Menu**: Quick tool switching with context menu.
- 🗃️ **Multi-Format Export**: Export labeled datasets in COCO JSON, Pascal VOC XML, YOLO TXT, and Simple JSON formats.
- 🌓 **Light/Dark Mode**: Modern UI with full responsive design.
- 💾 **Offline Support**: Save your projects locally without any backend required.
- 🖥️ **Desktop Application**: Support Multi-platform Desktop app for Mac/Window/Linux.

---

## 📂 Sub-Projects

| Sub-Project                 | Description                                                                        |
| --------------------------- | ---------------------------------------------------------------------------------- |
| [**Desktop**](apps/desktop) | 🖥️ Multi-platform desktop application for Mac, Windows, and Linux.                 |
| [**Studio**](apps/studio)   | 🌐 Web-based image labeling tool with advanced features like AI-assisted labeling. |
| [**API**](apps/api)         | 🖥️ FastAPI server for running YOLOv8 & web-based inference.                        |
| [**Web**](apps/web)         | 📚 Documentation and updates site for the project.                                 |

---

## 📸 Demo Screenshots

![Studio](/docs/screens/studio.gif)

---

## 🚀 Getting Started

### Prerequisites

- 🛠️ Node.js >= 20
- 📦 yarn

### Installation

#### Install pnpm globally if you haven't already:

```bash
npm install -g pnpm
```
#### Clone the repository and install dependencies:

```bash
# Clone the repository
git clone https://github.com/vailabel/vailabel-studio.git

# Go into the project directory
cd vailabel-studio

# Install dependencies
pnpm install


# Run the development server
pnpm dev
```


### NPM Scripts
| Command                | Description                                      |
| ---------------------- | ------------------------------------------------ |
| `pnpm dev`             | Start the development server both desktop and web                 |
| `pnpm build`           | Build the project for production                  |
| `pnpm lint`            | Run ESLint to check for code quality              |
| `pnpm format`          | Format the code using Prettier                    |
| `pnpm test`            | Run tests using Vitest                            |
| `pnpm desktop`        | Start the desktop application development server with studio app                 |
| `pnpm studio`          | Start the web-based labeling tool                 |
| `pnpm api`             | Start the FastAPI server for YOLOv8 inference    |
| `pnpm web`             | Start the documentation site                      |


---

## 📦 Export Formats

- **COCO JSON**: 🐒 Object detection format used in MS COCO dataset.
- **Pascal VOC**: 📄 XML annotation format.
- **YOLO TXT**: 🦁 YOLO label format (class x_center y_center width height).
- **Simple JSON**: 📋 Flat JSON export of annotations.

---

## 🤖 AI Auto-Labeling (YOLOv8 Integration)

- Click "**Auto Detect with AI**" button to run YOLOv8 model.
- Bounding boxes predicted by the AI will automatically appear on the canvas.
- Supports using pre-trained or custom YOLOv8 models.
- (Optional: Connect to a lightweight FastAPI server if browser-based inference is too heavy.)

---

## 📝 Roadmap

- [x] ✏️ Free Drawing (Lasso Tool)
- [x] 💾 Offline Project Storage
- [x] 🖼️ Multi-Image Labeling Projects
- [x] 🖥️ Desktop App (Electron)
- [ ] 🤖 AI YOLOv8 Auto-Detection (In Progress)
- [x] 📤 Export Multiple Formats
- [x] 🏷️ Multi-Class Annotation (Class Picker)
- [ ] 🎥 Video Frame-by-Frame Annotation
- [ ] 🖼️ Image Segmentation (Polygon)
- [ ] 🖼️ Text Annotation (OCR)
- [ ] 👥 Collaborative Labeling (Team mode) - Cloud Self-host
- [ ] ☁️ Cloud Storage Integration (S3, GCS, Azure)

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

For detailed guidelines, see the [Contributing Guide](CONTRIBUTE.md).

---

## 📄 License

This project is licensed under the **GNU GENERAL PUBLIC LICENSE** — see the [LICENSE](LICENSE) file for details.

---

## ❤️ Acknowledgements

- [Ultralytics YOLOv8](https://github.com/ultralytics/ultralytics)
- [TailwindCSS](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [Dexie.js](https://dexie.org/)
- Inspiration: Roboflow, Label Studio, CVAT

---
