export class FakeConn implements Deno.Conn {
  static rid = 0;
  localAddr: Deno.Addr;
  remoteAddr: Deno.Addr;
  rid: number;
  constructor(
    remoteAddr: Deno.NetAddr,
    localAddr?: Omit<Deno.NetAddr, "transport"> & {
      transport?: Deno.NetAddr["transport"];
    },
  ) {
    this.remoteAddr = remoteAddr;
    this.localAddr = {
      hostname: "127.0.0.1",
      port: 8000,
      ...localAddr,
      transport: localAddr?.transport ?? "tcp",
    };
    this.rid = FakeConn.rid++;
  }
  closeWrite(): Promise<void> {
    throw new Error("Method not implemented in class FakeConn.");
  }
  ref(): void {
    throw new Error("Method not implemented in class FakeConn.");
  }
  unref(): void {
    throw new Error("Method not implemented in class FakeConn.");
  }
  get readable(): ReadableStream<Uint8Array> {
    throw new Error("Property not implemented in class FakeConn.");
  }
  get writable(): WritableStream<Uint8Array> {
    throw new Error("Property not implemented in class FakeConn.");
  }
  read(_p: Uint8Array): Promise<number | null> {
    throw new Error("Method not implemented in class FakeConn.");
  }
  write(_p: Uint8Array): Promise<number> {
    throw new Error("Method not implemented in class FakeConn.");
  }
  close(): void {
    throw new Error("Method not implemented in class FakeConn.");
  }
}
