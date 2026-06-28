# optimize-audio.sh
#!/bin/sh

# Ensure ffmpeg is installed
if ! command -v ffmpeg &> /dev/null
then
    echo "ffmpeg could not be found, please install it."
    exit
fi

# Define the source and destination directories
SOURCE_DIR="src/sound/sounds"
DEST_DIR="src/sound/soundsOptimized"

# Create the destination directory if it does not exist
mkdir -p "$DEST_DIR"

# Optimize all .wav and .mp3 files in the source directory
for file in "$SOURCE_DIR"/*.{wav,mp3}
do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        ffmpeg -i "$file" -codec:a libmp3lame -qscale:a 2 "$DEST_DIR/$filename"
    fi
done

SOURCE_DIR="src/sound/soundsv2"
DEST_DIR="src/sound/soundsOptimized"

# Create the destination directory if it does not exist
mkdir -p "$DEST_DIR"

# Optimize all .wav and .mp3 files in the source directory
for file in "$SOURCE_DIR"/*.{wav,mp3}
do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        ffmpeg -i "$file" -codec:a libmp3lame -qscale:a 2 "$DEST_DIR/$filename"
    fi
done

echo "Audio optimization complete"
