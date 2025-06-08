# # Background tasks
# import dramatiq
# from src.logic import build_image
#
#
# @dramatiq.actor
# def run_script_process(job_id: int, script_id: str, image_id: str):
#     print("run_script_process defined")
#     from src.utils.docker_manager import DockerManager
#     DockerManager().run_container(job_id=job_id, script_id=script_id, image_id=image_id)
#
#
# @dramatiq.actor
# def build_image(image_id: str) -> None:
#     build_image.send(image_id)
