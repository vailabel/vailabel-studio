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
        {"name": "Auth", "description": "Authentication and authorization endpoints"},
        {"name": "SocialAuth", "description": "Social login with GitHub and Google"},
        {"name": "Projects", "description": "Operations on annotation projects"},
        {"name": "Images", "description": "Operations on image data"},
        {"name": "Annotations", "description": "Operations on annotations"},
        {"name": "Labels", "description": "Operations on labels"},
        {"name": "Tasks", "description": "Operations on annotation tasks"},
        {"name": "AI Models", "description": "Operations on AI models"},
        {"name": "History", "description": "Operations on project history"},
        {"name": "Settings", "description": "Operations on application settings"},
        {"name": "Users", "description": "Operations on users"},
    ],
}