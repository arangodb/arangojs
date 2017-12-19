export function btoa(str: string) {
  return Buffer.from(str).toString("base64");
}
