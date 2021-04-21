import 'core-js/stable';
import 'regenerator-runtime/runtime';
import { uniq } from 'lodash';
import { Doc, ComponentMeta } from './types';
import { generateFilename } from './utils';

const importHeaders = `import React from 'react';
import { mdx } from '@mdx-js/react';
import { Playground } from '@divriots/dockit-react/playground';
import Layout from '~/doc-layout';
export default Layout;
`;

const playgroundTemplate = `<Playground
scope={{ $scope }}
code={\`
$code\`}
/>`;

const chakraImport = `chakra`;

const headerRegex = /---[^]*?(---)/;
const componentNameRegex = /(?<=title:).*/g;
const selfAndNormalClosingTag = `<$name[^]*?(\\/>|<\\/$name>)`;
const codeRegex = /```tsx|```jsx\n(.+?)```/gms;
const chapterSelection = `^\#{$h}.$name(?:(?!\#{$h}).)*(?:(?!\#{$h}).)*`;
const componentsRegex = /<([A-Z][^\s\/>]*)|<(chakra)|[ ](use[A-Z][^\s\`"(]*)|as={([A-Za-z]*)}/gm;
const stringManipulationRegex = /(`.*\${.*}.*?`)/gm;
const interpolatedValueRegex = /\${(.*?)}/gm;
const emptyLineRegex = /^\s*\n/gm;

const localImportTemplate = `import { $name } from "~/$dsd";`;
const iconsImportTemplate = `import { $components } from "@chakra-ui/icons";`;
const reactImportTemplate = `import { $components } from "@chakra-ui/react";`;
const mdImportTemplate = `import { $components } from "react-icons/md";`;
const faImportTemplate = `import { $components } from "react-icons/fa";`;
const aiImportTemplate = `import { $components } from "react-icons/ai";`;
const spinnerImportTemplate = `import { $components } from "react-spinners";`;

const specificReactComponents = new Set<string>(['AlertIcon', 'Icon', 'ListIcon', 'AccordionIcon', 'TagLeftIcon', 'TagRightIcon']);
const specificIconComponents = new Set<string>([]);
const specificFaComponents = new Set<string>([]);
const specificMdComponents = new Set<string>([]);
const specificAiComponents = new Set<string>([]);
const specificSpinnerComponents = new Set<string>([]);

const supportedHooksList = ['useToken', 'useTheme', 'usePrefersReducedMotion', 'useDisclosure', 'useOutsideClick',
  'useMediaQuery', 'useDisclosure', ' useControllableProp', 'useControllableState', 'useClipboard', 'useBreakpointValue'];

const ignoredComponentList = ['ComponentLinks', 'carbon-ad'];
const ignoredComponentsRegex = ignoredComponentList.map(
  name => selfAndNormalClosingTag.replaceAll('$name', name)
).join('|');

const ignoredChapterList = [
  { h: 2, name: 'Props' },
  { h: 3, name: 'Usage with Form Libraries' },
  { h: 3, name: 'Using the `Icon` component' },
  { h: 3, name: 'Creating custom tab components' },
  { h: 4, name: 'Custom Radio Buttons' },
];
const ignoredChapterListRegex = ignoredChapterList.map(
  chapter => chapterSelection
    .replaceAll('$name', chapter.name.trim().replaceAll(' ', '.'))
    .replaceAll('$h', chapter.h.toString())
).join('|');

const isIconImport = (name: string) =>
  name.endsWith('Icon') &&
  !specificSpinnerComponents.has(name) &&
  !specificReactComponents.has(name) &&
  !specificFaComponents.has(name) &&
  !specificMdComponents.has(name) &&
  !specificAiComponents.has(name);

const isMdImport = (name: string) =>
  name.startsWith('Md') &&
  !specificSpinnerComponents.has(name) &&
  !specificReactComponents.has(name) &&
  !specificFaComponents.has(name) &&
  !specificIconComponents.has(name) &&
  !specificAiComponents.has(name);

const isAiImports = (name: string) =>
  name.startsWith('Ai') &&
  !specificSpinnerComponents.has(name) &&
  !specificReactComponents.has(name) &&
  !specificMdComponents.has(name) &&
  !specificFaComponents.has(name) &&
  !specificIconComponents.has(name);

const isFaImport = (name: string) =>
  name.startsWith('Fa') &&
  !specificSpinnerComponents.has(name) &&
  !specificReactComponents.has(name) &&
  !specificMdComponents.has(name) &&
  !specificIconComponents.has(name) &&
  !specificAiComponents.has(name);

const isSpinnerImport = (name: string) =>
  name.endsWith('Loader') &&
  !specificReactComponents.has(name) &&
  !specificFaComponents.has(name) &&
  !specificMdComponents.has(name) &&
  !specificIconComponents.has(name) &&
  !specificAiComponents.has(name);

const isChakraImport = (name: string) => name === chakraImport;

const isTagImport = (name: string) => name.startsWith('Tag');

const isHookImport = (name: string) => supportedHooksList.includes(name);

const isReactImport = (name: string) => true;

const createImportStatement = (
  componentSet: Set<string>,
  template: string
): string => {
  const components = [...componentSet.values()];
  return components.length
    ? template.replace('$components', components.join(', '))
    : '';
};

const createLocalImportStatement = (
  componentsSet: Set<ComponentMeta>,
): string => [...componentsSet.values()].map(
  c => `${localImportTemplate
    .replace('$name', c.name)
    .replace('$dsd', c.folder)}`
).join('\n');

const formatH1ComponentTitle = (headerBlock: string) =>
  headerBlock && `# ${headerBlock.match(componentNameRegex)}`.replaceAll('"', '')

export const enhanceDoc = (
  chakraDoc: string = '',
  docsMapMeta: ComponentMeta[]
): Promise<string> => {
  const mdImports = new Set<string>();
  const aiImports = new Set<string>();
  const faImports = new Set<string>();
  const iconImports = new Set<string>();
  const reactImports = new Set<string>();
  const spinnerImports = new Set<string>();
  const localImports = new Set<ComponentMeta>();

  const enhanced = chakraDoc.replace(headerRegex, (headerBlock) => formatH1ComponentTitle(headerBlock)
  ).replaceAll(new RegExp(ignoredComponentsRegex, 'gmi'), ''
  ).replaceAll(new RegExp(ignoredChapterListRegex, 'gms'), ''
  ).replaceAll(stringManipulationRegex, (_, stringInterpolation) => {
    if (stringInterpolation) {
      // used for: `some ${string} interpolation` => 'some ' + string + interpolation'
      return stringInterpolation
        .replaceAll('`', '\'')
        .replaceAll(interpolatedValueRegex, (_: string, match: string) => {
          return `' + ${match} + '`;
        });
    }
  }
  ).replaceAll(codeRegex, (_, codeBlock) => {
    const components: string[] = uniq(
      [...codeBlock.matchAll(componentsRegex)].map(
        ([_, component, chakraMatch, hookMatch, asUsageMatch]) => {
          return component || chakraMatch || hookMatch || asUsageMatch;
        }
      )
    );

    components.forEach((c) => {
      const docMeta = docsMapMeta.find(com => com.name === c);
      if (docMeta) localImports.add(docMeta);
      else if (isFaImport(c)) faImports.add(c);
      else if (isMdImport(c)) mdImports.add(c);
      else if (isAiImports(c)) aiImports.add(c);
      else if (isIconImport(c)) iconImports.add(c);
      else if (isSpinnerImport(c)) spinnerImports.add(c);
      else if (isTagImport(c) || isChakraImport(c) || isHookImport(c)
        || isReactImport(c)) reactImports.add(c);
    });

    return playgroundTemplate
      .replace('$code', codeBlock.replaceAll(emptyLineRegex, '').replaceAll('`', '\\`'))
      .replace('$scope', components.join(', '));
  });

  const doc = `${createImportStatement(faImports, faImportTemplate)}
${createImportStatement(mdImports, mdImportTemplate)}
${createImportStatement(aiImports, aiImportTemplate)}  
${createImportStatement(iconImports, iconsImportTemplate)}
${createImportStatement(reactImports, reactImportTemplate)}
${createLocalImportStatement(localImports)}
${createImportStatement(spinnerImports, spinnerImportTemplate)}
${importHeaders}\n${enhanced}`.trim();

  return Promise.resolve(doc);
};

// /src/[name].tsx
export const getComponentTsxContent = (name: string = ''): string => {
  return `export { ${name} } from '@chakra-ui/react';`;
}

// /src/index.ts
export const getIndexTsContent = (name: string = ''): string => {
  return `export * from './${name}';`;
}

// /index.js
export const getIndexJsContent = (): string => {
  return `export * from './src/index';`;
}

export const enhance = async (docsMap: Doc[]): Promise<Doc[]> => {
  const docsMapMeta = docsMap.map(d => new ComponentMeta(d.dsd));
  return Promise.all(
    docsMap.map(async (doc: Doc) => ({
      dsdDoc: await enhanceDoc(doc.chakraDoc, docsMapMeta),
      tsx: getComponentTsxContent(generateFilename(doc.dsd)),
      indexTs: getIndexTsContent(generateFilename(doc.dsd)),
      indexJs: getIndexJsContent(),
      ...doc,
    }))
  );
}
