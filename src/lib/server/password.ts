import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const KEY_LEN = 64;

export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(16);
	const key = (await scrypt(password, salt, KEY_LEN)) as Buffer;
	return `${salt.toString('hex')}:${key.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const [saltHex, hashHex] = stored.split(':');
	if (!saltHex || !hashHex) return false;
	const expected = Buffer.from(hashHex, 'hex');
	const salt = Buffer.from(saltHex, 'hex');
	const key = (await scrypt(password, salt, expected.length)) as Buffer;
	if (key.length !== expected.length) return false;
	return timingSafeEqual(key, expected);
}
