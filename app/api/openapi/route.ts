import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new Response(null, { status: 404 });
  }

  try {
    const spec = await readFile(join(process.cwd(), "openapi.yaml"), "utf8");

    return new Response(spec, {
      status: 200,
      headers: {
        "Content-Type": "application/yaml; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json(
      {
        data: null,
        error: {
          code: "OPENAPI_LOAD_FAILED",
          message: "Could not load the OpenAPI specification.",
        },
        meta: {},
      },
      { status: 500 },
    );
  }
}
