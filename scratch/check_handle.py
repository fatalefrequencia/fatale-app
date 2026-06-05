with open('src/App.jsx', 'r', encoding='utf-8') as f:
    for idx, line in enumerate(f, 1):
        if 'handleTuneInStation' in line:
            print(f"{idx}: {line.strip()}")
