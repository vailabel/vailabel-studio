// AUTO-GENERATED from Label Studio annotation_templates (develop branch).
// Converted to our native JSON via parseLabelConfig + serializeConfig.
// Regenerate with the __ls-gen generator; do not hand-edit.

export interface LsTemplate {
  id: string
  label: string
  group: string
  dataKind: string
  image?: string
  supported: boolean
  config: string
}

export const LS_TEMPLATES: LsTemplate[] = [
  {
    "id": "asr",
    "label": "Automatic Speech Recognition",
    "group": "Audio/Speech Processing",
    "dataKind": "audio",
    "supported": true,
    "config": "{\n  \"objects\": [\n    {\n      \"tag\": \"audio\",\n      \"name\": \"audio\",\n      \"value\": \"$audio\",\n      \"attrs\": {\n        \"name\": \"audio\",\n        \"value\": \"$audio\",\n        \"zoom\": \"true\",\n        \"hotkey\": \"ctrl+enter\"\n      }\n    }\n  ],\n  \"controls\": [\n    {\n      \"tag\": \"textarea\",\n      \"name\": \"transcription\",\n      \"toName\": \"audio\",\n      \"attrs\": {\n        \"name\": \"transcription\",\n        \"toname\": \"audio\",\n        \"rows\": \"4\",\n        \"editable\": \"true\",\n        \"maxsubmissions\": \"1\"\n      }\n    }\n  ]\n}",
    "image": "/templates/asr.png"
  },
  {
    "id": "asr-segments",
    "label": "Automatic Speech Recognition using Segments",
    "group": "Audio/Speech Processing",
    "dataKind": "audio",
    "supported": true,
    "config": "{\n  \"objects\": [\n    {\n      \"tag\": \"audio\",\n      \"name\": \"audio\",\n      \"value\": \"$audio\",\n      \"attrs\": {\n        \"name\": \"audio\",\n        \"value\": \"$audio\"\n      }\n    }\n  ],\n  \"controls\": [\n    {\n      \"tag\": \"labels\",\n      \"name\": \"labels\",\n      \"toName\": \"audio\",\n      \"choices\": [\n        {\n          \"value\": \"Speech\"\n        },\n        {\n          \"value\": \"Noise\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"labels\",\n        \"toname\": \"audio\"\n      }\n    },\n    {\n      \"tag\": \"textarea\",\n      \"name\": \"transcription\",\n      \"toName\": \"audio\",\n      \"attrs\": {\n        \"name\": \"transcription\",\n        \"toname\": \"audio\",\n        \"rows\": \"2\",\n        \"editable\": \"true\",\n        \"perregion\": \"true\",\n        \"required\": \"true\"\n      }\n    }\n  ]\n}",
    "image": "/templates/asr-segments.png"
  },
  {
    "id": "ls-intent-classification",
    "label": "Intent Classification",
    "group": "Audio/Speech Processing",
    "dataKind": "audio",
    "supported": true,
    "config": "{\n  \"objects\": [\n    {\n      \"tag\": \"audio\",\n      \"name\": \"audio\",\n      \"value\": \"$audio\",\n      \"attrs\": {\n        \"name\": \"audio\",\n        \"value\": \"$audio\"\n      }\n    }\n  ],\n  \"controls\": [\n    {\n      \"tag\": \"labels\",\n      \"name\": \"labels\",\n      \"toName\": \"audio\",\n      \"choices\": [\n        {\n          \"value\": \"Segment\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"labels\",\n        \"toname\": \"audio\"\n      }\n    },\n    {\n      \"tag\": \"choices\",\n      \"name\": \"intent\",\n      \"toName\": \"audio\",\n      \"choices\": [\n        {\n          \"value\": \"Question\"\n        },\n        {\n          \"value\": \"Request\"\n        },\n        {\n          \"value\": \"Satisfied\"\n        },\n        {\n          \"value\": \"Interested\"\n        },\n        {\n          \"value\": \"Unsatisfied\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"intent\",\n        \"toname\": \"audio\",\n        \"perregion\": \"true\",\n        \"required\": \"true\"\n      }\n    }\n  ]\n}",
    "image": "/templates/ls-intent-classification.png"
  },
  {
    "id": "ls-signal-quality-audio",
    "label": "Signal Quality Detection",
    "group": "Audio/Speech Processing",
    "dataKind": "audio",
    "supported": true,
    "config": "{\n  \"objects\": [\n    {\n      \"tag\": \"audio\",\n      \"name\": \"audio\",\n      \"value\": \"$audio\",\n      \"attrs\": {\n        \"name\": \"audio\",\n        \"value\": \"$audio\"\n      }\n    }\n  ],\n  \"controls\": [\n    {\n      \"tag\": \"rating\",\n      \"name\": \"rating\",\n      \"toName\": \"audio\",\n      \"attrs\": {\n        \"name\": \"rating\",\n        \"toname\": \"audio\",\n        \"maxrating\": \"10\",\n        \"icon\": \"star\",\n        \"size\": \"medium\"\n      }\n    }\n  ]\n}",
    "image": "/templates/ls-signal-quality-audio.png"
  },
  {
    "id": "sound-event-detection",
    "label": "Sound Event Detection",
    "group": "Audio/Speech Processing",
    "dataKind": "audio",
    "supported": true,
    "config": "{\n  \"objects\": [\n    {\n      \"tag\": \"audio\",\n      \"name\": \"audio\",\n      \"value\": \"$audio\",\n      \"attrs\": {\n        \"name\": \"audio\",\n        \"value\": \"$audio\"\n      }\n    }\n  ],\n  \"controls\": [\n    {\n      \"tag\": \"labels\",\n      \"name\": \"label\",\n      \"toName\": \"audio\",\n      \"choices\": [\n        {\n          \"value\": \"Event A\",\n          \"background\": \"red\"\n        },\n        {\n          \"value\": \"Event B\",\n          \"background\": \"green\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"label\",\n        \"toname\": \"audio\",\n        \"zoom\": \"true\",\n        \"hotkey\": \"ctrl+enter\"\n      }\n    }\n  ]\n}",
    "image": "/templates/sound-event-detection.png"
  },
  {
    "id": "speaker-segmentation",
    "label": "Speaker Segmentation",
    "group": "Audio/Speech Processing",
    "dataKind": "audio",
    "supported": true,
    "config": "{\n  \"objects\": [\n    {\n      \"tag\": \"audio\",\n      \"name\": \"audio\",\n      \"value\": \"$audio\",\n      \"attrs\": {\n        \"name\": \"audio\",\n        \"value\": \"$audio\"\n      }\n    }\n  ],\n  \"controls\": [\n    {\n      \"tag\": \"labels\",\n      \"name\": \"label\",\n      \"toName\": \"audio\",\n      \"choices\": [\n        {\n          \"value\": \"Speaker one\",\n          \"background\": \"#00FF00\"\n        },\n        {\n          \"value\": \"Speaker two\",\n          \"background\": \"#12ad59\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"label\",\n        \"toname\": \"audio\",\n        \"zoom\": \"true\",\n        \"hotkey\": \"ctrl+enter\"\n      }\n    }\n  ]\n}",
    "image": "/templates/speaker-segmentation.png"
  },
  {
    "id": "ls-mammogram-classification",
    "label": "Breast Cancer Mammogram Classification",
    "group": "Community Contributions",
    "dataKind": "text",
    "supported": true,
    "config": "{\n  \"objects\": [\n    {\n      \"tag\": \"text\",\n      \"name\": \"birads_legend\",\n      \"value\": \"BI-RADS: 0 = Incomplete, 1 = Negative, 2 = Benign, 3 = Probably Benign, 4 = Suspicious, 5 = Highly Suggestive of Malignancy, 6 = Known Cancer\",\n      \"attrs\": {\n        \"name\": \"birads_legend\",\n        \"value\": \"BI-RADS: 0 = Incomplete, 1 = Negative, 2 = Benign, 3 = Probably Benign, 4 = Suspicious, 5 = Highly Suggestive of Malignancy, 6 = Known Cancer\"\n      }\n    },\n    {\n      \"tag\": \"image\",\n      \"name\": \"left_cc\",\n      \"value\": \"$img1\",\n      \"attrs\": {\n        \"name\": \"left_cc\",\n        \"value\": \"$img1\",\n        \"classname\": \"mammogram-image\"\n      }\n    },\n    {\n      \"tag\": \"image\",\n      \"name\": \"right_cc\",\n      \"value\": \"$img3\",\n      \"attrs\": {\n        \"name\": \"right_cc\",\n        \"value\": \"$img3\",\n        \"classname\": \"mammogram-image\"\n      }\n    },\n    {\n      \"tag\": \"image\",\n      \"name\": \"left_mlo\",\n      \"value\": \"$img2\",\n      \"attrs\": {\n        \"name\": \"left_mlo\",\n        \"value\": \"$img2\",\n        \"classname\": \"mammogram-image\"\n      }\n    },\n    {\n      \"tag\": \"image\",\n      \"name\": \"right_mlo\",\n      \"value\": \"$img4\",\n      \"attrs\": {\n        \"name\": \"right_mlo\",\n        \"value\": \"$img4\",\n        \"classname\": \"mammogram-image\"\n      }\n    }\n  ],\n  \"controls\": [\n    {\n      \"tag\": \"choices\",\n      \"name\": \"birads_left\",\n      \"toName\": \"left_cc\",\n      \"choices\": [\n        {\n          \"value\": \"0 - Incomplete\"\n        },\n        {\n          \"value\": \"1 - Negative\"\n        },\n        {\n          \"value\": \"2 - Benign\"\n        },\n        {\n          \"value\": \"3 - Probably Benign\"\n        },\n        {\n          \"value\": \"4 - Suspicious Abnormality\"\n        },\n        {\n          \"value\": \"5 - Highly Suggestive of Malignancy\"\n        },\n        {\n          \"value\": \"6 - Known Biopsy-Proven Malignancy\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"birads_left\",\n        \"toname\": \"left_cc,right_cc,left_mlo,right_mlo\",\n        \"choice\": \"single\",\n        \"required\": \"true\"\n      }\n    },\n    {\n      \"tag\": \"choices\",\n      \"name\": \"density_left\",\n      \"toName\": \"left_cc\",\n      \"choices\": [\n        {\n          \"value\": \"A - Almost entirely fatty\"\n        },\n        {\n          \"value\": \"B - Scattered fibroglandular densities\"\n        },\n        {\n          \"value\": \"C - Heterogeneously dense\"\n        },\n        {\n          \"value\": \"D - Extremely dense\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"density_left\",\n        \"toname\": \"left_cc,right_cc,left_mlo,right_mlo\",\n        \"choice\": \"single\"\n      }\n    },\n    {\n      \"tag\": \"choices\",\n      \"name\": \"findings_left\",\n      \"toName\": \"left_cc\",\n      \"choices\": [\n        {\n          \"value\": \"Mass\"\n        },\n        {\n          \"value\": \"Calcifications\"\n        },\n        {\n          \"value\": \"Architectural Distortion\"\n        },\n        {\n          \"value\": \"Asymmetry\"\n        },\n        {\n          \"value\": \"Skin/Nipple Retraction\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"findings_left\",\n        \"toname\": \"left_cc,right_cc,left_mlo,right_mlo\",\n        \"choice\": \"multiple\"\n      }\n    },\n    {\n      \"tag\": \"choices\",\n      \"name\": \"birads_right\",\n      \"toName\": \"left_cc\",\n      \"choices\": [\n        {\n          \"value\": \"0 - Incomplete\"\n        },\n        {\n          \"value\": \"1 - Negative\"\n        },\n        {\n          \"value\": \"2 - Benign\"\n        },\n        {\n          \"value\": \"3 - Probably Benign\"\n        },\n        {\n          \"value\": \"4 - Suspicious Abnormality\"\n        },\n        {\n          \"value\": \"5 - Highly Suggestive of Malignancy\"\n        },\n        {\n          \"value\": \"6 - Known Biopsy-Proven Malignancy\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"birads_right\",\n        \"toname\": \"left_cc,right_cc,left_mlo,right_mlo\",\n        \"choice\": \"single\",\n        \"required\": \"true\"\n      }\n    },\n    {\n      \"tag\": \"choices\",\n      \"name\": \"density_right\",\n      \"toName\": \"left_cc\",\n      \"choices\": [\n        {\n          \"value\": \"A - Almost entirely fatty\"\n        },\n        {\n          \"value\": \"B - Scattered fibroglandular densities\"\n        },\n        {\n          \"value\": \"C - Heterogeneously dense\"\n        },\n        {\n          \"value\": \"D - Extremely dense\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"density_right\",\n        \"toname\": \"left_cc,right_cc,left_mlo,right_mlo\",\n        \"choice\": \"single\"\n      }\n    },\n    {\n      \"tag\": \"choices\",\n      \"name\": \"findings_right\",\n      \"toName\": \"left_cc\",\n      \"choices\": [\n        {\n          \"value\": \"Mass\"\n        },\n        {\n          \"value\": \"Calcifications\"\n        },\n        {\n          \"value\": \"Architectural Distortion\"\n        },\n        {\n          \"value\": \"Asymmetry\"\n        },\n        {\n          \"value\": \"Skin/Nipple Retraction\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"findings_right\",\n        \"toname\": \"left_cc,right_cc,left_mlo,right_mlo\",\n        \"choice\": \"multiple\"\n      }\n    },\n    {\n      \"tag\": \"textarea\",\n      \"name\": \"notes\",\n      \"toName\": \"left_cc\",\n      \"attrs\": {\n        \"name\": \"notes\",\n        \"toname\": \"left_cc,right_cc,left_mlo,right_mlo\",\n        \"rows\": \"5\",\n        \"placeholder\": \"Describe any notable findings, technical issues, or comparison to prior exams.\",\n        \"style\": \"width: 100%; padding: var(--spacing-300); border: 2px solid var(--color-neutral-border); border-radius: var(--corner-radius-small); font-size: var(--font-size-14); background: var(--color-neutral-background); color: var(--color-neutral-content);\"\n      }\n    }\n  ]\n}"
  },
  {
    "id": "ls-html-ner-tagging",
    "label": "HTML NER Tagging",
    "group": "Community Contributions",
    "dataKind": "html",
    "supported": false,
    "config": "{\n  \"objects\": [\n    {\n      \"tag\": \"hypertext\",\n      \"name\": \"text\",\n      \"value\": \"$text\",\n      \"attrs\": {\n        \"name\": \"text\",\n        \"value\": \"$text\"\n      }\n    }\n  ],\n  \"controls\": [\n    {\n      \"tag\": \"hypertextlabels\",\n      \"name\": \"ner\",\n      \"toName\": \"text\",\n      \"choices\": [\n        {\n          \"value\": \"Person\",\n          \"background\": \"green\"\n        },\n        {\n          \"value\": \"Organization\",\n          \"background\": \"blue\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"ner\",\n        \"toname\": \"text\"\n      }\n    }\n  ]\n}"
  },
  {
    "id": "ls-ner-invoices-bio",
    "label": "NER Tagging for Invoices (BIO Format)",
    "group": "Community Contributions",
    "dataKind": "text",
    "supported": true,
    "config": "{\n  \"objects\": [\n    {\n      \"tag\": \"text\",\n      \"name\": \"text\",\n      \"value\": \"$ocr\",\n      \"attrs\": {\n        \"name\": \"text\",\n        \"value\": \"$ocr\",\n        \"granularity\": \"word\"\n      }\n    }\n  ],\n  \"controls\": [\n    {\n      \"tag\": \"labels\",\n      \"name\": \"ner\",\n      \"toName\": \"text\",\n      \"choices\": [\n        {\n          \"value\": \"B-NIF\",\n          \"background\": \"#FF5733\"\n        },\n        {\n          \"value\": \"B-FORN\",\n          \"background\": \"#33FF57\"\n        },\n        {\n          \"value\": \"B-DATA\",\n          \"background\": \"#3375FF\"\n        },\n        {\n          \"value\": \"B-VALOR\",\n          \"background\": \"#FF33A1\"\n        },\n        {\n          \"value\": \"B-NUMFAT\",\n          \"background\": \"#F3FF33\"\n        },\n        {\n          \"value\": \"I-NIF\",\n          \"background\": \"#FF5733\"\n        },\n        {\n          \"value\": \"I-FORN\",\n          \"background\": \"#33FF57\"\n        },\n        {\n          \"value\": \"I-DATA\",\n          \"background\": \"#3375FF\"\n        },\n        {\n          \"value\": \"I-VALOR\",\n          \"background\": \"#FF33A1\"\n        },\n        {\n          \"value\": \"I-NUMFAT\",\n          \"background\": \"#F3FF33\"\n        },\n        {\n          \"value\": \"O\",\n          \"background\": \"#aaa\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"ner\",\n        \"toname\": \"text\",\n        \"showinline\": \"false\"\n      }\n    }\n  ]\n}"
  },
  {
    "id": "ls-ocr-invoices-bio",
    "label": "OCR Invoices Pre-NER BIO Format",
    "group": "Community Contributions",
    "dataKind": "image",
    "supported": true,
    "config": "{\n  \"objects\": [\n    {\n      \"tag\": \"image\",\n      \"name\": \"image\",\n      \"value\": \"$image\",\n      \"attrs\": {\n        \"name\": \"image\",\n        \"value\": \"$image\",\n        \"zoomcontrol\": \"true\"\n      }\n    }\n  ],\n  \"controls\": [\n    {\n      \"tag\": \"rectanglelabels\",\n      \"name\": \"label\",\n      \"toName\": \"image\",\n      \"choices\": [\n        {\n          \"value\": \"O\",\n          \"background\": \"#FFA500\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"label\",\n        \"toname\": \"image\",\n        \"choice\": \"single\"\n      }\n    },\n    {\n      \"tag\": \"textarea\",\n      \"name\": \"transcription\",\n      \"toName\": \"image\",\n      \"attrs\": {\n        \"name\": \"transcription\",\n        \"toname\": \"image\",\n        \"perregion\": \"true\",\n        \"editable\": \"true\",\n        \"rows\": \"1\",\n        \"required\": \"true\",\n        \"placeholder\": \"Type or correct OCR text…\"\n      }\n    }\n  ]\n}"
  },
  {
    "id": "ls-twitter-sentiment",
    "label": "Two-Level Sentiment Analysis of X / Twitter posts",
    "group": "Community Contributions",
    "dataKind": "text",
    "supported": true,
    "config": "{\n  \"objects\": [\n    {\n      \"tag\": \"text\",\n      \"name\": \"handle\",\n      \"value\": \"@johndoe\",\n      \"attrs\": {\n        \"name\": \"handle\",\n        \"value\": \"@johndoe\",\n        \"style\": \"color:gray;\"\n      }\n    },\n    {\n      \"tag\": \"text\",\n      \"name\": \"timestamp\",\n      \"value\": \"· 2 hrs ago\",\n      \"attrs\": {\n        \"name\": \"timestamp\",\n        \"value\": \"· 2 hrs ago\",\n        \"style\": \"color:gray;\"\n      }\n    },\n    {\n      \"tag\": \"text\",\n      \"name\": \"tweet\",\n      \"value\": \"$tweet\",\n      \"attrs\": {\n        \"name\": \"tweet\",\n        \"value\": \"$tweet\"\n      }\n    },\n    {\n      \"tag\": \"text\",\n      \"name\": \"comments\",\n      \"value\": \"💬 10\",\n      \"attrs\": {\n        \"name\": \"comments\",\n        \"value\": \"💬 10\"\n      }\n    },\n    {\n      \"tag\": \"text\",\n      \"name\": \"retweets\",\n      \"value\": \"🔁 3\",\n      \"attrs\": {\n        \"name\": \"retweets\",\n        \"value\": \"🔁 3\"\n      }\n    },\n    {\n      \"tag\": \"text\",\n      \"name\": \"likes\",\n      \"value\": \"❤️ 7\",\n      \"attrs\": {\n        \"name\": \"likes\",\n        \"value\": \"❤️ 7\"\n      }\n    },\n    {\n      \"tag\": \"text\",\n      \"name\": \"views\",\n      \"value\": \"📊 134\",\n      \"attrs\": {\n        \"name\": \"views\",\n        \"value\": \"📊 134\"\n      }\n    },\n    {\n      \"tag\": \"text\",\n      \"name\": \"other\",\n      \"value\": \"🔖 ⬆\",\n      \"attrs\": {\n        \"name\": \"other\",\n        \"value\": \"🔖 ⬆\"\n      }\n    }\n  ],\n  \"controls\": [\n    {\n      \"tag\": \"choices\",\n      \"name\": \"sentiment\",\n      \"toName\": \"tweet\",\n      \"choices\": [\n        {\n          \"value\": \"Positive\"\n        },\n        {\n          \"value\": \"Neutral\"\n        },\n        {\n          \"value\": \"Negative\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"sentiment\",\n        \"toname\": \"tweet\",\n        \"choice\": \"single\"\n      }\n    },\n    {\n      \"tag\": \"choices\",\n      \"name\": \"other-props\",\n      \"toName\": \"tweet\",\n      \"choices\": [\n        {\n          \"value\": \"Descriptive\"\n        },\n        {\n          \"value\": \"Emotional\"\n        },\n        {\n          \"value\": \"Mixed\"\n        },\n        {\n          \"value\": \"Ambigous\"\n        },\n        {\n          \"value\": \"Sarcams\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"other-props\",\n        \"toname\": \"tweet\",\n        \"choice\": \"multiple\",\n        \"showinline\": \"true\",\n        \"visiblewhen\": \"choice-selected\",\n        \"whentagname\": \"sentiment\"\n      }\n    }\n  ]\n}"
  },
  {
    "id": "ls-multipage-documents",
    "label": "Multi-page document annotation",
    "group": "Computer Vision",
    "dataKind": "image",
    "supported": true,
    "config": "{\n  \"objects\": [\n    {\n      \"tag\": \"image\",\n      \"name\": \"pdf\",\n      \"value\": \"\",\n      \"attrs\": {\n        \"valuelist\": \"$pages\",\n        \"name\": \"pdf\"\n      }\n    }\n  ],\n  \"controls\": [\n    {\n      \"tag\": \"rectanglelabels\",\n      \"name\": \"rectangles\",\n      \"toName\": \"pdf\",\n      \"choices\": [\n        {\n          \"value\": \"Title\",\n          \"background\": \"green\"\n        },\n        {\n          \"value\": \"Date\",\n          \"background\": \"blue\"\n        },\n        {\n          \"value\": \"Author\",\n          \"background\": \"gold\"\n        },\n        {\n          \"value\": \"Organization\",\n          \"background\": \"pink\"\n        },\n        {\n          \"value\": \"Amount\",\n          \"background\": \"red\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"rectangles\",\n        \"toname\": \"pdf\",\n        \"showinline\": \"true\"\n      }\n    }\n  ]\n}",
    "image": "/templates/ls-multipage-documents.png"
  },
  {
    "id": "ner",
    "label": "Named Entity Recognition",
    "group": "Natural Language Processing",
    "dataKind": "text",
    "supported": true,
    "config": "{\n  \"objects\": [\n    {\n      \"tag\": \"text\",\n      \"name\": \"text\",\n      \"value\": \"$text\",\n      \"attrs\": {\n        \"name\": \"text\",\n        \"value\": \"$text\"\n      }\n    }\n  ],\n  \"controls\": [\n    {\n      \"tag\": \"labels\",\n      \"name\": \"label\",\n      \"toName\": \"text\",\n      \"choices\": [\n        {\n          \"value\": \"PER\",\n          \"background\": \"red\"\n        },\n        {\n          \"value\": \"ORG\",\n          \"background\": \"darkorange\"\n        },\n        {\n          \"value\": \"LOC\",\n          \"background\": \"orange\"\n        },\n        {\n          \"value\": \"MISC\",\n          \"background\": \"green\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"label\",\n        \"toname\": \"text\"\n      }\n    }\n  ]\n}",
    "image": "/templates/ner.png"
  },
  {
    "id": "question-answering",
    "label": "Question Answering",
    "group": "Natural Language Processing",
    "dataKind": "text",
    "supported": true,
    "config": "{\n  \"objects\": [\n    {\n      \"tag\": \"text\",\n      \"name\": \"text\",\n      \"value\": \"$text\",\n      \"attrs\": {\n        \"name\": \"text\",\n        \"value\": \"$text\",\n        \"granularity\": \"word\"\n      }\n    },\n    {\n      \"tag\": \"text\",\n      \"name\": \"question\",\n      \"value\": \"$question\",\n      \"attrs\": {\n        \"name\": \"question\",\n        \"value\": \"$question\"\n      }\n    }\n  ],\n  \"controls\": [\n    {\n      \"tag\": \"labels\",\n      \"name\": \"answer\",\n      \"toName\": \"text\",\n      \"choices\": [\n        {\n          \"value\": \"Answer\",\n          \"background\": \"red\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"answer\",\n        \"toname\": \"text\"\n      }\n    }\n  ]\n}",
    "image": "/templates/question-answering.png"
  },
  {
    "id": "relation-extraction",
    "label": "Relation Extraction",
    "group": "Natural Language Processing",
    "dataKind": "text",
    "supported": true,
    "config": "{\n  \"objects\": [\n    {\n      \"tag\": \"text\",\n      \"name\": \"text\",\n      \"value\": \"$text\",\n      \"attrs\": {\n        \"name\": \"text\",\n        \"value\": \"$text\"\n      }\n    }\n  ],\n  \"controls\": [\n    {\n      \"tag\": \"relations\",\n      \"name\": \"\",\n      \"toName\": \"\"\n    },\n    {\n      \"tag\": \"labels\",\n      \"name\": \"label\",\n      \"toName\": \"text\",\n      \"choices\": [\n        {\n          \"value\": \"Organization\",\n          \"background\": \"orange\"\n        },\n        {\n          \"value\": \"Person\",\n          \"background\": \"green\"\n        },\n        {\n          \"value\": \"Datetime\",\n          \"background\": \"blue\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"label\",\n        \"toname\": \"text\"\n      }\n    }\n  ]\n}",
    "image": "/templates/relation-extraction.png"
  },
  {
    "id": "taxonomy",
    "label": "Taxonomy",
    "group": "Natural Language Processing",
    "dataKind": "text",
    "supported": true,
    "config": "{\n  \"objects\": [\n    {\n      \"tag\": \"text\",\n      \"name\": \"text\",\n      \"value\": \"$text\",\n      \"attrs\": {\n        \"name\": \"text\",\n        \"value\": \"$text\"\n      }\n    }\n  ],\n  \"controls\": [\n    {\n      \"tag\": \"taxonomy\",\n      \"name\": \"taxonomy\",\n      \"toName\": \"text\",\n      \"choices\": [\n        {\n          \"value\": \"Archaea\"\n        },\n        {\n          \"value\": \"Bacteria\"\n        },\n        {\n          \"value\": \"Eukarya\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"taxonomy\",\n        \"toname\": \"text\"\n      }\n    }\n  ]\n}",
    "image": "/templates/taxonomy.png"
  },
  {
    "id": "text-classification",
    "label": "Text Classification",
    "group": "Natural Language Processing",
    "dataKind": "text",
    "supported": true,
    "config": "{\n  \"objects\": [\n    {\n      \"tag\": \"text\",\n      \"name\": \"text\",\n      \"value\": \"$text\",\n      \"attrs\": {\n        \"name\": \"text\",\n        \"value\": \"$text\"\n      }\n    }\n  ],\n  \"controls\": [\n    {\n      \"tag\": \"choices\",\n      \"name\": \"sentiment\",\n      \"toName\": \"text\",\n      \"choices\": [\n        {\n          \"value\": \"Positive\"\n        },\n        {\n          \"value\": \"Negative\"\n        },\n        {\n          \"value\": \"Neutral\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"sentiment\",\n        \"toname\": \"text\",\n        \"choice\": \"single\",\n        \"showinline\": \"true\"\n      }\n    }\n  ]\n}",
    "image": "/templates/text-classification.png"
  },
  {
    "id": "text-summarization",
    "label": "Text Summarization",
    "group": "Natural Language Processing",
    "dataKind": "text",
    "supported": true,
    "config": "{\n  \"objects\": [\n    {\n      \"tag\": \"text\",\n      \"name\": \"text\",\n      \"value\": \"$text\",\n      \"attrs\": {\n        \"name\": \"text\",\n        \"value\": \"$text\"\n      }\n    }\n  ],\n  \"controls\": [\n    {\n      \"tag\": \"textarea\",\n      \"name\": \"answer\",\n      \"toName\": \"text\",\n      \"attrs\": {\n        \"name\": \"answer\",\n        \"toname\": \"text\",\n        \"showsubmitbutton\": \"true\",\n        \"maxsubmissions\": \"1\",\n        \"editable\": \"true\",\n        \"required\": \"true\"\n      }\n    }\n  ]\n}",
    "image": "/templates/text-summarization.png"
  },
  {
    "id": "content-image-retrieval",
    "label": "Content-based Image Retrieval",
    "group": "Ranking & Scoring",
    "dataKind": "image",
    "supported": true,
    "config": "{\n  \"objects\": [\n    {\n      \"tag\": \"image\",\n      \"name\": \"query\",\n      \"value\": \"$query_image\",\n      \"attrs\": {\n        \"name\": \"query\",\n        \"value\": \"$query_image\"\n      }\n    },\n    {\n      \"tag\": \"image\",\n      \"name\": \"image1\",\n      \"value\": \"$image1\",\n      \"attrs\": {\n        \"name\": \"image1\",\n        \"value\": \"$image1\"\n      }\n    },\n    {\n      \"tag\": \"image\",\n      \"name\": \"image2\",\n      \"value\": \"$image2\",\n      \"attrs\": {\n        \"name\": \"image2\",\n        \"value\": \"$image2\"\n      }\n    },\n    {\n      \"tag\": \"image\",\n      \"name\": \"image3\",\n      \"value\": \"$image3\",\n      \"attrs\": {\n        \"name\": \"image3\",\n        \"value\": \"$image3\"\n      }\n    }\n  ],\n  \"controls\": [\n    {\n      \"tag\": \"choices\",\n      \"name\": \"similar\",\n      \"toName\": \"query\",\n      \"choices\": [\n        {\n          \"value\": \"One\"\n        },\n        {\n          \"value\": \"Two\"\n        },\n        {\n          \"value\": \"Three\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"similar\",\n        \"toname\": \"query\",\n        \"required\": \"true\",\n        \"choice\": \"multiple\"\n      }\n    }\n  ]\n}",
    "image": "/templates/content-image-retrieval.png"
  },
  {
    "id": "document-retrieval",
    "label": "Document Retrieval",
    "group": "Ranking & Scoring",
    "dataKind": "text",
    "supported": true,
    "config": "{\n  \"objects\": [\n    {\n      \"tag\": \"text\",\n      \"name\": \"query\",\n      \"value\": \"$query\",\n      \"attrs\": {\n        \"name\": \"query\",\n        \"value\": \"$query\"\n      }\n    },\n    {\n      \"tag\": \"text\",\n      \"name\": \"text1\",\n      \"value\": \"$text1\",\n      \"attrs\": {\n        \"name\": \"text1\",\n        \"value\": \"$text1\"\n      }\n    },\n    {\n      \"tag\": \"text\",\n      \"name\": \"text2\",\n      \"value\": \"$text2\",\n      \"attrs\": {\n        \"name\": \"text2\",\n        \"value\": \"$text2\"\n      }\n    },\n    {\n      \"tag\": \"text\",\n      \"name\": \"text3\",\n      \"value\": \"$text3\",\n      \"attrs\": {\n        \"name\": \"text3\",\n        \"value\": \"$text3\"\n      }\n    }\n  ],\n  \"controls\": [\n    {\n      \"tag\": \"choices\",\n      \"name\": \"selection\",\n      \"toName\": \"query\",\n      \"choices\": [\n        {\n          \"value\": \"One\"\n        },\n        {\n          \"value\": \"Two\"\n        },\n        {\n          \"value\": \"Three\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"selection\",\n        \"toname\": \"query\",\n        \"required\": \"true\",\n        \"choice\": \"multiple\"\n      }\n    }\n  ]\n}",
    "image": "/templates/document-retrieval.png"
  },
  {
    "id": "pairwise",
    "label": "Pairwise classification",
    "group": "Ranking & Scoring",
    "dataKind": "text",
    "supported": false,
    "config": "{\n  \"objects\": [\n    {\n      \"tag\": \"text\",\n      \"name\": \"text1\",\n      \"value\": \"$text1\",\n      \"attrs\": {\n        \"name\": \"text1\",\n        \"value\": \"$text1\"\n      }\n    },\n    {\n      \"tag\": \"text\",\n      \"name\": \"text2\",\n      \"value\": \"$text2\",\n      \"attrs\": {\n        \"name\": \"text2\",\n        \"value\": \"$text2\"\n      }\n    }\n  ],\n  \"controls\": [\n    {\n      \"tag\": \"pairwise\",\n      \"name\": \"pw\",\n      \"toName\": \"text1\",\n      \"attrs\": {\n        \"name\": \"pw\",\n        \"toname\": \"text1,text2\"\n      }\n    }\n  ]\n}",
    "image": "/templates/pairwise.png"
  },
  {
    "id": "ls-pairwise-regression",
    "label": "Pairwise regression",
    "group": "Ranking & Scoring",
    "dataKind": "image",
    "supported": true,
    "config": "{\n  \"objects\": [\n    {\n      \"tag\": \"image\",\n      \"name\": \"image1\",\n      \"value\": \"$image1\",\n      \"attrs\": {\n        \"name\": \"image1\",\n        \"value\": \"$image1\"\n      }\n    },\n    {\n      \"tag\": \"image\",\n      \"name\": \"image2\",\n      \"value\": \"$image2\",\n      \"attrs\": {\n        \"name\": \"image2\",\n        \"value\": \"$image2\"\n      }\n    }\n  ],\n  \"controls\": [\n    {\n      \"tag\": \"rating\",\n      \"name\": \"rating\",\n      \"toName\": \"image1\",\n      \"attrs\": {\n        \"name\": \"rating\",\n        \"toname\": \"image1,image2\"\n      }\n    }\n  ]\n}",
    "image": "/templates/ls-pairwise-regression.png"
  },
  {
    "id": "ls-freeform-metadata",
    "label": "Freeform Metadata",
    "group": "Structured Data Parsing",
    "dataKind": "text",
    "supported": true,
    "config": "{\n  \"objects\": [\n    {\n      \"tag\": \"text\",\n      \"name\": \"text\",\n      \"value\": \"$text\",\n      \"attrs\": {\n        \"value\": \"$text\",\n        \"name\": \"text\"\n      }\n    }\n  ],\n  \"controls\": [\n    {\n      \"tag\": \"textarea\",\n      \"name\": \"table_name_1\",\n      \"toName\": \"text\",\n      \"attrs\": {\n        \"name\": \"table_name_1\",\n        \"toname\": \"text\",\n        \"placeholder\": \"name\",\n        \"editable\": \"true\",\n        \"maxsubmissions\": \"1\"\n      }\n    },\n    {\n      \"tag\": \"textarea\",\n      \"name\": \"table_value_1\",\n      \"toName\": \"text\",\n      \"attrs\": {\n        \"name\": \"table_value_1\",\n        \"toname\": \"text\",\n        \"placeholder\": \"value\",\n        \"editable\": \"true\",\n        \"maxsubmissions\": \"1\"\n      }\n    },\n    {\n      \"tag\": \"textarea\",\n      \"name\": \"table_name_2\",\n      \"toName\": \"text\",\n      \"attrs\": {\n        \"name\": \"table_name_2\",\n        \"toname\": \"text\",\n        \"placeholder\": \"name\",\n        \"editable\": \"true\",\n        \"maxsubmissions\": \"1\"\n      }\n    },\n    {\n      \"tag\": \"textarea\",\n      \"name\": \"table_value_2\",\n      \"toName\": \"text\",\n      \"attrs\": {\n        \"name\": \"table_value_2\",\n        \"toname\": \"text\",\n        \"placeholder\": \"value\",\n        \"editable\": \"true\",\n        \"maxsubmissions\": \"1\"\n      }\n    },\n    {\n      \"tag\": \"textarea\",\n      \"name\": \"table_name_3\",\n      \"toName\": \"text\",\n      \"attrs\": {\n        \"name\": \"table_name_3\",\n        \"toname\": \"text\",\n        \"placeholder\": \"name\",\n        \"editable\": \"true\",\n        \"maxsubmissions\": \"1\"\n      }\n    },\n    {\n      \"tag\": \"textarea\",\n      \"name\": \"table_value_3\",\n      \"toName\": \"text\",\n      \"attrs\": {\n        \"name\": \"table_value_3\",\n        \"toname\": \"text\",\n        \"placeholder\": \"value\",\n        \"editable\": \"true\",\n        \"maxsubmissions\": \"1\"\n      }\n    }\n  ]\n}",
    "image": "/templates/ls-freeform-metadata.png"
  },
  {
    "id": "html-ner",
    "label": "HTML Entity Recognition",
    "group": "Structured Data Parsing",
    "dataKind": "html",
    "supported": false,
    "config": "{\n  \"objects\": [\n    {\n      \"tag\": \"hypertext\",\n      \"name\": \"text\",\n      \"value\": \"$text\",\n      \"attrs\": {\n        \"name\": \"text\",\n        \"value\": \"$text\"\n      }\n    }\n  ],\n  \"controls\": [\n    {\n      \"tag\": \"hypertextlabels\",\n      \"name\": \"ner\",\n      \"toName\": \"text\",\n      \"choices\": [\n        {\n          \"value\": \"Title\",\n          \"background\": \"green\"\n        },\n        {\n          \"value\": \"Author\",\n          \"background\": \"blue\"\n        },\n        {\n          \"value\": \"Body\",\n          \"background\": \"yellow\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"ner\",\n        \"toname\": \"text\"\n      }\n    }\n  ]\n}",
    "image": "/templates/html-ner.png"
  },
  {
    "id": "pdf-classification",
    "label": "PDF Classification",
    "group": "Structured Data Parsing",
    "dataKind": "html",
    "supported": false,
    "config": "{\n  \"objects\": [\n    {\n      \"tag\": \"pdf\",\n      \"name\": \"pdf\",\n      \"value\": \"$pdf\",\n      \"attrs\": {\n        \"name\": \"pdf\",\n        \"value\": \"$pdf\"\n      }\n    }\n  ],\n  \"controls\": [\n    {\n      \"tag\": \"rating\",\n      \"name\": \"rating\",\n      \"toName\": \"pdf\",\n      \"attrs\": {\n        \"name\": \"rating\",\n        \"toname\": \"pdf\",\n        \"maxrating\": \"10\",\n        \"icon\": \"star\",\n        \"size\": \"medium\"\n      }\n    },\n    {\n      \"tag\": \"choices\",\n      \"name\": \"choices\",\n      \"toName\": \"pdf\",\n      \"choices\": [\n        {\n          \"value\": \"Important article\"\n        },\n        {\n          \"value\": \"Yellow press\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"choices\",\n        \"choice\": \"single-radio\",\n        \"toname\": \"pdf\",\n        \"showinline\": \"true\"\n      }\n    }\n  ]\n}",
    "image": "/templates/pdf-classification.png"
  },
  {
    "id": "tabular",
    "label": "Tabular Data",
    "group": "Structured Data Parsing",
    "dataKind": "html",
    "supported": false,
    "config": "{\n  \"objects\": [\n    {\n      \"tag\": \"table\",\n      \"name\": \"table\",\n      \"value\": \"$item\",\n      \"attrs\": {\n        \"name\": \"table\",\n        \"value\": \"$item\"\n      }\n    }\n  ],\n  \"controls\": [\n    {\n      \"tag\": \"choices\",\n      \"name\": \"choice\",\n      \"toName\": \"table\",\n      \"choices\": [\n        {\n          \"value\": \"Correct\"\n        },\n        {\n          \"value\": \"Incorrect\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"choice\",\n        \"toname\": \"table\"\n      }\n    }\n  ]\n}",
    "image": "/templates/tabular.png"
  },
  {
    "id": "ls-activity-recognition",
    "label": "Activity Recognition",
    "group": "Time Series Analysis",
    "dataKind": "timeseries",
    "supported": false,
    "config": "{\n  \"objects\": [\n    {\n      \"tag\": \"timeseries\",\n      \"name\": \"ts\",\n      \"value\": \"$timeseriesUrl\",\n      \"attrs\": {\n        \"name\": \"ts\",\n        \"valuetype\": \"url\",\n        \"value\": \"$timeseriesUrl\",\n        \"sep\": \",\",\n        \"timecolumn\": \"time\",\n        \"timeformat\": \"%Y-%m-%d %H:%M:%S.%f\",\n        \"timedisplayformat\": \"%Y-%m-%d\",\n        \"overviewchannels\": \"velocity\"\n      }\n    }\n  ],\n  \"controls\": [\n    {\n      \"tag\": \"timeserieslabels\",\n      \"name\": \"label\",\n      \"toName\": \"ts\",\n      \"choices\": [\n        {\n          \"value\": \"Run\",\n          \"background\": \"red\"\n        },\n        {\n          \"value\": \"Walk\",\n          \"background\": \"green\"\n        },\n        {\n          \"value\": \"Fly\",\n          \"background\": \"blue\"\n        },\n        {\n          \"value\": \"Swim\",\n          \"background\": \"#f6a\"\n        },\n        {\n          \"value\": \"Ride\",\n          \"background\": \"#351\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"label\",\n        \"toname\": \"ts\"\n      }\n    }\n  ]\n}",
    "image": "/templates/ls-activity-recognition.png"
  },
  {
    "id": "change-point",
    "label": "Change Point Detection",
    "group": "Time Series Analysis",
    "dataKind": "timeseries",
    "supported": false,
    "config": "{\n  \"objects\": [\n    {\n      \"tag\": \"timeseries\",\n      \"name\": \"ts\",\n      \"value\": \"$csv\",\n      \"attrs\": {\n        \"name\": \"ts\",\n        \"valuetype\": \"url\",\n        \"value\": \"$csv\",\n        \"sep\": \",\",\n        \"timecolumn\": \"time\",\n        \"timeformat\": \"%Y-%m-%d %H:%M:%S.%f\",\n        \"timedisplayformat\": \"%Y-%m-%d\",\n        \"overviewchannels\": \"velocity\"\n      }\n    }\n  ],\n  \"controls\": [\n    {\n      \"tag\": \"timeserieslabels\",\n      \"name\": \"label\",\n      \"toName\": \"ts\",\n      \"choices\": [\n        {\n          \"value\": \"Change\",\n          \"background\": \"red\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"label\",\n        \"toname\": \"ts\"\n      }\n    }\n  ]\n}",
    "image": "/templates/change-point.png"
  },
  {
    "id": "anomaly-detection",
    "label": "Outliers & Anomaly Detection",
    "group": "Time Series Analysis",
    "dataKind": "timeseries",
    "supported": false,
    "config": "{\n  \"objects\": [\n    {\n      \"tag\": \"timeseries\",\n      \"name\": \"ts\",\n      \"value\": \"$csv\",\n      \"attrs\": {\n        \"name\": \"ts\",\n        \"valuetype\": \"url\",\n        \"value\": \"$csv\",\n        \"sep\": \",\",\n        \"timecolumn\": \"time\",\n        \"timeformat\": \"%Y-%m-%d %H:%M:%S.%f\",\n        \"timedisplayformat\": \"%Y-%m-%d\",\n        \"overviewchannels\": \"velocity\"\n      }\n    }\n  ],\n  \"controls\": [\n    {\n      \"tag\": \"timeserieslabels\",\n      \"name\": \"label\",\n      \"toName\": \"ts\",\n      \"choices\": [\n        {\n          \"value\": \"Region\",\n          \"background\": \"red\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"label\",\n        \"toname\": \"ts\"\n      }\n    },\n    {\n      \"tag\": \"choices\",\n      \"name\": \"region_type\",\n      \"toName\": \"ts\",\n      \"choices\": [\n        {\n          \"value\": \"Outlier\"\n        },\n        {\n          \"value\": \"Anomaly\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"region_type\",\n        \"toname\": \"ts\",\n        \"perregion\": \"true\",\n        \"required\": \"true\"\n      }\n    }\n  ]\n}",
    "image": "/templates/anomaly-detection.png"
  },
  {
    "id": "ls-signal-quality",
    "label": "Signal Quality",
    "group": "Time Series Analysis",
    "dataKind": "timeseries",
    "supported": false,
    "config": "{\n  \"objects\": [\n    {\n      \"tag\": \"timeseries\",\n      \"name\": \"ts\",\n      \"value\": \"$csv\",\n      \"attrs\": {\n        \"name\": \"ts\",\n        \"valuetype\": \"url\",\n        \"value\": \"$csv\",\n        \"sep\": \",\",\n        \"timecolumn\": \"time\"\n      }\n    }\n  ],\n  \"controls\": [\n    {\n      \"tag\": \"timeserieslabels\",\n      \"name\": \"label\",\n      \"toName\": \"ts\",\n      \"choices\": [\n        {\n          \"value\": \"Region\",\n          \"background\": \"#5b5\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"label\",\n        \"toname\": \"ts\"\n      }\n    },\n    {\n      \"tag\": \"rating\",\n      \"name\": \"rating\",\n      \"toName\": \"ts\",\n      \"attrs\": {\n        \"name\": \"rating\",\n        \"toname\": \"ts\",\n        \"maxrating\": \"10\",\n        \"icon\": \"star\",\n        \"perregion\": \"true\"\n      }\n    },\n    {\n      \"tag\": \"choices\",\n      \"name\": \"choices\",\n      \"toName\": \"ts\",\n      \"choices\": [\n        {\n          \"value\": \"Good\"\n        },\n        {\n          \"value\": \"Medium\"\n        },\n        {\n          \"value\": \"Poor\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"choices\",\n        \"toname\": \"ts\",\n        \"showinline\": \"true\",\n        \"required\": \"true\",\n        \"perregion\": \"true\"\n      }\n    }\n  ]\n}",
    "image": "/templates/ls-signal-quality.png"
  },
  {
    "id": "ls-timeseries-forecasting",
    "label": "Time Series Forecasting",
    "group": "Time Series Analysis",
    "dataKind": "timeseries",
    "supported": false,
    "config": "{\n  \"objects\": [\n    {\n      \"tag\": \"timeseries\",\n      \"name\": \"stock\",\n      \"value\": \"$csv\",\n      \"attrs\": {\n        \"name\": \"stock\",\n        \"valuetype\": \"url\",\n        \"value\": \"$csv\",\n        \"sep\": \",\",\n        \"timecolumn\": \"time\",\n        \"timeformat\": \"%Y-%m-%d %H:%M:%S.%f\",\n        \"timedisplayformat\": \"%Y-%m-%d\",\n        \"overviewchannels\": \"value\"\n      }\n    }\n  ],\n  \"controls\": [\n    {\n      \"tag\": \"timeserieslabels\",\n      \"name\": \"predictable\",\n      \"toName\": \"stock\",\n      \"choices\": [\n        {\n          \"value\": \"Regions\",\n          \"background\": \"red\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"predictable\",\n        \"toname\": \"stock\"\n      }\n    },\n    {\n      \"tag\": \"choices\",\n      \"name\": \"trend_forecast\",\n      \"toName\": \"stock\",\n      \"choices\": [\n        {\n          \"value\": \"Up\"\n        },\n        {\n          \"value\": \"Down\"\n        },\n        {\n          \"value\": \"Steady\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"trend_forecast\",\n        \"toname\": \"stock\"\n      }\n    }\n  ]\n}",
    "image": "/templates/ls-timeseries-forecasting.png"
  },
  {
    "id": "video-classification",
    "label": "Video Classification",
    "group": "Videos",
    "dataKind": "video",
    "supported": false,
    "config": "{\n  \"objects\": [\n    {\n      \"tag\": \"video\",\n      \"name\": \"video\",\n      \"value\": \"$video\",\n      \"attrs\": {\n        \"name\": \"video\",\n        \"value\": \"$video\"\n      }\n    }\n  ],\n  \"controls\": [\n    {\n      \"tag\": \"choices\",\n      \"name\": \"choice\",\n      \"toName\": \"video\",\n      \"choices\": [\n        {\n          \"value\": \"Blurry\"\n        },\n        {\n          \"value\": \"Sharp\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"choice\",\n        \"toname\": \"video\",\n        \"showinline\": \"true\"\n      }\n    }\n  ]\n}",
    "image": "/templates/video-classification.png"
  },
  {
    "id": "video-timeline",
    "label": "Video Timeline Segmentation",
    "group": "Videos",
    "dataKind": "video",
    "supported": false,
    "config": "{\n  \"objects\": [\n    {\n      \"tag\": \"video\",\n      \"name\": \"video\",\n      \"value\": \"$video_url\",\n      \"attrs\": {\n        \"name\": \"video\",\n        \"value\": \"$video_url\",\n        \"sync\": \"audio\"\n      }\n    },\n    {\n      \"tag\": \"audio\",\n      \"name\": \"audio\",\n      \"value\": \"$video_url\",\n      \"attrs\": {\n        \"name\": \"audio\",\n        \"value\": \"$video_url\",\n        \"sync\": \"video\",\n        \"speed\": \"false\"\n      }\n    }\n  ],\n  \"controls\": [\n    {\n      \"tag\": \"labels\",\n      \"name\": \"tricks\",\n      \"toName\": \"audio\",\n      \"choices\": [\n        {\n          \"value\": \"Kickflip\",\n          \"background\": \"#1BB500\"\n        },\n        {\n          \"value\": \"360 Flip\",\n          \"background\": \"#FFA91D\"\n        },\n        {\n          \"value\": \"Trick\",\n          \"background\": \"#358EF3\"\n        }\n      ],\n      \"attrs\": {\n        \"name\": \"tricks\",\n        \"toname\": \"audio\",\n        \"choice\": \"multiple\"\n      }\n    }\n  ]\n}",
    "image": "/templates/video-timeline.png"
  }
]
