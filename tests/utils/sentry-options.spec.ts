import { describe, expect, it } from 'vitest';

import {
  sentryBaselineOptions,
  sentryBrowserBaseline,
  sentryDataCollection,
  withoutDedupe,
} from '#utils/sentry-options';

// The key fragments SDK 10 withheld while `sendDefaultPii` was off
const denied = { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] };

describe('utils/sentry-options', () => {
  describe('sentryDataCollection', () => {
    it('collects no user info, so the SDK never asks Sentry to infer an IP address', () => {
      expect(sentryDataCollection.userInfo).toBe(false);
    });

    it('collects no cookies and no request or response bodies', () => {
      expect(sentryDataCollection.cookies).toBe(false);
      expect(sentryDataCollection.httpBodies).toEqual([]);
    });

    it('withholds the identifying headers and query parameters SDK 10 withheld', () => {
      expect(sentryDataCollection.httpHeaders).toEqual({ request: denied, response: denied });
      expect(sentryDataCollection.urlQueryParams).toEqual(denied);
    });

    it('turns off every category SDK 11 added to the default', () => {
      expect(sentryDataCollection.genAI).toEqual({ inputs: false, outputs: false });
      expect(sentryDataCollection.graphQL).toEqual({ document: false, variables: false });
      expect(sentryDataCollection.databaseQueryData).toBe(false);
      expect(sentryDataCollection.queues).toBe(false);
    });

    it('keeps seven lines of source context around a stack frame', () => {
      expect(sentryDataCollection.frameContextLines).toBe(7);
    });
  });

  describe('sentryBaselineOptions', () => {
    it('carries the data collection baseline and the SDK 10 values of the flipped defaults', () => {
      expect(sentryBaselineOptions).toEqual({
        dataCollection: sentryDataCollection,
        attachStacktrace: false,
        traceLifecycle: 'static',
      });
    });
  });

  describe('withoutDedupe', () => {
    it('removes Dedupe and keeps the other defaults in order', () => {
      const defaults = [{ name: 'EventFilters' }, { name: 'Dedupe' }, { name: 'Console' }];

      expect(withoutDedupe(defaults)).toEqual([{ name: 'EventFilters' }, { name: 'Console' }]);
    });
  });

  describe('sentryBrowserBaseline', () => {
    it('starts a session per navigation', () => {
      expect(sentryBrowserBaseline.session).toEqual({ lifecycle: 'route' });
    });

    it('traces no back/forward-cache restore and reports one set of web vitals per page', () => {
      expect(sentryBrowserBaseline.tracing).toEqual({
        instrumentBfcacheRestore: false,
        webVitals: { softNavigations: false, bfcacheNavigations: false },
      });
    });
  });
});
