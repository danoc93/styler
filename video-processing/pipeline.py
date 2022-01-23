import subprocess
from pathlib import Path
import subprocess
import cv2
import sys
import os
import json
from multiprocessing.pool import ThreadPool
from collections import deque
import time


'''
VIDEO PROCESSING PIPELINE
This pipeline applies a processing method to a video.
As part of the arguments a configuration object is provided.
Depending on the method, this object can contain different fields.

The implementation tries to parallelize operations if desired, 
    as well as to exploit CUDA for GPU processing when possible.
'''

# Temporary hack until we sort out the issues with modules.
file_dir = os.path.dirname(__file__)
sys.path.append(f'{file_dir}/operations/styletransfer')
import operations.styletransfer.utils as styletransferutils
import operations.styletransfer.apply as styletransfer
import operations.grayscale.apply as grayscale
import operations.resize.apply as frame_resize

PoolType = ThreadPool

# Supported operations.
METHOD_STYLE_TRANSFER = 'style-transfer'
METHOD_GRAYSCALE = 'grayscale'

# Default processing parameters.
PARAM_FRAME_DROP_RATE = 0.25
PARAM_SCALING_MAX_DIMENSION = None
PARAM_SCALING_MAX_STYLE = 250

# List of processing methods provided.
PROCESSING_METHODS = [METHOD_STYLE_TRANSFER, METHOD_GRAYSCALE]

USE_CUDA_FOR_STYLING = True
USE_CUDA_FOR_PROCESSING = True

PARALLELIZE = True
NUM_PARALLEL_OPS = 3

TMP_DIR_PATH = os.getcwd() + '/tmp'
CODEC = ('XVID', 'avi')


'''
HELPERS
'''

def process_frame(frame, processing_method, w, h, style_matrix):
    # 
    # Process frames according to the operation requested.
    # 

    # Use ffmpeg directly, may be better than applying the operation directly!
    #frame, _, __ = frame_resize(frame, width=w, height=h)
    if processing_method == METHOD_STYLE_TRANSFER:
        tensor = styletransferutils.tensor_from_numpyimage(frame)
        transformed_tensor = styletransfer.apply_style(
            tensor, style_matrix, USE_CUDA_FOR_STYLING)
        frame = styletransferutils.tensor_to_numpy(
            transformed_tensor.data[0], h, w, USE_CUDA_FOR_STYLING)
    if processing_method == METHOD_GRAYSCALE:
        frame = grayscale.apply(frame, USE_CUDA_FOR_PROCESSING)
    return frame


