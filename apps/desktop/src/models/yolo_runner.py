import sys
import json
from ultralytics import YOLO

def main():
    image_path = sys.argv[1]
    model = YOLO('yolov8n.pt')
    results = model(image_path)
    labels = [{'label': r.names[int(cls)], 'box': box.xyxy[0].tolist()}
              for r in results for box, cls in zip(r.boxes, r.boxes.cls)]
    print(json.dumps(labels))

if __name__ == '__main__':
    main()
