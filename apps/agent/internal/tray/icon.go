package tray

import "encoding/binary"

// generateICO creates a valid Windows .ico file at runtime.
// 32x32, 32bpp (BGRA), no compression — guaranteed compatible with Shell_NotifyIcon.
func generateICO() []byte {
	const size = 32
	const bpp = 32
	pixelBytes := size * size * 4  // 4096
	maskBytes := size * size / 8     // 128
	imageSize := 40 + pixelBytes + maskBytes

	buf := make([]byte, 6+16+imageSize)
	pos := 0

	// ── ICO Header (6 bytes) ──
	binary.LittleEndian.PutUint16(buf[pos:], 0)   // reserved
	pos += 2
	binary.LittleEndian.PutUint16(buf[pos:], 1)   // type = ICO
	pos += 2
	binary.LittleEndian.PutUint16(buf[pos:], 1)   // count = 1
	pos += 2

	// ── Directory Entry (16 bytes) ──
	buf[pos] = size; pos++           // width
	buf[pos] = size; pos++           // height
	buf[pos] = 0; pos++              // color palette (0 = no palette)
	buf[pos] = 0; pos++              // reserved
	binary.LittleEndian.PutUint16(buf[pos:], 1); pos += 2  // color planes
	binary.LittleEndian.PutUint16(buf[pos:], bpp); pos += 2 // bpp
	binary.LittleEndian.PutUint32(buf[pos:], uint32(imageSize)); pos += 4 // image size
	binary.LittleEndian.PutUint32(buf[pos:], 6+16); pos += 4              // image offset

	// ── BITMAPINFOHEADER (40 bytes) ──
	binary.LittleEndian.PutUint32(buf[pos:], 40); pos += 4    // header size
	binary.LittleEndian.PutUint32(buf[pos:], size); pos += 4  // width
	binary.LittleEndian.PutUint32(buf[pos:], size*2); pos += 4 // height (2x for XOR+AND)
	binary.LittleEndian.PutUint16(buf[pos:], 1); pos += 2     // planes
	binary.LittleEndian.PutUint16(buf[pos:], bpp); pos += 2   // bpp
	binary.LittleEndian.PutUint32(buf[pos:], 0); pos += 4     // compression (BI_RGB)
	binary.LittleEndian.PutUint32(buf[pos:], 0); pos += 4     // image size (can be 0 for BI_RGB)
	pos += 16 // skip xPelsPerMeter, yPelsPerMeter, colors used, colors important

	// ── Pixel Data (BGRA, bottom-to-top) ──
	drawIconPixels(buf[pos:pos+pixelBytes], size)
	pos += pixelBytes

	// ── AND Mask (all 0 = fully opaque) ──
	// Already zero in buffer

	return buf
}

// drawIconPixels fills the BGRA pixel buffer (bottom-to-top rows).
// Draws a blue-purple gradient circle with a white "G" letter.
func drawIconPixels(pix []byte, size int) {
	cx, cy := size/2, size/2
	radius := size/2 - 2

	for y := 0; y < size; y++ {
		for x := 0; x < size; x++ {
			// BGRA bottom-to-top: row index = (size-1-y)
			row := size - 1 - y
			off := (row*size + x) * 4

			dx, dy := x-cx, y-cy
			dist2 := dx*dx + dy*dy

			var r, g, b byte
			if dist2 <= radius*radius {
				// Gradient circle: blue → purple
				t := float64(x+y) / float64(size*2)
				r = byte(60 + int(160*t))
				g = byte(70 + int(80*t))
				b = byte(210 - int(60*t))
			} else {
				// Dark background
				r, g, b = 40, 44, 52
			}

			// Check if this pixel is part of the "G" letter
			if isGLetter(x, y, cx, cy) {
				r, g, b = 255, 255, 255
			}

			pix[off+0] = b // B
			pix[off+1] = g // G
			pix[off+2] = r // R
			pix[off+3] = 0 // A (ignored for ICO)
		}
	}
}

// isGLetter returns true if (x,y) is part of the white "G" letter pattern.
// Pattern is 13 wide x 15 tall, centered at (cx, cy).
func isGLetter(x, y, cx, cy int) bool {
	// "G" pattern
	pattern := []string{
		"    XXXXXXX    ",
		"   XX     XX   ",
		"  XX       XX  ",
		" XX           ",
		" XX           ",
		" XX    XXXXX  ",
		" XX       XX  ",
		" XX       XX  ",
		" XX        XX ",
		"  XX      XX  ",
		"   XX    XX   ",
		"    XX  XX    ",
		"     XXXXX    ",
		"         XX   ",
		"          XX  ",
	}

	startX := cx - 6
	startY := cy - 7

	row := y - startY
	col := x - startX
	if row < 0 || row >= len(pattern) {
		return false
	}
	line := pattern[row]
	if col < 0 || col >= len(line) {
		return false
	}
	return line[col] == 'X'
}
