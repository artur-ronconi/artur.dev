import { NextResponse } from "next/server";

import { assertCsrf, getCurrentUser } from "@/server/auth/session";
import { uploadMedia } from "@/server/modules/media";
import { UploadError } from "@/server/storage";

export const runtime = "nodejs";

/** Authenticated image/video upload used by the admin media pickers. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Não autorizado." }, { status: 401 });
  }

  try {
    await assertCsrf(request.headers.get("x-csrf-token"));
  } catch {
    return NextResponse.json({ ok: false, message: "Requisição inválida." }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const alt = formData.get("alt");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ ok: false, message: "Nenhum arquivo enviado." }, { status: 400 });
    }

    const asset = await uploadMedia(file, typeof alt === "string" ? alt : undefined);

    return NextResponse.json({
      ok: true,
      asset: { id: asset.id, url: asset.url, alt: asset.alt, mimeType: asset.mimeType },
    });
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
    }

    console.error("[upload] falhou:", error);
    return NextResponse.json(
      { ok: false, message: "Não foi possível enviar o arquivo. Verifique a configuração de armazenamento." },
      { status: 500 },
    );
  }
}
