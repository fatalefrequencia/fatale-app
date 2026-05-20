from fontTools.fontBuilder import FontBuilder
import inspect

fb = FontBuilder(1000, isTTF=True)
methods = [m for m, _ in inspect.getmembers(fb, predicate=inspect.ismethod)]
print("Methods:")
for m in sorted(methods):
    print(m)
