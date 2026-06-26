package tray

import "encoding/binary"

// ── Cyberpunk color palette ──

type rgb struct{ r, g, b byte }

var (
	bgDark  = rgb{0x0F, 0x17, 0x2A} // deep slate #0F172A (rounded square background)
	cyan    = rgb{0x00, 0xD4, 0xFF} // cyberpunk cyan #00D4FF (play triangle)
	bgEdge  = rgb{0x1E, 0x29, 0x3B} // subtle lighter edge for depth
)

// ── ICO generation ──

func generateICO() []byte {
	const size = 32
	const bpp = 32
	pixelBytes := size * size * 4
	maskBytes := size * size / 8
	imageSize := 40 + pixelBytes + maskBytes

	buf := make([]byte, 6+16+imageSize)
	pos := 0

	// ── ICO Header (6 bytes) ──
	binary.LittleEndian.PutUint16(buf[pos:], 0)
	pos += 2 // reserved
	binary.LittleEndian.PutUint16(buf[pos:], 1)
	pos += 2 // ICO type
	binary.LittleEndian.PutUint16(buf[pos:], 1)
	pos += 2 // image count

	// ── Directory Entry (16 bytes) ──
	buf[pos] = size
	pos++                   // width
	buf[pos] = size
	pos++                   // height
	buf[pos] = 0
	pos++                   // color palette (0)
	buf[pos] = 0
	pos++                   // reserved
	binary.LittleEndian.PutUint16(buf[pos:], 1)
	pos += 2 // color planes
	binary.LittleEndian.PutUint16(buf[pos:], bpp)
	pos += 2 // bits per pixel
	binary.LittleEndian.PutUint32(buf[pos:], uint32(imageSize))
	pos += 4 // image size
	binary.LittleEndian.PutUint32(buf[pos:], 6+16)
	pos += 4 // offset to image data

	// ── BITMAPINFOHEADER (40 bytes) ──
	binary.LittleEndian.PutUint32(buf[pos:], 40)
	pos += 4 // biSize
	binary.LittleEndian.PutUint32(buf[pos:], size)
	pos += 4 // biWidth
	binary.LittleEndian.PutUint32(buf[pos:], size*2)
	pos += 4 // biHeight (×2 for ICO: AND mask below XOR mask)
	binary.LittleEndian.PutUint16(buf[pos:], 1)
	pos += 2 // biPlanes
	binary.LittleEndian.PutUint16(buf[pos:], bpp)
	pos += 2 // biBitCount
	binary.LittleEndian.PutUint32(buf[pos:], 0)
	pos += 4 // biCompression (BI_RGB)
	binary.LittleEndian.PutUint32(buf[pos:], 0)
	pos += 4 // biSizeImage (0 = calculated)
	pos += 16 // biXPelsPerMeter, biYPelsPerMeter, biClrUsed, biClrImportant (all 0)

	// ── Pixel data ──
	drawPlayIcon(buf[pos:pos+pixelBytes], size)

	return buf
}

