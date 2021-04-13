export type Doc = {
  name: string;

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

  constructor(name: string, folder: string) {
    this.name = name;
    this.folder = folder;
  };
}
