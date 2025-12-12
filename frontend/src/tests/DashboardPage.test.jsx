import React from "react";
import { render, screen } from "@testing-library/react";
import DashboardPage from "../pages/dashboard/DashboardPage.jsx";

// --- MOCK ORGANIZATION SELECTOR ---
vi.mock("../components/organization/OrganizationSelector.jsx", () => ({
  OrganizationSelector: () => (
    <button data-testid="mock-org-selector">
      Mock Org Selector
    </button>
  ),
}));

// --- MOCK MESSAGE LIST ---
vi.mock("../components/chat/MessageList.jsx", () => ({
  MessageList: ({ messages }) => (
    <div>
      {messages.map((m) => (
        <div key={m.id}>{m.content}</div>
      ))}
    </div>
  ),
}));

// --- MOCK MESSAGE INPUT ---
vi.mock("../components/chat/MessageInput.jsx", () => ({
  MessageInput: () => (
    <input placeholder="What are the best open opportunities by company size?" />
  ),
}));

const baseProps = {
  filters: {},
  onFiltersChange: vi.fn(),
  organizations: [],
  selectedOrganizationId: null,
  onSelectOrganization: vi.fn(),
  onStartConversation: vi.fn(),
  activeConversationId: null,
  displayMessages: [],
  isGenerating: false,
  canRetry: false,
  onSendMessage: vi.fn(),
  onCancelGeneration: vi.fn(),
  onRetryGeneration: vi.fn(),
  documents: [],
  onUploadDocument: vi.fn(),
  createConversationLoading: false,
  storageUsed: 0,
  storageQuota: 1000,
  user: null,
  onManageStorage: vi.fn(),
};


describe("DashboardPage Component", () => {

  test("renders header title JinkoSolar", () => {
    render(<DashboardPage {...baseProps} />);
    expect(screen.getByText("JinkoSolar")).toBeInTheDocument();
  });

  test("shows 'Select an Organization' when no org is selected", () => {
    render(<DashboardPage {...baseProps} />);
    expect(screen.getByText("Select an Organization")).toBeInTheDocument();
  });

  test("shows quick actions when an organization is selected but no conversation", () => {
    const props = {
      ...baseProps,
      organizations: [{ id: "1", name: "UNSW" }],
      selectedOrganizationId: "1",
    };

    render(<DashboardPage {...props} />);
    expect(screen.getByText("Creative Writing")).toBeInTheDocument();
    expect(screen.getByText("Problem Solving")).toBeInTheDocument();
  });

  test("renders MessageList when conversation is active", () => {
    const props = {
      ...baseProps,
      organizations: [{ id: "1", name: "UNSW" }],
      selectedOrganizationId: "1",
      activeConversationId: "conv1",
      displayMessages: [{ id: 1, content: "Hello" }],
      user: { id: "u1" },
    };

    render(<DashboardPage {...props} />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  test("renders OrganizationSelector always", () => {
    render(<DashboardPage {...baseProps} />);
    expect(screen.getByTestId("mock-org-selector")).toBeInTheDocument();
  });

  test("renders input area always", () => {
    render(<DashboardPage {...baseProps} />);
    expect(
      screen.getByPlaceholderText(
        "What are the best open opportunities by company size?"
      )
    ).toBeInTheDocument();
  });

});
