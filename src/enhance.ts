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

const codeRegex = /```tsx|```jsx\n(.+?)```/gms;
const componentsRegex = /<([A-Z][^\s\/>]*)/gm;
const emptyLineRegex = /^\s*\n/gm;

const iconsImportTemplate = `import { $components } from "@chakra-ui/icons";`;
const reactImportTemplate = `import { $components } from "@chakra-ui/react";`;
const mdImportTemplate = `import { $components } from "react-icons/md";`;
const faImportTemplate = `import { $components } from "react-icons/fa";`;

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

  const enhanced = chakraDoc.replaceAll(codeRegex, (_, codeBlock) => {
    const components: string[] = uniq(
      [...codeBlock.matchAll(componentsRegex)].map(
        ([_, component]) => component
      )
    );

    components.forEach((c) => {
      if (c.startsWith('Fa')) faImports.add(c);
      else if (c.startsWith('Md')) mdImports.add(c);
      else if (c.endsWith('Icon')) iconImports.add(c);
      else reactImports.add(c);
    });

    return playgroundTemplate
      .replace('$code', codeBlock.replaceAll(emptyLineRegex, ''))
      .replace('$scope', components.join(', '));
  });

  const doc = `${createImportStatement(faImports, faImportTemplate)}
${createImportStatement(mdImports, mdImportTemplate)}
${createImportStatement(iconImports, iconsImportTemplate)}
${createImportStatement(reactImports, reactImportTemplate)}
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
