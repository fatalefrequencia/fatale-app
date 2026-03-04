import re

file_path = r'c:\Users\Customer\Downloads\Fatale version 1\fatale-app\src\App.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace hex color
content = content.replace('#ff006e', 'var(--text-color)')

# Specific color variants in App.jsx
content = content.replace('#ff006e15', 'rgba(var(--text-color-rgb), 0.15)')
content = content.replace('#ff006e10', 'rgba(var(--text-color-rgb), 0.1)')
content = content.replace('#ff006e20', 'rgba(var(--text-color-rgb), 0.2)')
content = content.replace('#ff006e50', 'rgba(var(--text-color-rgb), 0.5)')

# Replace rgba variants
content = content.replace('rgba(255, 0, 110,', 'rgba(var(--text-color-rgb),')

# Also handle common shadows
# shadow-[0_0_20px_#ff006e] -> shadow-[0_0_20px_var(--text-color)]
# shadow-[0_0_30px_rgba(255,0,110,0.5)] -> shadow-[0_0_30px_rgba(var(--text-color-rgb),0.5)]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done App.jsx")
