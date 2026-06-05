import sys

encodings = ['utf-8', 'utf-16', 'utf-16-le', 'utf-16-be', 'latin-1']
content = None

for enc in encodings:
    try:
        with open('eslint_errors.txt', 'r', encoding=enc) as f:
            content = f.read()
        print(f"Successfully read using encoding: {enc}")
        break
    except Exception as e:
        continue

if content is None:
    print("Failed to read file with any encoding")
    sys.exit(1)

with open('eslint_errors_utf8.txt', 'w', encoding='utf-8') as out:
    out.write(content)

# Print lines containing 'no-undef'
for idx, line in enumerate(content.splitlines(), 1):
    if 'no-undef' in line:
        print(f"{idx}: {line.strip()}")
