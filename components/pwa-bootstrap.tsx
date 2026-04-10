"use client";

import * as React from "react";

export function PwaBootstrap() {
  React.useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js");
  }, []);

  return null;
}
