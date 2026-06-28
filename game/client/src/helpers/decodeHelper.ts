/**
 * Binary read/write helpers for byte-indexable buffers (Uint8Array, plain
 * number[], DataView-backed views). Little-endian throughout.
 *
 * Accepts any object that supports numeric index access and assignment so the
 * same helpers work for both server-decoded `Uint8Array` and our outgoing
 * scratch buffers (`Uint8Array` over a pre-allocated ArrayBuffer).
 */

type ByteIndexable = Uint8Array | number[] | { [index: number]: number };

const decoder = new TextDecoder("utf-8");

export function arrReadUint32(buf: ByteIndexable, offset: number): number {
  return (
    (buf[offset] |
      (buf[offset + 1] << 8) |
      (buf[offset + 2] << 16) |
      (buf[offset + 3] << 24)) >>>
    0
  );
}

export function arrReadUint16(buf: ByteIndexable, offset: number): number {
  return buf[offset] | (buf[offset + 1] << 8);
}

export function arrReadUint8(buf: ByteIndexable, offset: number): number {
  return buf[offset];
}

export function arrReadString(
  buf: Uint8Array,
  offset: number,
  length: number,
): string {
  return decoder.decode(buf.slice(offset, offset + length));
}

export function arrWriteUint16(
  buf: ByteIndexable,
  value: number,
  offset: number,
): void {
  buf[offset] = value & 0xff;
  buf[offset + 1] = value >> 8;
}

export function arrWriteInt16(
  buf: ByteIndexable,
  value: number,
  offset: number,
): void {
  const int16 = Math.floor(value);
  buf[offset] = int16 & 0xff;
  buf[offset + 1] = (int16 >> 8) & 0xff;
}

export function arrReadInt16(buf: ByteIndexable, offset: number): number {
  const value = buf[offset] | (buf[offset + 1] << 8);
  return value > 32767 ? value - 65536 : value;
}
