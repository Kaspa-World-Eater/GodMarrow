"""LSB-first bit reader and writer: the bit order of Diablo 2's DCC streams (a value's low bit is the first bit of
the lowest byte; the next value starts where the last one ended, with no byte alignment between them)."""
from __future__ import annotations


class BitReader:
    def __init__(self, data: bytes, pos: int = 0):
        self.data = data
        self.pos = pos          # in bits
        self.read = 0           # bits read since the start (or the last reset)

    def copy(self) -> "BitReader":
        return BitReader(self.data, self.pos)

    def bit(self) -> int:
        byte = self.data[self.pos >> 3] if (self.pos >> 3) < len(self.data) else 0
        v = (byte >> (self.pos & 7)) & 1
        self.pos += 1
        self.read += 1
        return v

    def bits(self, n: int) -> int:
        v = 0
        got = 0
        while got < n:
            byte = self.data[self.pos >> 3] if (self.pos >> 3) < len(self.data) else 0
            bit = self.pos & 7
            take = min(8 - bit, n - got)
            v |= ((byte >> bit) & ((1 << take) - 1)) << got
            got += take
            self.pos += take
        self.read += n
        return v

    def signed(self, n: int) -> int:
        if n == 0:
            return 0
        v = self.bits(n)
        if n == 1:
            return -v
        return v - (1 << n) if v >= 1 << (n - 1) else v

    def skip(self, n: int) -> None:
        self.pos += n
        self.read += n

    def align(self) -> None:
        self.pos = (self.pos + 7) & ~7


class BitWriter:
    def __init__(self):
        self.buf = bytearray()
        self.pos = 0            # in bits

    def bits(self, value: int, n: int) -> None:
        if n == 0:
            return
        value &= (1 << n) - 1
        while n > 0:
            if (self.pos >> 3) >= len(self.buf):
                self.buf.append(0)
            bit = self.pos & 7
            take = min(8 - bit, n)
            self.buf[self.pos >> 3] |= (value & ((1 << take) - 1)) << bit
            value >>= take
            n -= take
            self.pos += take

    def signed(self, value: int, n: int) -> None:
        if n == 0:
            return
        self.bits(value & ((1 << n) - 1), n)

    def align(self) -> None:
        self.pos = (self.pos + 7) & ~7
        while (self.pos >> 3) > len(self.buf):
            self.buf.append(0)

    def append(self, other: "BitWriter") -> None:
        """Append another writer's bits (no alignment: the next stream starts on the very next bit)."""
        r = BitReader(bytes(other.buf))
        left = other.pos
        while left > 0:
            take = min(32, left)
            self.bits(r.bits(take), take)
            left -= take

    def bytes(self) -> bytes:
        return bytes(self.buf)
