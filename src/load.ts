import 'core-js/stable';
import 'regenerator-runtime/runtime';
import fetch from 'node-fetch';
import { Doc } from './types';

const basePath = 'https://raw.githubusercontent.com/chakra-ui/chakra-ui/main';
const notFound = '404: Not Found';

const loadDoc = async (path?: string): Promise<string> => {
  try {
    const response = await fetch(`${basePath}${path}`);
    const content = await response.text();

    // don't create docs with '404 Not Found' message
    return (content === notFound) ? '' : content;

  } catch (error) {
    console.log('error loading doc for path', {
      path,
      error: error.response.body,
    });
    return '';
  }
};

export const load = async (docsMap: Doc[]): Promise<Doc[]> =>
  Promise.all(
    docsMap.map(async (doc: Doc) => {
      const storyUrl = `/packages/${doc.dsd}/stories/${doc.dsd}.stories.tsx`;
      return ({
        chakraDoc: await loadDoc(doc.chakra),
        storyDoc: await loadDoc(storyUrl),
        ...doc,
      })
    })
  );
