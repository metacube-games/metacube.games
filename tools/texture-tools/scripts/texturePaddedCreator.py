import os
from PIL import Image

def main():
    SQUARE_SIDE = 32
    TEXTURE_PATH = './images/'

    def extend_image(img):
        width, height = img.size
        left_most_pixels = img.crop((0, 0, 1, height))
        right_most_pixels = img.crop((width-1, 0, width, height))
        top_most_pixels = img.crop((0, 0, width, 1))
        bottom_most_pixels = img.crop((0, height-1, width, height))

        img_extended = Image.new('RGBA', (width+2, height+2))

        top_left_pixel = img.crop((0, 0, 1, 1))
        top_right_pixel = img.crop((width-1, 0, width, 1))
        bottom_left_pixel = img.crop((0, height-1, 1, height))
        bottom_right_pixel = img.crop((width-1, height-1, width, height))

        img_extended.paste(top_left_pixel, (0, 0))
        img_extended.paste(top_right_pixel, (width+1, 0))
        img_extended.paste(bottom_left_pixel, (0, height+1))
        img_extended.paste(bottom_right_pixel, (width+1, height+1))

        img_extended.paste(left_most_pixels, (0, 1))
        img_extended.paste(right_most_pixels, (width+1, 1))
        img_extended.paste(top_most_pixels, (1, 0))
        img_extended.paste(bottom_most_pixels, (1, height+1))
        
        img_extended.paste(img, (1, 1))
        
        return img_extended

    def browse_and_concat(path):
        cube_dirs = getSubDirsList(path)
        numberOfCubes = len(cube_dirs)

        if(numberOfCubes > 0):
            maps_dirs = getSubDirsList(cube_dirs[0])
            mapsNames = []
            for map in maps_dirs:
                mapsNames.append(os.path.basename(map))

            texture_path = path + "../textures/padded/"

            if not os.path.isdir(texture_path):
                os.mkdir(texture_path)

            for name in mapsNames:
                dest = Image.new('RGBA', (SQUARE_SIDE * numberOfCubes + 2 * numberOfCubes, SQUARE_SIDE*4 + 2*4))
                for idx, dir in enumerate(cube_dirs):
                    im = createCubeImage(dir + "/" + name)
                    dest.paste(im, (idx*(SQUARE_SIDE+2), 0))
                print("Final texture dimensions: ", dest.size)
                dest.save(texture_path + name + ".png")

    def getSubDirsList(dir):
        dirs = []

        dirList = os.listdir(dir)
        dirList.sort()
        for directoryName in dirList:
            d = os.path.join(dir, directoryName)
            if os.path.isdir(d):
                dirs.append(d)
        
        return dirs

    def createCubeImage(dir):
        imNames = []
        cubeIm = Image.new('RGBA', (SQUARE_SIDE+2, SQUARE_SIDE*4 + 2*4))

        files = os.listdir(dir)
        files.sort()

        for filename in files:
            f = os.path.join(dir, filename)
            if os.path.isfile(f):
                imNames.append(f)
        
        numberOfFiles = len(imNames)

        if (numberOfFiles >0):
            imNamesFull = imNames

            for i in range(3-numberOfFiles):
                imNamesFull.append(imNames[-1])

            for idx, filename in enumerate(imNamesFull):
                im = Image.open(filename)
                im = extend_image(im)
                cubeIm.paste(im, (0, (SQUARE_SIDE+2)*idx))
            
        else:
            cubeIm.putalpha(0)

        return cubeIm

    browse_and_concat(TEXTURE_PATH)
    
if __name__ == "__main__":
    main()
