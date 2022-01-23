
# Styler

## An End-to-End System for Video Transformation

![System](https://user-images.githubusercontent.com/10412991/132263531-cfb7bde9-a6bd-4d6f-a738-cd48d321b229.png)


This repository includes the distinct components for a system that processes videos by applying multiple operations requested by a user.

The system is distributed and independent services can be deployed independently. Jobs are managed via message passing with `RabbitMQ` and `Celery`.

The following instructions apply to Ubuntu, but they should also make sense in other distributions.

> Note: This was created as a project for a Birkbeck program, and should be properly acknowledged.

## System Dependencies

Depending on the module you will be using a different tech stack, so different services may be needed.
This section describes system-level dependencies. Installing local packages and building services is covered in the corresponding section.

### Client Application

App Landing            |  Processing Result
:-------------------------:|:-------------------------:
<img src="https://user-images.githubusercontent.com/10412991/132135185-2daaa3eb-de09-4efe-89a6-8a5739a5dd5c.JPG" width="350">  |  <img src="https://user-images.githubusercontent.com/10412991/132263600-5cbeec32-74b8-4d84-a1bd-e8a39840b6fe.JPG" width="400">


This service lives under `./styler-app` and is a React application initialized with `create-react-app`.

For this to work your system simply needs `node` and `npm`. 

```
sudo apt-get install node
```

> Note: Deployment is not managed in this repo. The client can be accessed via the development server included with `create-react-app`.


### API Gateway

This service lives under `./api-gateway` and is an `express.js` API whose purpose is to power features exposed by the frontend as well as enabling it to access the state of a processing request.

This gateway takes care of enqueuing jobs that can be picked up by the video processing services, as well as exposing assets to the clients.

For this to work your system needs `node` and `npm`, as well as `RabbitMQ` which is used as the message passing backend. 

```
sudo apt-get install node
```

For RabbitMQ, you can follow the following tutorial:

```
https://www.rabbitmq.com/install-debian.html
```

### Database

A database is a few of the services to keep track of state and information regarding job processing. It is also used by the client application to get access to available styles and other useful metadata.

A pre-commited empty `sqlite3` db is available, but more information about setting up the database can be found in `./db`.

### Job Orchestrator

This service lives under `./job_orchestrator` and its function is to listen to events in the Celery Message BUS, and ensuring job requests are processed.

In a sense, the orchestrator acts as a worker for the requests enqueued by the API gateway.

For this to work your system needs `node` and `npm`, as well as `RabbitMQ` which is used as the message passing backend. These instructions are already available in the API Gateway section.


### Video Processing Pipeline

The core of the video processing functionality lives under `./video-processing`. The core of this service is a pipeline executor which takes a video, and applies certain operations frame by frame. The list of available operations include applying a style transfer model, resizing, and grayscale transforms.

![pipeline](https://user-images.githubusercontent.com/10412991/132263561-f178d59c-0bc3-4ee8-98af-98c3de89170a.png)

Because this system processes videos, we leverage `python3.8`, and dependencies are managed via `pipenv` in order to enusre environments are reproductible.

```
sudo apt-get install python-3.8
sudo apt-get install ffmpeg
```

For `ffmpeg` we want to also install libraries that enable our videos to be encoded in web-friendly formats.

```
sudo apt-get install ffmpeg x264 libx264-dev
```

Building OpenCV with CUDA support is required in order to take advantage of these capabilities. However, the pipeline can be configured to use the CPU entirely. Although this is much slower.

https://www.pyimagesearch.com/2020/02/03/how-to-use-opencvs-dnn-module-with-nvidia-gpus-cuda-and-cudnn/

For this project, the following command did the job in a WSL2 machine with NVIDIA RTX 2060.

> Note: Ensure the CUDA_ARCH_BIN is correct for your graphic card.

```
cmake -D CMAKE_BUILD_TYPE=RELEASE \
    -D CMAKE_INSTALL_PREFIX=/usr/local \
    -D INSTALL_PYTHON_EXAMPLES=OFF \
    -D INSTALL_C_EXAMPLES=OFF \
    -D WITH_PROTOBUF=OFF \
    -D CUDA_ARCH_BIN=7.5 \
    -D WITH_CUDA=ON \
    -D WITH_OPENEXR=OFF \
    -D WITH_CUDNN=OFF \
    -D WITH_CUBLAS=ON \
    -D WITH_OPENCL=OFF -D WITH_OPENCL_SVM=OFF -D WITH_OPENCLAMDFFT=OFF -D WITH_OPENCLAMDBLAS=OFF \
    -D OPENCV_EXTRA_MODULES_PATH=~/opencv_contrib/modules \
    -D HAVE_opencv_python3=ON \
    -D PYTHON_EXECUTABLE=/home/doc/.local/share/virtualenvs/video-processing-sv-2NLAb/bin/python \
    -D BUILD_EXAMPLES=Off ..
```

## Storage

The system has been implemented with the idea of storage in mind considering clients should be able to upload videos and the processing pipelines should be able to export them. This is currently managed in the local file system via the file storage helpers used by the different services. However, the hope is this is abstract enough one could switch this for a different system like `S3` for cloud asset management.

To clean up storage folders and temporary processing files:
```
make clean
```

## Running the applications

Once all the system dependencies have been setup. A `Makefile` has been exposed with core operations.

```
make prepare-dependencies
make start-api &
make start-job-orchestrator &
make start-app-dev &
```

For this to work, ensure the RabbitMQ service is active

```
sudo service rabbitmq-server start
```

You can alternatively start each process individually, or run the individual scripts for the processing pipeline (Check the video processing `Pipfile` for more details.)


Once the services have started, with default port settings we should be able to access things via:
```
Frontend: http://localhost:3000/
API Gateway: http://localhost:3500/
RabbitMQ Backend: amqp://localhost:5672
```

However, one can edit these things in the corresponding services directly.

