# 🖼️ AI Labeling Studio

A powerful, modern **image labeling tool** built with **Next.js**, **TypeScript**, **TailwindCSS**, **Framer Motion**, and **Dexie.js**, designed for creating high-quality datasets for machine learning models.  
Supports manual annotation, free drawing, and **AI-assisted labeling** using **YOLOv8** models.

---

## ✨ Features

- 🚀 **Project Management**: Create, Save, Load, and Export labeling projects offline using Dexie.js.
- 🖌️ **Manual Annotation**: Draw bounding boxes, polygons, and freehand shapes on images.
- 📈 **Custom Canvas Tools**: Zoom, Pan, Resizable Divider, Ruler Guides, Dynamic Cursor Coordinates.
- ⚡ **AI Auto-Labeling**: Integrate YOLOv8 models to automatically detect and label objects.
- 🖱️ **Custom Right-Click Menu**: Quick tool switching with context menu.
- 🗃️ **Multi-Format Export**: Export labeled datasets in COCO JSON, Pascal VOC XML, YOLO TXT, and Simple JSON formats.
- 🌓 **Light/Dark Mode**: Modern UI with full responsive design.
- 💾 **Offline Support**: Save your projects locally without any backend required.

---

## 📸 Demo Screenshots

<!-- Add screenshots/gif later when you build -->

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18
- pnpm / yarn / npm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/ai-labeling-studio.git

# Go into the project directory
cd ai-labeling-studio

# Install dependencies
pnpm install

# Run the development server
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000) 🚀

---

## 🛠️ Project Structure

```bash
src/
  ├── components/
  │    ├── CanvasArea.tsx
  │    ├── FreeDrawTool.tsx
  │    ├── RightClickContextMenu.tsx
  │    ├── ResizableDivider.tsx
  │    ├── LabelSidebar.tsx
  │    └── ExportModal.tsx
  ├── services/
  │    ├── DexieStorageService.ts
  │    ├── AIModelService.ts
  │    └── ExportService.ts
  ├── utils/
  │    └── dataConverters.ts
  ├── hooks/
  │    └── useCanvasTools.ts
  └── pages/
       ├── index.tsx
       └── _app.tsx
```

---

## 📦 Export Formats

- **COCO JSON**: Object detection format used in MS COCO dataset.
- **Pascal VOC**: XML annotation format.
- **YOLO TXT**: YOLO label format (class x_center y_center width height).
- **Simple JSON**: Flat JSON export of annotations.

---

## 🤖 AI Auto-Labeling (YOLOv8 Integration)

- Click "**Auto Detect with AI**" button to run YOLOv8 model.
- Bounding boxes predicted by the AI will automatically appear on the canvas.
- Supports using pre-trained or custom YOLOv8 models.
- (Optional: Connect to a lightweight FastAPI server if browser-based inference is too heavy.)

---

## 📝 Roadmap

- [x] Free Drawing (Lasso Tool)
- [x] Offline Project Storage
- [x] Multi-Image Labeling Projects
- [x] AI YOLOv8 Auto-Detection
- [x] Export Multiple Formats
- [ ] Multi-Class Annotation (Class Picker)
- [ ] Video Frame-by-Frame Annotation
- [ ] Collaborative Labeling (Team mode)

---

## 🤝 Contributing

Pull requests are welcome!  
For major changes, please open an issue first to discuss what you would like to change.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## ❤️ Acknowledgements

- [Next.js](https://nextjs.org/)
- [Ultralytics YOLOv8](https://github.com/ultralytics/ultralytics)
- [TailwindCSS](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [Dexie.js](https://dexie.org/)
- Inspiration: Roboflow, Label Studio, CVAT

