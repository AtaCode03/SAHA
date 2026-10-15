import { readFile, writeFile } from "node:fs/promises";
/** Preserve unrelated integrations and comments; never print secret values. */
export async function updateEnvFile(
  file: string,
  changes: Record<string, string>,
) {
  let text = await readFile(file, "utf8").catch((e: NodeJS.ErrnoException) => {
    if (e.code === "ENOENT") return "";
    throw e;
  });
  for (const [key, value] of Object.entries(changes)) {
    if (!/^[A-Z][A-Z0-9_]*$/.test(key))
      throw Error("Geçersiz ortam değişkeni adı.");
    const line = key + "=" + JSON.stringify(value),
      pattern = new RegExp("^" + key + "=.*$", "m");
    text = pattern.test(text)
      ? text.replace(pattern, () => line)
      : text.replace(/\s*$/, "") + "\n" + line + "\n";
  }
  await writeFile(file, text, { mode: 0o600 });
}
