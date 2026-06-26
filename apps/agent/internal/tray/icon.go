package tray

import "encoding/binary"

// ── Color palette ──

type rgb struct{ r, g, b byte }

var (
	bgColor       = rgb{42, 45, 53}  // dark charcoal
	bodyColor     = rgb{55, 65, 81}  // dark blue-gray body
	bodyLight     = rgb{75, 85, 105} // lighter body edge
	dpadColor     = rgb{160, 170, 185} // silver dpad
	dpadCenter    = rgb{200, 205, 215} // dpad center highlight
	btnGreen      = rgb{76, 175, 80}   // A button
	btnRed        = rgb{244, 67, 54}   // B button
	btnBlue       = rgb{33, 150, 243}  // X button
	btnYellow     = rgb{255, 235, 59}  // Y button
	gripColor     = rgb{45, 55, 72}   // grip darker shade
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

	// ICO Header
	binary.LittleEndian.PutUint16(buf[pos:], 0); pos += 2
	binary.LittleEndian.PutUint16(buf[pos:], 1); pos += 2
	binary.LittleEndian.PutUint16(buf[pos:], 1); pos += 2

	// Directory Entry
	buf[pos] = size; pos++
	buf[pos] = size; pos++
	buf[pos] = 0; pos++
	buf[pos] = 0; pos++
	binary.LittleEndian.PutUint16(buf[pos:], 1); pos += 2
	binary.LittleEndian.PutUint16(buf[pos:], bpp); pos += 2
	binary.LittleEndian.PutUint32(buf[pos:], uint32(imageSize)); pos += 4
	binary.LittleEndian.PutUint32(buf[pos:], 6+16); pos += 4

	// BITMAPINFOHEADER
	binary.LittleEndian.PutUint32(buf[pos:], 40); pos += 4
	binary.LittleEndian.PutUint32(buf[pos:], size); pos += 4
	binary.LittleEndian.PutUint32(buf[pos:], size*2); pos += 4
	binary.LittleEndian.PutUint16(buf[pos:], 1); pos += 2
	binary.LittleEndian.PutUint16(buf[pos:], bpp); pos += 2
	binary.LittleEndian.PutUint32(buf[pos:], 0); pos += 4
	binary.LittleEndian.PutUint32(buf[pos:], 0); pos += 4
	pos += 16

	// Pixel data
	drawGamepad(buf[pos:pos+pixelBytes], size)

	return buf
}

// drawGamepad renders a game controller icon into the BGRA pixel buffer.
func drawGamepad(pix []byte, size int) {
	cx, cy := size/2, size/2

	// Build a 32x32 pixel map in memory, then write to BGRA buffer.
	// We use a [32][32]rgb array for easy pixel-level drawing.
	var img [32][32]rgb

	// ── Background fill ──
	for y := 0; y < size; y++ {
		for x := 0; x < size; x++ {
			img[y][x] = bgColor
		}
	}

	// ── Draw gamepad body (rounded rectangle) ──
	// Body occupies roughly x=3..28, y=5..26
	drawRoundedRect(&img, 3, 5, 26, 27, 4, bodyColor)

	// Body inner highlight
	drawRoundedRect(&img, 4, 6, 25, 21, 3, bodyLight)
	drawRoundedRect(&img, 5, 7, 24, 20, 2, bodyColor)

	// ── Draw grips (two smaller rounded rects at bottom) ──
	drawRoundedRect(&img, 6, 22, 12, 27, 3, gripColor)
	drawRoundedRect(&img, 19, 22, 26, 27, 3, gripColor)

	// ── Draw D-pad (left side, center area) ──
	// Cross shape centered at (11, 14)
	dpadX, dpadY := 10, 13
	// Horizontal bar
	for y := dpadY - 1; y <= dpadY+1; y++ {
		for x := dpadX - 3; x <= dpadX+3; x++ {
			if inBounds(x, y) { img[y][x] = dpadColor }
		}
	}
	// Vertical bar
	for y := dpadY - 3; y <= dpadY+3; y++ {
		for x := dpadX - 1; x <= dpadX+1; x++ {
			if inBounds(x, y) { img[y][x] = dpadColor }
		}
	}
	// Center highlight
	for y := dpadY - 1; y <= dpadY+1; y++ {
		for x := dpadX - 1; x <= dpadX+1; x++ {
			if inBounds(x, y) { img[y][x] = dpadCenter }
		}
	}

	// ── Draw action buttons (right side) ──
	// 4 small circles in diamond layout, centered at (21, 14)
	btnCX, btnCY := 21, 14
	// Y button (top) - yellow
	fillCircle(&img, btnCX, btnCY-3, 2, btnYellow)
	// A button (bottom) - green
	fillCircle(&img, btnCX, btnCY+3, 2, btnGreen)
	// X button (left) - blue
	fillCircle(&img, btnCX-3, btnCY, 2, btnBlue)
	// B button (right) - red
	fillCircle(&img, btnCX+3, btnCY, 2, btnRed)

	// ── Draw center guide button ──
	fillCircle(&img, cx, cy, 1, rgb{180, 190, 200})

	// ── Write pixel map to BGRA buffer (bottom-to-top) ──
	for y := 0; y < size; y++ {
		row := size - 1 - y // BGRA bottom-up
		for x := 0; x < size; x++ {
			off := (row*size + x) * 4
			c := img[y][x]
			pix[off+0] = c.b // B
			pix[off+1] = c.g // G
			pix[off+2] = c.r // R
			pix[off+3] = 0   // A (ignored)
		}
	}
}

// ── Drawing helpers ──

func inBounds(x, y int) bool {
	return x >= 0 && x < 32 && y >= 0 && y < 32
}

func drawRoundedRect(img *[32][32]rgb, x1, y1, x2, y2, r int, c rgb) {
	for y := y1; y <= y2; y++ {
		for x := x1; x <= x2; x++ {
			// Skip corners for rounded effect
			if isCorner(x, y, x1, y1, x2, y2, r) {
				continue
			}
			if inBounds(x, y) {
				img[y][x] = c
			}
		}
	}
}

func isCorner(x, y, x1, y1, x2, y2, r int) bool {
	// Top-left corner
	if x < x1+r && y < y1+r {
		dx, dy := x-(x1+r-1), y-(y1+r-1)
		return dx*dx+dy*dy >= r*r
	}
	// Top-right corner
	if x > x2-r && y < y1+r {
		dx, dy := x-(x2-r+1), y-(y1+r-1)
		return dx*dx+dy*dy >= r*r
	}
	// Bottom-left corner
	if x < x1+r && y > y2-r {
		dx, dy := x-(x1+r-1), y-(y2-r+1)
		return dx*dx+dy*dy >= r*r
	}
	// Bottom-right corner
	if x > x2-r && y > y2-r {
		dx, dy := x-(x2-r+1), y-(y2-r+1)
		return dx*dx+dy*dy >= r*r
	}
	return false
}

func fillCircle(img *[32][32]rgb, cx, cy, radius int, c rgb) {
	for y := cy - radius; y <= cy+radius; y++ {
		for x := cx - radius; x <= cx+radius; x++ {
			dx, dy := x-cx, y-cy
			if dx*dx+dy*dy <= radius*radius {
				if inBounds(x, y) {
					img[y][x] = c
				}
			}
		}
	}
}
