'''
    Grayscale Operation
    This operation simply takes a frame and grayscales it
'''

import cv2

def apply(frame, with_cuda):
    if with_cuda:
        gpu_frame = cv2.cuda_GpuMat()
        gpu_frame.upload(frame)
        recolored_frame = cv2.cuda.cvtColor(gpu_frame, cv2.COLOR_BGR2GRAY)
        return recolored_frame.download()
    else:
        return cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)