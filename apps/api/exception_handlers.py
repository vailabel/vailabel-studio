from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import traceback
import logging
from fastapi.encoders import jsonable_encoder


def register_exception_handlers(app):
    # Handle HTTP exceptions (e.g. 404, 403)
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "type": "HTTPException",
                    "message": str(exc.detail),
                    "status_code": exc.status_code,
                    "path": str(request.url),
                }
            },
        )

    # Handle Pydantic validation errors
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ):
        return JSONResponse(
            status_code=422,
            content={
                "detail": jsonable_encoder(exc.errors()),
                "body": exc.body,
            },
        )

    # Handle all other unhandled exceptions
    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logging.error("Unhandled exception occurred:\n%s", traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "type": "InternalServerError",
                    "message": "An unexpected error has occurred. Please try again later.",
                    "path": str(request.url),
                }
            },
        )