def main():

    global PARAM_FRAME_DROP_RATE
    global PARAM_SCALING_MAX_DIMENSION
    global PARAM_SCALING_MAX_STYLE
    
    if len(sys.argv) < 4:
        print("Error: Processing pipeline requires both an input, output video paths and a processing method.")
        exit(3)

    '''
        LOADING
        Extract relevant configuration.
    '''

    OP_CONFIGURATION = {}

    # Configuration object.
    if len(sys.argv) == 5:
        try:
            configuration = json.loads(sys.argv[4])
            print('Configuration loaded', json.dumps(configuration))
            PARAM_FRAME_DROP_RATE = float(
                configuration['frame_drop_rate']) if 'frame_drop_rate' in configuration else PARAM_FRAME_DROP_RATE
            PARAM_SCALING_MAX_DIMENSION = int(
                configuration['scaling_max_dimension']) if 'scaling_max_dimension' in configuration else PARAM_SCALING_MAX_DIMENSION
            PARAM_SCALING_MAX_STYLE = int(
                configuration['scaling_max_style']) if 'scaling_max_style' in configuration else PARAM_SCALING_MAX_STYLE
            OP_CONFIGURATION = configuration['operation_configuration'] if 'operation_configuration' in configuration else OP_CONFIGURATION
        except Exception as e:
            print('Invalid configuration, using default values', e)
    else:
        print('Configuration not provided, using default values')

    input_video_path = sys.argv[1]
    output_video_path = sys.argv[2]
    processing_method = sys.argv[3]

    if processing_method not in PROCESSING_METHODS:
        print("Error: Provided processing method not valid.")
        exit(4)

    if not os.path.isfile(input_video_path):
        print("Error: Input source file does not exist.\n")
        exit(1)

    if not os.path.isdir(TMP_DIR_PATH):
        print(f'Creating tmp directory at {TMP_DIR_PATH}')
        os.mkdir(TMP_DIR_PATH)

    print(f"Processing video at {input_video_path}")

    '''
        PREPARATION
        Prepare the video by initiating a read stream for all frames
    '''

    
    print(
        f"Using CUDA [Processing = {USE_CUDA_FOR_PROCESSING}] [Styling = {USE_CUDA_FOR_STYLING}]")

    video_capture = cv2.VideoCapture(input_video_path)
    success, frame = video_capture.read()

    if not success:
        print("Error: Invalid input source, could not find frame.")
        exit(-2)

    # Use the first frame as a proxy for output parameters
    # Make the largest dimension the target one to scale down, and let the other one be calculated to maintain ratios.
    original_height, original_width, _ = frame.shape
    scaled_height, scaled_width = original_height, original_width

    if PARAM_SCALING_MAX_DIMENSION:
        if original_height > original_width and PARAM_SCALING_MAX_DIMENSION < original_height:
            scaled_height, scaled_width = PARAM_SCALING_MAX_DIMENSION, None
        else:
            scaled_height, scaled_width = None, PARAM_SCALING_MAX_DIMENSION

    resized, w, h = frame_resize.apply(
        frame, width=scaled_width, height=scaled_height, with_cuda=USE_CUDA_FOR_PROCESSING)

    print(
        f"Video frames will be scaled to {w}x{h} with a frame dropout rate = {PARAM_FRAME_DROP_RATE * 100}%")

    LOADED_STYLE_MATRIX = None
    if processing_method == METHOD_STYLE_TRANSFER:
        if not OP_CONFIGURATION['style_file_source']:
            print(f"Style file source not provided for processing operation")
            exit(5)
        src_style_file = OP_CONFIGURATION['style_file_source']
        print(
            f'Transfering style in image {src_style_file} with scaling max dim {PARAM_SCALING_MAX_STYLE}')
        LOADED_STYLE_MATRIX = styletransferutils.tensor_load_rgbimage(
            OP_CONFIGURATION['style_file_source'], size=PARAM_SCALING_MAX_STYLE)

    '''
        PROCESSING
        Process frames of the video.
        Start by dropping frames if required, then continue with mathematical operations.
    '''

    # The library requires the format to be specified so we can rename things later! Save in a temporary location.
    task_id = output_video_path.split('/')[-1]
    tmp_out_file = f'{TMP_DIR_PATH}/{task_id}.{CODEC[1]}'

    print(f"Using staging file {tmp_out_file}")

    tmp_out_file_compressed = f'{TMP_DIR_PATH}/{task_id}compressed.{CODEC[1]}'

    if os.path.exists(tmp_out_file_compressed):
        print("Found output file with same name, removing...")
        os.remove(tmp_out_file_compressed)

    new_rate = 60 - int(PARAM_FRAME_DROP_RATE * 60)
    # Use ffmpeg to compress the video https://trac.ffmpeg.org/wiki/ChangingFrameRate
    if PARAM_FRAME_DROP_RATE > 0 or original_height != h or original_width != w:
        subprocess.run(
            ["ffmpeg", "-i", input_video_path, "-s", f'{w}x{h}', '-filter:v', f'fps={new_rate}', '-c:a', 'copy', tmp_out_file_compressed],
            stdout=subprocess.DEVNULL
        )
    else:
        print("Not invoking downscaling routine as dimensions are not changed")
        tmp_out_file_compressed = input_video_path

    print(f'Video transformed to {new_rate} FPS')
    video_capture.release()

    # Read the compressed video!
    video_capture = cv2.VideoCapture(tmp_out_file_compressed)
    total_frames = int(video_capture.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f"Processing {total_frames} video frames")

    success, frame = video_capture.read()
    fourcc = cv2.VideoWriter_fourcc(*CODEC[0])

    is_grayscale = processing_method == METHOD_GRAYSCALE

    out = cv2.VideoWriter(tmp_out_file, fourcc, 60,
                          (w, h), not is_grayscale)

    start_time_pipeline, start_time_frames = time.time(), time.time()
    count = 0
    if PARALLELIZE and NUM_PARALLEL_OPS > 1:

        print(
            f'Attempting to parallelize with {NUM_PARALLEL_OPS} concurrent workers')
        pending = deque()

        while True:
            pool = PoolType(processes=NUM_PARALLEL_OPS)
            for i in range(NUM_PARALLEL_OPS):
                success, frame = video_capture.read()
                if not success:
                    break
                task = pool.apply_async(
                    process_frame,
                    args=[frame, processing_method, w, h, LOADED_STYLE_MATRIX],
                    error_callback=lambda x: print(
                        "Error Processing Frame:", x)
                )
                pending.append(task)
            waiting = len(pending)
            pool.close()
            pool.join()
            while len(pending) > 0:
                out.write(pending.popleft().get())
            count += waiting
            if count % 10 == 0:
                print(f"Processed {count} frames...")
            # We ignore the first frame since this got extracted before this loop.
            if count == total_frames - 1:
                break

    else:

        while success:
            success, frame = video_capture.read()
            if not success:
                continue
            out.write(process_frame(frame, processing_method,
                      w, h, LOADED_STYLE_MATRIX))
            count += 1
            
            if count == 2:
                #Due to warmup start counting from the second frame
                start_time_frames = time.time()

            if count % 10 == 0:
                print(f"Processed {count} frames...")

    end_time_pipeline = time.time()
    total_time = (end_time_pipeline - start_time_pipeline)
    total_time_frames = end_time_pipeline - start_time_frames
    print(f"Total {total_time} Frames {total_time_frames} Warmup {total_time - total_time_frames} AVG / frame {total_time / count}")
    
    video_capture.release()
    out.release()
    cv2.destroyAllWindows()

    '''
        POST-PROCESSING
        Do any compression and saving of the files.
    '''

    if not os.path.isfile(tmp_out_file):
        print("Error: Output file does not exist [Processed Target].")
        exit(2)

    tmp_converted_file = tmp_out_file + '.mp4'

    # Until support for opencv and x264 is sorted, convert with ffmpeg into a web friendly format.
    subprocess.run(
        ["ffmpeg", "-hwaccel", "cuda", "-i", tmp_out_file, "-vcodec", "libx264", tmp_converted_file],
        stdout=subprocess.DEVNULL
    )
    os.remove(tmp_out_file)

    if not os.path.isfile(tmp_converted_file):
        print("Error: Output file does not exist [Converted Target].")
        exit(2)

    os.remove(tmp_out_file_compressed)

    output_video_path = output_video_path + '.mp4'

    if os.path.exists(output_video_path):
        print("Found output file with same name, removing...")
        os.remove(output_video_path)

    Path(tmp_converted_file).rename(output_video_path)

    if not os.path.isfile(output_video_path):
        print("Error: Output file does not exist [Transplanted Target].")
        exit(2)

    print(
        f"Output succesfully created at {output_video_path}")


if __name__ == "__main__":
    main()
