import cv2

'''
    Resize Operation
    This operation simply takes a frame and resizes it to the requested dimensions.
'''

def apply(frame, width=None, height=None, with_cuda=False):
    (h, w) = frame.shape[:2]
    new_dimensions = (width, height)
    if width is None and height is not None:
        new_dimensions = (int(w * (height / float(h))), height)
    elif height is None and width is not None:
        new_dimensions = (width, int(h * (width / float(w))))
    if with_cuda:
        gpu_frame = cv2.cuda_GpuMat()
        gpu_frame.upload(frame)
        resized_frame =  cv2.cuda.resize(gpu_frame, new_dimensions,
                               interpolation=cv2.INTER_AREA)
        resized_frame = resized_frame.download()
    else:
        resized_frame = cv2.resize(frame, new_dimensions,
                               interpolation=cv2.INTER_AREA)
    return resized_frame, new_dimensions[0], new_dimensions[1]