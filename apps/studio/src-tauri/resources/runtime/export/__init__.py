# Exporters (onnx, tensorrt, openvino). Each exposes a `run(req)` callable that
# converts `req.model_path` to `req.output_path` and returns an ExportResult.
