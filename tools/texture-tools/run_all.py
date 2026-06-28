from scripts.textureCreator import main as texture_creator_main
from scripts.offensivePixels import main as offensive_pixels_main
from scripts.dominantColorsWriter import main as dominant_colors_writer_main
from scripts.texturePaddedCreator import main as texturePadded_creator_main

def main():
    print("Running textureCreator.py")
    texture_creator_main()

    print("Running texturePaddedCreator.py")
    texturePadded_creator_main()

    print("Running dominantColorsWriter.py")
    dominant_colors_writer_main()

    print("Running offensivePixels.py")
    offensive_pixels_main()

    print("All scripts completed successfully")

if __name__ == "__main__":
    main()
