import "react";

interface ModelViewerElement extends HTMLElement {
  toBlob(options: { idealAspect: boolean }): Promise<Blob>;
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<React.HTMLAttributes<ModelViewerElement>, ModelViewerElement> & {
        src?:                 string;
        alt?:                 string;
        "auto-rotate"?:       boolean | string;
        "camera-controls"?:   boolean | string;
        "shadow-intensity"?:  string;
        "environment-image"?: string;
        exposure?:            string;
      };
    }
  }
}
