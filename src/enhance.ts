import 'core-js/stable';
import 'regenerator-runtime/runtime';
import { uniq, partition } from 'lodash';
import { Doc, ComponentMeta } from './types';
import { generateFilename } from './utils';
var bluebird = require('bluebird');

const importHeaders = `import React from 'react';
import { mdx } from '@mdx-js/react';
import { Playground } from '@divriots/dockit-react/playground';
import Layout from '~/doc-layout';
export default Layout;
`;

const playgroundTemplate = `<Playground
scope={{ $scope }}$noInline
code={\`
$code\`}
/>`;

const chakraImport = `chakra`;

const headerRegex = /---[^]*?(---)/;
const renderRegex = /render\(/;
const componentNameRegex = /(?<=title:).*/g;
const selfAndNormalClosingTag = `<$name[^]*?(\\/>|<\\/$name>)`;
const codeRegex = /```tsx|```jsx[ ^live=true|manual=true]*\n(.+?)```/gms;
const chapterSelection = `^\#{$h}.$name(?:(?!\#{$h}).)*(?:(?!\#{$h}).)*`;
const componentsRegex = /<([A-Z][^\s\/>]*)|<(chakra)|[ ](use[A-Z][^\s\`"(]*)|as={([A-Za-z]*)}/gm;
const stringManipulationRegex = /(`.*\${.*}.*?`)/gm;
const interpolatedValueRegex = /\${(.*?)}/gm;
const emptyLineRegex = /^\s*\n/gm;

const localImportTemplate = `import { $name } from "~/$dsd";`;
const iconsImportTemplate = `import { $components } from "../src/index";`;
const reactImportTemplate = `import { $components } from "../src/index";`;
const mdImportTemplate = `import { $components } from "react-icons/md";`;
const faImportTemplate = `import { $components } from "react-icons/fa";`;
const aiImportTemplate = `import { $components } from "react-icons/ai";`;
const spinnerImportTemplate = `import { $components } from "react-spinners";`;
const inputInportTemplate = `\nimport { $components} from "../src/index";`;

const exportTemplate = (set: Set<string>, source: string) =>
  `export { ${Array.from(set).join(', ')} } from '${source}';\n`

const specificReactComponents = new Set<string>(['AlertIcon', 'Icon', 'ListIcon', 'AccordionIcon', 'TagLeftIcon', 'TagRightIcon']);
const specificIconComponents = new Set<string>([]);
const specificFaComponents = new Set<string>([]);
const specificMdComponents = new Set<string>([]);
const specificAiComponents = new Set<string>([]);
const specificSpinnerComponents = new Set<string>([]);

const _iconImports = new Set<string>();
const _inputImports = new Set<string>();
const _reactImports = new Set<string>();

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

const isInputImport = (name: string) => name.startsWith('Input');

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

const resetSets = () => {
  _reactImports.clear();
  _iconImports.clear();
  _inputImports.clear();
}

export const enhanceDoc = (
  chakraDoc: string = '',
  docsMapMeta: ComponentMeta[]
): Promise<string> => {
  const mdImports = new Set<string>();
  const aiImports = new Set<string>();
  const faImports = new Set<string>();
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
    const noInlineProperty = !!(`${codeBlock}`.match(renderRegex)?.input);
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
      else if (isIconImport(c)) _iconImports.add(c);
      else if (isInputImport(c)) _inputImports.add(c);
      else if (isSpinnerImport(c)) spinnerImports.add(c);
      else if (isTagImport(c) || isChakraImport(c) || isHookImport(c)
        || isReactImport(c)) _reactImports.add(c);
    });

    return playgroundTemplate
      .replace('$code', codeBlock.replaceAll(emptyLineRegex, '').replaceAll('`', '\\`'))
      .replace('$noInline', noInlineProperty ? `\nnoInline={${noInlineProperty}}` : '')
      .replace('$scope', components.join(', '));
  });

  const doc = `${createImportStatement(faImports, faImportTemplate)}
${createImportStatement(mdImports, mdImportTemplate)}
${createImportStatement(aiImports, aiImportTemplate)}  
${createImportStatement(_iconImports, iconsImportTemplate)}
${createImportStatement(_reactImports, reactImportTemplate)}
${createLocalImportStatement(localImports)}${createImportStatement(_inputImports, inputInportTemplate)}
${createImportStatement(spinnerImports, spinnerImportTemplate)}
${importHeaders}\n${enhanced}`.trim();

  return Promise.resolve(doc);
};

const importRegex = /import\s+?(?:(?:(?:[\w*\s{},]*)\s+from\s+?)|)(?:(?:"\.\.\/src.*?")|(?:'\.\.\/src.*?'))[\s]*?(?:;|$|)/g;
const themeDecoratorRegex = /import { themeDecorator } [\s\S]*?(?=;);/g;
const exportDefaultRegex = /(export default {[\s\S]*?})/g;
const decoratorsRegex = /(decorators: [\s\S]*?])/g;
const importedComponentsRegex = /{[\s\S]*?}/g;
const eachComponentRegex = /(,?[\w][\w]*),?/g;

const importThemeDecoratorLine = 'import { themeDecorator } from "../../story-layout/src/index";'
const decoratorsLine = 'decorators: [themeDecorator]';

export const enhanceStory = (
  doc: Doc,
  docsMapMeta: ComponentMeta[]
): Promise<string> => {
  const { dsd, storyDoc } = doc;
  const componentName = generateFilename(dsd);

  // replace all the import statements that includes the '../src' path
  const enhancedStory = storyDoc
    ?.replaceAll(themeDecoratorRegex, '')
    .replace(decoratorsRegex, decoratorsLine)
    .replaceAll(importRegex, (importLine, _) => {

      // sample: '{Editable, EditableInput, EditablePreview, useEditableControls}'
      const allComponentsLine = (importLine.match(importedComponentsRegex) || [])[0];
      const components = allComponentsLine && [...allComponentsLine.matchAll(eachComponentRegex)]
        .map(([_, component]) => component);

      const [selfImportComponent, others] = partition(components, (el) => el.trim() === componentName);

      const selfImport = selfImportComponent.length ? `import { ${componentName} } from "../src/index"\n` : '';
      const reactImport = others.length ? `import { ${others.join(', ')} } from "@chakra-ui/react"` : '';

      // const [local, react] = partition(docsMapMeta, (el) => {
      //   // console.log(generateFilename(el.name), '~~', others.includes(generateFilename(el.name)));
      //   return others.includes(generateFilename(el.name));
      // });

      return `${selfImport}${reactImport}`;
    })
    .replaceAll(exportDefaultRegex, (exportDefault, _) => {
      const exportLine = exportDefault.indexOf('decorators:') < 0 ? exportDefault.replace('}', `${decoratorsLine},\n}`) : exportDefault
      return `${importThemeDecoratorLine}\n\n${exportLine}`;
    })


  return Promise.resolve(enhancedStory || '');
};

// /src/[name].tsx
export const getComponentTsxContent = (name: string = ''): string => {
  return `export { ${name} } from '@chakra-ui/react';`;
}

// /src/index.ts
export const getIndexTsContent = (name: string = ''): Promise<string> => {

  const content = `export * from './${name}'\n`
    .concat(_reactImports.size ? exportTemplate(_reactImports, '@chakra-ui/react') : '')
    .concat(_iconImports.size ? exportTemplate(_iconImports, '@chakra-ui/icons') : '')
    .concat(_inputImports.size ? exportTemplate(_inputImports, '@chakra-ui/input') : '');

  return Promise.resolve(content);
}

// /index.js
export const getIndexJsContent = (): string => {
  return `export * from './src/index';`;
}

export const enhance = async (docsMap: Doc[]): Promise<Doc[]> => {
  const docsMapMeta = docsMap.map(d => new ComponentMeta(d.dsd));

  return bluebird.mapSeries(docsMap, async (doc: Doc) => {

    const dsdDocContent = await enhanceDoc(doc.chakraDoc, docsMapMeta);
    const storyDocContent = await enhanceStory(doc, docsMapMeta);
    const indexTsContent = await getIndexTsContent(generateFilename(doc.dsd));
    resetSets();

    return ({
      ...doc,
      dsdDoc: dsdDocContent,
      storyDoc: storyDocContent,
      indexTs: indexTsContent,
      indexJs: getIndexJsContent(),
      tsx: getComponentTsxContent(generateFilename(doc.dsd)),
    })
  })
}
