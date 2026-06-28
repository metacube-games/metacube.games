FROM python:latest

WORKDIR /app

COPY . .

RUN pip3 install --upgrade pip

RUN pip3 install -r requirements.txt

RUN curl -sSL https://get.docker.com/ | sh

ENTRYPOINT ["python3", "main.py"]
