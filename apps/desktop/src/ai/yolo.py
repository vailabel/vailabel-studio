# This is a shell script to test the YOLOv8 model using Python
import argparse
from ultralytics import YOLO

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run YOLOv8 on an image with a custom model.")
    parser.add_argument("--model", required=True, help="Path to the YOLOv8 model (.pt) file")
    parser.add_argument("--source", help="Path to the input source file")
    parser.add_argument("--image-base64", help="Base64-encoded image string instead of file path")
    parser.add_argument("--conf", type=float, default=0.25, help="Confidence threshold for predictions")
    args = parser.parse_args()

    import base64
    import io
    from PIL import Image

    if args.image_base64:
        # Remove data URL prefix if present
        base64_str = args.image_base64
        if base64_str.startswith('data:'):
            base64_str = base64_str.split(',', 1)[-1]
        # Decode base64 image and save to a temporary file
        try:
            image_data = base64.b64decode(base64_str)
        except Exception as e:
            import sys
            print(f"Failed to decode base64 image: {e}", file=sys.stderr)
            exit(1)
        # Try to detect image format and convert if needed
        try:
            from PIL import Image
            import tempfile
            import os
            # Open and re-save as JPEG for YOLO
            with Image.open(io.BytesIO(image_data)) as image:
                with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
                    image.convert("RGB").save(tmp, format="JPEG")
                    image_path = tmp.name
        except Exception as e:
            import sys
            print(f"Failed to process image: {e}", file=sys.stderr)
            exit(1)
    else:
        image_path = args.source

    model = YOLO(args.model)
    results = model(image_path, conf=args.conf)
    print(results[0].to_json())