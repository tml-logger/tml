export class RingBuffer<T> {
  private items: T[] = [];
  private max: number;

  constructor(max: number) {
    if (!Number.isInteger(max) || max <= 0) {
      throw new TypeError('RingBuffer max must be a positive integer');
    }
    this.max = max;
  }

  push(value: T): void {
    this.items.push(value);
    if (this.items.length > this.max) {
      this.items.splice(0, this.items.length - this.max);
    }
  }

  values(): T[] {
    return [...this.items];
  }

  clear(): void {
    this.items.length = 0;
  }
}
