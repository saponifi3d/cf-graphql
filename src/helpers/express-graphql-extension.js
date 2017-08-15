'use strict';

// result of a `createExtension` call can be passed to express-graphql
//
// options available (all default to false):
// - timeline: includes timing of HTTP calls
// - detailedErrors: includes stacks of logged exceptions
// - version: includes cf-graphql's version
//
// timeline extension and detailed errors are nice for development, but most
// likely you want to skip them in your production setup

module.exports = createExtension;

function createExtension (client, schema, options = {}) {
  return function (req, res, params) {
    const start = Date.now();
    let api = 'cdn';
    if (params && params.variables && params.variables.preview) api = 'preview';
    const entryLoader = client.createEntryLoader(api);
    return {
      context: {entryLoader},
      schema,
      graphiql: false,
      extensions: prepareExtensions(start, options, entryLoader),
      formatError: options.detailedErrors ? formatError : undefined
    };
  };
}

function prepareExtensions (start, options, entryLoader) {
  if (!options.version && !options.timeline) {
    return;
  }

  return () => {
    const extensions = [];

    if (options.version) {
      extensions.push({
        'cf-graphql': {version: require('../../package.json').version}
      });
    }

    if (options.timeline) {
      extensions.push({
        time: Date.now()-start,
        timeline: entryLoader.getTimeline().map(httpCall => {
          return Object.assign({}, httpCall, {start: httpCall.start-start});
        })
      });
    }

    return Object.assign({}, ...extensions);
  };
}

function formatError (err) {
  return {
    message: err.message,
    locations: err.locations,
    stack: err.stack,
    path: err.path
  };
}
