import 'core-js/stable';
import 'regenerator-runtime/runtime';
import fetch from 'node-fetch';
import docsMap from './docs-map';

console.log('updating...');

const chakraBaseUrl =
  'https://raw.githubusercontent.com/chakra-ui/chakra-ui/main';

const update = async () => {
  await Promise.all(
    docsMap.map(async (doc) => {
      try {
        const response = await fetch(`${chakraBaseUrl}${doc.chakra}`);
        console.log(await response.text());
      } catch (error) {
        console.log(error.response.body);
      }
    })
  );
};

update().then(() => console.log('updated!'));
