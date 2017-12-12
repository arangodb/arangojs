export default function(str: string) {
  return Buffer.from(str).toString("base64");
}
