import re

file_path = r'c:\Users\Customer\Downloads\Fatale version 1\fatale-app\src\components\Profile.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace hex color
content = content.replace('#ff006e', 'var(--text-color)')

# Replace rgba variants
content = content.replace('rgba(255, 0, 110,', 'rgba(var(--text-color-rgb),')
content = content.replace('#ff006e20', 'rgba(var(--text-color-rgb), 0.2)')
content = content.replace('#ff006e10', 'rgba(var(--text-color-rgb), 0.1)')
content = content.replace('#ff006e05', 'rgba(var(--text-color-rgb), 0.05)')

# Specific cases for transitions or shadow hex
# shadow-[0_0_15px_#ff006e05] -> shadow-[0_0_15px_rgba(var(--text-color-rgb),0.05)]
# shadow-[0_0_20px_#ff006e20] -> shadow-[0_0_20px_rgba(var(--text-color-rgb),0.2)]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
