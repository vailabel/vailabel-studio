<h1 align="center">Vision AI Label Studio</h1>
<p align="center">
  <img src="/docs/logo.png" alt="Logo" width="200">
</p>
<span align="center">
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=vailabel_vailabel-studio&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=vailabel_vailabel-studio)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=vailabel_vailabel-studio&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=vailabel_vailabel-studio)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=vailabel_vailabel-studio&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=vailabel_vailabel-studio)
[![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=vailabel_vailabel-studio&metric=duplicated_lines_density)](https://sonarcloud.io/summary/new_code?id=vailabel_vailabel-studio)
</span>
A powerful, modern **image labeling tool** built with **React.js**, **TypeScript**, **TailwindCSS**, **Framer Motion**, and **Dexie.js**, designed for creating high-quality datasets for machine learning models.  
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
- **Desktop Application** : Support Multi-platform Desktop app for Mac/Window/Linux

---

## 📸 Demo Screenshots

![Studio](/docs/screens/studio.gif)

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 20
- yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/vailabel/vailabel-studio.git

# Go into the project directory
cd vailabel-studio

# Install dependencies
yarn install

# Run the development server
yarn dev
```

Then open [http://localhost:3000](http://localhost:3000) 🚀

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
- [ ] AI YOLOv8 Auto-Detection
- [ ] Export Multiple Formats
- [ ] Multi-Class Annotation (Class Picker)
- [ ] Video Frame-by-Frame Annotation
- [ ] Collaborative Labeling (Team mode)

---

## 🤝 Contributing

Pull requests are welcome!  
For major changes, please open an issue first to discuss what you would like to change.

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
