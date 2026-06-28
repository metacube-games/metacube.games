from PIL import Image
import tempfile
from colorthief import ColorThief
import numpy as np
import json
import os


def main():
    source = "./textures/color.png"

    im = Image.open(source)
    width, height = im.size

    arr = np.empty((0,3))

    for x in range(0, width, 32):
        sub_im = im.crop((x, 0, x + 32, height))

        tmpImage = tempfile.TemporaryFile()
        sub_im.save(tmpImage, "PNG")

        color_thief = ColorThief(tmpImage)
        palette = color_thief.get_palette(color_count=3)
        normalised_palette = np.divide(palette, 256)

        arr = np.vstack([arr, normalised_palette])

    colors = arr.tolist()

    json_dir = "./voxelsJson/"
    json_file = json_dir + "colorArray.json"

    if not os.path.isdir(json_dir):
        os.mkdir(json_dir)

    with open(json_file, 'w') as FileObj:
        json.dump(colors, FileObj)

if __name__ == "__main__":
    main()
