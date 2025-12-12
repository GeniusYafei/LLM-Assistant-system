import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatSidebar } from "../components/chat/ChatSidebar.jsx";

// Mock ScrollArea to avoid layout warnings
vi.mock("../components/ui/scroll-area", () => ({
  ScrollArea: ({ children }) => <div>{children}</div>,
}));

// Mock UI components used inside ChatSidebar
vi.mock("../components/ui/button", () => ({
  Button: ({ children, ...props }) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("../components/ui/input", () => ({
  Input: ({ ...props }) => <input {...props} />,
}));

vi.mock("../components/ui/select", () => ({
  Select: ({ children }) => <div>{children}</div>,
  SelectTrigger: ({ children }) => <div>{children}</div>,
  SelectContent: ({ children }) => <div>{children}</div>,
  SelectItem: ({ children, ...props }) => (
    <div data-testid="select-item" {...props}>
      {children}
    </div>
  ),
  SelectValue: () => <div />,
}));

// Helper mock conversations
const mockConversations = [
  {
    id: "1",
    title: "Today Chat",
    updatedAt: new Date().toISOString(),
    messages: [],
    attachedDocuments: [],
    storageSize: 0,
  },
  {
    id: "2",
    title: "Old Report",
    updatedAt: "2023-01-01T10:00:00Z",
    messages: [],
    attachedDocuments: [],
    storageSize: 0,
  },
];

describe("ChatSidebar Component", () => {
  test("renders title and New Chat button", () => {
    render(
      <ChatSidebar
        conversations={mockConversations}
        activeConversationId={null}
        onSelectConversation={() => {}}
        onNewConversation={() => {}}
        onDeleteConversation={() => {}}
        onRenameConversation={() => {}}
      />
    );

    expect(screen.getByText("Chat History")).toBeInTheDocument();
    expect(screen.getByText("New Chat")).toBeInTheDocument();
  });

  test("calls onNewConversation when New Chat is clicked", () => {
    const mockFn = vi.fn();

    render(
      <ChatSidebar
        conversations={mockConversations}
        activeConversationId={null}
        onSelectConversation={() => {}}
        onNewConversation={mockFn}
      />
    );

    fireEvent.click(screen.getByText("New Chat"));
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test("renders empty state when no conversations", () => {
    render(
      <ChatSidebar
        conversations={[]}
        activeConversationId={null}
        onSelectConversation={() => {}}
        onNewConversation={() => {}}
      />
    );

    expect(screen.getByText("No conversations yet")).toBeInTheDocument();
  });

  test("renders conversations grouped (Today + Older)", () => {
    render(
      <ChatSidebar
        conversations={mockConversations}
        activeConversationId={null}
        onSelectConversation={() => {}}
        onNewConversation={() => {}}
      />
    );

    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Previous 30 days")).toBeInTheDocument();
  });

  test("search filters conversations", () => {
    render(
      <ChatSidebar
        conversations={mockConversations}
        activeConversationId={null}
        onSelectConversation={() => {}}
        onNewConversation={() => {}}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("Search..."), {
      target: { value: "report" },
    });

    expect(screen.getByText("Old Report")).toBeInTheDocument();
    expect(screen.queryByText("Today Chat")).not.toBeInTheDocument();
  });

  test("click conversation triggers onSelectConversation", () => {
    const mockFn = vi.fn();

    render(
      <ChatSidebar
        conversations={mockConversations}
        activeConversationId={null}
        onSelectConversation={mockFn}
        onNewConversation={() => {}}
      />
    );

    fireEvent.click(screen.getByText("Today Chat"));
    expect(mockFn).toHaveBeenCalledWith("1");
  });
});
