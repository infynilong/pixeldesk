
import sys

filepath = '/Users/jiangyilong/project/PixelDesk/public/assets/officemap.json'

with open(filepath, 'r') as f:
    lines = f.readlines()

# Line numbers are 1-indexed in my previous view_file output.
# Line 96522:                           "value":"desk_park_short_down"
# Line 96535:                           "value":"desk_park_short_top"

# Check if content matches before replacing
line_96522 = lines[96521] # 0-indexed
line_96535 = lines[96534] # 0-indexed

print(f"Original line 96522: {line_96522.strip()}")
print(f"Original line 96535: {line_96535.strip()}")

if '"value":"desk_park_short_down"' in line_96522 and '"value":"desk_park_short_top"' in line_96535:
    lines[96521] = line_96522.replace('desk_park_short_down', 'desk_park_short_top')
    lines[96534] = line_96535.replace('desk_park_short_top', 'desk_park_short_down')
    
    with open(filepath, 'w') as f:
        f.writelines(lines)
    print("Successfully swapped values.")
else:
    print("Content mismatch, aborting.")
    sys.exit(1)
