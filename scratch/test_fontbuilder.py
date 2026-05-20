import os
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

print("Import succeeded")

# Test building a simple font
fb = FontBuilder(1000, isTTF=True)
fb.setupGlyphOrder([".notdef", "space", "A"])

pen = TTGlyphPen(None)
pen.moveTo((100, 100))
pen.lineTo((100, 800))
pen.lineTo((800, 800))
pen.lineTo((800, 100))
pen.closePath()
glyph = pen.glyph()

glyphs = {
    ".notdef": glyph,
    "space": pen.glyph(), # empty
    "A": glyph
}

fb.setupGlyf(glyphs)

cmap = {
    0x20: "space",
    0x41: "A"
}
fb.setupCharacterMap(cmap)

fb.setupNameTable({
    "familyName": "TestFont",
    "styleName": "Regular",
    "uniqueFontIdentifier": "TestFont Regular",
    "fullName": "TestFont",
    "psName": "TestFont-Regular",
})

# Setup basic metrics
metrics = {
    ".notdef": (900, 100),
    "space": (300, 0),
    "A": (900, 100)
}
fb.setupHorizontalMetrics(metrics)

# Setup dummy header/os2/post tables
fb.setupHorizontalHeader(ascent=800, descent=-200)
fb.setupOS2(sTypoAscender=800, sTypoDescender=-200)
fb.setupPost()

out_path = "scratch/test.ttf"
fb.save(out_path)
print("Font saved successfully at:", out_path)
