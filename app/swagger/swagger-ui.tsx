"use client";

import { useCallback, useRef } from "react";
import Script from "next/script";
import "swagger-ui-react/swagger-ui.css";

type SwaggerUiBundle = ((config: Record<string, unknown>) => void) & {
  presets: {
    apis: unknown;
  };
};

declare global {
  interface Window {
    SwaggerUIBundle?: SwaggerUiBundle;
    SwaggerUIStandalonePreset?: unknown;
  }
}

const SWAGGER_DOM_ID = "swagger-ui";

export function SwaggerViewer() {
  const initializedRef = useRef(false);

  const initializeSwagger = useCallback(() => {
    if (initializedRef.current || typeof window === "undefined") {
      return;
    }

    const SwaggerUIBundle = window.SwaggerUIBundle;

    if (!SwaggerUIBundle) {
      return;
    }

    initializedRef.current = true;

    SwaggerUIBundle({
      url: "/api/openapi",
      dom_id: `#${SWAGGER_DOM_ID}`,
      presets: [
        SwaggerUIBundle.presets.apis,
        window.SwaggerUIStandalonePreset,
      ].filter(Boolean),
      layout: "BaseLayout",
      docExpansion: "list",
      displayRequestDuration: true,
      defaultModelsExpandDepth: 2,
    });
  }, []);

  return (
    <>
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div id={SWAGGER_DOM_ID} className="min-h-[70vh]" />
      </div>

      <Script
        src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"
        strategy="afterInteractive"
        onLoad={initializeSwagger}
      />
      <Script
        src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"
        strategy="afterInteractive"
        onLoad={initializeSwagger}
      />
    </>
  );
}
