import { camelCase, capitalize } from "lodash";

export type Doc = {
  dsd: string;
  dsdDoc?: string;

  chakra: string;
  chakraDoc?: string;

  tsx?: string;        // src/[name].tsx
  indexTs?: string;    // src/index.ts
  indexJs?: string;    // /index.js
};

export class ComponentMeta {
  name: string;
  folder: string;

  constructor(folder: string) {
    this.name = capitalize(camelCase(folder));
    this.folder = folder;
  };
}
