files = [
    r"c:\Users\Customer\Downloads\Fatale version 1\fatale-app\src\components\SpatialProfile.css",
    r"c:\Users\Customer\Downloads\Fatale version 1\fatale-app\src\index.css",
    r"c:\Users\Customer\Downloads\Fatale version 1\fatale-app\src\components\DJMixerPlayer.css",
]

for path in files:
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        new_content = content.replace("'FataleNeon'", "'Share Tech Mono'")
        if new_content != content:
            with open(path, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"Updated: {path}")
        else:
            print(f"No changes needed: {path}")
    except Exception as e:
        print(f"Error on {path}: {e}")
