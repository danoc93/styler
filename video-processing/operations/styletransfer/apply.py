'''
    Style Transfer Operation
    This is an adapatation of https://github.com/StacyYang/MSG-Net to support videos and distributed CUDA processing for performance.
    This exposes the simplified core operations with a pretrained model based on the aforementioned implementation.
    It has also been changed to inject CUDA preferences from separate modules.
'''

import torch
import gc
from torch.autograd import Variable
import utils
from net import Net
import os 

def clear_cuda_cache():
    gc.collect()
    torch.cuda.empty_cache()

DEFAULT_SCALING_STYLE = 800
DEFAULT_FILTER_CHANNELS = 80

PRE_TRAINED_MODEL_LOCATION = os.path.dirname(os.path.realpath(__file__)) + '/models/21styles.model'
def apply(source, style_src_path):
    content_image = utils.tensor_load_rgbimage(source, keep_asp=True)
    style = utils.tensor_load_rgbimage(
        style_src_path, size=DEFAULT_SCALING_STYLE)
    return apply_style(content_image, style)


def apply_style(content_image_tensor, style, with_cuda=True):
    clear_cuda_cache()
    content_image = content_image_tensor.unsqueeze(0)
    style = style.unsqueeze(0)
    style = utils.preprocess_batch(style)
    style_model = Net()
    model_dict = torch.load(PRE_TRAINED_MODEL_LOCATION)
    all_keys = list(map(lambda x: x[0], model_dict.items()))
    for key in all_keys:
        if key.endswith(('running_mean', 'running_var')):
            del model_dict[key]
    style_model.load_state_dict(model_dict, False)

    if with_cuda:
        style_model.cuda()
        content_image = content_image.cuda()
        style = style.cuda()

    style_v = Variable(style)
    content_image = Variable(utils.preprocess_batch(content_image))
    style_model.setTarget(style_v)

    return style_model(content_image)
