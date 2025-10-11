const CDP = require('chrome-remote-interface');
const fs = require('fs');

(async function collectTrace() {
  let client;
  try {
    client = await CDP();
    const {Page, Performance, Tracing, Runtime} = client;
    await Page.enable();

    const tracePath = 'performance-trace.json';

    await Tracing.start({
      categories: ['devtools.timeline', 'v8', 'blink.user_timing', 'disabled-by-default-devtools.timeline'],
      options: 'sampling-frequency=1000'
    });

    await Page.navigate({url: 'http://localhost:5173'});
    await Page.loadEventFired();

    // wait a few seconds to let the app load and render charts
    await new Promise(r => setTimeout(r, 6000));

    const traceEvents = [];
    Tracing.dataCollected(({value}) => {
      traceEvents.push(...value);
    });

    await Tracing.end();

    Tracing.tracingComplete(() => {
      fs.writeFileSync(tracePath, JSON.stringify({traceEvents}, null, 2));
      console.log('Trace saved to', tracePath);
      client.close();
    });
  } catch (err) {
    console.error(err);
    if (client) client.close();
    process.exit(1);
  }
})();