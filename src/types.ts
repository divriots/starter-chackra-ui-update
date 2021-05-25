import { generateFilename } from "./utils";

export type Doc = {
  dsd: string;
  dsdDoc?: string;

  story?: string;
  storyDoc?: string;

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
    this.name = generateFilename(folder);
    this.folder = folder;
  };
}

export class ChakraComponentsImports {
  components: Set<string>;
  packageName: string;

  constructor(components: Set<string>, packageName: string) {
    this.components = components;
    this.packageName = packageName;
  };
}
export class ProcessedDoc {
  content: string;
  usedComponents!: Set<ChakraComponentsImports>;

  constructor(content: string, imports: Set<ChakraComponentsImports>) {
    this.content = content;
    this.usedComponents = imports;
  }
}

