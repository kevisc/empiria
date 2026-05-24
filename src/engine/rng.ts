/**
 * MT19937 Mersenne Twister — the same RNG family Empiria's VCV Rack suite
 * used, reimplemented in TypeScript so a patch reproduces byte-identically
 * in any browser on any OS. Never use Math.random(): it is not seedable and
 * not reproducible across engines, which would break the whole
 * shareable-artifact story.
 */
export class MT19937 {
  private mt = new Uint32Array(624);
  private index = 624;

  constructor(seed = 5489) {
    this.seed(seed);
  }

  seed(s: number): void {
    this.mt[0] = s >>> 0;
    for (let i = 1; i < 624; i++) {
      const prev = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
      this.mt[i] = (Math.imul(1812433253, prev) + i) >>> 0;
    }
    this.index = 624;
  }

  private generate(): void {
    for (let i = 0; i < 624; i++) {
      const y =
        ((this.mt[i] & 0x80000000) | (this.mt[(i + 1) % 624] & 0x7fffffff)) >>> 0;
      let next = this.mt[(i + 397) % 624] ^ (y >>> 1);
      if (y & 1) next ^= 0x9908b0df;
      this.mt[i] = next >>> 0;
    }
    this.index = 0;
  }

  /** Next 32-bit unsigned integer. */
  u32(): number {
    if (this.index >= 624) this.generate();
    let y = this.mt[this.index++];
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    return y >>> 0;
  }

  /** Uniform double in [0, 1). */
  random(): number {
    return this.u32() * (1 / 4294967296);
  }
}
