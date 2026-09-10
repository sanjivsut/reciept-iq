/* Rasterizes the committed SVG sources into the PNG / ICO / WebP assets the app
 * and PWA manifest need. Run with: npm run build:assets
 *
 * Sources (edit these, not the outputs):
 *   public/icon.svg            -> public/icons/icon-192.png, icon-512.png,
 *                                 public/apple-icon.png, app/favicon.ico
 *   scripts/og-template.svg    -> public/og/receiptiq-og-image.webp (+ .png)
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const root = path.resolve(import.meta.dirname, "..");
const p = (...s) => path.join(root, ...s);

async function main() {
  await mkdir(p("public/icons"), { recursive: true });
  await mkdir(p("public/og"), { recursive: true });

  const iconSvg = await readFile(p("public/icon.svg"));
  const render = (size) =>
    sharp(iconSvg, { density: 384 })
      .resize(size, size, { fit: "contain", background: "#FBF7EE" })
      .flatten({ background: "#FBF7EE" })
      .png();

  await render(192).toFile(p("public/icons/icon-192.png"));
  await render(512).toFile(p("public/icons/icon-512.png"));
  await render(180).toFile(p("public/apple-icon.png"));

  const icoSizes = await Promise.all(
    [16, 32, 48].map((s) => render(s).toBuffer()),
  );
  await writeFile(p("app/favicon.ico"), await pngToIco(icoSizes));

  const ogSvg = await readFile(p("scripts/og-template.svg"));
  const og = sharp(ogSvg, { density: 144 }).resize(1200, 630);
  await og.clone().webp({ quality: 88 }).toFile(p("public/og/receiptiq-og-image.webp"));
  await og.clone().png().toFile(p("public/og/receiptiq-og-image.png"));

  console.log("assets generated:");
  console.log("  public/icons/icon-192.png, icon-512.png");
  console.log("  public/apple-icon.png");
  console.log("  app/favicon.ico");
  console.log("  public/og/receiptiq-og-image.webp (+ .png)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
