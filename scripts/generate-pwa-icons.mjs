import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const ink = [0x17, 0x14, 0x12];
const paper = [0xf4, 0xf1, 0xea];

function crc32(buf) {
	let c = ~0;
	for (const b of buf) {
		c ^= b;
		for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
	}
	return ~c >>> 0;
}

function chunk(type, data) {
	const len = Buffer.alloc(4);
	len.writeUInt32BE(data.length);
	const body = Buffer.concat([Buffer.from(type), data]);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(body));
	return Buffer.concat([len, body, crc]);
}

function png(size) {
	const raw = Buffer.alloc((size * 4 + 1) * size);
	const left = Math.round(size * 0.34);
	const top = Math.round(size * 0.22);
	const bottom = Math.round(size * 0.78);
	const stem = Math.max(2, Math.round(size * 0.07));
	const bowlRight = Math.round(size * 0.64);
	const thick = Math.max(2, Math.round(size * 0.055));
	const mid = Math.round((top + bottom) / 2);

	for (let y = 0; y < size; y++) {
		const row = y * (size * 4 + 1);
		raw[row] = 0;
		for (let x = 0; x < size; x++) {
			const offset = row + 1 + x * 4;
			const inStem = x >= left && x < left + stem && y >= top && y < bottom;
			const inTop = x >= left && x < bowlRight && y >= top && y < top + thick;
			const inMid =
				x >= left && x < bowlRight && y >= mid - Math.floor(thick / 2) && y < mid + Math.ceil(thick / 2);
			const inBowl =
				x >= bowlRight - thick && x < bowlRight && y >= top && y < mid + Math.ceil(thick / 2);
			const color = inStem || inTop || inMid || inBowl ? paper : ink;
			raw[offset] = color[0];
			raw[offset + 1] = color[1];
			raw[offset + 2] = color[2];
			raw[offset + 3] = 255;
		}
	}

	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(size, 0);
	ihdr.writeUInt32BE(size, 4);
	ihdr[8] = 8;
	ihdr[9] = 6;
	const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
	return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

mkdirSync('static/icons', { recursive: true });
writeFileSync('static/icons/icon-192.png', png(192));
writeFileSync('static/icons/icon-512.png', png(512));
