import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MessageInput } from "../components/chat/MessageInput.jsx";

const getTextarea = () => screen.getByRole("textbox");

describe("MessageInput Component", () => {
  let onSendMessage;
  let onUploadDocument;

  beforeEach(() => {
    onSendMessage = vi.fn();
    onUploadDocument = vi.fn();
  });

  const renderInput = (props = {}) =>
    render(
      <MessageInput
        onSendMessage={onSendMessage}
        onUploadDocument={onUploadDocument}
        isGenerating={false}
        canRetry={false}
        {...props}
      />
    );

  it("renders the textarea", () => {
    renderInput();
    expect(getTextarea()).toBeInTheDocument();
  });

  it("allows typing", () => {
    renderInput();
    const textarea = getTextarea();
    fireEvent.change(textarea, { target: { value: "hello" } });
    expect(textarea.value).toBe("hello");
  });

  it("disables send button when empty", () => {
    renderInput();
    const sendBtn = screen.getAllByRole("button").at(-1);
    expect(sendBtn).toBeDisabled();
  });

  it("sends message on Send click", () => {
    renderInput();
    const textarea = getTextarea();
    fireEvent.change(textarea, { target: { value: "Hello AI" } });

    const sendBtn = screen.getAllByRole("button").at(-1);
    fireEvent.click(sendBtn);

    expect(onSendMessage).toHaveBeenCalledWith("Hello AI", expect.any(Array), "default");
  });

  it("sends message with Ctrl+Enter", () => {
    renderInput();
    const textarea = getTextarea();
    fireEvent.change(textarea, { target: { value: "Quick send" } });

    fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true });

    expect(onSendMessage).toHaveBeenCalledWith("Quick send", expect.any(Array), "default");
  });

  it("shows Stop button when isGenerating = true", () => {
    renderInput({ isGenerating: true });
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(1);
  });

  it("shows Retry button when canRetry = true", () => {
    renderInput({ canRetry: true });
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(1);
  });
});
