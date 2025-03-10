#!/bin/bash

# Use environment variables if set, otherwise use defaults
JPEG_DIR="${JPEG_DIR:-./jpegs}"
OUTPUT_JS_FILE="${OUTPUT_JS_FILE:-js/imageMetadata.js}"

# Check if the directory exists
if [ ! -d "$JPEG_DIR" ]; then
    echo "Error: Directory $JPEG_DIR does not exist"
    exit 1
fi

# Determine which EXIF tool to use
EXIF_TOOL=""
if command -v exiftool &> /dev/null; then
    EXIF_TOOL="exiftool"
elif command -v exif &> /dev/null; then
    EXIF_TOOL="exif"
else
    echo "Warning: No EXIF extraction tool found (exiftool or exif). Will extract date from filename."
fi

# Process each JPEG file (handles both .jpg and .jpeg extensions)
shopt -s nullglob
jpeg_files=("$JPEG_DIR"/*.{jpg,jpeg,JPG,JPEG})
if [ ${#jpeg_files[@]} -eq 0 ]; then
    echo "No JPEG files found in $JPEG_DIR"
    exit 1
fi

# Use a string to store all the metadata
metadata_output=""

for jpeg_file in "${jpeg_files[@]}"; do
    filename=$(basename "$jpeg_file")
    # Add file name as header
    metadata_output+="=== Metadata for $filename ===
"
    
    # Extract EXIF data if tool is available
    if [ -n "$EXIF_TOOL" ]; then
        if [ "$EXIF_TOOL" = "exiftool" ]; then
            exif_data=$($EXIF_TOOL "$jpeg_file" 2>/dev/null || echo "No EXIF data found for $filename")
        else
            exif_data=$($EXIF_TOOL "$jpeg_file" 2>/dev/null || echo "No EXIF data found for $filename")
        fi
        metadata_output+="$exif_data
"
    else
        # Extract date from filename (assuming format YYYYMMDD_HHMMSS.jpg)
        if [[ $filename =~ ([0-9]{4})([0-9]{2})([0-9]{2})_([0-9]{2})([0-9]{2})([0-9]{2}) ]]; then
            year="${BASH_REMATCH[1]}"
            month="${BASH_REMATCH[2]}"
            day="${BASH_REMATCH[3]}"
            hour="${BASH_REMATCH[4]}"
            min="${BASH_REMATCH[5]}"
            sec="${BASH_REMATCH[6]}"
            
            # Create a simple metadata string for the python script to parse
            metadata_output+="Date and Time | $year:$month:$day $hour:$min:$sec
"
        else
            metadata_output+="No date information available in filename.
"
        fi
    fi
    
    # Add separator
    metadata_output+="

"
done

# Pipe the entire metadata directly to the Python script
echo "$metadata_output" | python process_metadata.py

echo "Metadata extraction and processing complete. Results saved to $OUTPUT_JS_FILE"