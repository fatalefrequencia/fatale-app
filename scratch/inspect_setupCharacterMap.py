from fontTools.fontBuilder import FontBuilder
import inspect

fb = FontBuilder(1000, isTTF=True)
sig = inspect.signature(fb.setupCharacterMap)
print("setupCharacterMap signature:", sig)
