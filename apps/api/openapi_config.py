openapi_config = {
    "title": "Vailabel API",
    "description": "API for managing annotation projects, labels, images, and more.",
    "version": "1.0.0",
    "contact": {
        "name": "Vailabel Team",
        "url": "https://vailabel.com",
        "email": "support@vailabel.com",
    },
    "license_info": {
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    },
    "openapi_tags": [
        {"name": "Projects", "description": "Operations on annotation projects"},
        {"name": "Settings", "description": "Operations on application settings"},
        {
            "name": "AI Models",
            "description": "Operations on AI models used for annotations",
        },
        {
            "name": "Annotations",
            "description": "Operations on annotations and related data",
        },
    ],
}
