import { it, expect } from "vitest";
import { mkdtemp, readFile, writeFile, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { parse } from "dotenv";
import { updateEnvFile } from "../scripts/env-file.js";
it("yerel başlatma Supabase bağlantısını ve diğer yapılandırmayı korur", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "saha-env-test-"));
  try {
    const file = path.join(dir, ".env");
    await writeFile(
      file,
      '# custom config\nDATABASE_URL="local-old"\nSUPABASE_DATABASE_URL="remote-preserve"\nVITE_MAP_ATTRIBUTION="Özel atıf"\n',
    );
    await updateEnvFile(file, { DATABASE_URL: "local-new", PORT: "3001" });
    const text = await readFile(file, "utf8"),
      env = parse(text);
    expect(env.DATABASE_URL).toBe("local-new");
    expect(env.SUPABASE_DATABASE_URL).toBe("remote-preserve");
    expect(env.VITE_MAP_ATTRIBUTION).toBe("Özel atıf");
    expect(text).toContain("# custom config");
  } finally {
    await unlink(path.join(dir, ".env"));
    await rmdir(dir);
  }
});
