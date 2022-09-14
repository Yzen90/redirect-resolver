import { argv } from 'process';
import { get } from 'http';
import { get as httpsGet } from 'https';

import prompt from 'prompt';
import colors from '@colors/colors/safe.js';


const cliArg = argv[2];
const list = (cliArg === '-l'  || cliArg === '--list');
const URLs = [];


const printList = () => {
  for (const URL of URLs) {
    console.log(URL);
  }
};

const request = (URL) => new Promise((resolve, reject) => {
  try {
    if (URL.startsWith('https')) {
      httpsGet(URL, (response) => {
        resolve(response);
      }).on('error', (error) => reject(error));
    } else {
      get(URL, (response) => {
        resolve(response);
      }).on('error', (error) => reject(error));
    }
  } catch (error) {
    reject(error);
  }
});

const getURLFromURL = (originalURL) => {
  const url = new URL(originalURL);

  for (const [_name, value] of url.searchParams.entries()) {
    if (value.includes('http') || value.includes('https')) return value;
  }

  let index = url.pathname.indexOf('http');
  if (index === -1) index = url.pathname.indexOf('https');

  if (index !== -1) return url.pathname.slice(index);

  return originalURL;
}

const follow = async (URL, first = true) => {
  try {
    const response = await request(URL);
    const location = response.headers.location;
    response.resume();

    if (typeof location === 'string') {
      const nextURL = getURLFromURL(location);
      console.log(`      ${colors.yellow('>')} ${nextURL}`);

      await follow(nextURL, false);
    } else {
      if (!first) URLs.push(URL);
      console.log(`      ${colors.yellow('>')} No redirects`);
    }
  } catch (error) {
    console.error(error.message || error);
  }
};


if (typeof cliArg === 'string' && (cliArg.startsWith('http') || cliArg.startsWith('https'))) {
  await follow(cliArg);
} else {
  console.log(`Redirect Resolver ${colors.green('Interactive Mode')}`);

  prompt.message = '';
  prompt.delimiter = colors.magenta('>');
  prompt.start();
  
  do {
    const { url } = await prompt.get({
      properties: { url: { allowEmpty: false, description: colors.blue('URL ') } }
    });

    if (url === 'exit') {
      break;
    } else if (url === 'list') {
      printList();
    } else if (url === '') {
      continue;
    } else {
      await follow(url);
    }
  } while (true);

  if (list && URLs.length > 0) {
    console.log('\nList:');
    printList();
  }
}
