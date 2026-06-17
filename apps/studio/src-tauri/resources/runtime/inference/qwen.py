"""Qwen2-VL (transformers) — chat-style image captioning / visual Q&A.

`model_path` must be a local Qwen2-VL snapshot directory. Returns `{text}`.
"""

from typing import Any, Dict

from inference.loader import CACHE, lazy_import, load_image, pick_device


def _load(model_path: str):
    transformers = lazy_import("transformers", "transformers")
    torch = lazy_import("torch")
    device = pick_device()
    model_cls = getattr(transformers, "Qwen2VLForConditionalGeneration", None) or getattr(
        transformers, "AutoModelForVision2Seq"
    )
    # device_map dispatches cuda/cpu directly; transformers doesn't reliably map
    # "mps", so on Apple Silicon load then move the model onto the GPU.
    if device == "mps":
        model = model_cls.from_pretrained(model_path, torch_dtype="auto").eval().to("mps")
    else:
        model = model_cls.from_pretrained(
            model_path, torch_dtype="auto", device_map=device
        ).eval()
    processor = transformers.AutoProcessor.from_pretrained(model_path)
    return model, processor, device


def run_caption(req: Any) -> Dict[str, Any]:
    model, processor, device = CACHE.get_or_load(
        f"qwen:{req.model_path}", lambda: _load(req.model_path)
    )
    image, _ = load_image(req.image_path)
    question = (getattr(req, "prompt", None) or "").strip() or "Describe this image in detail."
    messages = [
        {
            "role": "user",
            "content": [
                {"type": "image", "image": req.image_path},
                {"type": "text", "text": question},
            ],
        }
    ]
    text = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = processor(text=[text], images=[image], return_tensors="pt").to(device)
    generated = model.generate(**inputs, max_new_tokens=512)
    # Drop the prompt tokens before decoding the answer.
    trimmed = generated[:, inputs["input_ids"].shape[1] :]
    out = processor.batch_decode(
        trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False
    )[0]
    return {"text": out.strip()}
