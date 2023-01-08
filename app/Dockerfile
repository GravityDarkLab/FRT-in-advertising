FROM python:3.9


RUN apt update
RUN apt install -y python3-opencv cmake

RUN useradd -m -d /frt frt
USER frt

ADD requirements.txt /frt/requirements.txt
RUN mkdir -p /frt/.deepface/weights

WORKDIR /frt/
RUN pip install -r requirements.txt

WORKDIR /frt/app
CMD PATH=$PATH:/frt/.local/bin uwsgi --ini uwsgi.ini
