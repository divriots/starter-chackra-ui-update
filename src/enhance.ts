import 'core-js/stable';
import 'regenerator-runtime/runtime';
import { uniq } from 'lodash';
import { Doc } from './types';

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
const componentsRegex = /<([A-Z][^\s\/>]*)|<(chakra)|([ ]use[A-Z][^\s\`"(]*)/gm;
const emptyLineRegex = /^\s*\n/gm;

const iconsImportTemplate = `import { $components } from "@chakra-ui/icons";`;
const reactImportTemplate = `import { $components } from "@chakra-ui/react";`;
const mdImportTemplate = `import { $components } from "react-icons/md";`;
const faImportTemplate = `import { $components } from "react-icons/fa";`;
const spinnerImportTemplate = `import { $components } from "react-spinners";`;

const specificReactComponents = new Set<string>(['AlertIcon']);
const specificIconComponents = new Set<string>([]);
const specificFaComponents = new Set<string>([]);
const specificMdComponents = new Set<string>([]);
const specificSpinnerComponents = new Set<string>([]);

const supportedHooksList = ['useToken', 'useTheme', 'usePrefersReducedMotion', 'useDisclosure', 'useOutsideClick',
  'useMediaQuery', 'useDisclosure', ' useControllableProp', 'useControllableState', 'useClipboard', 'useBreakpointValue'];

const ignoredComponentList = ['ComponentLinks', 'carbon-ad'];
const ignoredComponentsRegex = ignoredComponentList.map(
  name => selfAndNormalClosingTag.replaceAll('$name', name)
).join('|');

const isIconImport = (name: string) =>
  name.endsWith('Icon') &&
  !specificSpinnerComponents.has(name) &&
  !specificReactComponents.has(name) &&
  !specificFaComponents.has(name) &&
  !specificMdComponents.has(name);

const isMdImport = (name: string) =>
  name.startsWith('Md') &&
  !specificSpinnerComponents.has(name) &&
  !specificReactComponents.has(name) &&
  !specificFaComponents.has(name) &&
  !specificIconComponents.has(name);

const isFaImport = (name: string) =>
  name.startsWith('Fa') &&
  !specificSpinnerComponents.has(name) &&
  !specificReactComponents.has(name) &&
  !specificMdComponents.has(name) &&
  !specificIconComponents.has(name);

const isSpinnerImport = (name: string) =>
  name.endsWith('Loader') &&
  !specificReactComponents.has(name) &&
  !specificFaComponents.has(name) &&
  !specificMdComponents.has(name) &&
  !specificIconComponents.has(name);

const isChakraImport = (name: string) => name === chakraImport;

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

export const enhanceDoc = (chakraDoc: string = ''): Promise<string> => {
  const mdImports = new Set<string>();
  const faImports = new Set<string>();
  const iconImports = new Set<string>();
  const reactImports = new Set<string>();
  const spinnerImports = new Set<string>();

  const enhanced = chakraDoc.replace(
    headerRegex, (headerBlock) => headerBlock && `# ${headerBlock.match(componentNameRegex)}`
  ).replaceAll(new RegExp(ignoredComponentsRegex, 'gmi'), ''
  ).replaceAll(codeRegex, (_, codeBlock) => {
    const components: string[] = uniq(
      [...codeBlock.matchAll(componentsRegex)].map(
        ([_, component, chakraMatch, hookMatch]) => {
          return component || chakraMatch || hookMatch;
        }
      )
    );

    components.forEach((c) => {
      if (isFaImport(c)) faImports.add(c);
      else if (isMdImport(c)) mdImports.add(c);
      else if (isIconImport(c)) iconImports.add(c);
      else if (isSpinnerImport(c)) spinnerImports.add(c);
      else if (isChakraImport(c) || isHookImport(c)) reactImports.add(c);
      else if (isReactImport(c)) reactImports.add(c);
    });

    return playgroundTemplate
      .replace('$code', codeBlock.replaceAll(emptyLineRegex, ''))
      .replace('$scope', components.join(', '));
  });

  const doc = `${createImportStatement(faImports, faImportTemplate)}
${createImportStatement(mdImports, mdImportTemplate)}
${createImportStatement(iconImports, iconsImportTemplate)}
${createImportStatement(reactImports, reactImportTemplate)}
${createImportStatement(spinnerImports, spinnerImportTemplate)}
${importHeaders}\n${enhanced}`.trim();

  return Promise.resolve(doc);
};

export const enhance = async (docsMap: Doc[]): Promise<Doc[]> =>
  Promise.all(
    docsMap.map(async (doc: Doc) => ({
      dsdDoc: await enhanceDoc(doc.chakraDoc),
      ...doc,
    }))
  );
