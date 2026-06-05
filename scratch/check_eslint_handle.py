with open('eslint_errors_utf8.txt', 'r', encoding='utf-8') as f:
    for idx, line in enumerate(f, 1):
        if 'handleTuneInStation' in line:
            print(f"{idx}: {line.strip()}")
