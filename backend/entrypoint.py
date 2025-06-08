# Import modules required for startup initialisation
import src.factory.dramatiq_broker
import src.periodic
import uvicorn
from src.factory import app, create_db_and_tables
from src.controller import router
from fastapi.middleware.cors import CORSMiddleware

origins = [
    "http://localhost",
    "https://localhost",
    "http://localhost:3000",
    "https://localhost:3000",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:3000",
    "https://127.0.0.1:3000",
    "http://nginx:3000",  # optional, internal container name
    "https://nginx",      # if nginx hostname is ever used
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == '__main__':
    create_db_and_tables()
    app.include_router(router)
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")