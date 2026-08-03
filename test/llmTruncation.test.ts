import { expect } from "chai";
import { config } from "../package.json";
import { LLMService } from "../src/modules/llmService";
import type { LLMOptions } from "../src/modules/llmproviders/types";
import {
  isAutoContinuableTruncation,
  recordFinishReason,
  recordOpenAIResponsesObject,
  recordOpenAIResponsesTerminalEvent,
  resetTruncationState,
} from "../src/modules/llmproviders/shared/truncation";

describe("LLM truncation tracking", function () {
  it("marks token-limit finish reasons as auto-continuable", function () {
    const options: LLMOptions = {};
    recordFinishReason(
      options,
      "openai-compat",
      "choices.finish_reason",
      "length",
    );

    expect(options.truncation?.truncated).to.equal(true);
    expect(options.truncation?.kind).to.equal("max_tokens");
    expect(isAutoContinuableTruncation(options.truncation)).to.equal(true);
  });

  it("does not auto-continue context window exhaustion", function () {
    const options: LLMOptions = {};
    recordFinishReason(
      options,
      "anthropic",
      "message_delta",
      "model_context_window_exceeded",
    );

    expect(options.truncation?.truncated).to.equal(true);
    expect(options.truncation?.kind).to.equal("context_window");
    expect(isAutoContinuableTruncation(options.truncation)).to.equal(false);
  });

  it("reads OpenAI Responses incomplete status", function () {
    const options: LLMOptions = {};
    recordOpenAIResponsesObject(options, "openai", "responses.object", {
      status: "incomplete",
      incomplete_details: { reason: "max_output_tokens" },
    });

    expect(options.truncation?.finishReason).to.equal("max_output_tokens");
    expect(isAutoContinuableTruncation(options.truncation)).to.equal(true);
  });

  it("reads OpenAI Responses streaming incomplete events", function () {
    const options: LLMOptions = {};
    recordOpenAIResponsesTerminalEvent(options, "openai", "responses.event", {
      type: "response.incomplete",
      response: { incomplete_details: { reason: "max_output_tokens" } },
    });

    expect(options.truncation?.finishReason).to.equal("max_output_tokens");
    expect(options.truncation?.autoContinuable).to.equal(true);
  });

  it("clears stale truncation state before a new provider call", function () {
    const options: LLMOptions = {};
    recordFinishReason(options, "google", "finishReason", "MAX_TOKENS");
    resetTruncationState(options);

    expect(options.truncation).to.equal(undefined);
  });

  it("does not let a later normal finish reason overwrite a truncation", function () {
    const options: LLMOptions = {};
    recordFinishReason(
      options,
      "openai-compat",
      "choices.finish_reason",
      "length",
    );
    recordFinishReason(
      options,
      "openai-compat",
      "choices.finish_reason",
      "stop",
    );

    expect(options.truncation?.finishReason).to.equal("length");
    expect(isAutoContinuableTruncation(options.truncation)).to.equal(true);
  });

  it("reads and clamps the auto-continuation round preference", function () {
    const key = `${config.prefsPrefix}.autoContinuationRounds`;
    const original = Zotero.Prefs.get(key, true);
    try {
      Zotero.Prefs.set(key, "0", true);
      expect(LLMService.getAutoContinuationRounds()).to.equal(0);
      Zotero.Prefs.set(key, "99", true);
      expect(LLMService.getAutoContinuationRounds()).to.equal(10);
    } finally {
      if (original === undefined) Zotero.Prefs.clear(key, true);
      else Zotero.Prefs.set(key, original as any, true);
    }
  });
});
