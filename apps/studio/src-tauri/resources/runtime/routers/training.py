"""Training endpoints. Jobs run in background threads managed by `job_manager`."""

from typing import Dict

from fastapi import APIRouter
from pydantic import BaseModel

from services import job_manager

router = APIRouter(prefix="/training")


class TrainStartReq(BaseModel):
    job_id: str
    project_id: str
    model_family: str
    dataset_path: str
    config: Dict = {}
    log_path: str = ""


class JobIdReq(BaseModel):
    job_id: str


@router.post("/start")
async def start(req: TrainStartReq):
    job_manager.start_job(req.model_dump())
    return {"job_id": req.job_id, "status": "running"}


@router.post("/stop")
async def stop(req: JobIdReq):
    job_manager.stop_job(req.job_id)
    return {"ok": True}


@router.get("/jobs")
async def jobs():
    return job_manager.list_jobs()


@router.get("/logs")
async def logs(job_id: str, offset: int = 0):
    return job_manager.read_logs(job_id, offset)
