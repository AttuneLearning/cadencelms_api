#!/bin/bash

# Extract individual issues from ISSUE_QUEUE.md
input_file="ISSUE_QUEUE.md"
output_dir="issue_queue"

# Track current issue
current_issue=""
current_file=""
in_issue=false

while IFS= read -r line; do
    # Check if this is a new issue (starts with ### ISS-)
    if [[ "$line" =~ ^###[[:space:]]ISS-([0-9]+): ]]; then
        # Save previous issue if exists
        if [ -n "$current_file" ]; then
            echo "Created: $current_file"
        fi
        
        # Extract issue number
        issue_num="${BASH_REMATCH[1]}"
        current_issue="ISS-$issue_num"
        current_file="$output_dir/ISS-$issue_num.md"
        in_issue=true
        
        # Start new file
        echo "$line" > "$current_file"
        
    # Check if we hit the next main section (## something that's not an issue)
    elif [[ "$line" =~ ^##[[:space:]] ]] && [[ ! "$line" =~ ^###[[:space:]]ISS- ]] && [ "$in_issue" = true ]; then
        # End of current issue
        if [ -n "$current_file" ]; then
            echo "Created: $current_file"
        fi
        current_file=""
        in_issue=false
        
    # Append to current issue file if we're in an issue
    elif [ "$in_issue" = true ] && [ -n "$current_file" ]; then
        echo "$line" >> "$current_file"
    fi
done < "$input_file"

# Save last issue if exists
if [ -n "$current_file" ]; then
    echo "Created: $current_file"
fi
