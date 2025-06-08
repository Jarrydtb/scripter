# Scripter

## Purpose
The purpose of this project is to implement a small webapp that can be run locally via docker with minimal setup, that allows a user to create scripts and run them either as standalone jobs or scheduled jobs. This is done by leveraging Docker and Docker's Python SDK. 

## Features
- Create Docker Images
- Build/Destroy/Delete said Docker Images 
- View build logs for given Image. 
- Edit Docker Image config and files if status is Dormant or there was a failure to build. (Basic fields like name and description can be edited at any time)
- Create Python Scripts to run on said images. 
- Run Scripts either independently or schedule a script to run at different times using Crontabs. 
- View Job logs 


More technical based features: 
- Logs are written to files (Job Logs & Image Build Logs) instead of being saved to the db to preserve performance of database in terms of DB Latency or connection/session handling. Additionally, using log files is generally faster than writing to database when there are lots of logs for many different jobs. 
- Project's userdata structure makes file handling simpler. I.e. 
  - IMAGE For any given image created, the source files and the build logs are contained in the same directory:
  ```text
  [IMAGE_DB_ID]:
        │--- build.log
        └─── src
              │--- Dockerfile
              │--- requirements.txt
              └─── test.txt
  ```
  - SCRIPT: For any given script created, the source files are stored in its src directory whilst each subsequent job's logs are stored in the logs diretory. All of these are kept in a directory that uses the Scripts ID as its identifier:
  ```text
  [SCRIPT_DB_ID]:
        │--- logs
        │     │--- 2025-05-16T05-15-50__150.log
        │     │--- 2025-05-17T13-01-44__151.log
        │     └─── [DATETIME]__[JOB_ID].log
        └─── src
              │--- Dockerfile
              │--- requirements.txt
              └─── test.txt
  ```
### Script Language Support: 
- Python

## Getting Started

### Pre-requisites
- Docker Client Installed
- Note which OS is being used: I.e. Windows vs Unix-based system

Once downloading the source code, there are only a few things left to configure before everything can be fired up: 
1. Download the source code to your machine. `git clone <PROJECT_URL>`.
2. Take the `config.template.toml` file in the `project_root/backend` directory and rename it to `config.toml`. Ensure this is the only file of this name in the directory.
3. Fill in the placeholder values in the file: `<PATH_TO_LOCAL_DATA_DIRECTORY>`, `<DB_USER>`, and `<DB_PASSWORD>`.
    - It should be noted that if the base OS is windows then in the `docker` section of the `config.toml` file, the  `HOST_DIRECTORY` field must be filed in using the Windows Filesystem Path, otherwise some files won't be able to be found when running scripts and logging their outputs.
    - Also the database username and password is hardcoded in the `compose.yml` file and thus, if you want to use your own, the values need to be changed there as well. (`MYSQL_USER` & `MYSQL_PASSWORD`)
4. Your data directory should be located inside the backend directory as `./backend/data/`; however if desired, this directory can be placed anywhere but must be reflected in both the `config.toml` and `compose.yaml` files. 
5. The data directory must follow the following structure: (The content of each directory: `scripts` and `images` will be created dynamically.)
   ```text
    data
      │--- images
      └─── scripts
   ```
6. Configure SSL/TLS in NGINX by navigating inside the `./nginx` directory and generating a Key and Certificate using the command: `openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ./certs/key.pem -out ./certs/cert.pem`.
7. Start the application: `docker compose up -d` 

## Future Work
- Script Versioning
- Image Versioning
- Setting a Maximum Log File size for script outputs
- Garbage Collector
- Add additional languages to scripts


## Considerations

Initially adding a basic authentication mechanism like JWT tokens was considered, but given the scope of this project, I thought it was not necessary and would rather showcase that particular implementation in a different project. Perhaps, at a later stage, I will create a python auth library to support various authentication schemes/mechanisms as needed. Food for thought.


## Notes:

- Ability to create images and scripts
- Non-repudiation via script edit/creation version history recording
- Task scheduling.

Findings:

- Using dramatiq has some pros and cons.
Pros:
- Start up syntax is simple
- Supports cron by default in periodic scheduling.
- Works well with RabbitMQ

Cons:
- A bit more complicated to setup when coming from celery.
- Features are added using plugins as opposed to celery's build in library.
- The popular periodiq plugin (celery beat equiv) is separately installed and doesn't work in windows. (Have to use docker)
