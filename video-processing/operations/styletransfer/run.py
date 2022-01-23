import sys
import apply as op
import utils

'''
    Single Frame Style Transfer
    This is an adapatation of https://github.com/StacyYang/MSG-Net to support videos and distributed CUDA processing for performance.
    Enables to test the processing pipeline for styles only.
'''

def main():
    if len(sys.argv) != 4:
        raise ValueError(
            "Error: Required parameters for source image, style and output path")
    transformed = op.apply(sys.argv[1], sys.argv[2])
    out_path = sys.argv[3]
    utils.tensor_save_bgrimage(transformed.data[0], out_path, True)


if __name__ == "__main__":
    main()
