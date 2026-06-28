import os
from PIL import Image


def main():
    SQUARE_SIDE = 32
    TEXTURE_PATH = './images/'

    def browse_and_concat(path):
        cube_dirs = getSubDirsList(path)
        numberOfCubes = len(cube_dirs)

        if numberOfCubes > 0:
            maps_dirs = getSubDirsList(cube_dirs[0])
            mapsNames = []
            for map in maps_dirs:
                mapsNames.append(os.path.basename(map))

            texture_path = path + "../textures/"

            if not os.path.isdir(texture_path):
                os.mkdir(texture_path)

            for name in mapsNames:
                dest = Image.new('RGBA', (SQUARE_SIDE * numberOfCubes, SQUARE_SIDE*4))
                for idx, dir in enumerate(cube_dirs):
                    im = createCubeImage(dir + "/" + name)
                    dest.paste(im, (idx*SQUARE_SIDE,0))
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
        cubeIm = Image.new('RGBA', (SQUARE_SIDE, SQUARE_SIDE*4))

        files = os.listdir(dir)
        files.sort()

        for filename in files:
            f = os.path.join(dir, filename)
            if os.path.isfile(f):
                imNames.append(f)

        numberOfFiles = len(imNames)

        if numberOfFiles > 0:
            imNamesFull = imNames

            for i in range(3-numberOfFiles):
                imNamesFull.append(imNames[-1])

            for idx, filename in enumerate(imNamesFull):
                im = Image.open(filename)
                cubeIm.paste(im, (0,SQUARE_SIDE*idx))
        else:
            cubeIm.putalpha(0)

        return cubeIm

    browse_and_concat(TEXTURE_PATH)

if __name__ == "__main__":
    main()
