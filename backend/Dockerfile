FROM python:3.12-slim
LABEL authors="jarryd"
WORKDIR /app
COPY requirements.txt .
COPY src src/
COPY entrypoint.py .
COPY definitions.py .
RUN pip3 install -r requirements.txt
