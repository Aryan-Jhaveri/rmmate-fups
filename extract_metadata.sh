#!/bin/bash

# Use environment variables if set, otherwise use defaults
MEDIA_DIR="${MEDIA_DIR:-./jpegs}"
OUTPUT_JS_FILE="${OUTPUT_JS_FILE:-js/mediaMetadata.js}"

# Check if the directory exists
if [ ! -d "$MEDIA_DIR" ]; then
    echo "Error: Directory $MEDIA_DIR does not exist"
    exit 1
fi

# Determine which metadata extraction tool to use
METADATA_TOOL=""
if command -v exiftool &> /dev/null; then
    METADATA_TOOL="exiftool"
elif command -v exif &> /dev/null; then
    METADATA_TOOL="exif"
elif command -v ffprobe &> /dev/null; then
    METADATA_TOOL="ffprobe"
else
    echo "Warning: No metadata extraction tools found (exiftool, exif, or ffprobe). Will extract date from filename."
fi

# Function to extract date from filename
extract_date_from_filename() {
    local filename="$1"
    local output=""
    
    # Extract date from filename (assuming format YYYYMMDD_HHMMSS.ext)
    if [[ $filename =~ ([0-9]{4})([0-9]{2})([0-9]{2})_([0-9]{2})([0-9]{2})([0-9]{2}) ]]; then
        year="${BASH_REMATCH[1]}"
        month="${BASH_REMATCH[2]}"
        day="${BASH_REMATCH[3]}"
        hour="${BASH_REMATCH[4]}"
        min="${BASH_REMATCH[5]}"
        sec="${BASH_REMATCH[6]}"
        
        # Return a simple metadata string for the python script to parse
        output="Date and Time | $year:$month:$day $hour:$min:$sec"
    else
        output="No date information available in filename."
    fi
    
    echo "$output"
}

# Process each supported media file
shopt -s nullglob
image_files=("$MEDIA_DIR"/*.{jpg,jpeg,JPG,JPEG})
video_files=("$MEDIA_DIR"/*.{mp4,MP4,mov,MOV})

# Check if files exist
if [ ${#image_files[@]} -eq 0 ] && [ ${#video_files[@]} -eq 0 ]; then
    echo "No supported media files found in $MEDIA_DIR"
    echo "Creating empty metadata files to prevent errors"
    # Create mediaMetadata.js using window to avoid redeclaration
    echo "window.mediaMetadata = [];" > "$OUTPUT_JS_FILE"
    
    # Also create imageMetadata.js for backward compatibility
    IMAGE_OUTPUT_FILE="${OUTPUT_JS_FILE/mediaMetadata.js/imageMetadata.js}"
    echo "window.imageMetadata = [];" > "$IMAGE_OUTPUT_FILE"
    
    echo "Created empty metadata files: $OUTPUT_JS_FILE and $IMAGE_OUTPUT_FILE"
    exit 0
fi

# Use a string to store all the metadata
metadata_output=""

# Process all files together
for media_file in "${image_files[@]}" "${video_files[@]}"; do
    filename=$(basename "$media_file")
    
    # Determine file type based on extension
    filetype="image"
    if [[ "$filename" =~ \.(mp4|MP4|mov|MOV)$ ]]; then
        filetype="video"
    fi
    
    # Add file name and type as header
    metadata_output+="=== Metadata for $filename ===
Type: $filetype
"
    
    # Extract metadata based on tool and file type
    if [ -n "$METADATA_TOOL" ]; then
        if [ "$METADATA_TOOL" = "exiftool" ]; then
            # exiftool works with both images and videos
            metadata=$($METADATA_TOOL "$media_file" 2>/dev/null || echo "No metadata found for $filename")
            metadata_output+="$metadata
"
        elif [ "$METADATA_TOOL" = "exif" ] && [[ "$filetype" == "image" ]]; then
            # exif only works with images
            metadata=$($METADATA_TOOL "$media_file" 2>/dev/null || echo "No metadata found for $filename")
            metadata_output+="$metadata
"
        elif [ "$METADATA_TOOL" = "ffprobe" ] && [[ "$filetype" == "video" ]]; then
            # ffprobe for videos
            metadata=$(ffprobe -v quiet -print_format json -show_format -show_streams "$media_file" 2>/dev/null || echo "No metadata found for $filename")
            metadata_output+="$metadata
"
        else
            # Extract date from filename as fallback
            date_info=$(extract_date_from_filename "$filename")
            metadata_output+="$date_info
"
        fi
    else
        # Extract date from filename
        date_info=$(extract_date_from_filename "$filename")
        metadata_output+="$date_info
"
    fi
    
    # Add separator
    metadata_output+="

"
done

# Pipe the entire metadata directly to the Python script
echo "$metadata_output" | python process_metadata.py

echo "Metadata extraction and processing complete. Results saved to $OUTPUT_JS_FILE"