import { argv } from 'process';
import { get } from 'http';
import { get as httpsGet } from 'https';

import prompt from 'prompt';
import colors from '@colors/colors/safe.js';


const request = (url) => new Promise((resolve, reject) => {
  try {
    if (url.startsWith('https')) {
      httpsGet(url, (response) => {
        resolve(response);
      }).on('error', (error) => reject(error));
    } else {
      get(url, (response) => {
        resolve(response);
      }).on('error', (error) => reject(error));
    }
  } catch (error) {
    reject(error);
  }
});

const getUrlFromUrl = (originalURL) => {
  const url = new URL(originalURL);

  for (const [_name, value] of url.searchParams.entries()) {
    if (value.includes('http') || value.includes('https')) return value;
  }

  let urlIndex = url.pathname.indexOf('http');
  if (urlIndex === -1) urlIndex = url.pathname.indexOf('https');

  if (urlIndex !== -1) return url.pathname.slice(urlIndex);

  return originalURL;
}

const follow = async (url) => {
  try {
    const response = await request(url);
    const location = response.headers.location;

    if (typeof location === 'string') {
      const url = getUrlFromUrl(location);
      console.log(`      ${colors.yellow('>')} ${url}`);
      await follow(url);
    } else {
      console.log(`      ${colors.yellow('>')} No redirects`);
    }

    response.resume();
  } catch (error) {
    console.error(error.message || error);
  }
};


const url = argv[2];


if (typeof url === 'string') {
  await follow(url);
} else {
  console.log(`Redirect Resolver ${colors.green('Interactive Mode')}`);

  prompt.message = '';
  prompt.delimiter = colors.green(">");
  prompt.start();
  
  do {
    const { url } = await prompt.get({
      properties: { url: { allowEmpty: false, description: 'URL ' } }
    });

    if (url === 'exit') {
      break;
    } else if (url === '') {
      continue;
    } else {
      await follow(url);
    }
  } while (true)
}
