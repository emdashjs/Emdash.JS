const timings = new WeakMap<Request, ServerTiming>();

export class ServerTiming {
  #measures = new Map<string, TimingMeasure>();

  start(name: string): TimingMeasure {
    let measure = this.#measures.get(name);
    if (!measure) {
      measure = new TimingMeasure(name);
      this.#measures.set(name, measure);
    }
    return measure;
  }

  finish(name: string): void {
    this.#measures.get(name)?.finish();
  }

  toString(): string {
    if (this.#measures.size === 0) {
      return "noMetrics";
    }
    return Array.from(this.#measures.values(), (measure) => measure.toString())
      .join(", ");
  }

  static get(request: Request) {
    let timing = timings.get(request);
    if (!timing) {
      timing = new ServerTiming();
      timings.set(request, timing);
    }
    return timing;
  }

  static toString(request: Request): string {
    return ServerTiming.get(request).toString();
  }
}

export class TimingMeasure {
  name: string;
  start: number;
  end: number;

  constructor(name: string) {
    this.start = performance.now();
    this.end = NaN;
    this.name = name;
  }

  get duration(): number {
    if (Number.isNaN(this.end)) {
      return (this.end = performance.now()) - this.start;
    }
    return this.end - this.start;
  }

  finish() {
    this.end = performance.now();
  }

  toString(): string {
    return `${this.name};dur=${this.duration}`;
  }
}