// drawPlayIcon renders a cyberpunk-themed play-button icon into the BGRA pixel buffer.
//
// Design: deep rounded square background (#0F172A) with a bold cyan (#00D4FF)
// right-pointing play triangle "▶" centered in the frame. Clean, high-contrast,
// and recognizable at small sizes.
func drawPlayIcon(pix []byte, size int) {
	var img [32][32]rgb

	// ── Step 1: Fill entire canvas transparent ──
	for y := 0; y < size; y++ {
		for x := 0; x < size; x++ {
			img[y][x] = rgb{0, 0, 0} // transparent (A=0 in BGRA means the AND mask shows through)
		}
	}

	// ── Step 2: Draw the rounded-square background ──
	// Bounds: x=1..30, y=1..30, corner radius=6
	fillRoundedRect(&img, 1, 30, 1, 30, 6, bgDark)

	// Subtle 1px inner highlight on top-left for depth
	drawHLine(&img, 2, 28, 2, bgEdge)
	drawVLine(&img, 2, 2, 28, bgEdge)

	// ── Step 3: Draw the play triangle "▶" ──
	// A right-pointing triangle: flat left edge, pointed right tip.
	// Bounding box: y=[9,23], left x=11, right tip x=23
	//
	//     (11,9)
	//        *──────────────────▶ (23,16)  tip
	//        *──────────────────▶
	//     (11,23)
	//
	triTop := 9
	triMid := 16
	triBot := 23
	triLeft := 11
	triRight := 23

	for y := triTop; y <= triBot; y++ {
		var rightX int
		if y <= triMid {
			// Upper half: right edge slopes from left→right tip
			dy := y - triTop
			rightX = triLeft + dy*(triRight-triLeft)/(triMid-triTop)
		} else {
			// Lower half: right edge slopes from right tip→left
			dy := y - triMid
			rightX = triRight - dy*(triRight-triLeft)/(triBot-triMid)
		}
		for x := triLeft; x <= rightX; x++ {
			if inBounds(x, y) {
				img[y][x] = cyan
			}
		}
	}

	// ── Step 4: Write to BGRA buffer (bottom-to-top scan order) ──
	for y := 0; y < size; y++ {
		row := size - 1 - y // BMP rows are stored bottom-first
		for x := 0; x < size; x++ {
			off := (row*size + x) * 4
			c := img[y][x]
			pix[off+0] = c.b // Blue
			pix[off+1] = c.g // Green
			pix[off+2] = c.r // Red
			pix[off+3] = 0   // Alpha (ignored for ICO)
		}
	}
}

// ── Drawing helpers ──

func inBounds(x, y int) bool {
	return x >= 0 && x < 32 && y >= 0 && y < 32
}

// fillRoundedRect fills a rectangle with rounded corners.
// x1,y1 is top-left, x2,y2 is bottom-right (inclusive), r is corner radius.
func fillRoundedRect(img *[32][32]rgb, x1, x2, y1, y2, r int, c rgb) {
	for y := y1; y <= y2; y++ {
		for x := x1; x <= x2; x++ {
			if isCornerClipped(x, y, x1, y1, x2, y2, r) {
				continue
			}
			if inBounds(x, y) {
				img[y][x] = c
			}
		}
	}
}

// isCornerClipped returns true when (x,y) falls within one of the four
// clipped corner quadrants and is outside the corner arc (circle test).
func isCornerClipped(x, y, x1, y1, x2, y2, r int) bool {
	switch {
	// Top-left corner
	case x < x1+r && y < y1+r:
		dx, dy := x-(x1+r-1), y-(y1+r-1)
		return dx*dx+dy*dy >= r*r
	// Top-right corner
	case x > x2-r && y < y1+r:
		dx, dy := x-(x2-r+1), y-(y1+r-1)
		return dx*dx+dy*dy >= r*r
	// Bottom-left corner
	case x < x1+r && y > y2-r:
		dx, dy := x-(x1+r-1), y-(y2-r+1)
		return dx*dx+dy*dy >= r*r
	// Bottom-right corner
	case x > x2-r && y > y2-r:
		dx, dy := x-(x2-r+1), y-(y2-r+1)
		return dx*dx+dy*dy >= r*r
	}
	return false
}

// drawHLine draws a horizontal line from (x1,y) to (x2,y) inclusive.
func drawHLine(img *[32][32]rgb, x1, x2, y int, c rgb) {
	for x := x1; x <= x2; x++ {
		if inBounds(x, y) {
			img[y][x] = c
		}
	}
}

// drawVLine draws a vertical line from (x,y1) to (x,y2) inclusive.
func drawVLine(img *[32][32]rgb, x, y1, y2 int, c rgb) {
	for y := y1; y <= y2; y++ {
		if inBounds(x, y) {
			img[y][x] = c
		}
	}
}
