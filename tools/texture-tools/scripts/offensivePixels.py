import json
from PIL import Image
import os

def main():
    path = "./textures/light.png"
    texture_size = 32

    source = Image.open(path)
    textures_per_row = source.width // texture_size
    textures_per_column = 4

    json_list = []

    for column in range(textures_per_row):
        column_list = []

        for line in range(textures_per_column):
            line_list = []

            x = column * texture_size
            y = line * texture_size

            for i in range(texture_size):
                for j in range(texture_size):
                    pixel_x = x + i
                    pixel_y = y + j

                    if source.getpixel((pixel_x, pixel_y))[0] != 0 or source.getpixel((pixel_x, pixel_y))[1] != 0 or source.getpixel((pixel_x, pixel_y))[2] != 0:
                        unique_index = i + j * texture_size
                        line_list.append(unique_index)

            column_list.append(line_list)

        json_list.append(column_list)

    json_dir = "./voxelsJson/"
    json_file = json_dir + "offensiveCoor.json"

    if not os.path.isdir(json_dir):
        os.mkdir(json_dir)

    with open(json_file, "w") as f:
        json.dump(json_list, f)


if __name__ == "__main__":
    main()
